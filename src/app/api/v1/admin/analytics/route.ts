import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { getAnalyticsOverview } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const timeframeParam = searchParams.get('timeframe') || 'today';
    const timeframe = ['today', '7d', '30d', 'all'].includes(timeframeParam)
      ? (timeframeParam as 'today' | '7d' | '30d' | 'all')
      : 'today';

    const analytics = getAnalyticsOverview(timeframe);
    return NextResponse.json(analytics);
  } catch (error: any) {
    console.error('[Admin Analytics API Error]:', error);
    return NextResponse.json({ error: 'Failed to load analytics', message: error?.message }, { status: 500 });
  }
}
