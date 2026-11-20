# Fatwa & Islamic Q&A Search Platform (Monorepo)

A high-performance, minimalist search engine aggregating and indexing authentic Islamic Q&As and Fatwas from **Al-I'tisam**, **At-Tahreek**, and **Al-Kawsar**.

Organized as an enterprise **Turborepo** monorepo supporting web, mobile (Expo), and shared TypeScript packages.

---

## 🏗️ Monorepo Architecture

```
.
├── apps/
│   ├── web/                  # Next.js 14 App Router web platform
│   └── mobile/               # Expo (React Native) mobile application
├── packages/
│   ├── api-client/           # Typed client generated from OpenAPI 3.1 & Zod schemas
│   ├── text-utils/           # Pure TS Bengali normalizer, stemmer & synonym registry
│   └── config/               # Shared tsconfig & ESLint presets
├── docs/
│   ├── openapi.yaml          # OpenAPI 3.1 REST API specification
│   └── ...
├── data/
│   └── fatwas.db             # SQLite search database (WAL mode)
├── scraper/                  # Python incremental scrapers & sync scripts
├── turbo.json                # Turborepo task pipeline configuration
└── package.json              # Monorepo root workspace configuration
```

---

## 📦 Workspaces & Packages

### Applications (`apps/`)

- **`apps/web`**: Production Next.js 14 (App Router) web application featuring full-text search, semantic search, Banglish transliteration, dynamic facets, AI-powered RAG, dark mode, and an admin dashboard.
- **`apps/mobile`**: Cross-platform Expo / React Native mobile application integrating `@repo/api-client` and `@repo/text-utils` for online and offline search capabilities.

### Shared Packages (`packages/`)

- **`@repo/api-client` (`packages/api-client`)**: Fully typed, production API client with runtime validation powered by Zod schemas mirroring `docs/openapi.yaml`. Exports client class, types, and schemas for web and mobile consumers.
- **`@repo/text-utils` (`packages/text-utils`)**: Pure TypeScript utilities with zero external dependencies, providing:
  - Bengali Unicode orthographic normalizer (`normalizeBengaliText`)
  - Bengali morphological suffix stemmer (`stemBengaliToken`)
  - Stopword detection (`isStopWord`)
  - Fiqh synonym and orthographic variant expansion (`getSynonymsAndVariants`, `isAblutionTerm`)
- **`@repo/config` (`packages/config`)**: Shared presets for TypeScript (`tsconfig/base`, `tsconfig/nextjs`, `tsconfig/react-library`, `tsconfig/react-native`) and ESLint.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js >= 20.0.0 < 23.0.0
- npm >= 10.0.0 (or pnpm)

### 2. Install Dependencies

Install all dependencies across all workspaces:

```bash
npm install
```

### 3. Environment Setup

Create `.env.local` inside `apps/web/`:

```bash
cp apps/web/.env.example apps/web/.env.local
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `INGESTION_SECRET_TOKEN` | Bearer token required for `/api/v1/ingest` | `super_secure_fatwa_ingest_token_change_me_in_prod` |
| `DATABASE_PATH` | Path to SQLite database file | `../../data/fatwas.db` |
| `NEXT_PUBLIC_APP_URL` | Base application URL | `http://localhost:3000` |

---

## 💻 Common Commands (Turborepo)

Turborepo orchestrates builds, linting, tests, and development across the monorepo:

### Development
```bash
# Start all workspaces in parallel
npm run dev

# Or start specific applications
npm run web:dev        # Start Next.js web application
npm run mobile:dev     # Start Expo mobile app
```

### Type Checking & Linting
```bash
# Type check all workspaces
npm run type-check

# Lint all workspaces
npm run lint
```

### Testing
```bash
# Run tests across packages
npm test

# Run web app tests specifically
npm run web:test
```

### Production Build
```bash
# Build all apps and packages with Turbo caching
npm run build
```

---

## 🌐 Deployments (Vercel)

For web deployment on Vercel:

1. **Framework Preset**: `Next.js`
2. **Root Directory**: `apps/web`
3. **Build Command**: `next build` (or `npx turbo run build --filter=@repo/web`)
4. **Output Directory**: `.next` (default)
5. **Install Command**: Vercel automatically detects the Turborepo root and runs `npm install` across workspaces.

> [!NOTE]
> Database bundling: `apps/web/next.config.mjs` configures `outputFileTracingIncludes` to bundle the SQLite database into serverless functions.

---

## 📄 OpenAPI Specification

The REST API is formally defined in [`docs/openapi.yaml`](docs/openapi.yaml) (OpenAPI 3.1.0).

Key API endpoints include:
- `GET /api/v1/search` — Search fatwas with phonetic expansion, transliteration, and facets
- `GET /api/v1/fatwa/{id}` — Fetch detailed fatwa record by ID
- `POST /api/v1/rag` — AI-powered RAG answer generation grounded on fatwa references
- `POST /api/v1/analytics/track` — User interaction and search telemetry
- `POST /api/v1/ingest` — Authenticated batch fatwa ingestion
- `POST /api/v1/admin/auth` — Admin authentication

To regenerate or verify `@repo/api-client` from `docs/openapi.yaml`:
```bash
npm run generate --workspace=@repo/api-client
```

---

## 🐍 Monthly Sync & Web Scrapers

The standalone Python scraper resides in `scraper/` and automatically discovers new fatwas from the authentic publishing boards:

```bash
cd scraper
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run incremental sync
python3 incremental_scraper.py --source all --max-items 150
```

GitHub Actions automatically runs this crawler on the 1st and 5th of each month (`.github/workflows/auto-sync-fatwas.yml`).

---

## 🛡️ License

Private repository. All rights reserved.
