import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await SQLite.openDatabaseAsync('deenqna_offline.db');

  // Initialize SQLite settings: Enable WAL mode for high concurrency
  await dbInstance.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS fatwas (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      source_url TEXT NOT NULL,
      title TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      tags TEXT NOT NULL DEFAULT '[]',
      scholar TEXT DEFAULT '',
      published_date TEXT NOT NULL,
      scraped_at TEXT NOT NULL,
      sha256_hash TEXT NOT NULL,
      normalized_text TEXT NOT NULL DEFAULT '',
      synced_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_fatwas_category ON fatwas(category);
    CREATE INDEX IF NOT EXISTS idx_fatwas_source ON fatwas(source);
    CREATE INDEX IF NOT EXISTS idx_fatwas_published ON fatwas(published_date DESC);

    -- Virtual FTS5 table for lightning-fast Bengali offline full-text search
    CREATE VIRTUAL TABLE IF NOT EXISTS fatwas_fts USING fts5(
      id UNINDEXED,
      title,
      question,
      answer,
      normalized_text,
      category,
      scholar,
      tokenize = 'unicode61'
    );

    -- Local Collections
    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#059669',
      icon TEXT DEFAULT 'bookmark',
      created_at TEXT NOT NULL
    );

    -- Local Bookmarks
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      fatwa_id TEXT NOT NULL,
      collection_id TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(fatwa_id) REFERENCES fatwas(id) ON DELETE CASCADE,
      FOREIGN KEY(collection_id) REFERENCES collections(id) ON DELETE SET NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_fatwa ON bookmarks(fatwa_id);

    -- Local Recent Searches (Private, strictly client-side)
    CREATE TABLE IF NOT EXISTS recent_searches (
      id TEXT PRIMARY KEY,
      query TEXT NOT NULL UNIQUE,
      timestamp TEXT NOT NULL
    );

    -- Sync Metadata Store
    CREATE TABLE IF NOT EXISTS sync_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Seed default collections if empty
  const defaultCollections = [
    { id: 'col_salah', name: 'সালাত ও তাহারাত', color: '#059669', icon: 'droplet' },
    { id: 'col_sawm', name: 'রোজা ও রমযান', color: '#D97706', icon: 'moon' },
    { id: 'col_general', name: 'দৈনন্দিন মাসআলা', color: '#2563EB', icon: 'book' },
  ];

  for (const col of defaultCollections) {
    await dbInstance.runAsync(
      `INSERT OR IGNORE INTO collections (id, name, color, icon, created_at) VALUES (?, ?, ?, ?, ?)`,
      [col.id, col.name, col.color, col.icon, new Date().toISOString()]
    );
  }

  return dbInstance;
}
