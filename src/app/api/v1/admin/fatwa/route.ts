import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { getDb, invalidateFacetsCache, getFatwaById } from '@/lib/db';
import { computeFatwaHash, hashToUuid, normalizeText } from '@/lib/hash';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const source = searchParams.get('source') || '';
    const category = searchParams.get('category') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '15', 10)));
    const offset = (page - 1) * limit;

    const db = getDb();
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (q) {
      whereClauses.push('(LOWER(title) LIKE ? OR LOWER(question) LIKE ? OR LOWER(scholar) LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (source && source !== 'All') {
      whereClauses.push('LOWER(source) = ?');
      params.push(source.toLowerCase());
    }
    if (category && category !== 'All') {
      whereClauses.push('LOWER(category) = ?');
      params.push(category.toLowerCase());
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRow = db.prepare(`SELECT count(*) as count FROM fatwas ${whereSql}`).get(...params) as { count: number };
    const total = countRow.count;

    const rows = db.prepare(`
      SELECT id, source, source_url, title, question, answer, category, tags, scholar, published_date, sha256_hash, created_at, updated_at
      FROM fatwas
      ${whereSql}
      ORDER BY published_date DESC, created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as any[];

    const items = rows.map((r) => ({
      ...r,
      tags: JSON.parse(r.tags || '[]'),
    }));

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch fatwas', message: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id: inputId, title, question, answer, source, source_url, category, scholar, tags } = body;

    if (!title || !question || !answer || !source) {
      return NextResponse.json({ error: 'Title, question, answer, and source are required' }, { status: 400 });
    }

    const db = getDb();
    const normTitle = normalizeText(title);
    const normQuestion = normalizeText(question);
    const normAnswer = answer.trim();
    const normScholar = normalizeText(scholar) || 'ফতোয়া বোর্ড';
    const normCategory = category?.trim() || 'General';
    const normTags = JSON.stringify(Array.isArray(tags) ? tags : [normCategory]);
    const normSourceUrl = source_url?.trim() || 'https://deenqna.vercel.app';
    const now = new Date().toISOString();

    const sha256_hash = computeFatwaHash({ question: normQuestion, answer: normAnswer });

    if (inputId) {
      // Update existing record
      db.prepare(`
        UPDATE fatwas
        SET title = ?, question = ?, answer = ?, source = ?, source_url = ?, category = ?, scholar = ?, tags = ?, updated_at = ?
        WHERE id = ?
      `).run(normTitle, normQuestion, normAnswer, source, normSourceUrl, normCategory, normScholar, normTags, now, inputId);

      invalidateFacetsCache();
      return NextResponse.json({ success: true, id: inputId, message: 'ফতোয়া সফলভাবে আপডেট করা হয়েছে' });
    } else {
      // Insert new record
      const id = hashToUuid(sha256_hash);
      db.prepare(`
        INSERT OR REPLACE INTO fatwas (
          id, source, source_url, title, question, answer, category, tags, scholar, published_date, sha256_hash, scraped_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, source, normSourceUrl, normTitle, normQuestion, normAnswer, normCategory, normTags, normScholar, now.split('T')[0], sha256_hash, now, now, now);

      invalidateFacetsCache();
      return NextResponse.json({ success: true, id, message: 'নতুন ফতোয়া সফলভাবে যোগ করা হয়েছে' });
    }
  } catch (error: any) {
    return NextResponse.json({ error: 'Save failed', message: error?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const db = getDb();
    db.prepare('DELETE FROM fatwas WHERE id = ?').run(id);
    invalidateFacetsCache();

    return NextResponse.json({ success: true, message: 'ফতোয়া মুছে ফেলা হয়েছে' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Delete failed', message: error?.message }, { status: 500 });
  }
}
