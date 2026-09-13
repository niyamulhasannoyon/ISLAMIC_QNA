import { NextResponse } from "next/server";
import { getFatwaCount } from "@/lib/db";

const CHUNK_SIZE = 10000;
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://fatwa-archive.vercel.app";

export const dynamic = "force-dynamic";

export async function GET() {
  const total = getFatwaCount();
  const numSitemaps = Math.max(1, Math.ceil(total / CHUNK_SIZE));
  const now = new Date().toISOString();

  const sitemaps = Array.from(
    { length: numSitemaps },
    (_, i) => `${siteUrl}/sitemap/${i}.xml`
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    (url) => `  <sitemap>
    <loc>${url}</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`
  )
  .join("\n")}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
