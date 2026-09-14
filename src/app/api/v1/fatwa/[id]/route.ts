import { NextRequest, NextResponse } from 'next/server';
import { getFatwaByIdAsync } from '@/lib/db';
import { safeErrorResponse } from '@/lib/apiErrors';

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

    const fatwa = await getFatwaByIdAsync(id);
    if (!fatwa) {
      return NextResponse.json({ error: 'Fatwa not found' }, { status: 404 });
    }

    return NextResponse.json(fatwa, { status: 200 });
  } catch (error: any) {
    return safeErrorResponse('Internal server error', 500, error);
  }
}
