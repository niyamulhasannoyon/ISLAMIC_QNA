import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RateLimitTier } from './lib/rateLimit';

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Only apply rate limiting to /api/v1 routes
  if (pathname.startsWith('/api/v1/')) {
    let tier: RateLimitTier = 'default';

    if (pathname.startsWith('/api/v1/auth') || pathname.startsWith('/api/v1/admin/auth')) {
      tier = 'auth';
    } else if (pathname.startsWith('/api/v1/rag')) {
      tier = 'rag';
    } else if (pathname.startsWith('/api/v1/ingest')) {
      tier = 'ingest';
    } else if (pathname.startsWith('/api/v1/search')) {
      tier = 'search';
    }

    const rateLimit = await checkRateLimit(req, tier);

    if (!rateLimit.success) {
      const retryAfter = Math.max(1, rateLimit.reset - Math.floor(Date.now() / 1000));
      return NextResponse.json(
        {
          error: 'অতিরিক্ত অনুরোধ করা হয়েছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন। (Too many requests. Please slow down.)',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.reset),
          },
        }
      );
    }

    const res = NextResponse.next();
    res.headers.set('X-RateLimit-Limit', String(rateLimit.limit));
    res.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
    res.headers.set('X-RateLimit-Reset', String(rateLimit.reset));
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/v1/:path*'],
};
