import { getMongoDb } from '../db/mongodb';
import { LocalBengaliSearchEngine } from '../search/local';
import { FatwaQA } from '@/types/fatwa';
import { getEmbedding, isEmbeddingConfigured } from './embedding';

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

export interface RAGOptions {
  fatwaIds?: string[];
  limit?: number;
  preloadedFatwas?: FatwaQA[];
}

const SYSTEM_RAG_PROMPT = `You are an authentic Islamic Fiqh Research Assistant for an authentic Q&A archive (containing Al-Itisam, At-Tahreek, Al-Kawsar).
Your task is to provide a clear, concise, and authentic answer (সংক্ষিপ্ত সারসংক্ষেপ) STRICTLY based on the provided verified fatwa research contexts.

STRICT RULES:
1. Groundedness: Answer ONLY using the provided Fatwa Contexts. Do NOT invent rulings or bring outside opinions.
2. Structure:
   - স্পষ্ট ও দ্ব্যর্থহীন শারয়ী সমাধান (Direct Ruling in 1-2 sentences)
   - দলীল ও প্রমাণ (Quranic Surah/Ayah and Hadith citations if present in the text)
   - প্রয়োজনীয় শর্ত বা সতর্কতা (Conditions or cautions, if any)
3. Tone: Direct, respectful, authoritative, authentic Bengali.
4. Fallback: If the provided contexts do not answer the question, state:
"দুঃখিত, আমাদের যাচাইকৃত আর্কাইভে এই বিষয়ে সরাসরি কোনো ফতোয়া পাওয়া যায়নি।"

Fatwa Contexts:
`;

export async function generateRAGAnswer(userQuestion: string, options?: RAGOptions): Promise<RAGResponse> {
  const apiKey = process.env.MISTRAL_API_KEY;
  const limit = options?.limit || 2; // Keep to top 1-2 most relevant fatwas for precision & low latency

  let contextDocs: FatwaQA[] = [];

  // 1. Direct fatwa IDs if passed from UI
  if (options?.preloadedFatwas && options.preloadedFatwas.length > 0) {
    contextDocs = options.preloadedFatwas.slice(0, limit);
  } else if (options?.fatwaIds && options.fatwaIds.length > 0) {
    const mongoDb = await getMongoDb();
    if (mongoDb) {
      try {
        const found = await mongoDb
          .collection('fatwas')
          .find({ id: { $in: options.fatwaIds } }, { projection: { embedding: 0 } })
          .limit(limit)
          .toArray();
        if (found.length > 0) {
          contextDocs = found.map((doc: any) => ({
            id: doc.id || String(doc._id),
            source: doc.source,
            source_url: doc.source_url || '',
            title: doc.title || '',
            question: doc.question || '',
            answer: doc.answer || '',
            category: doc.category || 'General',
            tags: doc.tags || [],
            scholar: doc.scholar || '',
            published_date: doc.published_date || '',
            sha256_hash: doc.sha256_hash || '',
            scraped_at: doc.scraped_at || '',
            created_at: doc.created_at || '',
            updated_at: doc.updated_at || '',
          }));
        }
      } catch (e) {
        console.warn('[RAG Doc Fetch Warning]:', e);
      }
    }
  }

  // 2. Vector Search Retrieval ($vectorSearch) if contextDocs not provided
  if (contextDocs.length === 0) {
    const mongoDb = await getMongoDb();
    if (mongoDb && isEmbeddingConfigured()) {
      try {
        const queryVector = await getEmbedding(userQuestion);
        if (queryVector) {
          const vectorIndex = process.env.VECTOR_INDEX_NAME || 'vector_index';
          const vectorResults = await mongoDb
            .collection('fatwas')
            .aggregate([
              {
                $vectorSearch: {
                  index: vectorIndex,
                  path: 'embedding',
                  queryVector,
                  numCandidates: 50,
                  limit,
                },
              },
              {
                $project: {
                  embedding: 0,
                  score: { $meta: 'vectorSearchScore' },
                  id: 1,
                  source: 1,
                  source_url: 1,
                  title: 1,
                  question: 1,
                  answer: 1,
                  category: 1,
                  tags: 1,
                  scholar: 1,
                  published_date: 1,
                },
              },
            ])
            .toArray();

          if (vectorResults && vectorResults.length > 0) {
            contextDocs = vectorResults.map((doc: any) => ({
              id: doc.id || String(doc._id),
              source: doc.source,
              source_url: doc.source_url || '',
              title: doc.title || '',
              question: doc.question || '',
              answer: doc.answer || '',
              category: doc.category || 'General',
              tags: doc.tags || [],
              scholar: doc.scholar || '',
              published_date: doc.published_date || '',
              sha256_hash: doc.sha256_hash || '',
              scraped_at: doc.scraped_at || '',
              created_at: doc.created_at || '',
              updated_at: doc.updated_at || '',
            }));
          }
        }
      } catch (vErr) {
        console.warn('[RAG Vector Retrieval Notice]:', vErr);
      }
    }
  }

  // 3. Fallback to Local Search Engine
  if (contextDocs.length === 0) {
    try {
      const searchEngine = new LocalBengaliSearchEngine();
      await searchEngine.init();
      const searchRes = await searchEngine.search({ q: userQuestion, limit });
      contextDocs = searchRes.results;
    } catch {}
  }

  if (contextDocs.length === 0) {
    return {
      answer: 'দুঃখিত, আমাদের যাচাইকৃত আর্কাইভে এই বিষয়ে সরাসরি কোনো ফতোয়া পাওয়া যায়নি।',
      sources: [],
      grounded: false,
      model: 'fallback-direct',
    };
  }

  const sources = contextDocs.map((d) => ({
    id: d.id,
    title: d.title,
    scholar: d.scholar,
    source: d.source,
    source_url: d.source_url,
    published_date: d.published_date,
  }));

  // If no Mistral API key is configured, return top retrieved answer excerpt cleanly
  if (!apiKey) {
    const topDoc = contextDocs[0];
    return {
      answer: `${topDoc.answer.slice(0, 400)}...\n\n(সূত্র: ${topDoc.title} - ${topDoc.scholar})`,
      sources,
      grounded: true,
      model: 'direct-excerpt',
    };
  }

  // Format context for Mixtral
  const formattedContext = contextDocs
    .map(
      (d, i) =>
        `[ফতোয়া #${i + 1}]\nশিরোনাম: ${d.title}\nমুফতী/স্কলার: ${d.scholar}\nউৎস: ${d.source}\nপ্রশ্ন: ${d.question}\nউত্তর: ${d.answer.slice(0, 1500)}\n`
    )
    .join('\n---\n');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'open-mistral-nemo',
        messages: [
          {
            role: 'system',
            content: SYSTEM_RAG_PROMPT + formattedContext,
          },
          {
            role: 'user',
            content: `প্রশ্ন: ${userQuestion}\nউপরে প্রদত্ত ফতোয়াগুলোর আলোকে একটি স্পষ্ট, সংক্ষিপ্ত ও নির্ভরযোগ্য উত্তর প্রস্তুত করুন।`,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const topDoc = contextDocs[0];
      return {
        answer: `${topDoc.answer.slice(0, 400)}...\n\n(সূত্র: ${topDoc.title} - ${topDoc.scholar})`,
        sources,
        grounded: true,
        model: 'direct-excerpt',
      };
    }

    const data = await response.json();
    const generatedAnswer = data?.choices?.[0]?.message?.content || '';

    return {
      answer: generatedAnswer.trim(),
      sources,
      grounded: true,
      model: 'mistral-summary',
    };
  } catch (err) {
    console.error('RAG Generation Error:', err);
    const topDoc = contextDocs[0];
    return {
      answer: `${topDoc.answer.slice(0, 400)}...\n\n(সূত্র: ${topDoc.title} - ${topDoc.scholar})`,
      sources,
      grounded: true,
      model: 'direct-excerpt',
    };
  }
}
