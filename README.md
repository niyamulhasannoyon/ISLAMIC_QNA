# Fatwa & Islamic Q&A Search Platform

A clean, minimalist, lightning-fast search engine aggregating and indexing Islamic Q&As and Fatwas from authentic sources such as **Al-I'tisam** and **At-Tahreek**.

Built with Next.js (App Router), TypeScript, Tailwind CSS, Lucide icons, Shadcn UI styling, SQLite with WAL mode, and MiniSearch with fuzzy matching.

---

## Key Features

1. **Unified Data Layer**:
   - Standardized TypeScript Q&A model (`id`, `source`, `source_url`, `title`, `question`, `answer`, `category`, `tags`, `hash`, `createdAt`).
   - SQLite persistent storage with WAL mode and ACID guarantees.
   - Cryptographic SHA-256 deduplication hash guaranteeing idempotent upserts.

2. **Search & Retrieval**:
   - Debounced, sub-millisecond search API endpoint (`/api/v1/search`).
   - Unicode-aware full-text search supporting Bengali, Arabic, and English scripts.
   - Fuzzy matching (Levenshtein distance tolerance for spelling variations and transliterations).
   - Dynamic snippet extraction with `<mark>` keyword highlighting.
   - Source and Category facet filtering and pagination.

3. **Minimalist UI (Perplexity / Linear style)**:
   - Centered search input with instant results dropdown/list.
   - Global keyboard shortcuts: `⌘K` or `/` to focus, `Esc` to clear.
   - Filter chips for Sources ("All", "Al-I'tisam", "At-Tahreek") and Categories with live count badges.
   - Expandable accordion cards and dedicated Reader Modal with high-readability Bengali/Arabic typography.
   - One-click copy-link button for shareable deep links (`?id=...`).
   - Full dark mode and light mode support.

4. **Incremental Python Scraper**:
   - `httpx` + `BeautifulSoup4` incremental crawler.
   - Terminate pagination early as soon as known posts are reached.
   - Batch ingestion to `/api/v1/ingest` with Bearer token authentication.

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `INGESTION_SECRET_TOKEN` | Bearer token required for `/api/v1/ingest` | `super_secure_fatwa_ingest_token_change_me_in_prod` |
| `DATABASE_PATH` | Path to SQLite database file | `./data/fatwas.db` |
| `NEXT_PUBLIC_APP_URL` | Base application URL | `http://localhost:3000` |

### 3. Seed Initial Database

Populate the database with verified sample fatwas:

```bash
npm run seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Documentation

### 1. Ingestion Endpoint: `POST /api/v1/ingest`

Protected by Bearer token or `x-ingest-token` header.

**Headers:**
```http
Authorization: Bearer <INGESTION_SECRET_TOKEN>
Content-Type: application/json
```

**Payload:**
```json
{
  "items": [
    {
      "source": "Al-I'tisam",
      "source_url": "https://al-itisam.com/fatwa/example",
      "title": "Question Title",
      "question": "Full question text",
      "answer": "Detailed answer text",
      "category": "সালাত (Prayer)",
      "tags": ["সালাত", "জামায়াত"],
      "createdAt": "2024-03-15T10:00:00Z"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "inserted": 1,
  "updated": 0,
  "skipped": 0,
  "total": 1,
  "message": "Processed 1 items (inserted: 1, updated: 0, skipped: 0)"
}
```

### 2. Search Endpoint: `GET /api/v1/search`

**Query Parameters:**
- `q` (string): Search query text (e.g. `সালাত`, `ইনহেলার`, `যাকাত`).
- `source` (string): Filter by source name (e.g. `Al-I'tisam`, `At-Tahreek`).
- `category` (string): Filter by category.
- `page` (integer): Page number (default: `1`).
- `limit` (integer): Number of items per page (default: `10`).

**Sample Response:**
```json
{
  "results": [
    {
      "id": "7bb74497-821b-4f87-ab06-0d62ad45d3d0",
      "source": "Al-I'tisam",
      "title": "বিদআতী বা ফাসেক ইমামের পিছনে সালাত আদায় করার বিধান কি?",
      "snippet": "...তার পিছনে <mark>সালাত</mark> আদায় করা বিশুদ্ধ...",
      "score": 4.5,
      "category": "সালাত (Prayer)",
      "tags": ["ইমামতি", "সালাত", "বিদআত"]
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "tookMs": 1.2,
  "facets": {
    "sources": [{ "name": "Al-I'tisam", "count": 4 }, { "name": "At-Tahreek", "count": 4 }],
    "categories": [{ "name": "সালাত (Prayer)", "count": 3 }]
  }
}
```

### 3. Single Fatwa Lookup: `GET /api/v1/fatwa/:id`

Returns the complete record for a given Fatwa ID.

---

## Python Incremental Scraper

Located in `scraper/`.

```bash
cd scraper
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run crawler with incremental pagination
python3 incremental_scraper.py --source all --max-pages 5
```
# ISLAMIC_QNA
