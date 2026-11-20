import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createFatwaReport, getFatwaById } from '@/lib/db';
import { sanitizeString, stripAllHtml } from '@/lib/sanitizer';
import { safeErrorResponse } from '@/lib/apiErrors';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const ReportPayloadSchema = z.object({
  fatwaId: z.string().min(1, 'ফতোয়া আইডি আবশ্যক').max(128),
  issueType: z.enum(['typo', 'factual_error', 'broken_link', 'wrong_category', 'scholarly_dispute', 'other']),
  description: z.string().min(5, 'সমস্যার বিবরণ কমপক্ষে ৫ অক্ষরের হতে হবে').max(2000),
  proposedCorrection: z.string().max(2000).optional().nullable(),
  reporterName: z.string().max(100).optional().nullable(),
  reporterEmail: z.string().email('সঠিক ইমেইল ঠিকানা দিন').max(120).optional().nullable().or(z.literal('')),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limit: max 10 reports per minute per IP
    const rl = await checkRateLimit(req, 'default');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'অতিরিক্ত অনুরোধ করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।' },
        { status: 429 }
      );
    }

    const rawBody = await req.json().catch(() => ({}));
    const parseResult = ReportPayloadSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const firstError = Object.values(parseResult.error.flatten().fieldErrors)[0]?.[0] || 'অবৈধ তথ্য প্রদান করা হয়েছে';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { fatwaId, issueType, description, proposedCorrection, reporterName, reporterEmail } = parseResult.data;

    // Verify target fatwa exists
    const fatwa = getFatwaById(fatwaId);
    if (!fatwa) {
      return NextResponse.json({ error: 'ফতোয়াটি ডাটাবেজে খুঁজে পাওয়া যায়নি' }, { status: 404 });
    }

    const cleanDescription = stripAllHtml(description).trim();
    const cleanProposed = proposedCorrection ? stripAllHtml(proposedCorrection).trim() : null;
    const cleanReporterName = reporterName ? sanitizeString(reporterName).trim() : null;
    const cleanReporterEmail = reporterEmail ? sanitizeString(reporterEmail).trim() : null;

    const result = createFatwaReport({
      fatwa_id: fatwaId,
      issue_type: issueType,
      description: cleanDescription,
      proposed_correction: cleanProposed,
      reporter_name: cleanReporterName,
      reporter_email: cleanReporterEmail,
    });

    if (!result.success) {
      return NextResponse.json({ error: 'রিপোর্ট সংরক্ষণে ব্যর্থ হয়েছে' }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        reportId: result.id,
        message: 'আপনার রিপোর্টটি সফলভাবে গ্রহণ করা হয়েছে। পর্যালোচনার পর প্রয়োজনীয় সংশোধন করা হবে। জাযাকাল্লাহু খাইরান!',
      },
      { status: 200 }
    );
  } catch (error: any) {
    return safeErrorResponse('Report submission error', 500, error);
  }
}
