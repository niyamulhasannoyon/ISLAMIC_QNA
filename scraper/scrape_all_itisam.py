#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Full Archive Scraper for Al-I'tisam (আল-ইতিসাম)
Scrapes all published questions & answers across ID range 1 to 7350 using high-concurrency async I/O.
Directly ingests into SQLite data/fatwas.db with SHA-256 deduplication and saves data/al_itisam.json.
"""

import os
import sys
import re
import json
import sqlite3
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

import httpx
from bs4 import BeautifulSoup

# Ensure local imports work reliably
sys.path.insert(0, os.path.dirname(__file__))
from normalizer import normalize_text, compute_fatwa_hash
from state_manager import StateManager

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("AlItisamFullCrawler")

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 FatwaBot/2.0"

def infer_category(text: str) -> str:
    t = text.lower()
    if re.search(r"(?:সালাত|ছালাত|নামাজ|ইমাম|আযান|জানাযা|রুকূ|সিজদা|তাহাজ্জুদ|জুমুআ|বিতর|মাসবূক|রাকাআত)", t):
        return "সালাত (Prayer)"
    if re.search(r"(?:যাকাত|যাকাতুল|সাদাকাহ|ছাদাক্বা|ফিতরা|টাকা|অর্থসম্পদ|প্রভিডেন্ট|চুরি|দান|সম্পত্তি)", t):
        return "যাকাত ও সাদাকাহ (Zakat)"
    if re.search(r"(?:সিয়াম|রোযা|রমযান|ইফতার|সেহরী|তারাবীহ|রোজা|ছিয়াম|সাহারী)", t):
        return "সিয়াম (Fasting)"
    if re.search(r"(?:হজ্জ|উমরা|কুরবানী|কোরবানি|যবেহ|পশু|হজ)", t):
        return "হজ্জ ও উমরাহ (Hajj)"
    if re.search(r"(?:বিবাহ|বিয়ে|তালাক|স্ত্রী|স্বামী|মোহর|দেনমোহর|পর্দা|চাচী|সন্তান|মেয়ে|নারী)", t):
        return "পারিবারিক ও বিবাহ (Family)"
    if re.search(r"(?:শিরক|কুফর|বিদআত|বিদ‘আত|তাবিজ|তাভীজ|আকীদাহ|তাওহীদ|ঈমান|জান্নাত|জাহান্নাম|নাস্তিক|কাদারিয়া|মু‘তাযিলা)", t):
        return "আকীদাহ ও তাওহীদ (Creed)"
    if re.search(r"(?:হারাম|হালাল|ক্রিপ্টো|বিটকয়েন|সুদ|ব্যাংক|ব্যবসা|চাকুরি|লেনদেন|মুয়ামালাত|উপর্জন)", t):
        return "মুয়ামালাত ও লেনদেন (Transactions)"
    return "সাধারণ জিজ্ঞাসা (General)"

async def fetch_and_parse(client: httpx.AsyncClient, q_id: int, sem: asyncio.Semaphore) -> Optional[Dict[str, Any]]:
    url = f"https://al-itisam.com/view_question_answer/{q_id}"
    async with sem:
        try:
            r = await client.get(url)
            if r.status_code != 200 or len(r.text) < 1500:
                return None

            soup = BeautifulSoup(r.text, "html.parser")
            h1 = soup.find("h1") or soup.find("h2") or soup.find("h3")
            title = normalize_text(h1.get_text()) if h1 else ""

            # Check if this is a genuine question page
            if not title or "নিবরাস" in title or title.isdigit() or len(title) < 5:
                return None

            body_el = soup.find("div", class_=lambda c: c and any(k in c.lower() for k in ["content", "detail", "desc", "answer", "body", "article"]))
            full_text = normalize_text(body_el.get_text()) if body_el else ""

            if not full_text or len(full_text) < 15:
                return None

            question = title
            answer = full_text

            if "উত্তর:" in full_text or "উত্তরঃ" in full_text:
                parts = full_text.replace("উত্তরঃ", "উত্তর:").split("উত্তর:")
                if len(parts) >= 2:
                    q_part = normalize_text(parts[0].replace("প্রশ্ন:", "").replace("প্রশ্ন", ""))
                    if q_part and len(q_part) > 5:
                        question = q_part
                    answer = normalize_text(parts[1])

            if not answer or answer == question:
                return None

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
        except Exception:
            return None

async def scrape_range(start_id: int, end_id: int, concurrency: int = 35) -> List[Dict[str, Any]]:
    logger.info(f"Starting async full scrape for Al-I'tisam across ID range {start_id} to {end_id} (concurrency={concurrency})...")
    headers = {"User-Agent": USER_AGENT}
    sem = asyncio.Semaphore(concurrency)
    limits = httpx.Limits(max_connections=concurrency + 10, max_keepalive_connections=20)
    timeout = httpx.Timeout(12.0, connect=8.0)

    results = []
    async with httpx.AsyncClient(headers=headers, timeout=timeout, limits=limits, verify=False, follow_redirects=True) as client:
        # Process in batches of 500 for logging progress
        batch_size = 500
        for b_start in range(start_id, end_id + 1, batch_size):
            b_end = min(b_start + batch_size - 1, end_id)
            logger.info(f"Crawling IDs {b_start} -> {b_end}...")
            tasks = [fetch_and_parse(client, q_id, sem) for q_id in range(b_start, b_end + 1)]
            batch_results = await asyncio.gather(*tasks)
            valid_batch = [item for item in batch_results if item is not None]
            results.extend(valid_batch)
            logger.info(f"  --> Extracted {len(valid_batch)} valid Fatwas in batch (Total so far: {len(results)})")

    logger.info(f"Completed! Total valid Fatwas extracted: {len(results)}")
    return results

def save_to_database_and_json(items: List[Dict[str, Any]]):
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "fatwas.db")
    json_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "al_itisam.json")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    inserted = 0
    updated = 0
    skipped = 0
    seen_hashes = set()
    unique_items = []

    for item in items:
        h = item["sha256_hash"]
        if h in seen_hashes:
            continue
        seen_hashes.add(h)
        unique_items.append(item)

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
        else:
            skipped += 1

    conn.commit()
    conn.close()

    # Save clean deduplicated JSON
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(unique_items, f, ensure_ascii=False, indent=2)

    logger.info(f"=== INGESTION SUMMARY ===")
    logger.info(f"Unique Fatwas: {len(unique_items)}")
    logger.info(f"Inserted into SQLite: {inserted}")
    logger.info(f"Already existing in SQLite: {skipped}")
    logger.info(f"Saved full clean JSON to {json_path}")

def main():
    start_id = 1
    end_id = 7350
    if len(sys.argv) > 2:
        start_id = int(sys.argv[1])
        end_id = int(sys.argv[2])

    items = asyncio.run(scrape_range(start_id, end_id, concurrency=40))
    save_to_database_and_json(items)

if __name__ == "__main__":
    main()
