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
from normalizer import normalize_text, compute_fatwa_hash, hash_to_uuid
from state_manager import StateManager

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("FatwaCrawler")

DEFAULT_API_URL = os.getenv("API_URL", "")
DEFAULT_TOKEN = os.getenv("INGESTION_SECRET_TOKEN", "")
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 FatwaBot/2.0"

def infer_category(text: str) -> str:
    t = text.lower()
    if re.search(r"(?:সালাত|ছালাত|নামাজ|ইমাম|আযান|জানাযা|রুকূ|সিজদা|তাহাজ্জুদ|জুমুআ|বিতর|মাসবূক|রাকাআত|অযু|ওযূ|তায়াম্মুম|তায়াম্মুম|ক্বিবলা|মসজিদ|তাহারাত|পবিত্রতা|নাপাক|গোসল)", t):
        return "সালাত ও তাহারাত (Prayer & Purity)"
    if re.search(r"(?:যাকাত|যাকাতুল|সাদাকাহ|ছাদাক্বা|ফিতরা|টাকা|অর্থসম্পদ|প্রভিডেন্ট|চুরি|দান|সম্পত্তি|উত্তরাধিকার|ওয়ারিশ|সদকা|ঋণ)", t):
        return "যাকাত ও সাদাকাহ (Zakat)"
    if re.search(r"(?:সিয়াম|রোযা|রমযান|ইফতার|সেহরী|তারাবীহ|রোজা|ছিয়াম|সাহারী|ই‘তিকাফ)", t):
        return "সিয়াম (Fasting)"
    if re.search(r"(?:হজ্জ|উমরা|কুরবানী|কোরবানি|যবেহ|পশু|হজ|আক্বীক্বা|আকিকা|যিলহজ্জ|মক্কা)", t):
        return "হজ্জ ও উমরাহ (Hajj & Qurbani)"
    if re.search(r"(?:বিবাহ|বিয়ে|তালাক|স্ত্রী|স্বামী|মোহর|দেনমোহর|পর্দা|চাচী|সন্তান|মেয়ে|নারী|হায়েয|নিফাস|দাম্পত্য|মাহরাম|দুধমা|অভিভাবক|সন্তানাদি)", t):
        return "পারিবারিক ও বিবাহ (Family)"
    if re.search(r"(?:শিরক|কুফর|বিদআত|বিদ‘আত|তাবিজ|তাভীজ|আকীদাহ|তাওহীদ|ঈমান|জান্নাত|জাহান্নাম|নাস্তিক|কাদারিয়া|মু‘তাযিলা|জিন|শয়তান|ভাগ্য|তাক্বদীর|মাযার)", t):
        return "আকীদাহ ও তাওহীদ (Creed)"
    if re.search(r"(?:হারাম|হালাল|ক্রিপ্টো|বিটকয়েন|সুদ|ব্যাংক|ব্যবসা|চাকুরি|লেনদেন|মুয়ামালাত|উপার্জন|চাঁদা|বীমা|শেয়ার|ক্রয়|বিক্রয়|ভাড়া|চুক্তি)", t):
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

        date_str = datetime.utcnow().strftime("%Y-%m-%d")
        time_el = soup.find("time") or soup.find(class_=lambda c: c and "date" in c.lower())
        if time_el:
            date_str = normalize_text(time_el.get_text()) or date_str

        clean_q = re.sub(r"^প্রশ্ন\s*\([^\)]*\)\s*:\s*", "", question).strip()
        final_question = clean_q or question or title

        category = infer_category(final_question + " " + answer)
        scholar = "আল-ইতিসাম ফতোয়া বোর্ড"
        sha256_hash = compute_fatwa_hash(question=final_question, answer=answer)

        return {
            "source": "al-itisam",
            "source_url": url,
            "title": title or final_question[:120],
            "question": final_question,
            "answer": answer,
            "category": category,
            "tags": [category.split(" ")[0], "আল-ইতিসাম"],
            "scholar": scholar,
            "published_date": date_str,
            "sha256_hash": sha256_hash,
            "scraped_at": datetime.utcnow().isoformat() + "Z",
        }

    def scrape_al_itisam(self) -> List[Dict[str, Any]]:
        logger.info("=== Starting Live Crawl for Al-I'tisam ===")
        discovered_urls = []

        html = self.fetch_html("https://al-itisam.com/question-answers")
        if not html:
            logger.warning("[Al-I'tisam] Could not fetch base page (server may be unreachable from current IP). Skipping...")
            return []

        soup = BeautifulSoup(html, "html.parser")

        # Check magazine dropdown for the latest monthly issues
        select_el = soup.find("select", attrs={"name": "magazine_id"})
        recent_mag_ids = []
        if select_el:
            for opt in select_el.find_all("option"):
                val = opt.get("value")
                if val and val.isdigit():
                    recent_mag_ids.append((val, opt.get_text().strip()))

        pages_to_check = ["https://al-itisam.com/question-answers"]
        for mag_id, name in recent_mag_ids[:3]:
            pages_to_check.append(f"https://al-itisam.com/question-answers?magazine_id={mag_id}")

        for page_url in pages_to_check:
            p_html = self.fetch_html(page_url) if page_url != "https://al-itisam.com/question-answers" else html
            if not p_html:
                continue
            p_soup = BeautifulSoup(p_html, "html.parser")
            for a in p_soup.find_all("a", href=True):
                href = a["href"]
                if "view_question_answer" in href or "article_details" in href:
                    full_url = href if href.startswith("http") else f"https://al-itisam.com{href}"
                    if full_url not in discovered_urls:
                        discovered_urls.append(full_url)

        logger.info(f"[Al-I'tisam] Found {len(discovered_urls)} potential question links.")
        results = []
        for url in discovered_urls:
            if len(results) >= self.max_items:
                break
            item = self.parse_al_itisam_single(url)
            if item and not self.state.is_known(item["sha256_hash"]):
                results.append(item)

        logger.info(f"[Al-I'tisam] Extracted {len(results)} new unique Fatwas.")
        return results

    def parse_at_tahreek_single(self, url: str) -> Optional[Dict[str, Any]]:
        html = self.fetch_html(url)
        if not html:
            return None

        soup = BeautifulSoup(html, "html.parser")
        h = soup.find("h1") or soup.find("h2") or soup.find("h3")
        raw_title = normalize_text(h.get_text()) if h else ""

        art = soup.find("div", class_="article-details") or soup.find("div", class_="main_content_area") or soup.find("div", class_=lambda c: c and any(k in c.lower() for k in ["content", "detail", "body", "article", "desc"]))
        if not art:
            return None

        # Extract subjects/tags
        subjects = []
        subj_div = art.find("div", class_="subjects")
        if subj_div:
            for a in subj_div.find_all("a"):
                stext = normalize_text(a.get_text())
                if stext:
                    subjects.append(stext)
            subj_div.decompose()

        full_text = art.get_text("\n", strip=True)
        if not full_text:
            return None

        # Clean question prefix (e.g., 'প্রশ্ন (৪০/৪৮০) :')
        clean_q = re.sub(r"^প্রশ্ন\s*\([^\)]*\)\s*:\s*", "", raw_title).strip()
        question = normalize_text(clean_q) if clean_q else raw_title
        if not question:
            question = raw_title

        # Parse answer text
        ans_text = full_text
        if "উত্তর" in ans_text:
            ans_parts = re.split(r"উত্তর\s*:", ans_text, maxsplit=1)
            if len(ans_parts) > 1:
                ans_text = ans_parts[1].strip()

        if "প্রশ্নকারী" in ans_text:
            ans_text = re.split(r"প্রশ্নকারী\s*:", ans_text)[0].strip()

        answer = normalize_text(ans_text)
        if not answer or len(answer) < 10:
            return None

        # Extract issue / date from breadcrumb
        date_str = datetime.utcnow().strftime("%Y-%m-%d")
        breadcrumb = soup.find(class_=lambda c: c and any(k in c.lower() for k in ["breadcrumb", "path", "meta"]))
        if breadcrumb:
            b_text = breadcrumb.get_text(" ", strip=True)
            m = re.search(r"([^\s>]+)\s+(২০[০-৯]{2}|19[0-9]{2}|20[0-9]{2})", b_text)
            if m:
                date_str = f"{m.group(1)} {m.group(2)}"

        category = infer_category(question + " " + answer + " " + " ".join(subjects))
        tags = ["তাহরীক"] + [s for s in subjects if s] + [category.split(" ")[0]]
        unique_tags = list(dict.fromkeys(tags))
        scholar = "ড. মুহাম্মাদ আসাদুল্লাহ আল-গালিব"
        sha256_hash = compute_fatwa_hash(question=question, answer=answer)

        return {
            "source": "at-tahreek",
            "source_url": url,
            "title": raw_title or question[:120],
            "question": question,
            "answer": answer,
            "category": category,
            "tags": unique_tags,
            "scholar": scholar,
            "published_date": date_str,
            "sha256_hash": sha256_hash,
            "scraped_at": datetime.utcnow().isoformat() + "Z",
        }

    def scrape_at_tahreek(self) -> List[Dict[str, Any]]:
        logger.info("=== Starting Live Crawl for At-Tahreek ===")
        # Category 8 holds all published Q&As in reverse chronological order
        html = self.fetch_html("https://at-tahreek.com/category_archive/8")
        if not html:
            return []

        soup = BeautifulSoup(html, "html.parser")
        seen = set()
        article_urls = []
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if "article_details" in href:
                full_url = href if href.startswith("http") else f"https://at-tahreek.com{href}"
                if full_url not in seen:
                    seen.add(full_url)
                    article_urls.append(full_url)

        logger.info(f"[At-Tahreek] Found {len(article_urls)} total articles. Checking latest issues...")
        results = []
        consecutive_known = 0
        for url in article_urls[:self.max_items]:
            item = self.parse_at_tahreek_single(url)
            if not item:
                continue

            if self.state.is_known(item["sha256_hash"]):
                consecutive_known += 1
                if consecutive_known >= 8:
                    logger.info(f"[At-Tahreek] Reached previously indexed boundary ({consecutive_known} consecutive known). Stopping early.")
                    break
                continue

            consecutive_known = 0
            results.append(item)
            if len(results) >= self.max_items:
                break

        logger.info(f"[At-Tahreek] Extracted {len(results)} new unique Fatwas.")
        return results

    def scrape_al_kawsar(self) -> List[Dict[str, Any]]:
        logger.info("=== Starting Live Crawl for Al-Kawsar ===")
        now = datetime.utcnow()
        cur_y, cur_m = now.year, now.month
        target_periods = []
        # Dynamically check current month and previous 3 months
        for _ in range(4):
            target_periods.append((str(cur_y), f"{cur_m:02d}"))
            cur_m -= 1
            if cur_m == 0:
                cur_m = 12
                cur_y -= 1

        results = []
        pages_to_check = [
            ("https://www.alkawsar.com/bn/qa/answers/", str(now.year), f"{now.month:02d}")
        ]
        for year, month in target_periods:
            pages_to_check.append((f"https://www.alkawsar.com/bn/qa/answers/?year={year}&month={month}", year, month))

        visited_urls = set()
        for page_url, year, month in pages_to_check:
            if page_url in visited_urls or len(results) >= self.max_items:
                continue
            visited_urls.add(page_url)

            html = self.fetch_html(page_url)
            if not html:
                continue
            soup = BeautifulSoup(html, "html.parser")
            items = soup.find_all("div", class_=lambda c: c and "item-list-type" in c and "fatawa" in c)
            if not items:
                items = soup.find_all("div", class_=lambda c: c and "lx-latest-news-item" in c)

            for item in items:
                h2s = item.find_all("h2")
                if not h2s:
                    continue
                questioner = normalize_text(h2s[0].get_text()) if len(h2s) >= 2 else ""
                q_num = normalize_text(h2s[1].get_text()) if len(h2s) >= 2 else normalize_text(h2s[0].get_text())

                post_texts = item.find_all("div", class_="post-text")
                question_text = normalize_text(post_texts[0].get_text()) if len(post_texts) > 0 else ""
                answer_text = normalize_text(post_texts[1].get_text()) if len(post_texts) > 1 else ""

                if not question_text and not answer_text:
                    continue

                bq = item.find("blockquote")
                if bq:
                    ref_text = normalize_text(bq.get_text())
                    if ref_text and ref_text not in answer_text:
                        answer_text = f"{answer_text}\n\nদলীল ও সূত্র:\n{ref_text}"

                link_el = item.find("a", class_="shareable-link")
                href = link_el.get("href") if link_el else ""
                full_url = f"https://www.alkawsar.com{href}" if href and href.startswith("/") else (href or page_url)

                sha256_hash = compute_fatwa_hash(question=question_text, answer=answer_text)
                if self.state.is_known(sha256_hash):
                    continue

                clean_q_snippet = question_text.split("।")[0].strip() if "।" in question_text else question_text[:90].strip()
                title = f"{q_num} {clean_q_snippet}" if clean_q_snippet else (q_num or f"আলকাউসার ফতোয়া ({year}-{month})")

                category = infer_category(question_text + " " + answer_text)
                scholar_name = f"মারকাযুদ দাওয়াহ ({questioner})" if questioner else "মারকাযুদ দাওয়াহ / আলকাউসার ফতোয়া বিভাগ"

                results.append({
                    "source": "al-kawsar",
                    "source_url": full_url,
                    "title": title,
                    "question": question_text or title,
                    "answer": answer_text,
                    "category": category,
                    "tags": [category.split(" ")[0], "আলকাউসার"],
                    "scholar": scholar_name,
                    "published_date": f"{year}-{month}-01",
                    "sha256_hash": sha256_hash,
                    "scraped_at": datetime.utcnow().isoformat() + "Z",
                })

                if len(results) >= self.max_items:
                    break

        logger.info(f"[Al-Kawsar] Extracted {len(results)} new unique Fatwas.")
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
            item["id"] = hash_to_uuid(h)
            cursor.execute("SELECT id FROM fatwas WHERE sha256_hash = ?", (h,))
            row = cursor.fetchone()
            if not row:
                uid = item["id"]
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

    def dispatch_to_api(self, items: List[Dict[str, Any]]) -> int:
        if not items or not self.api_url or not self.token:
            return 0

        logger.info(f"[API Dispatch] Sending {len(items)} items to {self.api_url}...")
        total_synced = 0
        try:
            for i in range(0, len(items), self.batch_size):
                batch = items[i:i + self.batch_size]
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.token}",
                    "x-ingest-token": self.token,
                }
                res = self.client.post(self.api_url, json={"items": batch}, headers=headers, timeout=60.0)
                if res.status_code == 200:
                    data = res.json()
                    inserted = data.get("inserted", 0)
                    total_synced += inserted
                    logger.info(f"[API Dispatch] Batch {i // self.batch_size + 1}: Inserted {inserted} items via {data.get('storage', 'api')}")
                else:
                    logger.warning(f"[API Dispatch Warning] HTTP {res.status_code}: {res.text[:200]}")
        except Exception as e:
            logger.warning(f"[API Dispatch Error]: {e}")

        return total_synced

    def run(self, sources: List[str]):
        all_items = []
        if "al-itisam" in sources or "all" in sources:
            try:
                all_items.extend(self.scrape_al_itisam())
            except Exception as e:
                logger.error(f"Error crawling Al-I'tisam: {e}")

        if "at-tahreek" in sources or "all" in sources:
            try:
                all_items.extend(self.scrape_at_tahreek())
            except Exception as e:
                logger.error(f"Error crawling At-Tahreek: {e}")

        if "al-kawsar" in sources or "all" in sources:
            try:
                all_items.extend(self.scrape_al_kawsar())
            except Exception as e:
                logger.error(f"Error crawling Al-Kawsar: {e}")

        logger.info(f"Total newly discovered items across sources: {len(all_items)}")

        if self.dry_run:
            logger.info(f"[Dry Run] Discovered {len(all_items)} items without saving.")
            return

        if self.direct_db:
            self.save_direct_to_sqlite(all_items)

        if self.api_url and self.token:
            self.dispatch_to_api(all_items)

def main():
    parser = argparse.ArgumentParser(description="Live Incremental Fatwa Scraper")
    parser.add_argument("--source", choices=["al-itisam", "at-tahreek", "al-kawsar", "all"], default="all", help="Target website")
    parser.add_argument("--max-items", type=int, default=100, help="Max items per source to crawl")
    parser.add_argument("--dry-run", action="store_true", help="Preview only")
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help="Ingestion API endpoint URL")
    parser.add_argument("--token", default=DEFAULT_TOKEN, help="Ingestion secret token")
    args = parser.parse_args()

    scraper = LiveFatwaScraper(
        api_url=args.api_url,
        token=args.token,
        max_items_per_source=args.max_items,
        dry_run=args.dry_run,
    )
    try:
        scraper.run([args.source])
    finally:
        scraper.close()

if __name__ == "__main__":
    main()
