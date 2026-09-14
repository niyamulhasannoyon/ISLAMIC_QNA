import { getMongoDb } from '../db/mongodb';
import { extractSemanticFiqhIntent } from './semantic';
import { LocalBengaliSearchEngine } from '../search/local';
import { FatwaQA } from '@/types/fatwa';

export interface RAGResponse {
  answer: string;
  sources: Array<{
    id: string;
    title: string;
    scholar: string;
    source: string;
    source_url: string;
    published_date: string;
  }>;
  grounded: boolean;
  model: string;
}

const SYSTEM_RAG_PROMPT = `You are a Senior Verified Islamic Fiqh Research Assistant for an authentic Q&A archive (containing Al-Itisam, At-Tahreek, Al-Kawsar).
Your task is to answer the user's question STRICTLY based on the provided verified fatwa research contexts.

STRICT CONSTRAINTS & RULES:
1. Groundedness: Answer ONLY using the provided Fatwa Context. Do NOT invent rulings or bring in outside information.
2. Citation Requirement: Every major legal ruling MUST explicitly cite the specific Quranic Surah/Ayah and Hadith numbers if present in the retrieved fatwas.
3. Tone: Direct, respectful, authoritative, professional Bengali.
4. Fallback: If the provided fatwa contexts do not contain enough information to answer the question, state:
"দুঃখিত, আমাদের যাচাইকৃত আর্কাভে এই বিষয়ে সরাসরি কোনো ফতোয়া পাওয়া যায়নি।"

Fatwa Contexts Provided:
`;

export async function generateRAGAnswer(userQuestion: string): Promise<RAGResponse> {
  const startTime = Date.now();
  const apiKey = process.env.MISTRAL_API_KEY;

  // 1. Retrieve Context Documents via Vector / Hybrid Search
  let contextDocs: FatwaQA[] = [];
  const mongoDb = await getMongoDb();

  if (mongoDb) {
    try {
      // Atlas Vector Search stage if embeddings exist
      const collection = mongoDb.collection('fatwas');
      const vectorRes = await collection.aggregate([
        {
          $search: {
            index: 'fatwa_bengali_index',
            text: {
              query: userQuestion,
              path: ['title', 'question', 'answer'],
            },
          },
        },
        { $limit: 5 },
      ]).toArray();

      if (vectorRes.length > 0) {
        contextDocs = vectorRes.map((doc: any) => ({
          id: doc._id || doc.id,
          source: doc.source,
          source_url: doc.source_url,
          title: doc.title,
          question: doc.question,
          answer: doc.answer,
          category: doc.category,
          tags: doc.tags || [],
          scholar: doc.scholar || '',
          published_date: doc.published_date || '',
          sha256_hash: doc.sha256_hash || '',
          scraped_at: doc.scraped_at || '',
          created_at: doc.created_at || '',
          updated_at: doc.updated_at || '',
        }));
      }
    } catch (err) {
      console.warn('[MongoDB Vector Search Notice]:', err);
    }
  }

  // Fallback / Hybrid Search using Local Multi-Tier Engine
  if (contextDocs.length === 0) {
    const searchEngine = new LocalBengaliSearchEngine();
    await searchEngine.init();
    const searchRes = await searchEngine.search({ q: userQuestion, limit: 5 });
    contextDocs = searchRes.results;
  }

  if (contextDocs.length === 0) {
    return {
      answer: 'দুঃখিত, আমাদের যাচাইকৃত আর্কাইভে এই বিষয়ে সরাসরি কোনো ফতোয়া পাওয়া যায়নি।',
      sources: [],
      grounded: false,
      model: 'mistral-7b',
    };
  }

  // If no Mistral API key is configured, gracefully return top retrieved fatwa directly without external LLM call
  if (!apiKey) {
    const topDoc = contextDocs[0];
    return {
      answer: `${topDoc.answer.slice(0, 450)}...\n\n(সূত্র: ${topDoc.title} - ${topDoc.scholar})`,
      sources: contextDocs.map((d) => ({
        id: d.id,
        title: d.title,
        scholar: d.scholar,
        source: d.source,
        source_url: d.source_url,
        published_date: d.published_date,
      })),
      grounded: true,
      model: 'fallback-direct',
    };
  }

  // Format context for LLM prompt
  const formattedContext = contextDocs
    .map(
      (d, i) =>
        `[Document #${i + 1}]\nID: ${d.id}\nTitle: ${d.title}\nScholar: ${d.scholar}\nSource: ${d.source}\nQuestion: ${d.question}\nAnswer: ${d.answer}\n`
    )
    .join('\n---\n');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'open-mistral-7b',
        messages: [
          {
            role: 'system',
            content: SYSTEM_RAG_PROMPT + formattedContext,
          },
          {
            role: 'user',
            content: `User Question: ${userQuestion}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 600,
      }),
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    const generatedAnswer = data?.choices?.[0]?.message?.content || '';

    const sources = contextDocs.map((d) => ({
      id: d.id,
      title: d.title,
      scholar: d.scholar,
      source: d.source,
      source_url: d.source_url,
      published_date: d.published_date,
    }));

    return {
      answer: generatedAnswer.trim(),
      sources,
      grounded: true,
      model: 'open-mistral-7b',
    };
  } catch (err) {
    console.error('RAG Generation Warning:', err);
    // Extracted top answer fallback
    const topDoc = contextDocs[0];
    return {
      answer: `${topDoc.answer.slice(0, 450)}...\n\n(সূত্র: ${topDoc.title} - ${topDoc.scholar})`,
      sources: contextDocs.map((d) => ({
        id: d.id,
        title: d.title,
        scholar: d.scholar,
        source: d.source,
        source_url: d.source_url,
        published_date: d.published_date,
      })),
      grounded: true,
      model: 'fallback-direct',
    };
  }
}
