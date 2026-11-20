import { NextResponse } from 'next/server';
import { getFatwaCountAsync } from '@/lib/db';
import { getSiteUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 86400; // Cache on CDN for 24 hours

const CHUNK_SIZE = 2000;

export async function GET() {
  const siteUrl = getSiteUrl();
  const total = await getFatwaCountAsync();
  const numChunks = Math.max(1, Math.ceil(total / CHUNK_SIZE));
  const today = new Date().toISOString();

  let sitemapsXml = `  <sitemap>
    <loc>${siteUrl}/sitemap/0.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>\n`;

  for (let i = 1; i <= numChunks; i++) {
    sitemapsXml += `  <sitemap>
    <loc>${siteUrl}/sitemap/${i}.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>\n`;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapsXml}</sitemapindex>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
}
