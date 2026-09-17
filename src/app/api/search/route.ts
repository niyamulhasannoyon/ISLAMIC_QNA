import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb, isMongoConfigured } from '@/lib/db/mongodb';
import { normalizeSearchQuery } from '@/lib/ai/normalizeQuery';
import { getEmbedding, isEmbeddingConfigured } from '@/lib/ai/embedding';
import { searchFatwas } from '@/lib/search';

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
    const rawQuery = (searchParams.get('q') || searchParams.get('query') || '').trim();
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const source = searchParams.get('source') || undefined;
    const category = searchParams.get('category') || undefined;
    const scholar = searchParams.get('scholar') || undefined;

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
        if (scholar && scholar !== 'All') matchStage.scholar = { $regex: scholar, $options: 'i' };

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
    console.error('[Search API Error]:', err);
    return NextResponse.json(
      {
        error: 'Search processing error',
        message: err?.message || 'Unknown internal error',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body.q || body.query || '';
    const limit = body.limit || 10;
    const page = body.page || 1;
    const source = body.source;
    const category = body.category;
    const scholar = body.scholar;

    const url = new URL(req.url);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('page', String(page));
    if (source) url.searchParams.set('source', source);
    if (category) url.searchParams.set('category', category);
    if (scholar) url.searchParams.set('scholar', scholar);

    const getReq = new NextRequest(url, { method: 'GET', headers: req.headers });
    return GET(getReq);
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }
}
