/**
 * AI Semantic Search Intent Analyzer
 * 
 * Silently extracts the underlying Islamic legal/fiqh intent (মর্মার্থ)
 * from user queries (Banglish or Bengali) using Mistral AI.
 * 
 * Features:
 * - Ultra-fast in-memory LRU-style cache (0ms for repeated queries)
 * - Safe 2-second timeout with graceful fallback
 * - Returns canonical fiqh terms, subjects, and concepts
 */

import fs from 'fs';
import path from 'path';

export interface SemanticAnalysis {
  canonicalBengali: string;
  fiqhTerms: string[];
  primarySubject: string;
  primaryAction: string;
  mustInclude: string[];
}

function getApiKey(): string | undefined {
  if (process.env.MISTRAL_API_KEY) return process.env.MISTRAL_API_KEY;
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/MISTRAL_API_KEY=([^\s\r\n]+)/);
      if (match) return match[1];
    }
  } catch {}
  return undefined;
}

// In-memory cache for query intent
const semanticCache = new Map<string, SemanticAnalysis>();
const MAX_CACHE_SIZE = 500;

export async function extractSemanticFiqhIntent(rawQuery: string): Promise<SemanticAnalysis | null> {
  const query = (rawQuery || '').trim();
  if (!query || query.length < 2) return null;

  const cacheKey = query.toLowerCase();
  if (semanticCache.has(cacheKey)) {
    return semanticCache.get(cacheKey)!;
  }

  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2200);

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
            content: `You are an expert Islamic fiqh query analyzer for a verified fatwa research archive.
A user has entered a search query which may be in Banglish (English letters) or colloquial Bengali.
Analyze the core Islamic fiqh question/intent (মর্মার্থ).
Output ONLY a JSON object with:
{
  "canonicalBengali": "formal Bengali representation of the question",
  "fiqhTerms": ["3-5 specific fiqh terms/concepts, e.g. জালসায়ে ইস্তিরাহাত, দুই সিজদার মধ্যবর্তী বৈঠক"],
  "primarySubject": "core topic (e.g. সিজদা, রোজা, ওযু)",
  "primaryAction": "specific action/aspect (e.g. বসা, বৈঠক, ইনহেলার)",
  "mustInclude": ["2-3 core Bengali words"]
}
Example: 'dui sijdar por bosa' -> {
  "canonicalBengali": "দুই সিজদার পর বসা",
  "fiqhTerms": ["জালসায়ে ইস্তিরাহাত", "সিজদার পর বসা", "দুই সিজদার মধ্যবর্তী বৈঠক", "বৈঠক"],
  "primarySubject": "সিজদা",
  "primaryAction": "বসা",
  "mustInclude": ["সিজদা", "বসা"]
}`,
          },
          {
            role: 'user',
            content: query,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as SemanticAnalysis;
    const result: SemanticAnalysis = {
      canonicalBengali: parsed.canonicalBengali || query,
      fiqhTerms: Array.isArray(parsed.fiqhTerms) ? parsed.fiqhTerms.filter(Boolean) : [],
      primarySubject: parsed.primarySubject || '',
      primaryAction: parsed.primaryAction || '',
      mustInclude: Array.isArray(parsed.mustInclude) ? parsed.mustInclude.filter(Boolean) : [],
    };

    if (semanticCache.size >= MAX_CACHE_SIZE) {
      const firstKey = semanticCache.keys().next().value;
      if (firstKey) semanticCache.delete(firstKey);
    }
    semanticCache.set(cacheKey, result);

    return result;
  } catch {
    // Network error, abort/timeout or JSON parse error - silently fallback
    return null;
  }
}
