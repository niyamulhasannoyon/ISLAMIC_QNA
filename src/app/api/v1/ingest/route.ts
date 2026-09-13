import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { batchUpsertFatwas } from '@/lib/db';
import { refreshSearchIndex } from '@/lib/search';
import { IngestItemInput, FatwaSource } from '@/types/fatwa';
import { computeFatwaHash, isValidSha256 } from '@/lib/hash';

export const dynamic = 'force-dynamic';

const FatwaItemSchema = z.object({
  source: z.string().min(1, 'Source is required'),
  source_url: z.string().min(1, 'Source URL is required'),
  title: z.string().min(1, 'Title is required'),
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(1, 'Answer is required'),
  category: z.string().optional().default('General'),
  tags: z.array(z.string()).optional().default([]),
  scholar: z.string().optional().default(''),
  published_date: z.string().optional(),
  sha256_hash: z.string().optional(),
  scraped_at: z.string().optional(),
  // Backwards compatibility keys
  hash: z.string().optional(),
  createdAt: z.string().optional(),
});

const IngestPayloadSchema = z.union([
  z.array(FatwaItemSchema),
  FatwaItemSchema,
  z.object({
    items: z.array(FatwaItemSchema),
  }),
]);

function verifyToken(req: NextRequest): boolean {
  const secret = process.env.INGESTION_SECRET_TOKEN;
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    return false;
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      if (parts[1] === secret) return true;
    }
  }

  const customHeader = req.headers.get('x-ingest-token');
  if (customHeader && customHeader === secret) {
    return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate request via Bearer token
    if (!verifyToken(req)) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing secret bearer ingestion token' },
        { status: 401 }
      );
    }

    // 2. Parse and validate payload
    const body = await req.json();
    const parseResult = IngestPayloadSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    // 3. Extract items list
    let rawItems: any[] = [];
    const data = parseResult.data;

    if (Array.isArray(data)) {
      rawItems = data;
    } else if ('items' in data) {
      rawItems = data.items;
    } else {
      rawItems = [data];
    }

    if (rawItems.length === 0) {
      return NextResponse.json(
        { error: 'Payload must contain at least one item' },
        { status: 400 }
      );
    }

    // 4. Verify & Canonicalize SHA-256 hash (question + answer) for zero duplicate writes
    const validatedItems: IngestItemInput[] = rawItems.map((item) => {
      const computedHash = computeFatwaHash({
        question: item.question,
        answer: item.answer,
      });

      const providedHash = item.sha256_hash || item.hash;
      let finalHash = computedHash;

      if (providedHash && isValidSha256(providedHash)) {
        if (providedHash.toLowerCase() !== computedHash.toLowerCase()) {
          // Verify hash: if tampered or mismatched, enforce computed SHA-256 derived from question + answer
          finalHash = computedHash;
        } else {
          finalHash = providedHash.toLowerCase();
        }
      }

      return {
        source: item.source,
        source_url: item.source_url,
        title: item.title,
        question: item.question,
        answer: item.answer,
        category: item.category || 'General',
        tags: item.tags || [],
        scholar: item.scholar || '',
        published_date: item.published_date || item.createdAt || new Date().toISOString(),
        sha256_hash: finalHash,
        scraped_at: item.scraped_at || new Date().toISOString(),
      };
    });

    // 5. Perform idempotent batch upsert into SQLite
    const batchResult = batchUpsertFatwas(validatedItems);

    // 6. Instantly refresh search index with newly upserted items
    await refreshSearchIndex();

    return NextResponse.json({
      success: true,
      inserted: batchResult.inserted,
      updated: batchResult.updated,
      skipped: batchResult.skipped,
      total: batchResult.total,
      items: batchResult.results,
      message: `Processed ${batchResult.total} items (inserted: ${batchResult.inserted}, updated: ${batchResult.updated}, skipped: ${batchResult.skipped})`,
    });
  } catch (error: any) {
    console.error('Ingestion error:', error);
    return NextResponse.json(
      { error: 'Internal server error during ingestion', message: error?.message },
      { status: 500 }
    );
  }
}
