#!/usr/bin/env tsx
/**
 * Intent-Aware Semantic Vector Embedding Builder for PostgreSQL (pgvector)
 *
 * Embeds fatwa documents from `title + question` using the swappable Embedder
 * (Local Transformers multilingual-e5 or OpenAI text-embedding-3-small).
 * Only embeds NEW or CHANGED docs (where embedding IS NULL or hash mismatch).
 *
 * Usage:
 *   npx tsx scripts/build-embeddings.ts [options]
 *
 * Options:
 *   --batch=<n>     Batch size (default: 50)
 *   --limit=<n>     Max docs to embed (default: 0 = all)
 *   --force         Re-embed even if embedding exists
 */

import { getPostgresPool } from '../apps/web/src/lib/db/postgres';
import { getEmbedder, TARGET_VECTOR_DIMENSIONS } from '../apps/web/src/lib/search/embedder';

interface CliOptions {
  batchSize: number;
  limit: number;
  force: boolean;
}

function parseCliArgs(): CliOptions {
  const args = process.argv.slice(2);
  let batchSize = 50;
  let limit = 0;
  let force = false;

  for (const arg of args) {
    if (arg.startsWith('--batch=')) {
      batchSize = Math.max(1, parseInt(arg.split('=')[1], 10) || 50);
    } else if (arg.startsWith('--limit=')) {
      limit = Math.max(0, parseInt(arg.split('=')[1], 10) || 0);
    } else if (arg === '--force') {
      force = true;
    }
  }

  return { batchSize, limit, force };
}

async function main() {
  const options = parseCliArgs();
  const pool = getPostgresPool();
  const embedder = getEmbedder();

  console.log(`\n============================================================`);
  console.log(`Starting Vector Embedding Build (pgvector HNSW)`);
  console.log(`Provider: ${embedder.name} | Dimensions: ${TARGET_VECTOR_DIMENSIONS}`);
  console.log(`Batch Size: ${options.batchSize} | Limit: ${options.limit || 'ALL'}`);
  console.log(`============================================================\n`);

  // Count pending records
  const countQuery = options.force
    ? 'SELECT count(*) FROM fatwas'
    : 'SELECT count(*) FROM fatwas WHERE embedding IS NULL';
  const countRes = await pool.query(countQuery);
  const totalToEmbed = parseInt(countRes.rows[0].count, 10);

  console.log(`Total documents needing embedding: ${totalToEmbed}`);
  if (totalToEmbed === 0) {
    console.log('✅ All documents already have up-to-date embeddings. Exiting.');
    await pool.end();
    return;
  }

  const targetCount = options.limit > 0 ? Math.min(totalToEmbed, options.limit) : totalToEmbed;
  let processed = 0;
  const startTime = Date.now();

  while (processed < targetCount) {
    const currentBatchLimit = Math.min(options.batchSize, targetCount - processed);
    const selectQuery = options.force
      ? `SELECT id, title, question FROM fatwas ORDER BY id LIMIT $1 OFFSET $2`
      : `SELECT id, title, question FROM fatwas WHERE embedding IS NULL ORDER BY id LIMIT $1`;

    const selectParams = options.force ? [currentBatchLimit, processed] : [currentBatchLimit];
    const { rows } = await pool.query(selectQuery, selectParams);

    if (rows.length === 0) break;

    // Per requirements: "Build embeddings for each doc from title + question (not the full answer)"
    const texts = rows.map((r) => {
      const q = (r.question || '').trim();
      const t = (r.title || '').trim();
      return q && q !== t ? `${t} ${q}` : t;
    });

    const vectors = await embedder.embedBatch(texts);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < rows.length; i++) {
        const vec = vectors[i];
        if (vec) {
          const vectorStr = `[${vec.join(',')}]`;
          await client.query('UPDATE fatwas SET embedding = $1 WHERE id = $2', [vectorStr, rows[i].id]);
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    processed += rows.length;
    const progressPct = ((processed / targetCount) * 100).toFixed(1);
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    const docsPerSec = (processed / Math.max(0.1, (Date.now() - startTime) / 1000)).toFixed(1);
    process.stdout.write(`\rProcessed: ${processed}/${targetCount} (${progressPct}%) in ${elapsedSec}s (${docsPerSec} docs/s)`);
  }

  const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n✅ Successfully generated and saved embeddings for ${processed} fatwas in ${totalTimeSec}s.`);
  await pool.end();
}

main().catch((err) => {
  console.error('\n❌ Build embeddings failed:', err);
  process.exit(1);
});
