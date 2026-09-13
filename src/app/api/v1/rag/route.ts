import { NextRequest, NextResponse } from 'next/server';
import { RAGQuerySchema } from '@/lib/db/schema';
import { generateRAGAnswer } from '@/lib/ai/rag';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = RAGQuerySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid query', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { question } = parseResult.data;
    const ragResult = await generateRAGAnswer(question);

    return NextResponse.json(ragResult);
  } catch (err: any) {
    console.error('RAG API Error:', err);
    return NextResponse.json(
      { error: 'Failed to generate RAG response', message: err?.message },
      { status: 500 }
    );
  }
}
