import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { recordSearchClickDb } from '@/lib/db';
import { safeErrorResponse } from '@/lib/apiErrors';

export const dynamic = 'force-dynamic';

const ClickTrackSchema = z.object({
  searchEventId: z.string().min(1).max(128),
  fatwaId: z.string().min(1).max(128),
  position: z.number().int().min(1).max(500),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const parseResult = ClickTrackSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid click tracking payload' }, { status: 400 });
    }

    const { searchEventId, fatwaId, position } = parseResult.data;
    const success = recordSearchClickDb(searchEventId, fatwaId, position);

    return NextResponse.json({ success });
  } catch (err: any) {
    return safeErrorResponse('Click tracking error', 500, err);
  }
}
