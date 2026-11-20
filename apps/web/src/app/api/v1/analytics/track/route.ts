import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { getCurrentUserSession } from '@/lib/userAuth';
import { recordPageview } from '@/lib/analytics';
import { safeErrorResponse } from '@/lib/apiErrors';
import { stripAllHtml } from '@/lib/sanitizer';
import { getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const AnalyticsTrackSchema = z.object({
  visitorId: z.string().max(128).optional(),
  path: z.string().max(500).optional().default('/'),
  pageTitle: z.string().max(300).optional().nullable(),
  fatwaId: z.string().max(128).optional().nullable(),
  searchQuery: z.string().max(300).optional().nullable(),
  referrer: z.string().max(500).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const parseResult = AnalyticsTrackSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid tracking payload' },
        { status: 400 }
      );
    }

    const body = parseResult.data;

    // Read visitor ID from cookie or payload or generate new
    const existingCookieVisitorId = req.cookies.get('fatwa_visitor_id')?.value;
    const rawVisitorId = body.visitorId || existingCookieVisitorId || crypto.randomUUID();
    const visitorId = stripAllHtml(rawVisitorId).slice(0, 128);

    // Check if user is currently logged in via server session cookie
    const userSession = await getCurrentUserSession();

    const userAgent = (req.headers.get('user-agent') || '').slice(0, 500);
    const ip = getClientIp(req);

    const path = stripAllHtml(body.path || '/').slice(0, 500);
    const pageTitle = body.pageTitle ? stripAllHtml(body.pageTitle).slice(0, 250) : null;
    const fatwaId = body.fatwaId ? stripAllHtml(body.fatwaId).slice(0, 128) : null;
    const searchQuery = body.searchQuery ? stripAllHtml(body.searchQuery).slice(0, 250) : null;
    const rawReferrer = body.referrer || req.headers.get('referer') || null;
    const referrer = rawReferrer ? stripAllHtml(rawReferrer).slice(0, 500) : null;

    const result = recordPageview({
      visitorId,
      userId: userSession?.id || null,
      userName: userSession?.name || null,
      userEmail: userSession?.email || null,
      path,
      pageTitle,
      fatwaId,
      searchQuery,
      referrer,
      userAgent,
      ip,
    });

    const res = NextResponse.json({ success: result.success, visitorId });

    // Ensure visitor ID cookie is stored for 1 year
    if (!existingCookieVisitorId || existingCookieVisitorId !== visitorId) {
      res.cookies.set('fatwa_visitor_id', visitorId, {
        httpOnly: false, // client JS can read if needed
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: '/',
        sameSite: 'lax',
      });
    }

    return res;
  } catch (err: any) {
    return safeErrorResponse('Analytics tracking error', 500, err);
  }
}
