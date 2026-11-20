import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export function GET() {
  const siteUrl = getSiteUrl();
  return NextResponse.redirect(`${siteUrl}/sitemap.xml`, 301);
}
