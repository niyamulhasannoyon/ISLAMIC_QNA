import { getMongoDb } from '../db/mongodb';
import { batchUpsertFatwas } from '../db';
import { IngestItemInput, IngestResultItem } from '@/types/fatwa';
import { computeFatwaHash, hashToUuid } from '../hash';

export interface SyncBatchResponse {
  inserted: number;
  updated: number;
  skipped: number;
  total: number;
  results: IngestResultItem[];
  storage: 'mongodb' | 'sqlite' | 'dual';
}

/**
 * Enterprise Ingestion & Incremental Sync Pipeline
 * Supports MongoDB Atlas bulkWrite upserts with fallback to local SQLite.
 */
export async function syncFatwaBatch(items: IngestItemInput[]): Promise<SyncBatchResponse> {
  const mongoDb = await getMongoDb();

  // Primary: MongoDB Atlas BulkUpsert if connection configured
  if (mongoDb) {
    const collection = mongoDb.collection('fatwas');

    // Create unique index on sha256_hash and source_url if not present
    await collection.createIndex({ sha256_hash: 1 }, { unique: true });
    await collection.createIndex({ source_url: 1 });
    await collection.createIndex({ source: 1, published_date: -1 });

    const bulkOps = items.map((item) => {
      const question = item.question.trim();
      const answer = item.answer.trim();
      const sha256_hash = (item.sha256_hash || computeFatwaHash({ question, answer })).toLowerCase();
      const id = item.id || hashToUuid(sha256_hash);
      const now = new Date().toISOString();

      return {
        updateOne: {
          filter: { sha256_hash },
          update: {
            $set: {
              source: item.source,
              source_url: item.source_url,
              title: item.title,
              question: item.question,
              answer: item.answer,
              category: item.category || 'General',
              tags: item.tags || [],
              scholar: item.scholar || '',
              published_date: item.published_date || now,
              scraped_at: item.scraped_at || now,
              updated_at: now,
            },
            $setOnInsert: {
              _id: id,
              id: id,
              sha256_hash: sha256_hash,
              created_at: item.published_date || now,
            },
          },
          upsert: true,
        },
      };
    });

    const bulkRes = await collection.bulkWrite(bulkOps, { ordered: false });
    const inserted = bulkRes.upsertedCount || 0;
    const updated = bulkRes.modifiedCount || 0;
    const total = items.length;
    const skipped = total - (inserted + updated);

    // Also sync to SQLite for hybrid backup / local offline capability
    try {
      batchUpsertFatwas(items);
    } catch (e) {
      console.warn('[SQLite Dual-Sync Warning]:', e);
    }

    const results: IngestResultItem[] = items.map((item) => {
      const sha256_hash = (item.sha256_hash || computeFatwaHash({ question: item.question, answer: item.answer })).toLowerCase();
      return {
        id: item.id || hashToUuid(sha256_hash),
        sha256_hash,
        status: 'inserted',
      };
    });

    return {
      inserted,
      updated,
      skipped,
      total,
      results,
      storage: 'dual',
    };
  }

  // Fallback: Pure SQLite Local Ingestion
  const sqliteRes = batchUpsertFatwas(items);
  return {
    ...sqliteRes,
    storage: 'sqlite',
  };
}
