import { NextRequest, NextResponse } from 'next/server';
import { searchFatwas } from '@/lib/search';
import { SearchQuerySchema } from '@/lib/db/schema';
import { safeErrorResponse } from '@/lib/apiErrors';
import { normalizeBengaliText, stemBengaliToken, getSynonymsAndVariants } from '@repo/text-utils';

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

    const normalizedQ = normalizeBengaliText(q || '');
    const tokens = normalizedQ.split(/\s+/).filter(Boolean);
    const stemmedTokens = tokens.map(stemBengaliToken);
    const synonyms = Array.from(new Set(tokens.flatMap(getSynonymsAndVariants)));

    const result = await searchFatwas({
      q,
      source,
      category,
      scholar,
      page,
      limit,
    });

    const tookMs = Date.now() - startTime;

    return NextResponse.json(
      {
        ...result,
        timingMs: tookMs,
        intent: {
          normalizedQuery: normalizedQ,
          stemmedTokens,
          synonymsExpanded: synonyms.slice(0, 8),
          isIntentAware: true,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=59',
        },
      }
    );
  } catch (error: any) {
    return safeErrorResponse('Internal server error during v2 search', 500, error);
  }
}
