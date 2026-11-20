import Database from 'better-sqlite3';
import path from 'path';
import { getPostgresPool, initPostgresSchema } from '../apps/web/src/lib/db/postgres';
import { normalizeBengaliText } from '../packages/text-utils/src/normalize';
import { stemBengaliToken } from '../packages/text-utils/src/stemmer';
import { getCanonicalTerm } from '../packages/text-utils/src/synonyms';

function extractAndProcessTokens(text: string): string {
  if (!text) return '';
  const normalized = normalizeBengaliText(text);
  const raw = normalized.split(/[\s,.;:!?"'()\[\]{}।\\/\-_–—+*=<>#@%^&|~`]+/u).filter(Boolean);
  const processed: string[] = [];
  for (const t of raw) {
    const canonical = getCanonicalTerm(t);
    const stemmed = stemBengaliToken(canonical);
    processed.push(canonical);
    if (stemmed !== canonical && stemmed.length >= 2) {
      processed.push(stemmed);
    }
  }
  return processed.join(' ');
}

async function migrateData() {
  console.log('--- Initializing Postgres Schema ---');
  await initPostgresSchema();

  const sqlitePath = path.resolve(process.cwd(), 'data/fatwas.db');
  console.log(`--- Reading SQLite database at ${sqlitePath} ---`);
  const sqlite = new Database(sqlitePath, { readonly: true });

  const totalRow = sqlite.prepare('SELECT count(*) as count FROM fatwas').get() as { count: number };
  console.log(`Total fatwas to migrate: ${totalRow.count}`);

  const pool = getPostgresPool();
  const BATCH_SIZE = 250;

  let offset = 0;
  let migrated = 0;
  const startTime = Date.now();

  const selectStmt = sqlite.prepare(`
    SELECT id, source, source_url, title, question, answer, category, tags, scholar, published_date, sha256_hash, scraped_at, created_at, updated_at
    FROM fatwas
    ORDER BY created_at ASC
    LIMIT ? OFFSET ?
  `);

  while (offset < totalRow.count) {
    const rows = selectStmt.all(BATCH_SIZE, offset) as any[];
    if (rows.length === 0) break;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const row of rows) {
        let tagsArr: string[] = [];
        try {
          tagsArr = JSON.parse(row.tags || '[]');
        } catch {
          tagsArr = [];
        }

        const titleText = extractAndProcessTokens(row.title || '');
        const tagsText = extractAndProcessTokens(tagsArr.join(' '));
        const questionText = extractAndProcessTokens(row.question || '');
        const categoryText = extractAndProcessTokens(row.category || '');
        const answerText = extractAndProcessTokens((row.answer || '').slice(0, 3000));

        await client.query(
          `
          INSERT INTO fatwas (
            id, source, source_url, title, question, answer, category, tags, scholar,
            published_date, sha256_hash, scraped_at, created_at, updated_at, tsv
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
            setweight(to_tsvector('simple', $15), 'A') ||
            setweight(to_tsvector('simple', $16), 'B') ||
            setweight(to_tsvector('simple', $17), 'B') ||
            setweight(to_tsvector('simple', $18), 'C') ||
            setweight(to_tsvector('simple', $19), 'D')
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            question = EXCLUDED.question,
            answer = EXCLUDED.answer,
            category = EXCLUDED.category,
            tags = EXCLUDED.tags,
            scholar = EXCLUDED.scholar,
            tsv = EXCLUDED.tsv,
            updated_at = EXCLUDED.updated_at
        `,
          [
            row.id,
            row.source,
            row.source_url,
            row.title,
            row.question,
            row.answer,
            row.category,
            JSON.stringify(tagsArr),
            row.scholar || '',
            row.published_date || '',
            row.sha256_hash || '',
            row.scraped_at || '',
            row.created_at || new Date().toISOString(),
            row.updated_at || new Date().toISOString(),
            titleText,
            tagsText,
            questionText,
            categoryText,
            answerText,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    migrated += rows.length;
    offset += BATCH_SIZE;

    const progressPct = ((migrated / totalRow.count) * 100).toFixed(1);
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(`\rMigrated: ${migrated}/${totalRow.count} (${progressPct}%) in ${elapsedSec}s`);
  }

  console.log(`\n✅ Migration Complete! Migrated ${migrated} fatwas into PostgreSQL in ${((Date.now() - startTime) / 1000).toFixed(1)}s.`);
  await pool.end();
}

migrateData().catch((e) => {
  console.error('\n❌ Migration failed:', e);
  process.exit(1);
});
