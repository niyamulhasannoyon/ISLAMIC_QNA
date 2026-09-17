#!/usr/bin/env tsx
/**
 * Standalone MongoDB Atlas Vector Embedding Migration & Backfill Tool
 * 
 * Generates 1536-dimensional vector embeddings for fatwa documents
 * using OpenAI's 'text-embedding-3-small' model on combined:
 * `${doc.title} ${doc.question || ''} ${doc.content || ''}`
 * 
 * Features:
 * - Scans documents matching `{ embedding: { $exists: false } }` (or null/empty)
 * - Strips HTML tags and normalizes whitespace
 * - Truncates safely up to 8000 tokens (~24,000 characters)
 * - Batches requests (50 documents/request) to OpenAI API
 * - Uses MongoDB collection.bulkWrite with updateOne
 * - Exponential backoff retry logic with jitter on HTTP 429 and network errors
 * - Terminal progress bar, docs/sec throughput, and ETA calculation
 * - Supports CLI flags: --batch=<n>, --limit=<n>, --force, --dry-run
 */

import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';
import OpenAI from 'openai';

// Configuration constants
const EMBEDDING_MODEL = 'text-embedding-3-small';
const VECTOR_DIMENSIONS = 1536;
const DEFAULT_BATCH_SIZE = 50;
// text-embedding-3-small max context is 8,191 tokens.
// In Bengali & English, 1 token is approx ~3 characters.
// 24,000 characters safely yields ~7,500-8,000 tokens without overflowing.
const MAX_CHARS_SAFE_8000_TOKENS = 24000;

// Load environment variables from .env.local and .env
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
  --force            Re-embed all documents even if embedding already exists
  --dry-run          Preview documents to be processed without updating MongoDB
  -h, --help         Show this help message
`);
      process.exit(0);
    }
  }

  return { batchSize, limit, force, dryRun };
}

/**
 * Strips HTML tags and unescapes common HTML entities.
 */
export function cleanHtml(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Combines relevant text fields for embedding:
 * `${doc.title} ${doc.question || ''} ${doc.content || ''}`
 * (cleans HTML tags, collapses whitespace, and truncates safely up to 8000 tokens).
 */
export function formatDocForEmbedding(doc: {
  title?: string;
  question?: string;
  content?: string;
  answer?: string;
}): string {
  const title = cleanHtml(doc.title || '');
  const question = cleanHtml(doc.question || '');
  // Fatwas in MongoDB can store the body in 'content' or 'answer'
  const content = cleanHtml(doc.content || doc.answer || '');

  let combined = `${title} ${question} ${content}`.replace(/\s+/g, ' ').trim();

  // If text exceeds safe 8000 token limit (~24,000 characters), truncate gracefully at word boundary
  if (combined.length > MAX_CHARS_SAFE_8000_TOKENS) {
    const truncated = combined.slice(0, MAX_CHARS_SAFE_8000_TOKENS);
    const lastSpace = truncated.lastIndexOf(' ');
    combined = (lastSpace > MAX_CHARS_SAFE_8000_TOKENS - 200 ? truncated.slice(0, lastSpace) : truncated).trim();
  }

  return combined;
}

/**
 * Generates embeddings for an array of texts with exponential backoff & jitter.
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
      const isRateLimit = err?.status === 429 || err?.message?.toLowerCase().includes('rate');
      const baseWait = Math.pow(2, attempt) * 1000;
      const jitter = Math.random() * 800;
      const waitMs = Math.min(45000, baseWait + jitter);

      console.warn(
        `\n  ⚠️  [Retry ${attempt}/${maxRetries}] ${isRateLimit ? 'Rate limit hit (429)' : 'OpenAI API error'}: ${err?.message || err}. Pausing ${(waitMs / 1000).toFixed(1)}s...`
      );

      if (attempt >= maxRetries) {
        console.error(`\n  ❌ Batch of ${texts.length} failed after ${maxRetries} attempts. Falling back to single-item requests...`);
        // Fallback: Attempt each document individually so valid docs aren't lost
        for (let i = 0; i < sanitized.length; i++) {
          try {
            const single = await openai.embeddings.create({
              model: EMBEDDING_MODEL,
              input: sanitized[i],
            });
            results[i] = single.data[0].embedding;
          } catch (singleErr: any) {
            console.error(`     - Failed item #${i}: ${singleErr?.message || singleErr}`);
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

/**
 * Renders a visual ASCII progress bar in stdout.
 */
function renderProgressBar(current: number, total: number, barLength = 25): string {
  const ratio = total > 0 ? Math.min(1, current / total) : 0;
  const filled = Math.round(ratio * barLength);
  const empty = barLength - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}]`;
}

async function main() {
  const options = parseCliArgs();

  console.log('===========================================================');
  console.log('   DeenQnA: MongoDB Atlas Vector Embedding Migration       ');
  console.log('===========================================================\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ ERROR: MONGODB_URI is not set in environment or .env.local.');
    console.error('   Please configure MONGODB_URI with your MongoDB Atlas connection string.');
    process.exit(1);
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.error('❌ ERROR: OPENAI_API_KEY is not set in environment or .env.local.');
    console.error('   Please configure OPENAI_API_KEY with your OpenAI API key.');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey: openaiKey });

  console.log('Connecting to MongoDB Atlas...');
  const client = new MongoClient(mongoUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });

  await client.connect();
  console.log('✅ Connected to MongoDB Atlas successfully.');

  const dbName = process.env.MONGODB_DB_NAME || 'fatwas_db';
  const db = client.db(dbName);
  const collection = db.collection('fatwas');

  // Find documents needing embeddings: { embedding: { $exists: false } } (or null/empty unless --force)
  const filterQuery: any = options.force
    ? {}
    : {
        $or: [
          { embedding: { $exists: false } },
          { embedding: null },
          { embedding: { $size: 0 } },
        ],
      };

  const totalUnprocessed = await collection.countDocuments(filterQuery);
  console.log(`Documents to embed in '${collection.collectionName}': ${totalUnprocessed}`);

  if (totalUnprocessed === 0) {
    console.log('\n🎉 All documents in the collection already have vector embeddings! Nothing to do.');
    await client.close();
    process.exit(0);
  }

  const targetCount = options.limit > 0 ? Math.min(options.limit, totalUnprocessed) : totalUnprocessed;

  console.log('\nMigration Configuration:');
  console.log(`- Model:          ${EMBEDDING_MODEL} (${VECTOR_DIMENSIONS} dimensions)`);
  console.log(`- Database:       ${dbName}`);
  console.log(`- Collection:     ${collection.collectionName}`);
  console.log(`- Target Docs:    ${targetCount}`);
  console.log(`- Batch Size:     ${options.batchSize} docs/request`);
  console.log(`- Dry Run:        ${options.dryRun ? 'YES (preview only, no DB writes)' : 'NO'}`);
  console.log('-----------------------------------------------------------\n');

  let processedCount = 0;
  let successCount = 0;
  const startTime = Date.now();

  while (processedCount < targetCount) {
    const currentBatchLimit = Math.min(options.batchSize, targetCount - processedCount);

    // Fetch batch of documents
    const docs = await collection
      .find(filterQuery, {
        projection: {
          _id: 1,
          id: 1,
          title: 1,
          question: 1,
          content: 1,
          answer: 1,
          category: 1,
          scholar: 1,
        },
      })
      .limit(currentBatchLimit)
      .toArray();

    if (!docs || docs.length === 0) break;

    // Combine relevant text fields: `${doc.title} ${doc.question || ''} ${doc.content || ''}`
    const formattedTexts = docs.map((doc: any) => formatDocForEmbedding(doc));

    if (!options.dryRun) {
      // Generate batch embeddings via OpenAI
      const embeddings = await generateEmbeddingsWithRetry(openai, formattedTexts);

      const bulkOps: any[] = [];
      const nowIso = new Date().toISOString();

      for (let i = 0; i < docs.length; i++) {
        const vec = embeddings[i];
        if (vec && Array.isArray(vec) && vec.length === VECTOR_DIMENSIONS) {
          bulkOps.push({
            updateOne: {
              filter: { _id: docs[i]._id },
              update: {
                $set: {
                  embedding: vec,
                  embedded_at: nowIso,
                },
              },
            },
          });
        }
      }

      // Execute bulkWrite
      if (bulkOps.length > 0) {
        const bulkResult = await collection.bulkWrite(bulkOps, { ordered: false });
        successCount += (bulkResult.modifiedCount || 0) + (bulkResult.upsertedCount || 0);
      }
    } else {
      successCount += docs.length;
    }

    processedCount += docs.length;

    // Calculate rates and ETA
    const elapsedSec = (Date.now() - startTime) / 1000;
    const rate = processedCount / (elapsedSec || 0.001);
    const percent = ((processedCount / targetCount) * 100).toFixed(1);
    const remainingDocs = targetCount - processedCount;
    const remainingSec = Math.max(0, Math.round(remainingDocs / (rate || 1)));
    const etaMins = Math.floor(remainingSec / 60);
    const etaSecs = remainingSec % 60;
    const pBar = renderProgressBar(processedCount, targetCount);

    console.log(
      `${pBar} Processed ${processedCount}/${targetCount} documents (${percent}%) | ` +
      `Success: ${successCount} | ` +
      `Rate: ${rate.toFixed(1)} docs/sec | ` +
      `ETA: ${etaMins}m ${etaSecs}s`
    );

    // Polite 100ms throttle between batches to avoid sudden burst rate limits
    if (!options.dryRun && processedCount < targetCount) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n===========================================================');
  console.log('  🎉 Embedding Migration Complete!                         ');
  console.log('===========================================================');
  console.log(`- Documents Processed: ${processedCount}`);
  console.log(`- Documents Embedded:  ${successCount}`);
  console.log(`- Elapsed Time:        ${totalTimeSec}s`);
  console.log(`- Database:            ${dbName}`);
  console.log(`- Collection:          ${collection.collectionName}`);
  console.log(`- Status:              Ready for MongoDB Atlas $vectorSearch\n`);

  await client.close();
  process.exit(0);
}

const isDirectCliRun =
  process.argv[1] &&
  (process.argv[1].endsWith('generate-embeddings.ts') ||
    process.argv[1].endsWith('generate-embeddings.js') ||
    process.argv[1].endsWith('generate-embeddings'));

if (isDirectCliRun) {
  main().catch((err) => {
    console.error('\n❌ Fatal error during embedding migration:', err);
    process.exit(1);
  });
}
