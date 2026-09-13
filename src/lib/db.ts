import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { FatwaQA, FatwaSource, IngestItemInput, IngestResultItem, SearchFacets } from '@/types/fatwa';
import { computeFatwaHash, normalizeText } from './hash';

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

  global.__fatwaDb = db;
  return db;
}

interface DbStatements {
  selectByHash: Database.Statement;
  insert: Database.Statement;
  update: Database.Statement;
  getAll: Database.Statement;
  getById: Database.Statement;
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
    count: db.prepare('SELECT count(*) as count FROM fatwas'),
    sources: db.prepare('SELECT source as name, COUNT(*) as count FROM fatwas GROUP BY source ORDER BY count DESC'),
    categories: db.prepare('SELECT category as name, COUNT(*) as count FROM fatwas GROUP BY category ORDER BY count DESC'),
    scholars: db.prepare("SELECT scholar as name, COUNT(*) as count FROM fatwas WHERE scholar IS NOT NULL AND scholar != '' GROUP BY scholar ORDER BY count DESC"),
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
              const id = item.id || crypto.randomUUID();

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
      return { id: existing.id, sha256_hash, status: 'updated' };
    }

    return { id: existing.id, sha256_hash, status: 'skipped' };
  }

  // Insert new record
  const id = crypto.randomUUID();
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

/**
 * Retrieves a single Fatwa record by ID.
 */
export function getFatwaById(id: string): FatwaQA | null {
  const db = getDb();
  const stmts = getStatements(db);
  const r = stmts.getById.get(id) as any;
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

/**
 * Computes source, category, and scholar aggregations.
 */
export function getFacets(): SearchFacets {
  const db = getDb();
  const stmts = getStatements(db);
  const sourceRows = stmts.sources.all() as { name: string; count: number }[];
  const categoryRows = stmts.categories.all() as { name: string; count: number }[];
  const scholarRows = stmts.scholars.all() as { name: string; count: number }[];

  return {
    sources: sourceRows,
    categories: categoryRows,
    scholars: scholarRows,
  };
}
