import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { FatwaQA, FatwaSource, IngestItemInput, IngestResultItem, RelatedFatwaItem, SearchFacets } from '@/types/fatwa';
import { computeFatwaHash, normalizeText, hashToUuid } from './hash';
import { extractIdFromSlug } from './utils';
import {
  isMongoConfigured,
  getFatwaByIdMongo,
  findUserByEmailMongo,
  findUserByIdMongo,
  createOrUpdateUserMongo,
  upsertFatwaMongo,
  deleteFatwaMongo,
  createDbSessionMongo,
  findDbSessionByTokenHashMongo,
  deleteDbSessionMongo,
  deleteSessionsByUserIdMongo,
  getFatwaCountMongo,
  getFatwaMetadataListMongo,
} from './db/mongodb';

// Singleton instance across hot reloads in Next.js
declare global {
  // eslint-disable-next-line no-var
  var __fatwaDb: Database.Database | undefined;
}

function getDatabasePath(): string {
  if (process.env.DATABASE_PATH) {
    const envPath = process.env.DATABASE_PATH;
    return path.isAbsolute(envPath) ? envPath : path.join(process.cwd(), envPath);
  }

  // On Vercel or AWS Lambda serverless environments, the root directory is read-only.
  // We copy the bundled data/fatwas.db to /tmp/fatwas.db so SQLite can safely open in read-write WAL mode.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDbPath = path.join('/tmp', 'fatwas.db');
    const sourceDbPath = path.join(process.cwd(), 'data', 'fatwas.db');

    if (fs.existsSync(sourceDbPath)) {
      try {
        let shouldCopy = !fs.existsSync(tmpDbPath);
        if (!shouldCopy) {
          const sourceStat = fs.statSync(sourceDbPath);
          const tmpStat = fs.statSync(tmpDbPath);
          if (sourceStat.size !== tmpStat.size || sourceStat.mtimeMs > tmpStat.mtimeMs) {
            shouldCopy = true;
          }
        }
        if (shouldCopy) {
          fs.copyFileSync(sourceDbPath, tmpDbPath);
        }
      } catch (e) {
        console.warn('[Vercel SQLite Copy Warning]:', e);
      }
    }
    return tmpDbPath;
  }

  return path.join(process.cwd(), 'data', 'fatwas.db');
}

function canonicalizeSource(src: string): FatwaSource {
  const lower = (src || '').toLowerCase();
  if (lower.includes('tahreek')) return 'at-tahreek';
  if (lower.includes('kawsar') || lower.includes('kausar')) return 'al-kawsar';
  return 'al-itisam';
}

export function getDb(): Database.Database {
  if (global.__fatwaDb) {
    return global.__fatwaDb;
  }

  const dbPath = getDatabasePath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  // Initialize unified schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS fatwas (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      source_url TEXT NOT NULL,
      title TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      tags TEXT NOT NULL DEFAULT '[]',
      scholar TEXT NOT NULL DEFAULT '',
      published_date TEXT NOT NULL DEFAULT '',
      sha256_hash TEXT NOT NULL DEFAULT '',
      scraped_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS fatwas_fts USING fts5(
      id UNINDEXED,
      title,
      question,
      answer,
      category,
      source,
      scholar,
      tokenize="unicode61"
    );

    CREATE TRIGGER IF NOT EXISTS fatwas_ai AFTER INSERT ON fatwas BEGIN
      INSERT INTO fatwas_fts(id, title, question, answer, category, source, scholar)
      VALUES (new.id, new.title, new.question, new.answer, new.category, new.source, new.scholar);
    END;

    CREATE TRIGGER IF NOT EXISTS fatwas_ad AFTER DELETE ON fatwas BEGIN
      DELETE FROM fatwas_fts WHERE id = old.id;
    END;

    CREATE TRIGGER IF NOT EXISTS fatwas_au AFTER UPDATE ON fatwas BEGIN
      DELETE FROM fatwas_fts WHERE id = old.id;
      INSERT INTO fatwas_fts(id, title, question, answer, category, source, scholar)
      VALUES (new.id, new.title, new.question, new.answer, new.category, new.source, new.scholar);
    END;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      picture TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user',
      provider TEXT NOT NULL DEFAULT 'credentials',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      fatwa_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, fatwa_id)
    );

    CREATE TABLE IF NOT EXISTS analytics_visitors (
      visitor_id TEXT PRIMARY KEY,
      user_id TEXT,
      user_email TEXT,
      user_name TEXT,
      device_type TEXT NOT NULL DEFAULT 'Desktop',
      browser TEXT NOT NULL DEFAULT 'Unknown',
      os TEXT NOT NULL DEFAULT 'Unknown',
      ip_hash TEXT NOT NULL DEFAULT '',
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      total_pageviews INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS analytics_pageviews (
      id TEXT PRIMARY KEY,
      visitor_id TEXT NOT NULL,
      user_id TEXT,
      user_type TEXT NOT NULL DEFAULT 'guest',
      user_name TEXT,
      user_email TEXT,
      path TEXT NOT NULL,
      page_title TEXT,
      fatwa_id TEXT,
      search_query TEXT,
      referrer TEXT,
      device_type TEXT NOT NULL DEFAULT 'Desktop',
      browser TEXT NOT NULL DEFAULT 'Unknown',
      os TEXT NOT NULL DEFAULT 'Unknown',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pv_created_at ON analytics_pageviews(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_pv_visitor_id ON analytics_pageviews(visitor_id);
    CREATE INDEX IF NOT EXISTS idx_pv_user_id ON analytics_pageviews(user_id);
    CREATE INDEX IF NOT EXISTS idx_pv_user_type ON analytics_pageviews(user_type);
    CREATE INDEX IF NOT EXISTS idx_pv_path ON analytics_pageviews(path);
    CREATE INDEX IF NOT EXISTS idx_pv_fatwa_id ON analytics_pageviews(fatwa_id);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'user',
      email TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_active_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
  `);

  // Handle auto-migration for existing SQLite tables
  try {
    const tableInfo = db.prepare(`PRAGMA table_info(fatwas)`).all() as Array<{ name: string }>;
    const colNames = new Set(tableInfo.map((c) => c.name));

    if (colNames.has('hash')) {
      // Migrate legacy table to unified schema without legacy hash NOT NULL column
      db.transaction(() => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS fatwas_migrated (
            id TEXT PRIMARY KEY,
            source TEXT NOT NULL,
            source_url TEXT NOT NULL,
            title TEXT NOT NULL,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'General',
            tags TEXT NOT NULL DEFAULT '[]',
            scholar TEXT NOT NULL DEFAULT '',
            published_date TEXT NOT NULL DEFAULT '',
            sha256_hash TEXT NOT NULL DEFAULT '',
            scraped_at TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );

          INSERT OR REPLACE INTO fatwas_migrated (
            id, source, source_url, title, question, answer, category, tags, scholar, published_date, sha256_hash, scraped_at, created_at, updated_at
          )
          SELECT
            id,
            source,
            source_url,
            title,
            question,
            answer,
            category,
            tags,
            COALESCE(scholar, ''),
            COALESCE(published_date, created_at),
            COALESCE(NULLIF(sha256_hash, ''), hash),
            COALESCE(scraped_at, created_at),
            created_at,
            updated_at
          FROM fatwas;

          DROP TABLE fatwas;
          ALTER TABLE fatwas_migrated RENAME TO fatwas;
        `);
      })();
    } else {
      if (!colNames.has('scholar')) {
        db.exec(`ALTER TABLE fatwas ADD COLUMN scholar TEXT NOT NULL DEFAULT ''`);
      }
      if (!colNames.has('published_date')) {
        db.exec(`ALTER TABLE fatwas ADD COLUMN published_date TEXT NOT NULL DEFAULT ''`);
      }
      if (!colNames.has('scraped_at')) {
        db.exec(`ALTER TABLE fatwas ADD COLUMN scraped_at TEXT NOT NULL DEFAULT ''`);
      }
      if (!colNames.has('sha256_hash')) {
        db.exec(`ALTER TABLE fatwas ADD COLUMN sha256_hash TEXT NOT NULL DEFAULT ''`);
      }
    }
  } catch (migErr) {
    console.warn('[DB Migration Warning]:', migErr);
  }

  // Create indexes now that all columns are guaranteed to exist
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_fatwas_sha256_hash ON fatwas(sha256_hash);
    CREATE INDEX IF NOT EXISTS idx_fatwas_source ON fatwas(source);
    CREATE INDEX IF NOT EXISTS idx_fatwas_category ON fatwas(category);
    CREATE INDEX IF NOT EXISTS idx_fatwas_scholar ON fatwas(scholar);
    CREATE INDEX IF NOT EXISTS idx_fatwas_published_date ON fatwas(published_date DESC);
  `);

  // Auto-seed database from JSON datasets if running with 0 records (e.g. fresh Vercel /tmp instance)
  autoSeedIfEmpty(db);

  // Ensure FTS5 index is populated
  try {
    const ftsCount = db.prepare('SELECT count(*) as c FROM fatwas_fts').pluck().get() as number;
    const fatwasCount = db.prepare('SELECT count(*) as c FROM fatwas').pluck().get() as number;
    if (ftsCount < fatwasCount) {
      db.exec(`
        DELETE FROM fatwas_fts;
        INSERT INTO fatwas_fts(id, title, question, answer, category, source, scholar)
        SELECT id, title, question, answer, category, source, scholar FROM fatwas;
      `);
    }
  } catch (ftsErr) {
    console.warn('[FTS Setup Warning]:', ftsErr);
  }

  global.__fatwaDb = db;
  return db;
}

interface DbStatements {
  selectByHash: Database.Statement;
  insert: Database.Statement;
  update: Database.Statement;
  getAll: Database.Statement;
  getById: Database.Statement;
  getByHash: Database.Statement;
  getByHashPrefix: Database.Statement;
  count: Database.Statement;
  sources: Database.Statement;
  categories: Database.Statement;
  scholars: Database.Statement;
}

let cachedStatements: DbStatements | undefined;

function getStatements(db: Database.Database): DbStatements {
  if (cachedStatements) {
    return cachedStatements;
  }

  cachedStatements = {
    selectByHash: db.prepare(
      'SELECT id, source, source_url, title, question, answer, category, tags, scholar, published_date FROM fatwas WHERE sha256_hash = ?'
    ),
    insert: db.prepare(`
      INSERT INTO fatwas (
        id, source, source_url, title, question, answer, category, tags, scholar, published_date, sha256_hash, scraped_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    update: db.prepare(`
      UPDATE fatwas
      SET title = ?, category = ?, tags = ?, scholar = ?, source_url = ?, published_date = ?, updated_at = ?
      WHERE id = ?
    `),
    getAll: db.prepare('SELECT * FROM fatwas ORDER BY published_date DESC, created_at DESC'),
    getById: db.prepare('SELECT * FROM fatwas WHERE id = ?'),
    getByHash: db.prepare('SELECT * FROM fatwas WHERE sha256_hash = ?'),
    getByHashPrefix: db.prepare("SELECT * FROM fatwas WHERE sha256_hash LIKE ? || '%' LIMIT 1"),
    count: db.prepare('SELECT count(*) as count FROM fatwas'),
    sources: db.prepare('SELECT source as name, COUNT(*) as count FROM fatwas GROUP BY source ORDER BY count DESC'),
    categories: db.prepare('SELECT category as name, COUNT(*) as count FROM fatwas GROUP BY category ORDER BY count DESC'),
    scholars: db.prepare("SELECT scholar as name, COUNT(*) as count FROM fatwas WHERE scholar IS NOT NULL AND scholar != '' GROUP BY scholar ORDER BY count DESC LIMIT 50"),
  };

  return cachedStatements;
}

export function closeDb(): void {
  cachedStatements = undefined;
  if (global.__fatwaDb) {
    try {
      global.__fatwaDb.close();
    } catch (e) {
      // Ignore if already closed
    }
    global.__fatwaDb = undefined;
  }
}

function autoSeedIfEmpty(db: Database.Database): void {
  try {
    const row = db.prepare('SELECT count(*) as count FROM fatwas').get() as { count: number } | undefined;
    if (row && row.count > 0) {
      return;
    }

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      return;
    }

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO fatwas (
        id, source, source_url, title, question, answer, category, tags, scholar, published_date, sha256_hash, scraped_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const jsonFiles = ['al_itisam.json', 'at_tahreek.json', 'al_kawsar.json'];

    db.transaction(() => {
      for (const fileName of jsonFiles) {
        const filePath = path.join(dataDir, fileName);
        if (fs.existsSync(filePath)) {
          try {
            const raw = fs.readFileSync(filePath, 'utf-8');
            const items = JSON.parse(raw);
            const itemsArr = Array.isArray(items) ? items : [items];

            for (const item of itemsArr) {
              if (!item) continue;
              const question = (item.question || item.title || '').trim();
              const answer = (item.answer || item.body || '').trim();
              if (!question && !answer) continue;

              const title = (item.title || question.slice(0, 120)).trim();
              const source = canonicalizeSource(item.source || fileName);
              const source_url = (item.source_url || '').trim();
              const category = (item.category || 'General').trim();
              const tags = JSON.stringify(item.tags || [category.split(' ')[0]]);
              const scholar = (
                item.scholar ||
                (source === 'at-tahreek'
                  ? 'ড. মুহাম্মাদ আসাদুল্লাহ আল-গালিব'
                  : source === 'al-kawsar'
                  ? 'মারকাযুদ দাওয়াহ / আলকাউসার'
                  : 'ফতোয়া বোর্ড')
              ).trim();
              const published_date = item.published_date || item.createdAt || new Date().toISOString().split('T')[0];
              const scraped_at = item.scraped_at || new Date().toISOString();
              const sha256_hash = (item.sha256_hash || computeFatwaHash({ question, answer })).toLowerCase();
              const id = item.id || hashToUuid(sha256_hash);

              insertStmt.run(
                id,
                source,
                source_url,
                title,
                question,
                answer,
                category,
                tags,
                scholar,
                published_date,
                sha256_hash,
                scraped_at,
                published_date,
                new Date().toISOString()
              );
            }
          } catch (fileErr) {
            console.warn(`[Auto-Seed Warning] Error processing ${fileName}:`, fileErr);
          }
        }
      }
    })();
  } catch (err) {
    console.warn('[Auto-Seed Error]:', err);
  }
}

export type UpsertResult = IngestResultItem;

/**
 * Idempotently upserts a single Fatwa entry using its SHA-256 hash (derived from question + answer).
 */
export function upsertFatwa(item: IngestItemInput): UpsertResult {
  const db = getDb();
  const stmts = getStatements(db);

  const title = normalizeText(item.title);
  const question = normalizeText(item.question);
  const answer = item.answer.trim();
  const source = canonicalizeSource(item.source);
  const source_url = item.source_url.trim();
  const category = (item.category && item.category.trim()) || 'General';
  const tags = JSON.stringify(item.tags || []);
  const scholar = normalizeText(item.scholar) || (source === 'at-tahreek' ? 'আল-মারকাযুল ইসলামী' : source === 'al-kawsar' ? 'মারকাযুদ দাওয়াহ / আলকাউসার' : 'ফতোয়া বোর্ড');
  
  const now = new Date().toISOString();
  const published_date = item.published_date || item.createdAt || now;
  const scraped_at = item.scraped_at || now;

  // Derive SHA-256 strictly from question + answer
  const computedHash = computeFatwaHash({ question, answer });
  const sha256_hash = (item.sha256_hash || item.hash || computedHash).toLowerCase();

  // Check if entry with this sha256_hash already exists
  const existing = stmts.selectByHash.get(sha256_hash) as any;

  if (existing) {
    // Check if any mutable metadata changed
    const hasChanged =
      existing.title !== title ||
      existing.category !== category ||
      existing.tags !== tags ||
      existing.scholar !== scholar ||
      existing.source_url !== source_url ||
      existing.published_date !== published_date;

    if (hasChanged) {
      stmts.update.run(title, category, tags, scholar, source_url, published_date, now, existing.id);
      invalidateFacetsCache();
      return { id: existing.id, sha256_hash, status: 'updated' };
    }

    return { id: existing.id, sha256_hash, status: 'skipped' };
  }

  // Insert new record with deterministic ID
  const id = (item as any).id || hashToUuid(sha256_hash);
  stmts.insert.run(
    id,
    source,
    source_url,
    title,
    question,
    answer,
    category,
    tags,
    scholar,
    published_date,
    sha256_hash,
    scraped_at,
    published_date,
    now
  );

  invalidateFacetsCache();
  return { id, sha256_hash, status: 'inserted' };
}

/**
 * Executes a batch of upserts inside a single SQLite transaction for optimal speed.
 */
export function batchUpsertFatwas(items: IngestItemInput[]): {
  inserted: number;
  updated: number;
  skipped: number;
  total: number;
  results: UpsertResult[];
} {
  const db = getDb();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const results: UpsertResult[] = [];

  const runBatch = db.transaction((batchItems: IngestItemInput[]) => {
    for (const item of batchItems) {
      const res = upsertFatwa(item);
      results.push(res);
      if (res.status === 'inserted') inserted++;
      else if (res.status === 'updated') updated++;
      else skipped++;
    }
  });

  runBatch(items);

  if (inserted > 0 || updated > 0) {
    invalidateFacetsCache();
  }

  return {
    inserted,
    updated,
    skipped,
    total: items.length,
    results,
  };
}

/**
 * Retrieves all Fatwa records (used for search indexing or backup).
 */
export function getAllFatwas(): FatwaQA[] {
  const db = getDb();
  const stmts = getStatements(db);
  const rows = stmts.getAll.all() as any[];

  return rows.map((r) => ({
    id: r.id,
    source: r.source as FatwaSource,
    source_url: r.source_url,
    title: r.title,
    question: r.question,
    answer: r.answer,
    category: r.category,
    tags: JSON.parse(r.tags || '[]'),
    scholar: r.scholar || '',
    published_date: r.published_date || r.created_at,
    sha256_hash: r.sha256_hash || r.hash || '',
    scraped_at: r.scraped_at || r.created_at,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

// Explicit mapping for legacy random UUIDs that may have been generated on past ephemeral instances
const LEGACY_ID_MAP: Record<string, string> = {
  // User reported issue: https://deenqna.vercel.app/fatwa/23efcf59-3367-4faf-b7f9-c6e38fbe9442
  '23efcf59-3367-4faf-b7f9-c6e38fbe9442': '8fdde759-e0e4-e141-c428-487c1eacfa1b',
};

/**
 * Retrieves a single Fatwa record by ID, legacy alias, SHA-256 hash, or hash prefix.
 */
export function getFatwaById(rawId: string): FatwaQA | null {
  if (!rawId || typeof rawId !== 'string') return null;
  let decoded = rawId.trim();
  try {
    decoded = decodeURIComponent(rawId).trim();
  } catch {}
  const targetId = LEGACY_ID_MAP[decoded] || decoded;
  const extractedCandidate = extractIdFromSlug(targetId);

  const db = getDb();
  const stmts = getStatements(db);

  // 1. Try exact primary key ID match
  let r = stmts.getById.get(targetId) as any;

  // 2. Try extracted candidate ID match (short ID suffix or UUID)
  if (!r && extractedCandidate && extractedCandidate !== targetId) {
    r = stmts.getById.get(extractedCandidate) as any;
    if (!r) {
      r = db.prepare("SELECT * FROM fatwas WHERE id LIKE ? || '%' LIMIT 1").get(extractedCandidate) as any;
    }
  }

  // 3. If alias was resolved and differs, try original ID as well
  if (!r && targetId !== decoded) {
    r = stmts.getById.get(decoded) as any;
  }

  // 4. Try exact SHA-256 hash match
  if (!r) {
    r = stmts.getByHash.get(targetId.toLowerCase()) as any;
  }

  // 5. Try prefix match on targetId / cleanHex
  if (!r) {
    const cleanHex = (extractedCandidate || targetId).replace(/[^a-f0-9]/gi, '').toLowerCase();
    if (cleanHex.length >= 6) {
      r = db.prepare("SELECT * FROM fatwas WHERE id LIKE ? || '%' LIMIT 1").get(cleanHex) as any;
      if (!r) {
        r = stmts.getByHashPrefix.get(cleanHex) as any;
      }
    }
  }

  if (!r) return null;

  return {
    id: r.id,
    source: r.source as FatwaSource,
    source_url: r.source_url,
    title: r.title,
    question: r.question,
    answer: r.answer,
    category: r.category,
    tags: JSON.parse(r.tags || '[]'),
    scholar: r.scholar || '',
    published_date: r.published_date || r.created_at,
    sha256_hash: r.sha256_hash || r.hash || '',
    scraped_at: r.scraped_at || r.created_at,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

let cachedFacets: { data: SearchFacets; expiresAt: number } | null = null;

export function invalidateFacetsCache(): void {
  cachedFacets = null;
}

/**
 * Computes source, category, and scholar aggregations with in-memory caching.
 */
export function getFacets(): SearchFacets {
  const now = Date.now();
  if (cachedFacets && cachedFacets.expiresAt > now) {
    return cachedFacets.data;
  }

  const db = getDb();
  const stmts = getStatements(db);
  const sourceRows = stmts.sources.all() as { name: string; count: number }[];
  const categoryRows = stmts.categories.all() as { name: string; count: number }[];
  const scholarRows = stmts.scholars.all() as { name: string; count: number }[];

  // Consolidate categories across archives (e.g. Prayer and Hajj variants)
  const { CANONICAL_CATEGORIES } = require('./search/categoryUtils');
  const catMap = new Map<string, number>();
  for (const c of categoryRows) {
    catMap.set(c.name, c.count);
  }

  const consolidatedCategories: { name: string; count: number }[] = [];
  const handledRaw = new Set<string>();

  for (const canon of CANONICAL_CATEGORIES) {
    let sum = 0;
    for (const dbName of canon.dbCategories) {
      if (catMap.has(dbName)) {
        sum += catMap.get(dbName)!;
        handledRaw.add(dbName);
      }
    }
    if (sum > 0) {
      consolidatedCategories.push({ name: canon.name, count: sum });
    }
  }

  for (const c of categoryRows) {
    if (!handledRaw.has(c.name)) {
      consolidatedCategories.push(c);
    }
  }

  consolidatedCategories.sort((a, b) => b.count - a.count);

  const data: SearchFacets = {
    sources: sourceRows,
    categories: consolidatedCategories,
    scholars: scholarRows,
  };

  cachedFacets = {
    data,
    expiresAt: now + 5 * 60 * 1000, // 5 minutes TTL
  };

  return data;
}

/**
 * Returns total number of fatwa entries in database.
 */
export function getFatwaCount(): number {
  const db = getDb();
  const row = db.prepare('SELECT count(*) as count FROM fatwas').get() as { count: number } | undefined;
  return row?.count || 0;
}

/**
 * Hybrid persistent count:
 * Checks MongoDB Atlas if configured, falling back to local SQLite.
 */
export async function getFatwaCountAsync(): Promise<number> {
  if (isMongoConfigured()) {
    try {
      const count = await getFatwaCountMongo();
      if (count > 0) return count;
    } catch (err) {
      console.warn('[MongoDB getFatwaCountAsync Warning, falling back to SQLite]:', err);
    }
  }
  return getFatwaCount();
}

/**
 * Returns a lightweight list of IDs and timestamps for XML sitemaps.
 */
export function getFatwaMetadataList(
  limit: number = 10000,
  offset: number = 0
): Array<{ id: string; title: string; updated_at: string; published_date: string }> {
  const db = getDb();
  const rows = db
    .prepare('SELECT id, title, updated_at, published_date FROM fatwas ORDER BY id ASC LIMIT ? OFFSET ?')
    .all(limit, offset) as Array<{ id: string; title: string; updated_at: string; published_date: string }>;
  return rows;
}

/**
 * Hybrid persistent metadata list for sitemaps:
 * Fetches lightweight metadata from MongoDB Atlas if configured, falling back to local SQLite.
 */
export async function getFatwaMetadataListAsync(
  limit: number = 2000,
  offset: number = 0
): Promise<Array<{ id: string; title: string; updated_at: string; published_date: string }>> {
  if (isMongoConfigured()) {
    try {
      const list = await getFatwaMetadataListMongo(limit, offset);
      if (list && list.length > 0) return list;
    } catch (err) {
      console.warn('[MongoDB getFatwaMetadataListAsync Warning, falling back to SQLite]:', err);
    }
  }
  return getFatwaMetadataList(limit, offset);
}

/**
 * Fetches related fatwas for internal crawlable link architecture and recommended questions.
 */
export function getRelatedFatwas(
  category: string,
  currentId: string,
  limit: number = 6
): RelatedFatwaItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, title, question, substr(answer, 1, 160) as answer, category, source, scholar, published_date 
       FROM fatwas 
       WHERE category = ? AND id != ? 
       ORDER BY published_date DESC 
       LIMIT ?`
    )
    .all(category, currentId, limit) as any[];

  if (rows.length < limit) {
    const existingIds = [currentId, ...rows.map((r) => r.id)];
    const placeholders = existingIds.map(() => '?').join(',');
    const remaining = limit - rows.length;
    const fallbacks = db
      .prepare(
        `SELECT id, title, question, substr(answer, 1, 160) as answer, category, source, scholar, published_date 
         FROM fatwas 
         WHERE id NOT IN (${placeholders}) 
         ORDER BY published_date DESC 
         LIMIT ?`
      )
      .all(...existingIds, remaining) as any[];

    return [...rows, ...fallbacks];
  }

  return rows;
}

const relatedCache = new Map<string, { data: RelatedFatwaItem[]; expiresAt: number }>();
const RELATED_CACHE_TTL = 15 * 60 * 1000; // 15 mins

export async function getRelatedFatwasAsync(
  category: string,
  currentId: string,
  limit: number = 6
): Promise<RelatedFatwaItem[]> {
  const cacheKey = `${category}_${limit}`;
  const now = Date.now();
  const cached = relatedCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    const filtered = cached.data.filter((item) => item.id !== currentId).slice(0, limit);
    if (filtered.length >= limit) {
      return filtered;
    }
  }

  if (isMongoConfigured()) {
    try {
      const { getMongoDb } = await import('./db/mongodb');
      const db = await getMongoDb();
      if (db) {
        const collection = db.collection('fatwas');
        const projection = {
          _id: 0,
          id: 1,
          title: 1,
          question: 1,
          answer: 1,
          category: 1,
          source: 1,
          scholar: 1,
          published_date: 1,
        };

        const docs = await collection
          .find({ category, id: { $ne: currentId } })
          .project(projection)
          .sort({ published_date: -1 })
          .limit(limit + 4)
          .toArray();

        let items: RelatedFatwaItem[] = docs.map((d: any) => ({
          id: d.id,
          title: d.title || '',
          question: d.question || '',
          answer: (d.answer || '').slice(0, 160),
          category: d.category || '',
          source: d.source as FatwaSource,
          scholar: d.scholar || '',
          published_date: d.published_date || '',
        }));

        if (items.length < limit) {
          const excludeIds = [currentId, ...items.map((i) => i.id)];
          const fallbacks = await collection
            .find({ id: { $nin: excludeIds } })
            .project(projection)
            .sort({ published_date: -1 })
            .limit(limit - items.length)
            .toArray();

          items = [
            ...items,
            ...fallbacks.map((d: any) => ({
              id: d.id,
              title: d.title || '',
              question: d.question || '',
              answer: (d.answer || '').slice(0, 160),
              category: d.category || '',
              source: d.source as FatwaSource,
              scholar: d.scholar || '',
              published_date: d.published_date || '',
            })),
          ];
        }

        relatedCache.set(cacheKey, { data: items, expiresAt: now + RELATED_CACHE_TTL });
        return items.filter((item) => item.id !== currentId).slice(0, limit);
      }
    } catch (err) {
      console.warn('[MongoDB getRelatedFatwasAsync Warning, falling back to SQLite]:', err);
    }
  }

  return getRelatedFatwas(category, currentId, limit);
}

import { User } from '@/types/user';

export function findUserByEmail(email: string): User | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as User | undefined;
  return row || null;
}

export function findUserById(id: string): User | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  return row || null;
}

export function createOrUpdateUser(userData: {
  email: string;
  name: string;
  picture?: string;
  password_hash?: string;
  role?: 'user' | 'admin';
  provider?: 'credentials' | 'google';
}): User {
  const db = getDb();
  const existing = findUserByEmail(userData.email);
  const now = new Date().toISOString();

  if (existing) {
    db.prepare(`
      UPDATE users 
      SET name = ?, picture = COALESCE(?, picture), password_hash = COALESCE(?, password_hash), 
          role = ?, provider = ?, updated_at = ?
      WHERE email = ?
    `).run(
      userData.name,
      userData.picture || existing.picture || '',
      userData.password_hash || existing.password_hash || '',
      userData.role || existing.role || 'user',
      userData.provider || existing.provider || 'credentials',
      now,
      userData.email.toLowerCase().trim()
    );
    return findUserByEmail(userData.email)!;
  }

  const userId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO users (id, email, name, picture, password_hash, role, provider, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    userData.email.toLowerCase().trim(),
    userData.name,
    userData.picture || '',
    userData.password_hash || '',
    userData.role || 'user',
    userData.provider || 'credentials',
    now,
    now
  );

  return findUserById(userId)!;
}

export interface DbSession {
  id: string;
  user_id: string;
  token_hash: string;
  role: string;
  email: string;
  created_at: string;
  expires_at: string;
  last_active_at: string;
}

export function createDbSession(data: {
  userId: string;
  email: string;
  role: string;
  tokenHash: string;
  expiresAt: string;
}): DbSession {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, role, email, created_at, expires_at, last_active_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.userId, data.tokenHash, data.role, data.email.toLowerCase().trim(), now, data.expiresAt, now);

  return {
    id,
    user_id: data.userId,
    token_hash: data.tokenHash,
    role: data.role,
    email: data.email.toLowerCase().trim(),
    created_at: now,
    expires_at: data.expiresAt,
    last_active_at: now,
  };
}

export function findDbSessionByTokenHash(tokenHash: string): DbSession | null {
  const db = getDb();
  const now = new Date().toISOString();
  const row = db.prepare(`
    SELECT * FROM sessions 
    WHERE token_hash = ? AND expires_at > ?
  `).get(tokenHash, now) as DbSession | undefined;

  return row || null;
}

export function deleteDbSession(tokenHash: string): void {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

export function deleteSessionsByUserId(userId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export function cleanupExpiredSessions(): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
}

export async function createDbSessionAsync(data: {
  userId: string;
  email: string;
  role: string;
  tokenHash: string;
  expiresAt: string;
}): Promise<void> {
  if (isMongoConfigured()) {
    try {
      await createDbSessionMongo(data);
    } catch (err) {
      console.warn('[MongoDB createDbSessionAsync Warning]:', err);
    }
  }

  try {
    createDbSession(data);
  } catch (err) {
    // Safe to ignore in ephemeral serverless SQLite
  }
}

export async function findDbSessionByTokenHashAsync(tokenHash: string): Promise<DbSession | null> {
  if (isMongoConfigured()) {
    try {
      const session = await findDbSessionByTokenHashMongo(tokenHash);
      if (session) return session;
    } catch (err) {
      console.warn('[MongoDB findDbSessionByTokenHashAsync Warning]:', err);
    }
  }

  try {
    return findDbSessionByTokenHash(tokenHash);
  } catch {
    return null;
  }
}

export async function deleteDbSessionAsync(tokenHash: string): Promise<void> {
  if (isMongoConfigured()) {
    try {
      await deleteDbSessionMongo(tokenHash);
    } catch (err) {
      console.warn('[MongoDB deleteDbSessionAsync Warning]:', err);
    }
  }

  try {
    deleteDbSession(tokenHash);
  } catch {
    // ignore
  }
}

export async function deleteSessionsByUserIdAsync(userId: string): Promise<void> {
  if (isMongoConfigured()) {
    try {
      await deleteSessionsByUserIdMongo(userId);
    } catch (err) {
      console.warn('[MongoDB deleteSessionsByUserIdAsync Warning]:', err);
    }
  }

  try {
    deleteSessionsByUserId(userId);
  } catch {
    // ignore
  }
}

/**
 * Hybrid persistent single fatwa fetch:
 * Checks MongoDB Atlas first if configured, falling back to local SQLite.
 */
export async function getFatwaByIdAsync(rawId: string): Promise<FatwaQA | null> {
  if (isMongoConfigured()) {
    try {
      const doc = await getFatwaByIdMongo(rawId);
      if (doc) return doc;
    } catch (err) {
      console.warn('[MongoDB getFatwaByIdAsync Warning, falling back to SQLite]:', err);
    }
  }
  return getFatwaById(rawId);
}

/**
 * Hybrid persistent fatwa upsert:
 * Writes to MongoDB Atlas if configured, and dual-syncs to SQLite.
 */
export async function upsertFatwaAsync(item: IngestItemInput): Promise<UpsertResult> {
  if (isMongoConfigured()) {
    try {
      const res = await upsertFatwaMongo(item);
      try {
        upsertFatwa(item);
      } catch (sqLiteErr) {
        // Safe to ignore in ephemeral serverless
      }
      return res;
    } catch (err) {
      console.warn('[MongoDB upsertFatwaAsync Warning, falling back to SQLite]:', err);
    }
  }
  return upsertFatwa(item);
}

/**
 * Hybrid persistent fatwa delete:
 * Deletes from MongoDB Atlas if configured, and deletes from SQLite.
 */
export async function deleteFatwaAsync(id: string): Promise<boolean> {
  let deleted = false;
  if (isMongoConfigured()) {
    try {
      deleted = await deleteFatwaMongo(id);
    } catch (err) {
      console.warn('[MongoDB deleteFatwaAsync Warning]:', err);
    }
  }

  try {
    const db = getDb();
    db.prepare('DELETE FROM fatwas WHERE id = ?').run(id);
    invalidateFacetsCache();
    deleted = true;
  } catch (err) {
    // ignore
  }

  return deleted;
}

/**
 * Hybrid persistent user fetch by email:
 * Reads from MongoDB Atlas if configured, otherwise SQLite.
 */
export async function findUserByEmailAsync(email: string): Promise<User | null> {
  if (isMongoConfigured()) {
    try {
      const user = await findUserByEmailMongo(email);
      if (user) return user;
    } catch (err) {
      console.warn('[MongoDB findUserByEmailAsync Warning, falling back to SQLite]:', err);
    }
  }
  return findUserByEmail(email);
}

/**
 * Hybrid persistent user fetch by ID:
 * Reads from MongoDB Atlas if configured, otherwise SQLite.
 */
export async function findUserByIdAsync(id: string): Promise<User | null> {
  if (isMongoConfigured()) {
    try {
      const user = await findUserByIdMongo(id);
      if (user) return user;
    } catch (err) {
      console.warn('[MongoDB findUserByIdAsync Warning, falling back to SQLite]:', err);
    }
  }
  return findUserById(id);
}

/**
 * Hybrid persistent user create or update:
 * Saves to MongoDB Atlas if configured, and dual-syncs to SQLite.
 */
export async function createOrUpdateUserAsync(userData: {
  email: string;
  name: string;
  picture?: string;
  password_hash?: string;
  role?: 'user' | 'admin';
  provider?: 'credentials' | 'google';
}): Promise<User> {
  if (isMongoConfigured()) {
    try {
      const user = await createOrUpdateUserMongo(userData);
      try {
        createOrUpdateUser(userData);
      } catch (sqLiteErr) {
        // Safe to ignore in ephemeral serverless
      }
      return user;
    } catch (err) {
      console.warn('[MongoDB createOrUpdateUserAsync Warning, falling back to SQLite]:', err);
    }
  }
  return createOrUpdateUser(userData);
}


