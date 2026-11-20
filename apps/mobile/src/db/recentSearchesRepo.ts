import * as SQLite from 'expo-sqlite';
import type { RecentSearch } from '../types';

export async function addRecentSearch(
  db: SQLite.SQLiteDatabase,
  query: string
): Promise<void> {
  const clean = query.trim();
  if (!clean || clean.length < 2) return;

  const id = `rec_${Date.now()}`;
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    // Delete duplicate if exists
    await db.runAsync(`DELETE FROM recent_searches WHERE query = ?`, [clean]);
    // Insert new query at top
    await db.runAsync(
      `INSERT INTO recent_searches (id, query, timestamp) VALUES (?, ?, ?)`,
      [id, clean, now]
    );
    // Keep only latest 20 searches
    await db.runAsync(`
      DELETE FROM recent_searches
      WHERE id NOT IN (
        SELECT id FROM recent_searches ORDER BY timestamp DESC LIMIT 20
      )
    `);
  });
}

export async function getRecentSearches(
  db: SQLite.SQLiteDatabase
): Promise<RecentSearch[]> {
  const rows = await db.getAllAsync<RecentSearch>(
    `SELECT * FROM recent_searches ORDER BY timestamp DESC LIMIT 15`
  );
  return rows;
}

export async function deleteRecentSearch(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync(`DELETE FROM recent_searches WHERE id = ?`, [id]);
}

export async function clearRecentSearches(
  db: SQLite.SQLiteDatabase
): Promise<void> {
  await db.runAsync(`DELETE FROM recent_searches`);
}
