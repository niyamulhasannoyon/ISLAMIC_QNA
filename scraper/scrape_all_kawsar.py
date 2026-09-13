#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Full Archive Scraper for Monthly Al-Kawsar (মাসিক আলকাউসার)
Scrapes all questions & answers from 2007 to 2026 across all monthly archives at https://www.alkawsar.com/bn/qa/answers/
Directly ingests into SQLite data/fatwas.db with SHA-256 deduplication and saves data/al_kawsar.json.
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

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("AlKawsarFullCrawler")

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 FatwaBot/2.0"

def infer_category(text: str) -> str:
    t = text.lower()
    if re.search(r"(?:সালাত|ছালাত|নামাজ|ইমাম|আযান|জানাযা|রুকূ|সিজদা|তাহাজ্জুদ|জুমুআ|বিতর|মাসবূক|রাকাআত|অযু|ওযু|ওযূ|তায়াম্মুম|তায়াম্মুম|ক্বিবলা|মসজিদ|তাহারাত|পবিত্রতা|নাপাক|গোসল)", t):
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

async def fetch_month_page(client: httpx.AsyncClient, year: str, month: str, sem: asyncio.Semaphore) -> List[Dict[str, Any]]:
    url = f"https://www.alkawsar.com/bn/qa/answers/?year={year}&month={month}"
    async with sem:
        try:
            r = await client.get(url)
            if r.status_code != 200 or len(r.text) < 1000:
                return []

            soup = BeautifulSoup(r.text, "html.parser")
            items = soup.find_all("div", class_=lambda c: c and "item-list-type" in c and "fatawa" in c)
            if not items:
                items = soup.find_all("div", class_=lambda c: c and "lx-latest-news-item" in c)

            parsed_list = []
            for item in items:
                h2s = item.find_all("h2")
                if not h2s:
                    continue

                questioner = ""
                q_num = ""
                if len(h2s) >= 2:
                    questioner = normalize_text(h2s[0].get_text())
                    q_num = normalize_text(h2s[1].get_text())
                elif len(h2s) == 1:
                    q_num = normalize_text(h2s[0].get_text())

                post_texts = item.find_all("div", class_="post-text")
                question_text = normalize_text(post_texts[0].get_text()) if len(post_texts) > 0 else ""
                answer_text = normalize_text(post_texts[1].get_text()) if len(post_texts) > 1 else ""

                if not question_text and not answer_text:
                    continue

                # Scholarly references in blockquote
                bq = item.find("blockquote")
                if bq:
                    ref_text = normalize_text(bq.get_text())
                    if ref_text and ref_text not in answer_text:
                        answer_text = f"{answer_text}\n\nদলীল ও সূত্র:\n{ref_text}"

                # Shareable link permalink
                link_el = item.find("a", class_="shareable-link")
                href = link_el.get("href") if link_el else ""
                if href:
                    full_url = f"https://www.alkawsar.com{href}" if href.startswith("/") else href
                else:
                    full_url = url

                clean_q_snippet = question_text.split("।")[0].strip() if "।" in question_text else question_text[:90].strip()
                if clean_q_snippet and len(clean_q_snippet) > 10:
                    title = f"{q_num} {clean_q_snippet}" if q_num else clean_q_snippet
                else:
                    title = f"{q_num} {question_text[:80]}" if q_num else question_text[:80]

                if not title.strip():
                    title = f"আলকাউসার ফতোয়া ({year}-{month})"

                date_str = f"{year}-{month}-01"
                category = infer_category(question_text + " " + answer_text)
                
                # Scholar attribution
                scholar_name = "মারকাযুদ দাওয়াহ / আলকাউসার ফতোয়া বিভাগ"
                if questioner:
                    scholar_name = f"মারকাযুদ দাওয়াহ ({questioner})"

                sha256_hash = compute_fatwa_hash(question=question_text, answer=answer_text)

                parsed_list.append({
                    "source": "al-kawsar",
                    "source_url": full_url,
                    "title": title,
                    "question": question_text or title,
                    "answer": answer_text,
                    "category": category,
                    "tags": [category.split(" ")[0], "আলকাউসার"],
                    "scholar": scholar_name,
                    "published_date": date_str,
                    "sha256_hash": sha256_hash,
                    "scraped_at": datetime.utcnow().isoformat(),
                })

            return parsed_list

        except Exception as e:
            logger.warning(f"Failed to fetch or parse {url}: {e}")
            return []

async def scrape_all_kawsar(concurrency: int = 15) -> List[Dict[str, Any]]:
    # 2007 through 2026
    current_year = datetime.utcnow().year
    years = [str(y) for y in range(2007, current_year + 1)]
    months = [f"{m:02d}" for m in range(1, 13)]

    logger.info(f"Starting Al-Kawsar full crawl across {len(years)} years ({years[0]} - {years[-1]}), {len(years)*12} months...")
    sem = asyncio.Semaphore(concurrency)
    all_results: List[Dict[str, Any]] = []

    async with httpx.AsyncClient(
        headers={
            "User-Agent": USER_AGENT,
            "Accept-Language": "bn,ar,en-US,en;q=0.9",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        timeout=30.0,
        verify=False,
        limits=httpx.Limits(max_connections=concurrency + 5, max_keepalive_connections=concurrency),
        follow_redirects=True,
    ) as client:
        tasks = []
        for y in years:
            for m in months:
                tasks.append((y, m, fetch_month_page(client, y, m, sem)))

        # Process in chunks of 24 months
        chunk_size = 24
        for i in range(0, len(tasks), chunk_size):
            chunk = tasks[i : i + chunk_size]
            month_labels = [f"{y}-{m}" for y, m, _ in chunk]
            logger.info(f"Fetching months: {month_labels[0]} -> {month_labels[-1]}...")
            
            chunk_results = await asyncio.gather(*[t[2] for t in chunk])
            for res_list in chunk_results:
                all_results.extend(res_list)
            
            logger.info(f"  --> Extracted {sum(len(r) for r in chunk_results)} Q&As in chunk (Total so far: {len(all_results)})")

    logger.info(f"Completed Al-Kawsar crawl! Total extracted Q&As: {len(all_results)}")
    return all_results

def save_to_database_and_json(items: List[Dict[str, Any]]):
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "fatwas.db")
    json_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "al_kawsar.json")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    inserted = 0
    skipped = 0
    seen_hashes = set()
    unique_items = []

    for item in items:
        h = item["sha256_hash"]
        if not h or h in seen_hashes:
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
                item.get("published_date", datetime.utcnow().isoformat()),
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

    logger.info(f"=== AL-KAWSAR INGESTION SUMMARY ===")
    logger.info(f"Unique Q&As scraped: {len(unique_items)}")
    logger.info(f"Inserted into SQLite: {inserted}")
    logger.info(f"Already existing in SQLite: {skipped}")
    logger.info(f"Saved full clean JSON to {json_path}")

def main():
    concurrency = 15
    if len(sys.argv) > 1:
        concurrency = int(sys.argv[1])

    items = asyncio.run(scrape_all_kawsar(concurrency=concurrency))
    save_to_database_and_json(items)

if __name__ == "__main__":
    main()
