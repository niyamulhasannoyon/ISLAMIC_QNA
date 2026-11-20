#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Source Site DOM Structure & Anomaly Monitor
===========================================
Detects breaking layout, CMS, or CSS selector changes across source fatwa portals:
  - Al-I'tisam (https://al-itisam.com)
  - At-Tahreek (https://at-tahreek.com)
  - Al-Kawsar (https://www.alkawsar.com)

Prevents silent scraper degradation and database corruption.
Fails with exit code 2 when structural anomalies are detected.
"""

import os
import sys
import json
import logging
from typing import Dict, Any, List, Optional
import httpx
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("StructureMonitor")

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 FatwaHealthCheck/2.0"
WEBHOOK_URL = os.getenv("ALERT_WEBHOOK_URL", "")

class StructureMonitor:
    def __init__(self, timeout: float = 20.0):
        self.client = httpx.Client(
            headers={
                "User-Agent": USER_AGENT,
                "Accept-Language": "bn,en;q=0.9",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            timeout=timeout,
            follow_redirects=True,
            verify=False,
        )

    def close(self):
        self.client.close()

    def check_al_itisam(self) -> Dict[str, Any]:
        url = "https://al-itisam.com/question-answers"
        result = {
            "source": "al-itisam",
            "url": url,
            "status": "PASS",
            "http_status": None,
            "issues": [],
            "discovered_links": 0,
        }
        try:
            resp = self.client.get(url)
            result["http_status"] = resp.status_code
            if resp.status_code != 200:
                result["status"] = "WARN"
                result["issues"].append(f"HTTP status returned {resp.status_code}")
                return result

            soup = BeautifulSoup(resp.text, "html.parser")

            # Check 1: Magazine dropdown
            select_el = soup.find("select", attrs={"name": "magazine_id"})
            if not select_el:
                result["issues"].append("Missing magazine dropdown selector: select[name='magazine_id']")

            # Check 2: Article Links
            links = []
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if "view_question_answer" in href or "article_details" in href:
                    links.append(href)

            result["discovered_links"] = len(links)
            if len(links) == 0:
                result["status"] = "FAIL"
                result["issues"].append("Zero question/answer links discovered on landing page (selector mismatch)")
            else:
                # Sample 1 item structure
                sample_url = links[0] if links[0].startswith("http") else f"https://al-itisam.com{links[0]}"
                sample_resp = self.client.get(sample_url)
                if sample_resp.status_code == 200:
                    sample_soup = BeautifulSoup(sample_resp.text, "html.parser")
                    title = sample_soup.find("h1") or sample_soup.find("h2") or sample_soup.find("h3")
                    body = sample_soup.find("div", class_=lambda c: c and any(k in c.lower() for k in ["content", "detail", "desc", "answer", "body", "article"]))
                    if not title:
                        result["issues"].append("Sample item has missing title heading (h1/h2/h3)")
                    if not body:
                        result["issues"].append("Sample item has missing content body container")

            if result["issues"] and result["status"] != "FAIL":
                result["status"] = "WARN"

        except Exception as e:
            result["status"] = "ERROR"
            result["issues"].append(f"Connection error: {str(e)}")

        return result

    def check_at_tahreek(self) -> Dict[str, Any]:
        url = "https://at-tahreek.com/category_archive/8"
        result = {
            "source": "at-tahreek",
            "url": url,
            "status": "PASS",
            "http_status": None,
            "issues": [],
            "discovered_links": 0,
        }
        try:
            resp = self.client.get(url)
            result["http_status"] = resp.status_code
            if resp.status_code != 200:
                result["status"] = "WARN"
                result["issues"].append(f"HTTP status returned {resp.status_code}")
                return result

            soup = BeautifulSoup(resp.text, "html.parser")

            # Check article links
            links = []
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if "article_details" in href or "/article/" in href:
                    links.append(href)

            result["discovered_links"] = len(links)
            if len(links) == 0:
                result["status"] = "FAIL"
                result["issues"].append("Zero article links found matching 'article_details' pattern on category archive")
            else:
                sample_url = links[0] if links[0].startswith("http") else f"https://at-tahreek.com{links[0]}"
                sample_resp = self.client.get(sample_url)
                if sample_resp.status_code == 200:
                    sample_soup = BeautifulSoup(sample_resp.text, "html.parser")
                    h = sample_soup.find("h1") or sample_soup.find("h2") or sample_soup.find("h3")
                    art = sample_soup.find("div", class_="article-details") or sample_soup.find("div", class_="main_content_area")
                    if not h:
                        result["issues"].append("At-Tahreek sample article missing headline h1/h2")
                    if not art:
                        result["issues"].append("At-Tahreek sample article missing content container (.article-details / .main_content_area)")

            if result["issues"] and result["status"] != "FAIL":
                result["status"] = "WARN"

        except Exception as e:
            result["status"] = "ERROR"
            result["issues"].append(f"Connection error: {str(e)}")

        return result

    def check_al_kawsar(self) -> Dict[str, Any]:
        url = "https://www.alkawsar.com/bn/qa/answers/"
        result = {
            "source": "al-kawsar",
            "url": url,
            "status": "PASS",
            "http_status": None,
            "issues": [],
            "discovered_links": 0,
        }
        try:
            resp = self.client.get(url)
            result["http_status"] = resp.status_code
            if resp.status_code != 200:
                result["status"] = "WARN"
                result["issues"].append(f"HTTP status returned {resp.status_code}")
                return result

            soup = BeautifulSoup(resp.text, "html.parser")
            links = []
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if "answers/detail" in href or "/qa/" in href:
                    links.append(href)

            result["discovered_links"] = len(links)
            if len(links) == 0:
                result["status"] = "WARN"
                result["issues"].append("Zero article links found on Al-Kawsar answers archive page")

        except Exception as e:
            result["status"] = "ERROR"
            result["issues"].append(f"Connection error: {str(e)}")

        return result

    def run_all_checks(self) -> Dict[str, Any]:
        logger.info("Executing source portal layout & structure canaries...")
        checks = [
            self.check_al_itisam(),
            self.check_at_tahreek(),
            self.check_al_kawsar(),
        ]

        has_critical_fail = any(c["status"] == "FAIL" for c in checks)
        has_warnings = any(c["status"] in ["WARN", "ERROR"] for c in checks)

        overall_status = "CRITICAL_STRUCTURE_CHANGED" if has_critical_fail else ("DEGRADED" if has_warnings else "HEALTHY")

        summary = {
            "overall_status": overall_status,
            "has_critical_fail": has_critical_fail,
            "results": checks,
        }

        # Send alert if webhook configured and anomalies detected
        if has_critical_fail and WEBHOOK_URL:
            self.send_alert_webhook(summary)

        return summary

    def send_alert_webhook(self, summary: Dict[str, Any]):
        try:
            msg = f"🚨 **CRITICAL: Scraper DOM Structure Change Detected!**\n\n"
            for r in summary["results"]:
                if r["status"] == "FAIL":
                    msg += f"• **{r['source']}**: {', '.join(r['issues'])}\n"
            httpx.post(WEBHOOK_URL, json={"content": msg}, timeout=10.0)
            logger.info("Alert dispatched to webhook successfully.")
        except Exception as e:
            logger.warning(f"Failed to dispatch webhook alert: {e}")

def main():
    monitor = StructureMonitor()
    try:
        summary = monitor.run_all_checks()
        print(json.dumps(summary, indent=2, ensure_ascii=False))

        if summary["has_critical_fail"]:
            logger.error("❌ Critical structure changes detected! Halting automated crawler pipeline.")
            sys.exit(2)
        else:
            logger.info(f"✅ Source portal checks complete. Overall status: {summary['overall_status']}")
            sys.exit(0)
    finally:
        monitor.close()

if __name__ == "__main__":
    main()
