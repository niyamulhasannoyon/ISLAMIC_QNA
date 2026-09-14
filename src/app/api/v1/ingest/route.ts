import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { syncFatwaBatch } from '@/lib/pipeline/ingest';
import { refreshSearchIndex } from '@/lib/search';
import { IngestItemInput } from '@/types/fatwa';
import { computeFatwaHash, isValidSha256 } from '@/lib/hash';
import { safeErrorResponse } from '@/lib/apiErrors';
import { sanitizeFatwaInput } from '@/lib/sanitizer';

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
    if (!verifyToken(req)) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing secret bearer ingestion token' },
        { status: 401 }
      );
    }

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

    const validatedItems: IngestItemInput[] = rawItems.map((item) => {
      const sanitized = sanitizeFatwaInput(item);
      const computedHash = computeFatwaHash({
        question: sanitized.question || '',
        answer: sanitized.answer || '',
      });

      const providedHash = sanitized.sha256_hash || (sanitized as any).hash;
      let finalHash = computedHash;

      if (providedHash && isValidSha256(providedHash)) {
        finalHash = providedHash.toLowerCase();
      }

      return {
        source: sanitized.source,
        source_url: sanitized.source_url || '',
        title: sanitized.title || '',
        question: sanitized.question || '',
        answer: sanitized.answer || '',
        category: sanitized.category || 'General',
        tags: sanitized.tags || [],
        scholar: sanitized.scholar || '',
        published_date: sanitized.published_date || (sanitized as any).createdAt || new Date().toISOString(),
        sha256_hash: finalHash,
        scraped_at: sanitized.scraped_at || new Date().toISOString(),
      };
    });

    const batchResult = await syncFatwaBatch(validatedItems);

    if (batchResult.inserted > 0 || batchResult.updated > 0) {
      await refreshSearchIndex();
    }

    return NextResponse.json({
      success: true,
      inserted: batchResult.inserted,
      updated: batchResult.updated,
      skipped: batchResult.skipped,
      total: batchResult.total,
      storage: batchResult.storage,
      items: batchResult.results,
      message: `Processed ${batchResult.total} items via ${batchResult.storage} (inserted: ${batchResult.inserted}, updated: ${batchResult.updated}, skipped: ${batchResult.skipped})`,
    });
  } catch (error: any) {
    return safeErrorResponse('Internal server error during ingestion', 500, error);
  }
}
