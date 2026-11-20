import OpenAI from 'openai';
import { normalizeText } from './normalize';

export const TARGET_VECTOR_DIMENSIONS = 1536;

export interface Embedder {
  name: string;
  dimension: number;
  embed(text: string): Promise<number[] | null>;
  embedBatch(texts: string[]): Promise<(number[] | null)[]>;
}

// In-memory LRU cache for query embeddings (0ms for repeated queries)
const queryEmbeddingCache = new Map<string, number[]>();
const MAX_CACHE_SIZE = 1000;

function padVector(vec: number[], targetDim: number = TARGET_VECTOR_DIMENSIONS): number[] {
  if (vec.length === targetDim) return vec;
  if (vec.length > targetDim) return vec.slice(0, targetDim);
  // Zero-padding preserves cosine similarity:
  // cos(u ++ 0, v ++ 0) = <u, v> / (||u|| * ||v||) = cos(u, v)
  const padded = new Array(targetDim).fill(0);
  for (let i = 0; i < vec.length; i++) {
    padded[i] = vec[i];
  }
  return padded;
}

// ── 1. Transformers (Local ONNX) Embedder ─────────────────────────────
class TransformersEmbedder implements Embedder {
  name = 'transformers';
  dimension = TARGET_VECTOR_DIMENSIONS;
  private modelName: string;
  private pipelinePromise: Promise<any> | null = null;

  constructor(modelName: string = process.env.EMBEDDING_MODEL || 'Xenova/multilingual-e5-small') {
    this.modelName = modelName;
  }

  private async getPipeline(): Promise<any> {
    if (!this.pipelinePromise) {
      this.pipelinePromise = (async () => {
        const { pipeline } = await import('@xenova/transformers');
        return pipeline('feature-extraction', this.modelName);
      })();
    }
    return this.pipelinePromise;
  }

  async embed(text: string): Promise<number[] | null> {
    const clean = normalizeText(text);
    if (!clean) return null;

    try {
      const extractor = await this.getPipeline();
      // multilingual-e5 models require 'query: ' prefix for search queries
      const prefix = this.modelName.includes('e5') ? 'query: ' : '';
      const output = await extractor(prefix + clean, { pooling: 'mean', normalize: true });
      const raw = Array.from(output.data) as number[];
      return padVector(raw, TARGET_VECTOR_DIMENSIONS);
    } catch (err) {
      console.warn('[TransformersEmbedder] Embedding generation failed:', err);
      return null;
    }
  }

  async embedBatch(texts: string[]): Promise<(number[] | null)[]> {
    if (!texts || texts.length === 0) return [];
    try {
      const extractor = await this.getPipeline();
      const prefix = this.modelName.includes('e5') ? 'passage: ' : '';
      const inputs = texts.map((t) => prefix + (normalizeText(t) || ' '));
      const outputs = await extractor(inputs, { pooling: 'mean', normalize: true });
      
      const results: (number[] | null)[] = [];
      const itemSize = outputs.dims[outputs.dims.length - 1];
      const flatData = outputs.data;

      for (let i = 0; i < texts.length; i++) {
        const start = i * itemSize;
        const slice = Array.from(flatData.slice(start, start + itemSize)) as number[];
        results.push(padVector(slice, TARGET_VECTOR_DIMENSIONS));
      }
      return results;
    } catch (err) {
      console.warn('[TransformersEmbedder] Batch embedding failed, falling back to sequential:', err);
      const results: (number[] | null)[] = [];
      for (const t of texts) {
        results.push(await this.embed(t));
      }
      return results;
    }
  }
}

// ── 2. OpenAI Embedder ────────────────────────────────────────────────
class OpenAIEmbedder implements Embedder {
  name = 'openai';
  dimension = TARGET_VECTOR_DIMENSIONS;
  private client: OpenAI | null = null;
  private model: string;

  constructor() {
    this.model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    const key = process.env.OPENAI_API_KEY;
    if (key) {
      this.client = new OpenAI({ apiKey: key });
    }
  }

  async embed(text: string): Promise<number[] | null> {
    const clean = normalizeText(text);
    if (!clean || !this.client) return null;

    try {
      const resp = await this.client.embeddings.create({
        model: this.model,
        input: clean,
      });
      const vec = resp.data?.[0]?.embedding;
      return vec ? padVector(vec, TARGET_VECTOR_DIMENSIONS) : null;
    } catch (err) {
      console.warn('[OpenAIEmbedder] Embedding generation failed:', err);
      return null;
    }
  }

  async embedBatch(texts: string[]): Promise<(number[] | null)[]> {
    if (!texts || texts.length === 0) return [];
    if (!this.client) return texts.map(() => null);

    try {
      const inputs = texts.map((t) => normalizeText(t) || ' ');
      const resp = await this.client.embeddings.create({
        model: this.model,
        input: inputs,
      });
      return resp.data.map((d) => padVector(d.embedding, TARGET_VECTOR_DIMENSIONS));
    } catch (err) {
      console.warn('[OpenAIEmbedder] Batch embedding failed:', err);
      return texts.map(() => null);
    }
  }
}

// ── Factory & Singleton ───────────────────────────────────────────────
let activeEmbedder: Embedder | null = null;

export function getEmbedder(): Embedder {
  if (activeEmbedder) return activeEmbedder;

  const provider = (process.env.EMBEDDING_PROVIDER || '').toLowerCase();
  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    activeEmbedder = new OpenAIEmbedder();
  } else {
    activeEmbedder = new TransformersEmbedder();
  }
  return activeEmbedder;
}

/**
 * Universal embedding function with:
 * - LRU in-memory query cache
 * - 800ms strict timeout guard (graceful degradation: returns null on timeout)
 */
export async function embed(text: string): Promise<number[] | null> {
  const clean = normalizeText(text);
  if (!clean) return null;

  const cacheKey = clean.toLowerCase();
  if (queryEmbeddingCache.has(cacheKey)) {
    return queryEmbeddingCache.get(cacheKey)!;
  }

  const embedder = getEmbedder();

  // Strict 800ms timeout guard per requirements:
  // "Graceful fallback: if embedding API fails or times out (>800ms), return lexical-only results."
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), 800);
  });

  try {
    const result = await Promise.race([embedder.embed(clean), timeoutPromise]);
    if (result) {
      if (queryEmbeddingCache.size >= MAX_CACHE_SIZE) {
        const firstKey = queryEmbeddingCache.keys().next().value;
        if (firstKey) queryEmbeddingCache.delete(firstKey);
      }
      queryEmbeddingCache.set(cacheKey, result);
    }
    return result;
  } catch {
    return null;
  }
}
