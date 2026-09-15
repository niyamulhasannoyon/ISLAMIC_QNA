import { NextResponse } from 'next/server';
import { getFatwaMetadataListAsync } from '@/lib/db';
import { getSiteUrl, createFatwaSlug } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 86400; // Cache on CDN for 24 hours

const CHUNK_SIZE = 2000;

const CATEGORIES = [
  'ঈমান ও আক্বীদাহ',
  'তাহারাত ও পবিত্রতা',
  'ছালাত',
  'জানাযা ও কবর',
  'যাকাত ও সাদাক্বাহ',
  'সিয়াম',
  'হজ্জ ও উমরাহ',
  'কুরবানী ও আক্বীক্বা',
  'হালাল ও হারাম',
  'ব্যবসা ও লেনদেন',
  'বিবাহ ও পরিবার',
  'তালাক ও ইদ্দত',
  'পর্দা ও পোশাক',
  'জিহাদ ও কিতাল',
  'আদব ও শিষ্টাচার',
  "দু'আ ও যিকির",
  "বিদ'আত ও কুসংস্কার",
  'সমকালীন মাসআলা',
];

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseIsoDate(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString();
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return new Date().toISOString();
}

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: Request, { params }: RouteParams) {
  const rawId = (params?.id || '').replace(/\.xml$/i, '').trim();
  const chunkId = parseInt(rawId, 10);

  if (isNaN(chunkId) || chunkId < 0) {
    return new NextResponse('Invalid sitemap chunk identifier', { status: 404 });
  }

  const siteUrl = getSiteUrl();

  // Chunk 0: Core static pages and category landing pages
  if (chunkId === 0) {
    const today = new Date().toISOString();
    let urlsXml = `  <url>
    <loc>${escapeXml(siteUrl)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${escapeXml(`${siteUrl}/privacy`)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>
  <url>
    <loc>${escapeXml(`${siteUrl}/terms`)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>\n`;

    for (const cat of CATEGORIES) {
      const catUrl = `${siteUrl}/?category=${encodeURIComponent(cat)}`;
      urlsXml += `  <url>
    <loc>${escapeXml(catUrl)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}</urlset>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
      },
    });
  }

  // Chunks >= 1: Dynamic fatwa QA pages from authoritative database
  const offset = (chunkId - 1) * CHUNK_SIZE;
  const fatwas = await getFatwaMetadataListAsync(CHUNK_SIZE, offset);

  if (!fatwas || fatwas.length === 0) {
    return new NextResponse('Sitemap chunk not found', { status: 404 });
  }

  let urlsXml = '';
  for (const f of fatwas) {
    const slug = createFatwaSlug(f.title, f.id);
    const loc = `${siteUrl}/fatwa/${encodeURI(slug)}`;
    const lastMod = parseIsoDate(f.updated_at || f.published_date);

    urlsXml += `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
}
