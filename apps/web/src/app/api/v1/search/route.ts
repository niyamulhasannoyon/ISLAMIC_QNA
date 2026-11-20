import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { searchFatwas } from '@/lib/search';
import { SearchQuerySchema } from '@/lib/db/schema';
import { safeErrorResponse } from '@/lib/apiErrors';
import { recordSearchEventDb, recordZeroResultSearch } from '@/lib/db';
import { normalizeText } from '@/lib/hash';

export const dynamic = 'force-dynamic';

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

    const { q, source, category, scholar, page, limit } = parseResult.data;

    const result = await searchFatwas({
      q,
      source,
      category,
      scholar,
      page,
      limit,
    });

    // Record search quality telemetry for non-empty queries
    let searchEventId = '';
    const trimmedQuery = (q || '').trim();
    if (trimmedQuery) {
      try {
        const visitorId = req.cookies.get('fatwa_visitor_id')?.value || 'anon_visitor';
        const sessionId = req.cookies.get('fatwa_session_id')?.value || visitorId;
        const normalized = normalizeText(trimmedQuery);
        const tookMs = result.tookMs || (Date.now() - startTime);

        searchEventId = recordSearchEventDb({
          sessionId,
          visitorId,
          query: trimmedQuery,
          normalizedQuery: normalized,
          resultCount: result.total || 0,
          tookMs,
          searchEngine: result.engine || 'local',
        });

        // Task 5: Capture zero-result queries in search_logs (hashed/anonymous, zero PII)
        if (result.total === 0) {
          recordZeroResultSearch(trimmedQuery, sessionId);
        }
      } catch (telemetryErr) {
        // Non-blocking telemetry
      }
    }

    const isHomePageBrowse = !q && (!source || source === 'All') && (!category || category === 'All') && (page === 1);
    const cacheControlHeader = isHomePageBrowse
      ? 'no-store, max-age=0, must-revalidate'
      : 'public, s-maxage=60, stale-while-revalidate=300';

    const isDebugAllowed =
      searchParams.get('debug') === '1' &&
      (process.env.NODE_ENV !== 'production' || process.env.SEARCH_DEBUG === 'true');

    const sanitizedResults = isDebugAllowed
      ? result.results
      : result.results.map((item) => {
          const { debug, ...rest } = item as any;
          return rest;
        });

    const responsePayload = {
      ...result,
      results: sanitizedResults,
      ...(searchEventId ? { searchEventId } : {}),
    };

    return NextResponse.json(responsePayload, {
      status: 200,
      headers: {
        'Cache-Control': cacheControlHeader,
      },
    });
  } catch (error: any) {
    return safeErrorResponse('Internal server error during search', 500, error);
  }
}

