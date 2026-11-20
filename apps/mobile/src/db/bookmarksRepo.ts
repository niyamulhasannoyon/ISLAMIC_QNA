import * as SQLite from 'expo-sqlite';
import type { Bookmark, Collection } from '../types';

export async function isBookmarked(
  db: SQLite.SQLiteDatabase,
  fatwaId: string
): Promise<boolean> {
  const row = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM bookmarks WHERE fatwa_id = ?`,
    [fatwaId]
  );
  return Boolean(row);
}

export async function toggleBookmark(
  db: SQLite.SQLiteDatabase,
  fatwaId: string,
  collectionId?: string | null
): Promise<boolean> {
  const existing = await isBookmarked(db, fatwaId);
  if (existing) {
    await db.runAsync(`DELETE FROM bookmarks WHERE fatwa_id = ?`, [fatwaId]);
    return false; // removed
  } else {
    const id = `bm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await db.runAsync(
      `INSERT INTO bookmarks (id, fatwa_id, collection_id, created_at) VALUES (?, ?, ?, ?)`,
      [id, fatwaId, collectionId || null, new Date().toISOString()]
    );
    return true; // added
  }
}

export async function updateBookmarkCollection(
  db: SQLite.SQLiteDatabase,
  fatwaId: string,
  collectionId: string | null
): Promise<void> {
  await db.runAsync(
    `UPDATE bookmarks SET collection_id = ? WHERE fatwa_id = ?`,
    [collectionId, fatwaId]
  );
}

export async function getBookmarks(
  db: SQLite.SQLiteDatabase,
  collectionId?: string | null
): Promise<Bookmark[]> {
  const params: any[] = [];
  let filterSql = '';

  if (collectionId) {
    filterSql = 'WHERE b.collection_id = ?';
    params.push(collectionId);
  }

  const rows = await db.getAllAsync<any>(
    `SELECT b.id, b.fatwa_id, b.collection_id, b.notes, b.created_at,
            f.source, f.source_url, f.title, f.question, f.answer,
            f.category, f.tags, f.scholar, f.published_date, f.scraped_at, f.sha256_hash
     FROM bookmarks b
     JOIN fatwas f ON b.fatwa_id = f.id
     ${filterSql}
     ORDER BY b.created_at DESC`,
    params
  );

  return rows.map((r) => ({
    id: r.id,
    fatwa_id: r.fatwa_id,
    collection_id: r.collection_id,
    notes: r.notes,
    created_at: r.created_at,
    fatwa: {
      id: r.fatwa_id,
      source: r.source,
      source_url: r.source_url,
      title: r.title,
      question: r.question,
      answer: r.answer,
      category: r.category,
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags || [],
      scholar: r.scholar,
      published_date: r.published_date,
      scraped_at: r.scraped_at,
      sha256_hash: r.sha256_hash,
    },
  }));
}

export async function getCollections(
  db: SQLite.SQLiteDatabase
): Promise<Collection[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT c.*, COUNT(b.id) as count
     FROM collections c
     LEFT JOIN bookmarks b ON c.id = b.collection_id
     GROUP BY c.id
     ORDER BY c.created_at ASC`
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    icon: r.icon,
    created_at: r.created_at,
    count: r.count || 0,
  }));
}

export async function createCollection(
  db: SQLite.SQLiteDatabase,
  name: string,
  color: string = '#059669',
  icon: string = 'folder'
): Promise<Collection> {
  const id = `col_${Date.now()}`;
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO collections (id, name, color, icon, created_at) VALUES (?, ?, ?, ?, ?)`,
    [id, name.trim(), color, icon, now]
  );
  return { id, name: name.trim(), color, icon, created_at: now, count: 0 };
}

export async function deleteCollection(
  db: SQLite.SQLiteDatabase,
  collectionId: string
): Promise<void> {
  await db.runAsync(`DELETE FROM collections WHERE id = ?`, [collectionId]);
}
