import { NextRequest, NextResponse } from 'next/server';
import { searchFatwas } from '@/lib/search';
import { SearchQuerySchema } from '@/lib/db/schema';
import { safeErrorResponse } from '@/lib/apiErrors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59',
      },
    });
  } catch (error: any) {
    return safeErrorResponse('Internal server error during search', 500, error);
  }
}
