import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { safeErrorResponse } from '@/lib/apiErrors';
import type { FatwaQA } from '@/types/fatwa';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const since = searchParams.get('since') || '';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '200', 10), 1), 500);

    const db = getDb();

    let fatwas: FatwaQA[] = [];
    if (since) {
      // Incremental sync
      const stmt = db.prepare(`
        SELECT id, source, source_url, title, question, answer, category, tags,
               scholar, published_date, sha256_hash, scraped_at, created_at, updated_at
        FROM fatwas
        WHERE (updated_at > ? OR created_at > ? OR published_date > ?)
        ORDER BY COALESCE(updated_at, created_at, published_date) ASC
        LIMIT ?
      `);
      const rows = stmt.all(since, since, since, limit + 1) as any[];
      const hasMore = rows.length > limit;
      const sliced = hasMore ? rows.slice(0, limit) : rows;

      fatwas = sliced.map((r) => ({
        ...r,
        tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags || [],
      }));

      const latestTimestamp = fatwas.length > 0
        ? fatwas[fatwas.length - 1].updated_at || fatwas[fatwas.length - 1].created_at || new Date().toISOString()
        : since;

      return NextResponse.json({
        fatwas,
        hasMore,
        count: fatwas.length,
        since,
        latestTimestamp,
      });
    } else {
      // Initial sync (first batch)
      const stmt = db.prepare(`
        SELECT id, source, source_url, title, question, answer, category, tags,
               scholar, published_date, sha256_hash, scraped_at, created_at, updated_at
        FROM fatwas
        ORDER BY id ASC
        LIMIT ?
      `);
      const rows = stmt.all(limit + 1) as any[];
      const hasMore = rows.length > limit;
      const sliced = hasMore ? rows.slice(0, limit) : rows;

      fatwas = sliced.map((r) => ({
        ...r,
        tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags || [],
      }));

      const latestTimestamp = fatwas.length > 0
        ? fatwas[fatwas.length - 1].updated_at || fatwas[fatwas.length - 1].created_at || new Date().toISOString()
        : new Date().toISOString();

      return NextResponse.json({
        fatwas,
        hasMore,
        count: fatwas.length,
        since: null,
        latestTimestamp,
      });
    }
  } catch (error: any) {
    return safeErrorResponse('Internal server error during v2 sync', 500, error);
  }
}
