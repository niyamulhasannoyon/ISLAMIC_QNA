import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb, isMongoConfigured } from '@/lib/db/mongodb';
import { normalizeSearchQuery } from '@/lib/ai/normalizeQuery';
import { getEmbedding, isEmbeddingConfigured } from '@/lib/ai/embedding';
import { searchFatwas } from '@/lib/search';
import { escapeRegExp } from '@/lib/utils';
import { safeErrorResponse } from '@/lib/apiErrors';
import { SearchQuerySchema } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

/**
 * Production-Grade MongoDB Atlas Vector Search API Route
 * 
 * Pipeline:
 * 1. Query Pre-processing / Normalizer:
 *    Uses Groq/Mixtral (or OpenAI with low temperature 0.1 and max tokens 30)
 *    to translate Banglish or casual conversational Bengali into a clear semantic Islamic topic query.
 * 2. Generate Query Embedding:
 *    Passes normalized query to text-embedding-3-small to produce a 1536-dimension float array.
 * 3. MongoDB $vectorSearch Aggregation:
 *    Executes $vectorSearch with numCandidates: 100, limit: 10 against vector_index.
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(req.url);

    const parseResult = SearchQuerySchema.safeParse({
      q: searchParams.get('q') || searchParams.get('query') || '',
      source: searchParams.get('source') || undefined,
      category: searchParams.get('category') || undefined,
      scholar: searchParams.get('scholar') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'অনুসন্ধান প্যারামিটার অবৈধ',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { q: rawQuery, limit, page, source, category, scholar } = parseResult.data;

    // Empty query fallback to standard browse
    if (!rawQuery) {
      const fallbackResult = await searchFatwas({ page, limit, source, category, scholar });
      return NextResponse.json(fallbackResult, { status: 200 });
    }

    // =========================================================================
    // STEP 1: Query Pre-processing / Fast Intent Normalizer
    // =========================================================================
    const normResult = await normalizeSearchQuery(rawQuery);
    const normalizedQuery = normResult.normalizedQuery || rawQuery;

    // =========================================================================
    // STEP 2: Generate Query Embedding (1536 dimensions)
    // =========================================================================
    let queryVector: number[] | null = null;
    if (isEmbeddingConfigured()) {
      queryVector = await getEmbedding(normalizedQuery);
    }

    // =========================================================================
    // STEP 3: Run MongoDB $vectorSearch Aggregation
    // =========================================================================
    if (queryVector && Array.isArray(queryVector) && isMongoConfigured()) {
      const db = await getMongoDb();
      if (db) {
        const collection = db.collection('fatwas');
        const indexName = process.env.VECTOR_INDEX_NAME || 'vector_index';
        const numCandidates = 100;

        const vectorPipeline: any[] = [
          {
            $vectorSearch: {
              index: indexName,
              path: 'embedding',
              queryVector: queryVector,
              numCandidates: numCandidates,
              limit: limit,
            },
          },
        ];

        // Optional post-filters
        const matchStage: any = {};
        if (source && source !== 'All') matchStage.source = source.toLowerCase();
        if (category && category !== 'All') matchStage.category = category;
        if (scholar && scholar !== 'All') matchStage.scholar = { $regex: escapeRegExp(scholar), $options: 'i' };

        if (Object.keys(matchStage).length > 0) {
          vectorPipeline.push({ $match: matchStage });
        }

        // Exclude the 1536-dim embedding vector from the wire to minimize bandwidth
        vectorPipeline.push(
          {
            $project: {
              embedding: 0,
            },
          },
          {
            $project: {
              score: { $meta: 'vectorSearchScore' },
              id: 1,
              title: 1,
              question: 1,
              answer: 1,
              content: 1,
              source: 1,
              source_url: 1,
              category: 1,
              scholar: 1,
              published_date: 1,
              tags: 1,
              sha256_hash: 1,
              scraped_at: 1,
            },
          }
        );

        try {
          const vectorDocs = await collection.aggregate(vectorPipeline).toArray();

          if (vectorDocs && vectorDocs.length > 0) {
            const results = vectorDocs.map((doc: any) => ({
              id: doc.id || String(doc._id),
              source: doc.source,
              source_url: doc.source_url || '',
              title: doc.title || '',
              question: doc.question || '',
              answer: doc.answer || doc.content || '',
              category: doc.category || 'General',
              tags: Array.isArray(doc.tags) ? doc.tags : [],
              scholar: doc.scholar || '',
              published_date: doc.published_date || '',
              sha256_hash: doc.sha256_hash || '',
              score: doc.score || 1.0,
              snippet: (doc.answer || doc.question || '').slice(0, 240) + '...',
              titleSnippet: doc.title || '',
              matchedTerms: [],
            }));

            return NextResponse.json(
              {
                query: rawQuery,
                normalizedQuery,
                provider: normResult.provider,
                normalizationLatencyMs: normResult.latencyMs,
                engine: 'MongoDB Atlas Vector Search ($vectorSearch)',
                results,
                total: results.length,
                page,
                limit,
                totalPages: 1,
                tookMs: Date.now() - startTime,
              },
              {
                status: 200,
                headers: {
                  'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59',
                },
              }
            );
          }
        } catch (vectorError: any) {
          console.warn('[Vector Search Notice]: Falling back to standard search pipeline:', vectorError?.message || vectorError);
        }
      }
    }

    // Graceful fallback to searchFatwas if vector index is still initializing
    const fallbackResponse = await searchFatwas({
      q: normalizedQuery,
      source,
      category,
      scholar,
      page,
      limit,
    });

    return NextResponse.json(
      {
        ...fallbackResponse,
        originalQuery: rawQuery,
        normalizedQuery,
        normalizerProvider: normResult.provider,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59',
        },
      }
    );
  } catch (err: any) {
    return safeErrorResponse('Search processing error', 500, err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = SearchQuerySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'অনুসন্ধান প্যারামিটার অবৈধ',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { q, limit, page, source, category, scholar } = parseResult.data;
    const url = new URL(req.url);
    url.searchParams.set('q', q);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('page', String(page));
    if (source) url.searchParams.set('source', source);
    if (category) url.searchParams.set('category', category);
    if (scholar) url.searchParams.set('scholar', scholar);

    const getReq = new NextRequest(url, { method: 'GET', headers: req.headers });
    return GET(getReq);
  } catch (err: any) {
    return safeErrorResponse('Search request failed', 400, err);
  }
}
