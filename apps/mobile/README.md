# DeenQnA Mobile (React Native / Expo)

DeenQnA Mobile is a native, offline-first Fatwa and Islamic Q&A application built with Expo SDK 51, React Native, TypeScript, and Expo Router.

> **Apple App Store Guideline 4.2 Compliance**: This is a fully native application with offline SQLite FTS5 search, local bookmarking/collections, native typography scaling, haptics, and universal link routing—**not** a WebView wrapper.

---

## 🌟 Key Features

1. **Intent-Aware Search & FTS5 Full-Text Search**:
   - Debounced search querying the intent-aware backend API (`/api/v2/search`).
   - Source chips (`at-tahreek`, `al-kawsar`, `al-itisam`) and category filters.
   - Exact and snippet highlighting using `<mark>` tag parsing.
   - Transparent, instant fallback to the local SQLite FTS5 store if network is unavailable or poor.
   - Client-side recent search persistence (max 20 entries, stored locally).

2. **Offline Mode & Incremental Sync**:
   - Initial and incremental sync via `/api/v2/sync?since=`.
   - SQLite schema with WAL mode, FTS5 virtual table (`fatwas_fts`), and `unicode61` tokenizer.
   - Shared text normalization and stemming pipeline powered by `@repo/text-utils`.
   - Live sync status indicator with manual trigger.

3. **High-Readability Reader Screen**:
   - Responsive Bengali and Arabic typography with dynamic font scaling (Small, Medium, Large, X-Large).
   - Arabic RTL formatting and quote card styling for Quranic verses and Hadiths.
   - Source attribution badges and direct "Open original source" external linking (`expo-linking`).
   - Deep link sharing (`https://deenqna.vercel.app/fatwa/[id]`) via `expo-sharing` and clipboard copying.
   - Instant bookmark toggle with collection assignment.
   - "Report an issue" modal form directly from the reader screen.

4. **Bookmarks & Collections (Local-First)**:
   - Zero user accounts required for v1.
   - Organize bookmarked fatwas into custom folders/collections.
   - All bookmarks and collections stored in local SQLite database.

5. **Islamic Categories Browser**:
   - Browse fatwas categorized into core Islamic topics (ঈমান ও আকীদা, সালাত, সিয়াম, যাকাত, হজ্জ, ইত্যাদি).
   - Local category aggregation counts with real-time filtering.

6. **Settings & Privacy**:
   - Theme: System / Light / Dark modes.
   - Language: Bengali (`bn`) and English (`en`).
   - Privacy-friendly telemetry via Sentry with a one-click opt-out switch.
   - One-click clear local data (cache, recent searches, bookmarks) with confirmation dialog.
   - Built-in legal screens: Privacy Policy, Terms & Scholarly Disclaimer.

---

## 🏗️ Architecture & Monorepo Packages

The mobile app integrates with the Turborepo workspace:

```
├── apps/
│   ├── mobile/             # React Native Expo app
│   └── web/                # Next.js 14 web app & API v1/v2 routes
└── packages/
    ├── api-client/         # Typed API client generated from OpenAPI 3.1
    ├── text-utils/         # Unicode normalization, stemmer, and synonym clusters
    └── config/             # Shared TypeScript and ESLint configurations
```

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js 18+ (tested with Node 20 / 22)
- npm 10+
- macOS for iOS simulator (`Xcode` & `Cocoapods`) or Android Studio for Android emulator.

### 1. Install Dependencies
From the monorepo root:
```bash
npm install
```

### 2. Start the Development Server
```bash
# Start Expo Metro bundler
npm run dev --workspace=@repo/mobile
```

### 3. Run on Simulators
```bash
# Run on iOS simulator
npm run ios --workspace=@repo/mobile

# Run on Android emulator
npm run android --workspace=@repo/mobile
```

---

## ⚙️ Environment Configuration (`app.config.ts`)

The application supports multiple environments driven by environment variables:

| Variable | Description | Default |
|---|---|---|
| `APP_ENV` | Application environment (`development`, `preview`, `production`) | `production` |
| `APP_BUNDLE_OWNER` | Prefix for the bundle identifier | `niyamul` |
| `EXPO_PUBLIC_API_URL` | Base URL for remote API v1/v2 endpoints | `https://deenqna.vercel.app` |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry DSN for crash reporting (optional) | `""` |

### Bundle Identifiers & Package Names
Calculated automatically in `app.config.ts`:
- **Production**: `com.<owner>.deenqna` (e.g. `com.niyamul.deenqna`)
- **Preview / Staging**: `com.<owner>.deenqna.preview`
- **Development**: `com.<owner>.deenqna.dev`

> **Note**: To customize `<owner>`, set `APP_BUNDLE_OWNER=<yourname>` in `.env` or EAS build secrets.

---

## 🧪 Testing

### 1. Unit & Component Tests (Jest + React Native Testing Library)
```bash
npm test --workspace=@repo/mobile
```

Tests included:
- `__tests__/normalizer.test.ts`: Offline search tokenization, Bengali stemmer, and synonym cluster expansion.
- `__tests__/db.test.ts`: SQLite bookmarks repository, collections manager, and recent searches persistence.
- `__tests__/SearchScreen.test.tsx`: Search screen rendering, filter chips, and query input interactions.

### 2. TypeScript Strict Type-Check
```bash
npm run type-check --workspace=@repo/mobile
```

### 3. Maestro E2E Test (Search -> Reader -> Bookmark -> Offline)
To run automated end-to-end tests:
```bash
# Install Maestro (if not already installed)
curl -Ls "https://get.maestro.mobile.dev" | bash

# Run the E2E flow against iOS simulator or Android emulator
maestro test apps/mobile/.maestro/search_and_bookmark.yaml
```

---

## 🔒 Security & Privacy Commitments
- **Zero PII**: No user tracking, no phone numbers, no login requirement.
- **Opt-Out Respected**: Telemetry can be toggled off at any time in Settings, stored in `expo-secure-store`.
- **No Ads**: Non-commercial community resource for authentic Islamic fatwas.
