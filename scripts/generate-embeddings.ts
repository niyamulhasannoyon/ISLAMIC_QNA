#!/usr/bin/env tsx
/**
 * Standalone MongoDB Atlas Vector Embedding Migration & Backfill Tool
 * 
 * Generates 1536-dimensional vector embeddings for existing fatwa documents
 * using OpenAI's 'text-embedding-3-small' model on formatted 'title + " " + content'.
 * 
 * Features:
 * - Standalone execution: npx tsx scripts/generate-embeddings.ts
 * - Automatic environment loading (.env.local & .env)
 * - Rate-limit compliance with exponential backoff on HTTP 429
 * - Batching with MongoDB bulkWrite operations
 * - CLI flags: --batch=<n>, --limit=<n>, --force, --dry-run
 * - Live progress, rate (docs/sec), and ETA calculations
 */

import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';
import OpenAI from 'openai';

// Configuration constants
const EMBEDDING_MODEL = 'text-embedding-3-small';
const VECTOR_DIMENSIONS = 1536;
const DEFAULT_BATCH_SIZE = 50;
const MAX_CHARS_PER_DOC = 2000;

// Load environment variables manually from .env.local or .env if not loaded by runner
function loadEnvironment(): void {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const match = trimmed.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      } catch {}
    }
  }
}

loadEnvironment();

// Parse CLI flags
interface CliOptions {
  batchSize: number;
  limit: number;
  force: boolean;
  dryRun: boolean;
}

function parseCliArgs(): CliOptions {
  const args = process.argv.slice(2);
  let batchSize = DEFAULT_BATCH_SIZE;
  let limit = 0;
  let force = false;
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith('--batch=')) {
      batchSize = Math.max(1, parseInt(arg.split('=')[1], 10) || DEFAULT_BATCH_SIZE);
    } else if (arg.startsWith('--limit=')) {
      limit = Math.max(0, parseInt(arg.split('=')[1], 10) || 0);
    } else if (arg === '--force') {
      force = true;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: npx tsx scripts/generate-embeddings.ts [options]

Options:
  --batch=<number>   Number of documents per OpenAI batch request (default: 50)
  --limit=<number>   Maximum number of documents to embed (default: 0 = all)
  --force            Re-embed documents even if they already have an embedding
  --dry-run          Preview documents to be processed without writing to MongoDB
  -h, --help         Show this help message
`);
      process.exit(0);
    }
  }

  return { batchSize, limit, force, dryRun };
}

/**
 * Formats a document into 'title + " " + content' representation.
 */
function formatForEmbedding(doc: {
  title?: string;
  content?: string;
  question?: string;
  answer?: string;
}): string {
  const title = (doc.title || '').trim();
  const rawContent = (doc.content || '').trim();
  const question = (doc.question || '').trim();
  const answer = (doc.answer || '').trim();

  let body = '';
  if (rawContent) {
    body = rawContent;
  } else if (question && question !== title) {
    body = `${question}\n${answer}`;
  } else {
    body = answer;
  }

  // Combine title + " " + content per architecture specification
  const combined = `${title} ${body}`.trim();
  return combined.slice(0, MAX_CHARS_PER_DOC);
}

/**
 * Executes a batch embedding request against OpenAI with exponential backoff.
 */
async function generateEmbeddingsWithRetry(
  openai: OpenAI,
  texts: string[],
  maxRetries = 5
): Promise<Array<number[] | null>> {
  const results: Array<number[] | null> = new Array(texts.length).fill(null);
  const sanitized = texts.map((t) => (t && t.length > 0 ? t : 'ফতোয়া'));

  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: sanitized,
      });

      if (response?.data && Array.isArray(response.data)) {
        for (const item of response.data) {
          results[item.index] = item.embedding;
        }
        return results;
      }
      break;
    } catch (err: any) {
      attempt++;
      const isRateLimit = err?.status === 429 || err?.message?.includes('rate');
      const waitMs = Math.min(60000, Math.pow(2, attempt) * 1000 + Math.random() * 500);

      console.warn(
        `[Retry ${attempt}/${maxRetries}] ${isRateLimit ? 'Rate limit hit (429)' : 'OpenAI API error'}. Waiting ${(waitMs / 1000).toFixed(1)}s...`
      );

      if (attempt >= maxRetries) {
        console.error(`[Error]: Batch of ${texts.length} items failed after ${maxRetries} retries.`);
        // Fallback to individual items for resilience
        for (let i = 0; i < sanitized.length; i++) {
          try {
            const single = await openai.embeddings.create({
              model: EMBEDDING_MODEL,
              input: sanitized[i],
            });
            results[i] = single.data[0].embedding;
          } catch {
            results[i] = null;
          }
        }
        return results;
      }

      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  return results;
}

async function main() {
  const options = parseCliArgs();

  console.log('===========================================================');
  console.log('  MongoDB Atlas Vector Search Embedding Batch Migrator    ');
  console.log('===========================================================\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('ERROR: MONGODB_URI is not set in environment or .env.local.');
    console.error('Please configure MONGODB_URI with your Atlas connection string.');
    process.exit(1);
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.error('ERROR: OPENAI_API_KEY is not set in environment or .env.local.');
    console.error('Please configure OPENAI_API_KEY with your OpenAI API key.');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey: openaiKey });

  console.log('Connecting to MongoDB Atlas...');
  const client = new MongoClient(mongoUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });

  await client.connect();
  console.log('Successfully connected to MongoDB Atlas.');

  const db = client.db(process.env.MONGODB_DB_NAME || 'fatwas_db');
  const collection = db.collection('fatwas');

  // Match documents needing embeddings
  const query: any = options.force
    ? {}
    : {
        $or: [
          { embedding: { $exists: false } },
          { embedding: null },
          { embedding: { $size: 0 } },
        ],
      };

  const totalUnprocessed = await collection.countDocuments(query);
  console.log(`Documents to embed in 'fatwas' collection: ${totalUnprocessed}`);

  if (totalUnprocessed === 0) {
    console.log('All documents already have vector embeddings! Nothing to do.');
    await client.close();
    process.exit(0);
  }

  const targetCount = options.limit > 0 ? Math.min(options.limit, totalUnprocessed) : totalUnprocessed;

  console.log(`\nConfiguration:`);
  console.log(`- Model:      ${EMBEDDING_MODEL} (${VECTOR_DIMENSIONS} dimensions)`);
  console.log(`- Target:     ${targetCount} documents`);
  console.log(`- Batch Size: ${options.batchSize} items/request`);
  console.log(`- Dry Run:    ${options.dryRun ? 'YES (no updates saved)' : 'NO'}`);
  console.log(`-----------------------------------------------------------\n`);

  let processedCount = 0;
  let successCount = 0;
  const startTime = Date.now();

  while (processedCount < targetCount) {
    const currentLimit = Math.min(options.batchSize, targetCount - processedCount);

    const docs = await collection
      .find(query, {
        projection: {
          _id: 1,
          id: 1,
          title: 1,
          content: 1,
          question: 1,
          answer: 1,
          category: 1,
          scholar: 1,
        },
      })
      .limit(currentLimit)
      .toArray();

    if (!docs || docs.length === 0) break;

    const formattedTexts = docs.map((d: any) => formatForEmbedding(d));

    if (!options.dryRun) {
      const embeddings = await generateEmbeddingsWithRetry(openai, formattedTexts);

      const bulkOps: any[] = [];
      const now = new Date().toISOString();

      for (let i = 0; i < docs.length; i++) {
        const vec = embeddings[i];
        if (vec && Array.isArray(vec) && vec.length === VECTOR_DIMENSIONS) {
          bulkOps.push({
            updateOne: {
              filter: { _id: docs[i]._id },
              update: {
                $set: {
                  embedding: vec,
                  embedded_at: now,
                },
              },
            },
          });
        }
      }

      if (bulkOps.length > 0) {
        const res = await collection.bulkWrite(bulkOps, { ordered: false });
        successCount += res.modifiedCount || 0;
      }
    } else {
      successCount += docs.length;
    }

    processedCount += docs.length;

    // Calculate metrics
    const elapsedSec = (Date.now() - startTime) / 1000;
    const rate = processedCount / (elapsedSec || 0.001);
    const percent = ((processedCount / targetCount) * 100).toFixed(1);
    const remainingDocs = targetCount - processedCount;
    const remainingSec = Math.max(0, Math.round(remainingDocs / (rate || 1)));

    console.log(
      `[Progress] ${processedCount}/${targetCount} (${percent}%) | ` +
      `Success: ${successCount} | ` +
      `Rate: ${rate.toFixed(1)} docs/sec | ` +
      `ETA: ${Math.floor(remainingSec / 60)}m ${remainingSec % 60}s`
    );

    // Subtle 150ms throttle between batches to avoid bursting TPM limits
    if (!options.dryRun && processedCount < targetCount) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n===========================================================');
  console.log('  Embedding Generation Complete!                          ');
  console.log('===========================================================');
  console.log(`- Total Processed: ${processedCount}`);
  console.log(`- Total Embedded:  ${successCount}`);
  console.log(`- Total Time:      ${totalTimeSec}s`);
  console.log(`- Collection:      fatwas`);
  console.log(`- Status:          Ready for Atlas Vector Search ($vectorSearch)\n`);

  await client.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error during embedding generation:', err);
  process.exit(1);
});
