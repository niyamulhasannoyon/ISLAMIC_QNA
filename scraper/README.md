# Fatwa & Islamic Q&A Incremental Scraper

A high-performance Python scraper designed to incrementally crawl and index fatwa Q&As from sites like **Al-I'tisam** and **At-Tahreek**.

## Key Features

- **Incremental Crawling**: Persists known SHA-256 hashes in `scraper_state.json`. Once an already-indexed post is encountered during pagination, the crawler terminates immediately to prevent redundant network requests.
- **Cryptographic Idempotency**: Pre-computes normalized SHA-256 content hashes (`source + title + question`) that guarantee deduplication on the backend.
- **Batch Dispatches**: Buffers newly discovered Q&As and dispatches them in atomic batches to `/api/v1/ingest` with Bearer authentication.
- **Unicode Resilience**: Handles Bengali and Arabic typography with NFC Unicode normalization and whitespace sanitization.

## Setup

```bash
cd scraper
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Quick Start: Seed Database

Populate your local search engine immediately with verified fatwa records:

```bash
python3 seed_data.py
```

## Running Incremental Crawlers

### Crawl All Sources
```bash
python3 incremental_scraper.py --source all --max-pages 5 --batch-size 20
```

### Crawl Al-I'tisam Only
```bash
python3 incremental_scraper.py --source al-itisam --max-pages 3
```

### Crawl At-Tahreek Only
```bash
python3 incremental_scraper.py --source at-tahreek --max-pages 3
```

### Dry Run (Preview without sending to Ingestion API)
```bash
python3 incremental_scraper.py --dry-run
```

## Environment Variables

- `API_URL`: The ingestion endpoint URL (default: `http://localhost:3000/api/v1/ingest`).
- `INGESTION_SECRET_TOKEN`: Secret Bearer token for authentication.
