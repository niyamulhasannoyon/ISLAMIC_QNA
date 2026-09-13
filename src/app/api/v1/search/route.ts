import { NextRequest, NextResponse } from 'next/server';
import { searchFatwas } from '@/lib/search';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const q = searchParams.get('q') || searchParams.get('query') || '';
    const source = searchParams.get('source') || undefined;
    const category = searchParams.get('category') || undefined;
    const scholar = searchParams.get('scholar') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

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
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during search', message: error?.message },
      { status: 500 }
    );
  }
}
