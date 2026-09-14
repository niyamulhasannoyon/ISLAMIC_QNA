import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentUserSession } from '@/lib/userAuth';
import { recordPageview } from '@/lib/analytics';
import { safeErrorResponse } from '@/lib/apiErrors';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Read visitor ID from cookie or payload or generate new
    const existingCookieVisitorId = req.cookies.get('fatwa_visitor_id')?.value;
    const visitorId = body.visitorId || existingCookieVisitorId || crypto.randomUUID();

    // Check if user is currently logged in via server session cookie
    const userSession = await getCurrentUserSession();

    const userAgent = req.headers.get('user-agent') || '';
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || '';

    const path = body.path || '/';
    const pageTitle = body.pageTitle || null;
    const fatwaId = body.fatwaId || null;
    const searchQuery = body.searchQuery || null;
    const referrer = body.referrer || req.headers.get('referer') || null;

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
