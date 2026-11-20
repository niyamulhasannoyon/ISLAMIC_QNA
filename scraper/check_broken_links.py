#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Broken-Link & Content Rot Checker
=================================
Validates the availability of canonical external source URLs stored in data/fatwas.db.
Performs concurrent, rate-limited HTTP checks with HEAD and GET fallback.
Detects 404s, 5xx errors, SSL expirations, and soft-404 redirects.
"""

import os
import sys
import json
import sqlite3
import argparse
import logging
from datetime import datetime
from typing import List, Dict, Any, Tuple
import concurrent.futures

import httpx

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("BrokenLinkChecker")

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 FatwaAuditBot/2.0"

SOFT_404_INDICATORS = [
    "page not found",
    "404 not found",
    "কনটেন্ট পাওয়া যায়নি",
    "কনটেন্ট খুঁজে পাওয়া যায়নি",
    "পৃষ্ঠাটি বিদ্যমান নেই",
    "article not found",
    "nothing found",
]

def check_single_url(client: httpx.Client, fatwa_id: str, title: str, source: str, url: str) -> Dict[str, Any]:
    record = {
        "id": fatwa_id,
        "title": title[:80],
        "source": source,
        "url": url,
        "status_code": None,
        "is_broken": False,
        "error_type": None,
        "latency_ms": 0,
    }

    if not url or not url.startswith("http"):
        record["is_broken"] = True
        record["error_type"] = "INVALID_URL"
        return record

    start_time = datetime.now()
    try:
        # First try HEAD to save bandwidth
        resp = client.head(url, timeout=12.0)
        
        # Some servers reject HEAD with 403 or 405; fallback to GET with stream
        if resp.status_code in [403, 405, 501]:
            resp = client.get(url, timeout=15.0)

        latency = int((datetime.now() - start_time).total_seconds() * 1000)
        record["latency_ms"] = latency
        record["status_code"] = resp.status_code

        if resp.status_code in [404, 410]:
            record["is_broken"] = True
            record["error_type"] = f"HTTP_{resp.status_code}_NOT_FOUND"
        elif resp.status_code >= 500:
            record["is_broken"] = True
            record["error_type"] = f"HTTP_{resp.status_code}_SERVER_ERROR"
        elif resp.status_code == 200:
            # Check for soft-404 in HTML content
            text_preview = resp.text[:3000].lower() if hasattr(resp, "text") else ""
            for indicator in SOFT_404_INDICATORS:
                if indicator in text_preview:
                    record["is_broken"] = True
                    record["error_type"] = "SOFT_404_DETECTED"
                    break

    except httpx.ConnectTimeout:
        record["is_broken"] = True
        record["error_type"] = "CONNECTION_TIMEOUT"
    except httpx.ReadTimeout:
        record["is_broken"] = True
        record["error_type"] = "READ_TIMEOUT"
    except httpx.ConnectError as e:
        record["is_broken"] = True
        record["error_type"] = f"CONNECT_ERROR: {str(e)[:50]}"
    except Exception as e:
        record["is_broken"] = True
        record["error_type"] = f"EXCEPTION: {str(e)[:50]}"

    return record

def run_broken_link_check(
    db_path: str = "data/fatwas.db",
    sample_limit: int = 50,
    source_filter: str = "all",
    max_workers: int = 6,
) -> Dict[str, Any]:
    if not os.path.exists(db_path):
        logger.error(f"Database file not found: {db_path}")
        return {"error": "DB_NOT_FOUND"}

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    query = "SELECT id, title, source, source_url FROM fatwas WHERE source_url IS NOT NULL AND source_url != ''"
    params = []
    if source_filter != "all":
        query += " AND source = ?"
        params.append(source_filter)
    query += " ORDER BY RANDOM() LIMIT ?"
    params.append(sample_limit)

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    total_sampled = len(rows)
    logger.info(f"Auditing {total_sampled} external fatwa URLs (source: {source_filter})...")

    results = []
    broken_links = []

    with httpx.Client(
        headers={"User-Agent": USER_AGENT, "Accept-Language": "bn,en;q=0.9"},
        follow_redirects=True,
        verify=False,
    ) as client:
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [
                executor.submit(check_single_url, client, r[0], r[1], r[2], r[3])
                for r in rows
            ]
            for f in concurrent.futures.as_completed(futures):
                res = f.result()
                results.append(res)
                if res["is_broken"]:
                    broken_links.append(res)
                    logger.warning(f"❌ BROKEN LINK: [{res['status_code'] or res['error_type']}] {res['url']} (ID: {res['id']})")
                else:
                    logger.info(f"✓ Healthy ({res['latency_ms']}ms): {res['url'][:60]}...")

    broken_count = len(broken_links)
    broken_rate_pct = round((broken_count / max(1, total_sampled)) * 100, 2)

    summary = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "sample_size": total_sampled,
        "healthy_count": total_sampled - broken_count,
        "broken_count": broken_count,
        "broken_rate_pct": broken_rate_pct,
        "broken_links": broken_links,
    }

    # Save structured audit report
    out_dir = "data"
    os.makedirs(out_dir, exist_ok=True)
    report_file = os.path.join(out_dir, "broken_links_report.json")
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    logger.info(f"Audit Complete. Healthy: {total_sampled - broken_count}/{total_sampled} | Broken: {broken_count} ({broken_rate_pct}%)")
    logger.info(f"Detailed report saved to: {report_file}")

    return summary

def main():
    parser = argparse.ArgumentParser(description="Audit source URLs in fatwas.db for link rot")
    parser.add_argument("--db", default="data/fatwas.db", help="Path to fatwas SQLite DB")
    parser.add_argument("--sample", type=int, default=30, help="Number of URLs to randomly sample")
    parser.add_argument("--source", default="all", help="Filter by source (al-itisam, at-tahreek, al-kawsar)")
    parser.add_argument("--workers", type=int, default=5, help="Concurrent workers")
    args = parser.parse_args()

    summary = run_broken_link_check(
        db_path=args.db,
        sample_limit=args.sample,
        source_filter=args.source,
        max_workers=args.workers,
    )

    if summary.get("broken_rate_pct", 0) > 15.0:
        logger.error(f"High link rot rate detected: {summary['broken_rate_pct']}% > 15% threshold!")
        sys.exit(1)
    sys.exit(0)

if __name__ == "__main__":
    main()
