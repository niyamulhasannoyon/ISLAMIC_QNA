# Deen QnA — Production Operations Runbook

**Service Name**: Deen QnA (ইসলামিক ফতোয়া ও গবেষণা ডিজিটাল আর্কাইভ)  
**Classification**: Production-grade Web Application & Search Engine  
**Version**: 0.1.0  
**Repository Architecture**: Turborepo Monorepo (`apps/web`, `packages/text-utils`, `packages/api-client`, `packages/config`)  
**Stack**: Next.js 14.2 (App Router), Node.js 20, SQLite (WAL mode) / PostgreSQL / MongoDB Atlas, MiniSearch, TailwindCSS  
**Maintainer**: Web Engineering / SRE Team  

---

## 1. System Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │             Edge CDN (Vercel / Cloudflare)    │
                      │   - Edge Caching (s-maxage=60, SWR=300)       │
                      │   - ISR Pages (revalidate=86400, 24h)         │
                      └──────────────────────┬───────────────────────┘
                                             │
                      ┌──────────────────────▼───────────────────────┐
                      │             Next.js 14 App Router             │
                      │   - Security Headers (CSP, HSTS, DENY)        │
                      │   - BiDi Arabic (RTL) / Bengali (LTR) engine │
                      │   - JSON-LD QAPage / FAQPage Schema           │
                      └──────────────┬────────────────┬──────────────┘
                                     │                │
            ┌────────────────────────▼─┐            ┌─▼────────────────────────┐
            │       Search Engine      │            │       Database Tier      │
            │  - MiniSearch (Lexical)  │            │  - SQLite (WAL mode)     │
            │  - Vector / RAG Fallback │            │  - MongoDB Atlas (Embed) │
            │  - BiDi Token Normalizer │            │  - search_logs (Zero res)│
            └──────────────────────────┘            └──────────────────────────┘
```

- **Web Application (`apps/web`)**: Next.js 14 App Router with standalone output, SSR/ISR caching, and strict TypeScript.
- **Search Engine**: Multi-tier hybrid search with BM25 lexical ranking, prefix matching, Bengali/Arabic text normalization, and Reciprocal Rank Fusion (RRF).
- **Caching**:
  - Search API (`/api/search`, `/api/v1/search`): `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.
  - Static Pages (`/sources`, `/contact`, `/privacy`, `/terms`): Prerendered static (`○`).
  - Fatwa Detail Pages (`/fatwa/[id]-[slug]`): Incremental Static Regeneration (ISR) with 24h CDN revalidation (`revalidate = 86400`).

---

## 2. Health Checks & Observability

### 2.1 Health Check Endpoints
- **Public Health Endpoint**: `GET /api/health`
- **API v1 Health Endpoint**: `GET /api/v1/health`

**Expected Response (HTTP 200)**:
```json
{
  "status": "ok",
  "timestamp": "2026-11-21T02:45:50.000Z",
  "uptime": 1420.5,
  "version": "0.1.0",
  "database": {
    "status": "healthy",
    "totalFatwas": 3450,
    "responseTimeMs": 1.2
  },
  "checks": {
    "api": "ok",
    "database": "healthy"
  }
}
```
*HTTP 503 is returned if the database connection fails or drops below operational thresholds.*

### 2.2 Observability & Zero-Result Search Queries
Search analytics records queries yielding zero results to identify content gaps and missing synonyms without violating user privacy:
- **Table**: `search_logs`
- **Data Privacy Guarantee**: 
  - `query_hash`: SHA-256 hash of the normalized query.
  - `anonymous_session_hash`: SHA-256 salted hash of the user session (never contains raw IP or personal information).
- **Inspection Query**:
```sql
SELECT query, COUNT(*) as frequency, MAX(created_at) as last_queried
FROM search_logs
WHERE result_count = 0
GROUP BY query_hash
ORDER BY frequency DESC
LIMIT 50;
```

### 2.3 Sentry & Error Tracking
- Integrated via `apps/web/src/lib/observability/sentry.ts`.
- Captures unhandled runtime errors in `apps/web/src/app/error.tsx`.
- Automatically scrubs sensitive data (passwords, tokens, credentials, PII) before transmission.

---

## 3. Security Architecture & Operations

### 3.1 HTTP Security Headers
Configured in `apps/web/next.config.mjs` and enforced across all routes:
- **Strict-Transport-Security (HSTS)**: `max-age=63072000; includeSubDomains; preload`
- **X-Frame-Options**: `DENY` (prevents clickjacking)
- **X-Content-Type-Options**: `nosniff` (prevents MIME sniffing)
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **Permissions-Policy**: `camera=(), microphone=(), geolocation=(), browsing-topics=()`
- **Content-Security-Policy (CSP)**: Strict origin whitelisting with script execution controls.

### 3.2 SSRF & Ingestion Hardening
All inbound fatwa ingestion records (`/api/v1/ingest`) pass through `isSafePublicUrl`:
- Blocks loopback (`127.0.0.0/8`, `::1`, `localhost`).
- Blocks AWS/GCP/Azure cloud metadata IP (`169.254.169.254`, `metadata.google.internal`).
- Blocks RFC 1918 private IPv4 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
- Batch size limit enforced: `MAX_INGEST_BATCH_SIZE = 500`.

### 3.3 Output Sanitization & SafeHighlight
- All raw search result snippets render via `<SafeHighlight />` (`apps/web/src/components/SafeHighlight.tsx`).
- Strips all HTML except authorized `<mark>` highlighting tags.
- Disallows `dangerouslySetInnerHTML` across user-facing search and fatwa cards.
- Structured data rendered with `serializeJsonLd()` to prevent script-breakout XSS.

### 3.4 Secret Rotation Procedures
When rotating credentials:
1. **`AUTH_SECRET`**:
   - Generate high-entropy 256-bit secret: `openssl rand -hex 32`.
   - Update in hosting environment variables (`vercel env add AUTH_SECRET`).
   - Invalidate existing active admin sessions: `DELETE FROM admin_sessions WHERE created_at < datetime('now');`.
2. **`INGESTION_SECRET_TOKEN`**:
   - Generate new bearer token: `openssl rand -base64 36`.
   - Update both ingestion crawler (`scraper/incremental_scraper.py`) and Next.js web app.
   - Verified in constant-time via `crypto.timingSafeEqual`.

---

## 4. Performance & Core Web Vitals Targets

| Metric | Target | Optimization Strategy |
| :--- | :--- | :--- |
| **LCP (Largest Contentful Paint)** | `< 2.5s` | Next.js server font preloading (`next/font/google`), zero external Google Fonts blocking links, edge caching |
| **CLS (Cumulative Layout Shift)** | `< 0.1` | Static dimension reservations on cards, font fallback metrics matching, CSS font variables |
| **INP (Interaction to Next Paint)** | `< 200ms` | Debounced search queries (180ms), lightweight DOM tree, virtualization on long listings |
| **First Load JS** | `< 100 kB` | Shared bundle is 87.3 kB; modular imports with `@repo/text-utils` |

### 4.1 Bengali & Arabic Subsetting
Fonts are configured in `apps/web/src/app/layout.tsx`:
- Latin: `Inter`
- Bengali: `Anek_Bangla` and `Noto_Serif_Bengali`
- Arabic: `Amiri`
- Variables: `--font-sans`, `--font-bengali`, `--font-bengali-serif`, `--font-arabic`.

### 4.2 Bundle Analysis
To inspect production chunks and identify dependency bloat:
```bash
ANALYZE=true npm run web:build
```
This launches the `@next/bundle-analyzer` visualizer for server and client bundles.

---

## 5. SEO & Structured Data

- **Canonical URL Pattern**: `/fatwa/[id]-[slug]` (auto-redirects 301 from legacy non-slug URLs).
- **Structured Data**:
  - `QAPage` Schema: Google Q&A Rich Snippets for question, answer, scholar author, and publication date.
  - `FAQPage` Schema: Secondary FAQ indexing.
  - `BreadcrumbList`: Complete hierarchical category navigation.
- **Hreflang Configuration**:
  - `bn-BD`, `bn`: Primary canonical URL.
  - `en`: Canonical URL with `?lang=en`.
  - `ar`: Canonical URL with `?lang=ar`.
  - `x-default`: Canonical Bengali URL.
- **Chunked Sitemaps**: Chunked sitemap index at `/sitemap_index.xml` and `/sitemap.xml`, serving 2,000 URLs per partition.

---

## 6. Scraping & Data Pipeline

### 6.1 Incremental Sync Execution
Run live incremental scraper to ingest new fatwas:
```bash
# Direct scraper execution
python3 scraper/incremental_scraper.py

# Ingestion verification test
npx tsx apps/web/src/scripts/test-api.ts
```

### 6.2 Data Integrity Verification
Every fatwa contains a cryptographic `sha256_hash` computed over:
`SHA256(source + "|" + normalized_title + "|" + normalized_question + "|" + normalized_answer)`
Ensures zero silent data drift or unauthorized database modifications.

---

## 7. Quality Gates & CI/CD Pipeline

The `.github/workflows/ci.yml` pipeline blocks merging unless all gates are green:

1. **Typecheck Gate**:
   ```bash
   npx turbo run type-check
   ```
2. **Lint Gate**:
   ```bash
   npx turbo run lint
   ```
3. **Vitest Unit Test Suite**:
   ```bash
   npx vitest run
   ```
   Runs 51 unit tests across `@repo/text-utils`, `@repo/api-client`, and `apps/web/tests/` (Security, SSRF, BiDi, Sanitizer, Observability, Health).
4. **Security & Hygiene Suite**:
   ```bash
   npm run test:security --workspace=@repo/web
   npm run test:hygiene-security --workspace=@repo/web
   ```
   Runs 44 comprehensive security test assertions + 5 repository hygiene verifications.
5. **Playwright E2E Test Suite**:
   ```bash
   npm run test:e2e
   ```
   Tests live search execution, source filters, reader modal dialog, canonical redirects, and legal pages.
6. **Production Build Gate**:
   ```bash
   npm run web:build
   ```

---

## 8. Incident Response & Disaster Recovery

### 8.1 SQLite Database Corruption or Disk I/O Failure
1. Verify database integrity:
   ```bash
   sqlite3 data/fatwas.db "PRAGMA integrity_check;"
   ```
2. Restore from daily snapshot backup:
   ```bash
   cp data/fatwas.db data/fatwas.db.corrupt.$(date +%s)
   cp data/backups/fatwas-latest.db data/fatwas.db
   ```
3. Restart application server to rebuild WAL locks.

### 8.2 Deployment Rollback (Vercel)
1. In the Vercel dashboard: Deployments -> Select last known healthy deployment -> **Instant Rollback**.
2. Or via Vercel CLI:
   ```bash
   vercel rollback <deployment-id>
   ```

### 8.3 Rate Limit Mitigation for Bot/DDoS Attacks
If search APIs experience an active DoS attack:
- Adjust IP rate limit threshold in `apps/web/src/lib/rateLimit.ts` (`SEARCH_RATE_LIMIT_PER_MINUTE`).
- Enable Cloudflare "Under Attack" mode or activate Vercel Web Application Firewall (WAF) challenge rules.
