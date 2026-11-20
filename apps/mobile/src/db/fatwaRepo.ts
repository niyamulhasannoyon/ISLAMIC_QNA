import * as SQLite from 'expo-sqlite';
import { normalizeBengaliText, stemBengaliToken, getSynonymsAndVariants } from '@repo/text-utils';
import type { LocalFatwa, CategorySummary } from '../types';

/**
 * Prepares normalized search corpus using @repo/text-utils
 */
export function buildNormalizedCorpus(title: string, question: string, answer: string): string {
  const fullText = `${title} ${question} ${answer}`;
  const normalized = normalizeBengaliText(fullText);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const stemmed = tokens.map(stemBengaliToken);
  return stemmed.join(' ');
}

/**
 * Batch insert / upsert fatwas into SQLite and FTS5 table
 */
export async function batchUpsertLocalFatwas(
  db: SQLite.SQLiteDatabase,
  fatwas: LocalFatwa[]
): Promise<number> {
  if (fatwas.length === 0) return 0;

  await db.withTransactionAsync(async () => {
    for (const f of fatwas) {
      const normalizedCorpus = buildNormalizedCorpus(f.title, f.question, f.answer);
      const tagsJson = JSON.stringify(f.tags || []);
      const now = new Date().toISOString();

      await db.runAsync(
        `INSERT INTO fatwas (
          id, source, source_url, title, question, answer, category,
          tags, scholar, published_date, scraped_at, sha256_hash,
          normalized_text, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          source = excluded.source,
          source_url = excluded.source_url,
          title = excluded.title,
          question = excluded.question,
          answer = excluded.answer,
          category = excluded.category,
          tags = excluded.tags,
          scholar = excluded.scholar,
          published_date = excluded.published_date,
          scraped_at = excluded.scraped_at,
          sha256_hash = excluded.sha256_hash,
          normalized_text = excluded.normalized_text,
          synced_at = excluded.synced_at`,
        [
          f.id,
          f.source,
          f.source_url,
          f.title,
          f.question,
          f.answer,
          f.category || 'General',
          tagsJson,
          f.scholar || '',
          f.published_date || now,
          f.scraped_at || now,
          f.sha256_hash || '',
          normalizedCorpus,
          now,
        ]
      );

      // Refresh FTS5 index
      await db.runAsync(`DELETE FROM fatwas_fts WHERE id = ?`, [f.id]);
      await db.runAsync(
        `INSERT INTO fatwas_fts (id, title, question, answer, normalized_text, category, scholar)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [f.id, f.title, f.question, f.answer, normalizedCorpus, f.category || 'General', f.scholar || '']
      );
    }
  });

  return fatwas.length;
}

/**
 * Full-text offline search using FTS5 and @repo/text-utils expansion
 */
export async function searchOfflineFatwas(
  db: SQLite.SQLiteDatabase,
  query: string,
  options: {
    source?: string;
    category?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ results: LocalFatwa[]; total: number }> {
  const limit = options.limit || 20;
  const offset = options.offset || 0;
  const cleanQ = (query || '').trim();

  if (!cleanQ) {
    // Browse mode
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (options.source && options.source !== 'All') {
      whereClauses.push('source = ?');
      params.push(options.source);
    }
    if (options.category && options.category !== 'All') {
      whereClauses.push('category = ?');
      params.push(options.category);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRow = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM fatwas ${whereSql}`,
      params
    );
    const total = countRow?.count || 0;

    const rows = await db.getAllAsync<any>(
      `SELECT * FROM fatwas ${whereSql} ORDER BY published_date DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const results = rows.map((r) => ({
      ...r,
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags || [],
    }));

    return { results, total };
  }

  // Build FTS5 search query
  const normalized = normalizeBengaliText(cleanQ);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const expandedTokens = tokens.flatMap((t) => {
    const root = stemBengaliToken(t);
    const syns = getSynonymsAndVariants(t).slice(0, 3);
    return [t, root, ...syns];
  });

  // Deduplicate and escape FTS5 tokens
  const uniqueTokens = Array.from(new Set(expandedTokens))
    .map((t) => t.replace(/["*]/g, ''))
    .filter((t) => t.length > 0);

  const ftsQuery = uniqueTokens.length > 0
    ? uniqueTokens.map((t) => `"${t}"*`).join(' OR ')
    : cleanQ;

  const whereExtra: string[] = [];
  const params: any[] = [ftsQuery];

  if (options.source && options.source !== 'All') {
    whereExtra.push('f.source = ?');
    params.push(options.source);
  }
  if (options.category && options.category !== 'All') {
    whereExtra.push('f.category = ?');
    params.push(options.category);
  }

  const extraSql = whereExtra.length > 0 ? `AND ${whereExtra.join(' AND ')}` : '';

  const countRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM fatwas_fts fts
     JOIN fatwas f ON fts.id = f.id
     WHERE fatwas_fts MATCH ? ${extraSql}`,
    params
  );
  const total = countRow?.count || 0;

  const rows = await db.getAllAsync<any>(
    `SELECT f.*,
            bm25(fatwas_fts, 5.0, 3.0, 1.0, 2.0, 1.0, 1.0) as rank,
            snippet(fatwas_fts, 3, '<mark>', '</mark>', '...', 25) as fts_snippet
     FROM fatwas_fts fts
     JOIN fatwas f ON fts.id = f.id
     WHERE fatwas_fts MATCH ? ${extraSql}
     ORDER BY rank ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const results: LocalFatwa[] = rows.map((r) => ({
    ...r,
    tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags || [],
    score: Math.abs(r.rank || 0),
    snippet: r.fts_snippet || r.answer.slice(0, 150) + '...',
  }));

  return { results, total };
}

/**
 * Get fatwa by ID from local SQLite store
 */
export async function getLocalFatwaById(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<LocalFatwa | null> {
  const row = await db.getFirstAsync<any>(`SELECT * FROM fatwas WHERE id = ?`, [id]);
  if (!row) return null;

  return {
    ...row,
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags || [],
  };
}

/**
 * Get category aggregates for browsing
 */
export async function getLocalCategories(
  db: SQLite.SQLiteDatabase
): Promise<CategorySummary[]> {
  const rows = await db.getAllAsync<CategorySummary>(
    `SELECT category as name, COUNT(*) as count
     FROM fatwas
     WHERE category IS NOT NULL AND category != ''
     GROUP BY category
     ORDER BY count DESC`
  );
  return rows;
}

/**
 * Total stored fatwas count
 */
export async function getLocalFatwaCount(db: SQLite.SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM fatwas`);
  return row?.count || 0;
}
