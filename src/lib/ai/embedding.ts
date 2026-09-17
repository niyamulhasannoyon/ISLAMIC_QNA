import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// Default vector dimension for text-embedding-3-small
export const VECTOR_DIMENSIONS = 1536;
export const EMBEDDING_MODEL = 'text-embedding-3-small';

function getOpenAIKey(): string | undefined {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/OPENAI_API_KEY=([^\s\r\n]+)/);
      if (match) return match[1];
    }
  } catch {}
  return undefined;
}

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  const key = getOpenAIKey();
  if (!key) return null;
  if (!openaiClient || openaiClient.apiKey !== key) {
    openaiClient = new OpenAI({ apiKey: key });
  }
  return openaiClient;
}

// In-memory LRU cache for query embeddings (0ms for repeated searches)
const queryEmbeddingCache = new Map<string, number[]>();
const MAX_CACHE_SIZE = 1000;

/**
 * Checks if OpenAI embedding is configured and ready to use.
 */
export function isEmbeddingConfigured(): boolean {
  return Boolean(getOpenAIKey());
}

/**
 * Combines title and content (or question + answer) into an optimal semantic representation
 * for Islamic jurisprudence Q&A embeddings.
 * Formats: title + " " + content (per requirement).
 */
export function formatDocumentForEmbedding(item: {
  title?: string;
  content?: string;
  question?: string;
  answer?: string;
  category?: string;
  scholar?: string;
}): string {
  const title = (item.title || '').trim();
  const rawContent = (item.content || '').trim();
  const question = (item.question || '').trim();
  const answer = (item.answer || '').trim();

  // If explicit content is provided, format: title + " " + content
  if (rawContent) {
    return `${title} ${rawContent}`.trim();
  }

  // Otherwise synthesize content from question and answer (truncated to ~1500 chars)
  const synthesizedContent = question === title || !question
    ? answer.slice(0, 1500)
    : `${question}\n${answer.slice(0, 1500)}`.trim();

  return `${title} ${synthesizedContent}`.trim();
}

/**
 * Legacy compatible formatter for Islamic jurisprudence Q&A embeddings.
 */
export function formatFatwaForEmbedding(item: {
  title: string;
  question: string;
  answer: string;
  content?: string;
  category?: string;
  scholar?: string;
}): string {
  return formatDocumentForEmbedding(item);
}

/**
 * Generates a vector embedding for a single text using OpenAI text-embedding-3-small.
 * Uses an in-memory LRU cache to return query embeddings in 0ms for repeated queries.
 */
export async function getEmbedding(text: string): Promise<number[] | null> {
  const cleanText = (text || '').trim();
  if (!cleanText) return null;

  const cacheKey = cleanText.toLowerCase();
  if (queryEmbeddingCache.has(cacheKey)) {
    return queryEmbeddingCache.get(cacheKey)!;
  }

  const client = getOpenAIClient();
  if (!client) return null;

  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: cleanText,
    });

    const embedding = response.data?.[0]?.embedding;
    if (embedding && Array.isArray(embedding)) {
      if (queryEmbeddingCache.size >= MAX_CACHE_SIZE) {
        const firstKey = queryEmbeddingCache.keys().next().value;
        if (firstKey) queryEmbeddingCache.delete(firstKey);
      }
      queryEmbeddingCache.set(cacheKey, embedding);
      return embedding;
    }
  } catch (error) {
    console.warn('[Embedding Error]: Failed to generate embedding for query:', error);
  }

  return null;
}

/**
 * Alias for getEmbedding specifically for query vectors.
 */
export const getQueryEmbedding = getEmbedding;

/**
 * Generates vector embeddings for a batch of texts.
 * Handles chunking and returns vectors in the exact order of input texts.
 */
export async function getBatchEmbeddings(texts: string[]): Promise<Array<number[] | null>> {
  if (!texts || texts.length === 0) return [];

  const client = getOpenAIClient();
  if (!client) {
    return texts.map(() => null);
  }

  const results: Array<number[] | null> = new Array(texts.length).fill(null);
  const CHUNK_SIZE = 100; // OpenAI supports up to 2048 inputs per request

  for (let i = 0; i < texts.length; i += CHUNK_SIZE) {
    const chunk = texts.slice(i, i + CHUNK_SIZE);
    const sanitizedChunk = chunk.map((t) => (t && t.trim().length > 0 ? t.trim() : 'ফতোয়া'));

    try {
      const response = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: sanitizedChunk,
      });

      if (response?.data && Array.isArray(response.data)) {
        for (const item of response.data) {
          const globalIdx = i + item.index;
          results[globalIdx] = item.embedding;
        }
      }
    } catch (err: any) {
      console.error(`[Embedding Batch Error at offset ${i}]:`, err?.message || err);
      // Fallback: Try individually for this chunk if batch fails
      for (let j = 0; j < chunk.length; j++) {
        const text = chunk[j];
        if (text && text.trim().length > 0) {
          try {
            const single = await client.embeddings.create({
              model: EMBEDDING_MODEL,
              input: text.trim(),
            });
            results[i + j] = single.data[0].embedding;
          } catch {
            results[i + j] = null;
          }
        }
      }
    }
  }

  return results;
}
