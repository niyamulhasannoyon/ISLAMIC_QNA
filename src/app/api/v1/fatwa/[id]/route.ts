import { NextRequest, NextResponse } from 'next/server';
import { getFatwaById } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Missing ID parameter' }, { status: 400 });
    }

    const fatwa = getFatwaById(id);
    if (!fatwa) {
      return NextResponse.json({ error: 'Fatwa not found' }, { status: 404 });
    }

    return NextResponse.json(fatwa, { status: 200 });
  } catch (error: any) {
    console.error('Fetch fatwa error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error?.message },
      { status: 500 }
    );
  }
}
