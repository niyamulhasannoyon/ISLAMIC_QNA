# Fatwa & Islamic Q&A Incremental Monthly Scraper

A high-performance Python scraper designed to incrementally crawl and index monthly fatwa Q&As from scholarly archives:
1. **Al-I'tisam (মাসিক আল-ইতিসাম)** - https://al-itisam.com
2. **At-Tahreek (মাসিক আত-তাহরীক)** - https://at-tahreek.com
3. **Al-Kawsar (মাসিক আলকাউসার)** - https://www.alkawsar.com

## Key Features

- **Automatic Monthly Sync**: Runs automatically via GitHub Actions on the 1st and 5th of every month at 06:00 AM BD Time.
- **Incremental Crawling & Early Termination**: Pre-loads 20,000+ known SHA-256 hashes from SQLite (`data/fatwas.db`) and `scraper_state.json`. Skips existing posts instantly.
- **Dual Destination**: Writes directly to SQLite (`data/fatwas.db`) and optionally dispatches to the live Next.js Ingestion API (`/api/v1/ingest`) for MongoDB Atlas vector search.
- **Zero-Downtime Auto-Deploy**: Automatically pushes updated SQLite database to GitHub `main`, triggering seamless automatic Vercel deployment.

## Setup

```bash
cd scraper
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Running the Scraper

### Crawl All 3 Sources (Monthly New Items)
```bash
python3 incremental_scraper.py --source all --max-items 100
```

### Crawl Al-I'tisam Only
```bash
python3 incremental_scraper.py --source al-itisam --max-items 50
```

### Crawl At-Tahreek Only
```bash
python3 incremental_scraper.py --source at-tahreek --max-items 50
```

### Crawl Al-Kawsar Only
```bash
python3 incremental_scraper.py --source al-kawsar --max-items 50
```

### Dry Run (Preview without saving to DB)
```bash
python3 incremental_scraper.py --dry-run
```

## Environment Variables

- `API_URL`: Optional remote ingestion endpoint URL (e.g. `https://your-domain.vercel.app/api/v1/ingest`).
- `INGESTION_SECRET_TOKEN`: Secret Bearer token for authentication.
