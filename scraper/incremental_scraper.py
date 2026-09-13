#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Industrial-Strength Incremental Fatwa & Islamic Q&A Scraper
Aggregates scholarly Q&A posts from Al-I'tisam and At-Tahreek archives.

Key Features:
- Tenacity auto-retries with exponential backoff & jitter for network resilience.
- SHA-256 cryptographic fingerprinting derived strictly from question + answer text.
- Early pagination termination: immediately stops traversing as soon as a previously indexed post is reached.
- Strict unified schema emission: source ('al-itisam' | 'at-tahreek'), source_url, title, question,
  answer, category, tags, scholar, published_date, sha256_hash, scraped_at.
- Idempotent batched dispatch to Next.js /api/v1/ingest endpoint with Bearer authentication.
"""

import os
import sys
import argparse
import time
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

import httpx
from bs4 import BeautifulSoup
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

# Ensure local imports work reliably
sys.path.insert(0, os.path.dirname(__file__))
from normalizer import normalize_text, compute_fatwa_hash
from state_manager import StateManager

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("FatwaScraper")

DEFAULT_API_URL = os.getenv("API_URL", "http://localhost:3000/api/v1/ingest")
DEFAULT_TOKEN = os.getenv("INGESTION_SECRET_TOKEN", "super_secure_fatwa_ingest_token_change_me_in_prod")
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 FatwaBot/2.0"

class IndustrialFatwaScraper:
    def __init__(
        self,
        api_url: str = DEFAULT_API_URL,
        token: str = DEFAULT_TOKEN,
        batch_size: int = 20,
        max_pages: int = 5,
        dry_run: bool = False,
    ):
        self.api_url = api_url
        self.token = token
        self.batch_size = batch_size
        self.max_pages = max_pages
        self.dry_run = dry_run
        self.state = StateManager()
        self.client = httpx.Client(
            headers={
                "User-Agent": USER_AGENT,
                "Accept-Language": "bn,ar,en-US,en;q=0.9",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            timeout=25.0,
            follow_redirects=True,
        )

    def close(self):
        self.client.close()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1.5, min=2.0, max=10.0),
        retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException)),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=False,
    )
    def fetch_html(self, url: str) -> Optional[str]:
        """Fetches HTML with Tenacity exponential retry backoff."""
        try:
            response = self.client.get(url)
            if response.status_code == 200:
                return response.text
            elif response.status_code == 404:
                logger.warning(f"Resource not found (404): {url}")
                return None
            else:
                logger.warning(f"HTTP {response.status_code} received for {url}")
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.error(f"HTTP error {exc.response.status_code} on {url}")
            return None
        except Exception as e:
            logger.warning(f"Connection failed for {url}: {e}")
            raise e
        return None

    def scrape_al_itisam(self) -> List[Dict[str, Any]]:
        """
        Incrementally scrapes Al-I'tisam fatwa archive.
        Halts pagination immediately upon encountering a previously indexed SHA-256 hash.
        """
        logger.info("=== Starting incremental crawl for Al-I'tisam ===")
        base_url = "https://al-itisam.com/category/fatwa"
        scraped_items: List[Dict[str, Any]] = []
        stop_pagination = False

        for page in range(1, self.max_pages + 1):
            if stop_pagination:
                break

            url = f"{base_url}/page/{page}/" if page > 1 else base_url
            logger.info(f"[Al-I'tisam] Fetching page {page}: {url}")
            html = self.fetch_html(url)
            if not html:
                logger.info(f"[Al-I'tisam] No more content or failed to fetch page {page}. Halting crawl.")
                break

            soup = BeautifulSoup(html, "html.parser")
            articles = soup.find_all("article")
            if not articles:
                articles = soup.find_all("div", class_=lambda c: c and any(k in c.lower() for k in ["post", "entry"]))

            if not articles:
                logger.info("[Al-I'tisam] No articles detected on page. Stopping.")
                break

            page_new_count = 0

            for article in articles:
                title_elem = article.find(["h2", "h3", "h1"])
                if not title_elem:
                    continue

                link_elem = title_elem.find("a") or article.find("a", href=True)
                source_url = link_elem["href"] if link_elem and link_elem.has_attr("href") else url
                title = normalize_text(title_elem.get_text())

                content_elem = article.find(class_=lambda c: c and any(k in c for k in ["entry-content", "content", "excerpt"]))
                full_text = normalize_text(content_elem.get_text()) if content_elem else ""

                question = title
                answer = full_text

                if "প্রশ্ন:" in full_text or "উত্তরঃ" in full_text or "উত্তর:" in full_text:
                    parts = full_text.replace("উত্তরঃ", "উত্তর:").split("উত্তর:")
                    if len(parts) >= 2:
                        question = normalize_text(parts[0].replace("প্রশ্ন:", "")) or title
                        answer = normalize_text(parts[1])

                cat_elem = article.find(class_=lambda c: c and "category" in c)
                category = normalize_text(cat_elem.get_text()) if cat_elem else "ফতোয়া (Fatwa)"

                tag_elems = article.find_all("a", rel="tag")
                tags = [normalize_text(t.get_text()) for t in tag_elems if t.get_text()]

                scholar_elem = article.find(class_=lambda c: c and ("author" in c or "scholar" in c))
                scholar = normalize_text(scholar_elem.get_text()) if scholar_elem else "শায়খ আব্দুল হামীদ ফাইযী আল-মাদানী"

                time_elem = article.find("time")
                published_date = time_elem.get("datetime") if time_elem and time_elem.has_attr("datetime") else datetime.utcnow().isoformat() + "Z"

                # SHA-256 fingerprint derived strictly from question + answer
                content_hash = compute_fatwa_hash(question=question, answer=answer)

                # Incremental check: halt pagination if already known
                if self.state.is_known(content_hash):
                    logger.info(f"[Al-I'tisam] Reached previously indexed post: '{title[:45]}...' [Hash: {content_hash[:10]}]")
                    logger.info("[Al-I'tisam] Halting pagination early. Archive is up-to-date.")
                    stop_pagination = True
                    break

                scraped_items.append({
                    "source": "al-itisam",
                    "source_url": source_url,
                    "title": title,
                    "question": question,
                    "answer": answer,
                    "category": category,
                    "tags": tags,
                    "scholar": scholar,
                    "published_date": published_date,
                    "sha256_hash": content_hash,
                    "scraped_at": datetime.utcnow().isoformat() + "Z",
                })
                page_new_count += 1

            logger.info(f"[Al-I'tisam] Page {page}: Discovered {page_new_count} new entries.")

        logger.info(f"[Al-I'tisam] Completed crawl. Total new items discovered: {len(scraped_items)}")
        return scraped_items

    def scrape_at_tahreek(self) -> List[Dict[str, Any]]:
        """
        Incrementally scrapes At-Tahreek fatwa archive.
        Halts pagination immediately upon encountering a previously indexed SHA-256 hash.
        """
        logger.info("=== Starting incremental crawl for At-Tahreek ===")
        base_url = "https://www.at-tahreek.com/fatwa"
        scraped_items: List[Dict[str, Any]] = []
        stop_pagination = False

        for page in range(1, self.max_pages + 1):
            if stop_pagination:
                break

            url = f"{base_url}?page={page}" if page > 1 else base_url
            logger.info(f"[At-Tahreek] Fetching page {page}: {url}")
            html = self.fetch_html(url)
            if not html:
                logger.info(f"[At-Tahreek] No more content or network error on page {page}. Halting.")
                break

            soup = BeautifulSoup(html, "html.parser")
            items = soup.find_all(["div", "article"], class_=lambda c: c and any(k in c.lower() for k in ["fatwa-item", "qa-item", "card", "post"]))
            if not items:
                logger.info("[At-Tahreek] No items found on page. Halting.")
                break

            page_new_count = 0

            for item in items:
                title_el = item.find(["h2", "h3", "h4", "a"])
                if not title_el:
                    continue

                title = normalize_text(title_el.get_text())
                link_el = item.find("a", href=True)
                source_url = link_el["href"] if link_el else url

                q_elem = item.find(class_=lambda c: c and "question" in c.lower())
                a_elem = item.find(class_=lambda c: c and "answer" in c.lower())

                question = normalize_text(q_elem.get_text()) if q_elem else title
                answer = normalize_text(a_elem.get_text()) if a_elem else normalize_text(item.get_text())

                cat_el = item.find(class_=lambda c: c and ("cat" in c.lower() or "badge" in c.lower()))
                category = normalize_text(cat_el.get_text()) if cat_el else "প্রশ্নোত্তর (Q&A)"

                scholar = "ড. মুহাম্মাদ আসাদুল্লাহ আল-গালিব"
                published_date = datetime.utcnow().isoformat() + "Z"

                # SHA-256 fingerprint derived strictly from question + answer
                content_hash = compute_fatwa_hash(question=question, answer=answer)

                if self.state.is_known(content_hash):
                    logger.info(f"[At-Tahreek] Reached previously indexed post: '{title[:45]}...' [Hash: {content_hash[:10]}]")
                    logger.info("[At-Tahreek] Halting pagination early. Archive is up-to-date.")
                    stop_pagination = True
                    break

                scraped_items.append({
                    "source": "at-tahreek",
                    "source_url": source_url,
                    "title": title,
                    "question": question,
                    "answer": answer,
                    "category": category,
                    "tags": ["মাসআলা", "তাহরীক"],
                    "scholar": scholar,
                    "published_date": published_date,
                    "sha256_hash": content_hash,
                    "scraped_at": datetime.utcnow().isoformat() + "Z",
                })
                page_new_count += 1

            logger.info(f"[At-Tahreek] Page {page}: Discovered {page_new_count} new entries.")

        logger.info(f"[At-Tahreek] Completed crawl. Total new items discovered: {len(scraped_items)}")
        return scraped_items

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1.0, min=2.0, max=8.0),
        retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException)),
        reraise=False,
    )
    def dispatch_batch(self, items: List[Dict[str, Any]]) -> bool:
        """Sends a batch of items to the Next.js /api/v1/ingest endpoint with Bearer auth."""
        if not items:
            return True

        if self.dry_run:
            logger.info(f"[Dry Run] Would dispatch {len(items)} items to {self.api_url}")
            for it in items[:3]:
                logger.info(f"  - [{it['source']}] {it['title']} ({it['sha256_hash'][:10]}...) by {it.get('scholar')}")
            return True

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

        try:
            payload = {"items": items}
            response = self.client.post(self.api_url, json=payload, headers=headers, timeout=30.0)

            if response.status_code == 200:
                data = response.json()
                logger.info(f"[Ingestion API] Success: {data.get('message', 'Batch ingested')}")
                for item in items:
                    self.state.record_hash(item["sha256_hash"])
                self.state.save()
                return True
            else:
                logger.error(f"[Ingestion API] HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            logger.error(f"[Ingestion API] Failed to post batch: {e}")
            raise e

    def run(self, sources: List[str]):
        """Runs the incremental crawler and dispatches batches to /api/v1/ingest."""
        all_new_items: List[Dict[str, Any]] = []

        if "al-itisam" in sources or "all" in sources:
            all_new_items.extend(self.scrape_al_itisam())

        if "at-tahreek" in sources or "all" in sources:
            all_new_items.extend(self.scrape_at_tahreek())

        logger.info(f"\nTotal new items to ingest across all sources: {len(all_new_items)}")

        for i in range(0, len(all_new_items), self.batch_size):
            chunk = all_new_items[i : i + self.batch_size]
            logger.info(f"Dispatching batch {i // self.batch_size + 1} ({len(chunk)} items)...")
            self.dispatch_batch(chunk)

        logger.info("Incremental crawl & ingestion pipeline complete!")
        logger.info(f"Total entries now tracked in state: {len(self.state.known_hashes)}")


def main():
    parser = argparse.ArgumentParser(description="Industrial-Strength Incremental Fatwa Scraper")
    parser.add_argument("--source", choices=["al-itisam", "at-tahreek", "all"], default="all", help="Target website")
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help="Ingestion API endpoint")
    parser.add_argument("--token", default=DEFAULT_TOKEN, help="Secret bearer token")
    parser.add_argument("--max-pages", type=int, default=5, help="Maximum pages to traverse")
    parser.add_argument("--batch-size", type=int, default=20, help="Batch size for ingestion API")
    parser.add_argument("--dry-run", action="store_true", help="Print items without sending to API")

    args = parser.parse_args()

    scraper = IndustrialFatwaScraper(
        api_url=args.api_url,
        token=args.token,
        batch_size=args.batch_size,
        max_pages=args.max_pages,
        dry_run=args.dry_run,
    )

    try:
        scraper.run([args.source])
    finally:
        scraper.close()

if __name__ == "__main__":
    main()
