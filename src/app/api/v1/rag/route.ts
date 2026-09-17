import { NextRequest, NextResponse } from 'next/server';
import { RAGQuerySchema } from '@/lib/db/schema';
import { generateRAGAnswer } from '@/lib/ai/rag';
import { safeErrorResponse } from '@/lib/apiErrors';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = RAGQuerySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'অবৈধ প্রশ্ন বা প্যারামিটার', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { question, fatwaIds, contextLimit } = parseResult.data;
    const ragResult = await generateRAGAnswer(question, {
      fatwaIds,
      limit: contextLimit || 2,
    });

    return NextResponse.json(ragResult);
  } catch (err: any) {
    return safeErrorResponse('Failed to generate RAG response', 500, err);
  }
}
