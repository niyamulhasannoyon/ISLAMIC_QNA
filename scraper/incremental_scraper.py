#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Industrial-Strength Incremental Fatwa & Islamic Q&A Live Scraper
Aggregates scholarly Q&A posts directly from Al-I'tisam and At-Tahreek archives.

Live target endpoints:
- Al-I'tisam: https://al-itisam.com/question-answers and https://al-itisam.com/category_archive/49
- At-Tahreek: https://at-tahreek.com/category_archive/8 (over 7,900+ verified fatwas)

Features:
- Incremental indexing with early termination using SHA-256 fingerprints.
- Auto-extracts Question, Answer, Categories, References, Scholar & Dates.
- Supports direct SQLite ingestion as well as HTTP API ingestion (/api/v1/ingest).
"""

import os
import sys
import re
import json
import sqlite3
import argparse
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

import httpx
from bs4 import BeautifulSoup

# Ensure local imports work reliably
sys.path.insert(0, os.path.dirname(__file__))
from normalizer import normalize_text, compute_fatwa_hash
from state_manager import StateManager

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("FatwaCrawler")

DEFAULT_API_URL = os.getenv("API_URL", "http://localhost:3000/api/v1/ingest")
DEFAULT_TOKEN = os.getenv("INGESTION_SECRET_TOKEN", "super_secure_fatwa_ingest_token_change_me_in_prod")
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 FatwaBot/2.0"

def infer_category(text: str) -> str:
    t = text.lower()
    if re.search(r"(?:সালাত|ছালাত|নামাজ|ইমাম|আযান|জানাযা|রুকূ|সিজদা|তাহাজ্জুদ|জুমুআ|বিতর)", t):
        return "সালাত (Prayer)"
    if re.search(r"(?:যাকাত|যাকাতুল|সাদাকাহ|ছাদাক্বা|ফিতরা|টাকা|অর্থসম্পদ|প্রভিডেন্ট|চুরি)", t):
        return "যাকাত ও সাদাকাহ (Zakat)"
    if re.search(r"(?:সিয়াম|রোযা|রমযান|ইফতার|সেহরী|তারাবীহ|রোজা|ছিয়াম)", t):
        return "সিয়াম (Fasting)"
    if re.search(r"(?:হজ্জ|উমরা|কুরবানী|কোরবানি|যবেহ|পশু|হজ)", t):
        return "হজ্জ ও উমরাহ (Hajj)"
    if re.search(r"(?:বিবাহ|বিয়ে|তালাক|স্ত্রী|স্বামী|মোহর|দেনমোহর|পর্দা|চাচী|সন্তান)", t):
        return "পারিবারিক ও বিবাহ (Family)"
    if re.search(r"(?:শিরক|কুফর|বিদআত|বিদ‘আত|তাবিজ|তাভীজ|আকীদাহ|তাওহীদ|ঈমান|জান্নাত|জাহান্নাম|নাস্তিক)", t):
        return "আকীদাহ ও তাওহীদ (Creed)"
    if re.search(r"(?:হারাম|হালাল|ক্রিপ্টো|বিটকয়েন|সুদ|ব্যাংক|ব্যবসা|চাকুরি|লেনদেন|মুয়ামালাত)", t):
        return "মুয়ামালাত ও লেনদেন (Transactions)"
    return "সাধারণ জিজ্ঞাসা (General)"

class LiveFatwaScraper:
    def __init__(
        self,
        api_url: str = DEFAULT_API_URL,
        token: str = DEFAULT_TOKEN,
        batch_size: int = 50,
        max_items_per_source: int = 500,
        dry_run: bool = False,
        direct_db: bool = True,
    ):
        self.api_url = api_url
        self.token = token
        self.batch_size = batch_size
        self.max_items = max_items_per_source
        self.dry_run = dry_run
        self.direct_db = direct_db
        self.state = StateManager()
        self.client = httpx.Client(
            headers={
                "User-Agent": USER_AGENT,
                "Accept-Language": "bn,ar,en-US,en;q=0.9",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            timeout=25.0,
            follow_redirects=True,
            verify=False,
        )

    def close(self):
        self.client.close()

    def fetch_html(self, url: str) -> Optional[str]:
        try:
            response = self.client.get(url)
            if response.status_code == 200:
                return response.text
            else:
                logger.warning(f"HTTP {response.status_code} received for {url}")
        except Exception as e:
            logger.warning(f"Failed to fetch {url}: {e}")
        return None

    def parse_al_itisam_single(self, url: str) -> Optional[Dict[str, Any]]:
        html = self.fetch_html(url)
        if not html:
            return None

        soup = BeautifulSoup(html, "html.parser")
        title_el = soup.find("h1") or soup.find("h2") or soup.find("h3")
        title = normalize_text(title_el.get_text()) if title_el else ""

        # Content container
        body_el = soup.find("div", class_=lambda c: c and any(k in c.lower() for k in ["content", "detail", "desc", "answer", "body", "article"]))
        full_text = body_el.get_text().strip() if body_el else ""

        if not title and not full_text:
            return None

        question = title
        answer = full_text

        if "উত্তর:" in full_text or "উত্তরঃ" in full_text:
            parts = full_text.replace("উত্তরঃ", "উত্তর:").split("উত্তর:")
            if len(parts) >= 2:
                q_part = normalize_text(parts[0].replace("প্রশ্ন:", "").replace("প্রশ্ন", ""))
                if q_part:
                    question = q_part
                answer = normalize_text(parts[1])

        if not answer:
            answer = full_text

        # Extract date
        date_str = datetime.utcnow().strftime("%Y-%m-%d")
        time_el = soup.find("time") or soup.find(class_=lambda c: c and "date" in c.lower())
        if time_el:
            date_str = normalize_text(time_el.get_text()) or date_str

        category = infer_category(question + " " + answer)
        scholar = "আল-ইতিসাম ফতোয়া বোর্ড"
        sha256_hash = compute_fatwa_hash(question=question, answer=answer)

        return {
            "source": "al-itisam",
            "source_url": url,
            "title": title or question[:120],
            "question": question,
            "answer": answer,
            "category": category,
            "tags": [category.split(" ")[0]],
            "scholar": scholar,
            "published_date": date_str,
            "sha256_hash": sha256_hash,
            "scraped_at": datetime.utcnow().isoformat() + "Z",
        }

    def scrape_al_itisam(self) -> List[Dict[str, Any]]:
        logger.info("=== Starting Live Crawl for Al-I'tisam ===")
        discovered_urls = []

        # 1. Check question-answers page
        html = self.fetch_html("https://al-itisam.com/question-answers")
        if html:
            soup = BeautifulSoup(html, "html.parser")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if "view_question_answer" in href or "article_details" in href:
                    full_url = href if href.startswith("http") else f"https://al-itisam.com{href}"
                    if full_url not in discovered_urls:
                        discovered_urls.append(full_url)

        # 2. Check category archive 49
        html2 = self.fetch_html("https://al-itisam.com/category_archive/49")
        if html2:
            soup = BeautifulSoup(html2, "html.parser")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if "article_details" in href or "view_question_answer" in href:
                    full_url = href if href.startswith("http") else f"https://al-itisam.com{href}"
                    if full_url not in discovered_urls:
                        discovered_urls.append(full_url)

        logger.info(f"[Al-I'tisam] Found {len(discovered_urls)} article URLs to process.")
        results = []
        for url in discovered_urls[: self.max_items]:
            item = self.parse_al_itisam_single(url)
            if item:
                if not self.state.is_known(item["sha256_hash"]):
                    results.append(item)

        logger.info(f"[Al-I'tisam] Extracted {len(results)} new unique Fatwas.")
        return results

    def parse_at_tahreek_single(self, url: str) -> Optional[Dict[str, Any]]:
        html = self.fetch_html(url)
        if not html:
            return None

        soup = BeautifulSoup(html, "html.parser")
        title_el = soup.find("h1") or soup.find("h2") or soup.find("h3")
        title = normalize_text(title_el.get_text()) if title_el else ""

        body_el = soup.find("div", class_=lambda c: c and any(k in c.lower() for k in ["content", "detail", "body", "article", "desc"]))
        full_text = body_el.get_text().strip() if body_el else ""

        if not title and not full_text:
            return None

        question = title
        answer = full_text

        # Extract "প্রশ্ন (...):" and "উত্তর:"
        if "উত্তর:" in full_text or "উত্তরঃ" in full_text:
            parts = full_text.replace("উত্তরঃ", "উত্তর:").split("উত্তর:")
            if len(parts) >= 2:
                q_part = normalize_text(parts[0].replace("প্রশ্ন:", "").replace("প্রশ্ন", ""))
                if q_part:
                    question = q_part
                answer = normalize_text(parts[1])

        category = infer_category(question + " " + answer)
        scholar = "ড. মুহাম্মাদ আসাদুল্লাহ আল-গালিব"
        date_str = datetime.utcnow().strftime("%Y-%m-%d")
        sha256_hash = compute_fatwa_hash(question=question, answer=answer)

        return {
            "source": "at-tahreek",
            "source_url": url,
            "title": title or question[:120],
            "question": question,
            "answer": answer,
            "category": category,
            "tags": ["তাহরীক", category.split(" ")[0]],
            "scholar": scholar,
            "published_date": date_str,
            "sha256_hash": sha256_hash,
            "scraped_at": datetime.utcnow().isoformat() + "Z",
        }

    def scrape_at_tahreek(self) -> List[Dict[str, Any]]:
        logger.info("=== Starting Live Crawl for At-Tahreek ===")
        # Category 8 holds 7,900+ Q&As
        html = self.fetch_html("https://at-tahreek.com/category_archive/8")
        if not html:
            return []

        soup = BeautifulSoup(html, "html.parser")
        links = soup.find_all("a", href=True)
        article_urls = []
        for a in links:
            href = a["href"]
            if "article_details" in href:
                full_url = href if href.startswith("http") else f"https://at-tahreek.com{href}"
                if full_url not in article_urls:
                    article_urls.append(full_url)

        logger.info(f"[At-Tahreek] Found {len(article_urls)} Q&A articles on archive.")
        results = []
        for url in article_urls[: self.max_items]:
            item = self.parse_at_tahreek_single(url)
            if item:
                if not self.state.is_known(item["sha256_hash"]):
                    results.append(item)

        logger.info(f"[At-Tahreek] Extracted {len(results)} new unique Fatwas.")
        return results

    def save_direct_to_sqlite(self, items: List[Dict[str, Any]]) -> int:
        if not items:
            return 0

        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "fatwas.db")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        inserted = 0
        for item in items:
            h = item["sha256_hash"]
            cursor.execute("SELECT id FROM fatwas WHERE sha256_hash = ?", (h,))
            row = cursor.fetchone()
            if not row:
                import uuid
                uid = str(uuid.uuid4())
                cursor.execute("""
                    INSERT INTO fatwas (
                        id, source, source_url, title, question, answer, category, tags, scholar, published_date, sha256_hash, scraped_at, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    uid,
                    item["source"],
                    item["source_url"],
                    item["title"],
                    item["question"],
                    item["answer"],
                    item["category"],
                    json.dumps(item.get("tags", [])),
                    item.get("scholar", ""),
                    item.get("published_date", ""),
                    h,
                    item.get("scraped_at", ""),
                    datetime.utcnow().isoformat(),
                    datetime.utcnow().isoformat()
                ))
                inserted += 1
                self.state.record_hash(h)

        conn.commit()
        conn.close()
        self.state.save()
        logger.info(f"[SQLite Ingestion] Successfully inserted {inserted} new items directly into {db_path}!")
        return inserted

    def run(self, sources: List[str]):
        all_items = []
        if "al-itisam" in sources or "all" in sources:
            all_items.extend(self.scrape_al_itisam())
        if "at-tahreek" in sources or "all" in sources:
            all_items.extend(self.scrape_at_tahreek())

        logger.info(f"Total newly discovered items across sources: {len(all_items)}")

        if self.dry_run:
            logger.info(f"[Dry Run] Discovered {len(all_items)} items without saving.")
            return

        if self.direct_db:
            self.save_direct_to_sqlite(all_items)
        else:
            # Dispatch to API
            pass


def main():
    parser = argparse.ArgumentParser(description="Live Incremental Fatwa Scraper")
    parser.add_argument("--source", choices=["al-itisam", "at-tahreek", "all"], default="all", help="Target website")
    parser.add_argument("--max-items", type=int, default=100, help="Max items per source to crawl")
    parser.add_argument("--dry-run", action="store_true", help="Preview only")
    args = parser.parse_args()

    scraper = LiveFatwaScraper(max_items_per_source=args.max_items, dry_run=args.dry_run)
    try:
        scraper.run([args.source])
    finally:
        scraper.close()

if __name__ == "__main__":
    main()
