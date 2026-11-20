import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdminAuthenticated } from '@/lib/auth';
import { getFatwaReports, updateFatwaReport, getFatwaReportStats } from '@/lib/db';
import { safeErrorResponse } from '@/lib/apiErrors';
import { sanitizeString, stripAllHtml } from '@/lib/sanitizer';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: 'অননুমোদিত এক্সেস' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all';
    const issueType = searchParams.get('issue_type') || 'all';
    const page = parseInt(searchParams.get('page') || '1', 10) || 1;
    const limit = parseInt(searchParams.get('limit') || '20', 10) || 20;

    const data = getFatwaReports({ status, issue_type: issueType, page, limit });
    const stats = getFatwaReportStats();

    return NextResponse.json({
      ...data,
      stats,
    });
  } catch (error: any) {
    return safeErrorResponse('Failed to fetch fatwa reports', 500, error);
  }
}

const UpdateReportSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['pending', 'under_review', 'resolved', 'dismissed']).optional(),
  adminNotes: z.string().max(1000).optional().nullable(),
});

export async function PATCH(req: NextRequest) {
  try {
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: 'অননুমোদিত এক্সেস' }, { status: 401 });
    }

    const rawBody = await req.json().catch(() => ({}));
    const parseResult = UpdateReportSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json({ error: 'অবৈধ প্যারামিটার' }, { status: 400 });
    }

    const { id, status, adminNotes } = parseResult.data;

    const cleanNotes = adminNotes ? stripAllHtml(adminNotes).trim() : undefined;
    const updated = updateFatwaReport(id, {
      status,
      admin_notes: cleanNotes,
      resolved_by: 'Admin',
    });

    if (!updated) {
      return NextResponse.json({ error: 'রিপোর্টটি খুঁজে পাওয়া যায়নি' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'রিপোর্ট সফলভাবে আপডেট করা হয়েছে',
    });
  } catch (error: any) {
    return safeErrorResponse('Failed to update report', 500, error);
  }
}
