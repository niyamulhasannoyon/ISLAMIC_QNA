#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Full Archive Scraper for Monthly At-Tahreek (মাসিক আত-তাহরীক)
Scrapes all 7,900+ scholarly questions & answers from https://at-tahreek.com/category_archive/8
Directly ingests into SQLite data/fatwas.db with SHA-256 deduplication and saves data/at_tahreek.json.
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
from normalizer import normalize_text, compute_fatwa_hash, hash_to_uuid

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("AtTahreekFullCrawler")

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 FatwaBot/2.0"

def infer_category(text: str) -> str:
    t = text.lower()
    if re.search(r"(?:সালাত|ছালাত|নামাজ|ইমাম|আযান|জানাযা|রুকূ|সিজদা|তাহাজ্জুদ|জুমুআ|বিতর|মাসবূক|রাকাআত|অযু|ওযূ|তায়াম্মুম|তায়াম্মুম|ক্বিবলা|মসজিদ)", t):
        return "সালাত (Prayer)"
    if re.search(r"(?:যাকাত|যাকাতুল|সাদাকাহ|ছাদাক্বা|ফিতরা|টাকা|অর্থসম্পদ|প্রভিডেন্ট|চুরি|দান|সম্পত্তি|উত্তরাধিকার|ওয়ারিশ|সদকা|ঋণ)", t):
        return "যাকাত ও সাদাকাহ (Zakat)"
    if re.search(r"(?:সিয়াম|রোযা|রমযান|ইফতার|সেহরী|তারাবীহ|রোজা|ছিয়াম|সাহারী|ই‘তিকাফ)", t):
        return "সিয়াম (Fasting)"
    if re.search(r"(?:হজ্জ|উমরা|কুরবানী|কোরবানি|যবেহ|পশু|হজ|আক্বীক্বা|আকিকা|যিলহজ্জ|মক্কা)", t):
        return "হজ্জ ও উমরাহ (Hajj)"
    if re.search(r"(?:বিবাহ|বিয়ে|তালাক|স্ত্রী|স্বামী|মোহর|দেনমোহর|পর্দা|চাচী|সন্তান|মেয়ে|নারী|হায়েয|নিফাস|দাম্পত্য|মাহরাম|দুধমা|অভিভাবক)", t):
        return "পারিবারিক ও বিবাহ (Family)"
    if re.search(r"(?:শিরক|কুফর|বিদআত|বিদ‘আত|তাবিজ|তাভীজ|আকীদাহ|তাওহীদ|ঈমান|জান্নাত|জাহান্নাম|নাস্তিক|কাদারিয়া|মু‘তাযিলা|জিন|শয়তান|ভাগ্য|তাক্বদীর)", t):
        return "আকীদাহ ও তাওহীদ (Creed)"
    if re.search(r"(?:হারাম|হালাল|ক্রিপ্টো|বিটকয়েন|সুদ|ব্যাংক|ব্যবসা|চাকুরি|লেনদেন|মুয়ামালাত|উপার্জন|চাঁদা|বীমা|শেয়ার|ক্রয়|বিক্রয়)", t):
        return "মুয়ামালাত ও লেনদেন (Transactions)"
    return "সাধারণ জিজ্ঞাসা (General)"

async def fetch_article_urls(client: httpx.AsyncClient) -> List[str]:
    archive_url = "https://at-tahreek.com/category_archive/8"
    logger.info(f"Fetching master Q&A article list from {archive_url}...")
    try:
        r = await client.get(archive_url)
        if r.status_code != 200:
            logger.error(f"Failed to fetch archive page: HTTP {r.status_code}")
            return []
        soup = BeautifulSoup(r.text, "html.parser")
        discovered_urls = []
        seen = set()
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if "article_details" in href:
                full_url = href if href.startswith("http") else f"https://at-tahreek.com{href}"
                if full_url not in seen:
                    seen.add(full_url)
                    discovered_urls.append(full_url)
        logger.info(f"Successfully discovered {len(discovered_urls)} unique At-Tahreek Q&A article URLs.")
        return discovered_urls
    except Exception as e:
        logger.error(f"Error fetching archive page: {e}")
        return []

async def parse_article(client: httpx.AsyncClient, url: str, sem: asyncio.Semaphore) -> Optional[Dict[str, Any]]:
    async with sem:
        for attempt in range(4):
            try:
                r = await client.get(url)
                if r.status_code != 200:
                    if attempt < 3:
                        await asyncio.sleep(0.5 * (attempt + 1))
                        continue
                    return None

                if len(r.text) < 500:
                    return None

                soup = BeautifulSoup(r.text, "html.parser")
                h = soup.find("h1") or soup.find("h2") or soup.find("h3")
                raw_title = normalize_text(h.get_text()) if h else ""

                art = soup.find("div", class_="article-details") or soup.find("div", class_="main_content_area")
                if not art:
                    return None

                # Extract and clean subjects
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

                # Extract questioner
                questioner = ""
                q_match = re.search(r"প্রশ্নকারী\s*:\s*(.*?)(?:\n|$)", full_text)
                if q_match:
                    questioner = normalize_text(q_match.group(1))

                # Parse answer body
                ans_text = full_text
                if "উত্তর" in ans_text:
                    ans_parts = re.split(r"উত্তর\s*:", ans_text, maxsplit=1)
                    if len(ans_parts) > 1:
                        ans_text = ans_parts[1].strip()

                if questioner and "প্রশ্নকারী" in ans_text:
                    ans_text = re.split(r"প্রশ্নকারী\s*:", ans_text)[0].strip()

                answer = normalize_text(ans_text)
                if not answer or len(answer) < 10:
                    return None

                # Clean question
                clean_q = re.sub(r"^প্রশ্ন\s*\([^\)]*\)\s*:\s*", "", raw_title).strip()
                question = normalize_text(clean_q) if clean_q else raw_title
                if not question:
                    question = raw_title

                # Extract issue / date
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
            except Exception:
                if attempt < 3:
                    await asyncio.sleep(0.5 * (attempt + 1))
                else:
                    return None
        return None

async def scrape_all_tahreek(concurrency: int = 25) -> List[Dict[str, Any]]:
    headers = {"User-Agent": USER_AGENT}
    sem = asyncio.Semaphore(concurrency)
    limits = httpx.Limits(max_connections=concurrency + 5, max_keepalive_connections=15)
    timeout = httpx.Timeout(20.0, connect=10.0)

    results = []
    async with httpx.AsyncClient(headers=headers, timeout=timeout, limits=limits, verify=False, follow_redirects=True) as client:
        urls = await fetch_article_urls(client)
        if not urls:
            logger.error("No URLs found to scrape.")
            return []

        total = len(urls)
        logger.info(f"Starting async full scrape for At-Tahreek ({total} articles, concurrency={concurrency})...")

        batch_size = 400
        for i in range(0, total, batch_size):
            chunk = urls[i:i + batch_size]
            logger.info(f"Crawling articles {i+1} -> {min(i+batch_size, total)} of {total}...")
            tasks = [parse_article(client, u, sem) for u in chunk]
            batch_results = await asyncio.gather(*tasks)
            valid_batch = [item for item in batch_results if item is not None]
            results.extend(valid_batch)
            logger.info(f"  --> Extracted {len(valid_batch)} valid Fatwas in batch (Total so far: {len(results)})")

    logger.info(f"Completed! Total valid Fatwas extracted: {len(results)}")
    return results

def save_to_database_and_json(items: List[Dict[str, Any]]):
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "fatwas.db")
    json_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "at_tahreek.json")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    inserted = 0
    skipped = 0
    seen_hashes = set()
    unique_items = []

    for item in items:
        h = item["sha256_hash"]
        if h in seen_hashes:
            continue
        seen_hashes.add(h)
        item["id"] = hash_to_uuid(h)
        unique_items.append(item)

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
    concurrency = 25
    if len(sys.argv) > 1:
        concurrency = int(sys.argv[1])

    items = asyncio.run(scrape_all_tahreek(concurrency=concurrency))
    save_to_database_and_json(items)

if __name__ == "__main__":
    main()
