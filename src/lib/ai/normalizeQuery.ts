import fs from 'fs';
import path from 'path';
import { transliterateQuery, isLatinScript } from '../search/transliterate';
import { getDeterministicFiqhFallback } from './semantic';

/**
 * Normalization result with metadata
 */
export interface NormalizedQueryResult {
  normalizedQuery: string;
  originalQuery: string;
  provider: 'groq' | 'openai' | 'mistral' | 'offline_deterministic' | 'passthrough';
  latencyMs: number;
}

// In-memory LRU cache for normalized queries (0ms for repeated queries)
const normalizationCache = new Map<string, NormalizedQueryResult>();
const MAX_CACHE_SIZE = 1000;

function getEnvVar(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(new RegExp(`${key}=([^\\s\\r\\n]+)`));
      if (match) return match[1];
    }
  } catch {}
  return undefined;
}

const SYSTEM_NORMALIZATION_PROMPT = `You are an Islamic legal (Fiqh) search query normalizer for an authentic Islamic Q&A database.
Your task: Convert the user's raw input (which may be written in Banglish / Romanized Bengali, colloquial Bengali, or English) into a single, clean, concise, formal Bengali search phrase representing the core religious ruling/issue.

Examples:
- User: "ami esarer namaj porte vule gechi fojorer pore ki porte parbo"
  Output: এশার সালাত কাজা হলে ফজরের পর পড়ার হুকুম
- User: "inhaler nile ki roja vange"
  Output: রোজা অবস্থায় ইনহেলার ব্যবহারের বিধান
- User: "share market e biniyog kora halal kina"
  Output: শেয়ার বাজারে বিনিয়োগের শারয়ী বিধান
- User: "wudur foroj koyti"
  Output: ওযুর ফরযসমূহ ও নিয়ম
- User: "dog touched clothes how to purify"
  Output: কুকুরের লালা লাগলে কাপড় পবিত্র করার নিয়ম

STRICT RULES:
1. Output ONLY the clean Bengali phrase (under 10 words).
2. Absolutely NO markdown, NO quotes, NO explanation, NO punctuation like colons or quotes.
3. Translate Banglish / English into formal Bengali terms (e.g. namaj/salat -> সালাত, roja/siam -> রোজা/সিয়াম, foroj -> ফরয).`;

/**
 * Strips formatting, quotes, or accidental conversational filler from LLM output.
 */
function sanitizeNormalizedOutput(output: string): string {
  if (!output) return '';
  let cleaned = output.trim();
  // Remove markdown code fences or quotes
  cleaned = cleaned.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '');
  cleaned = cleaned.replace(/^["'`]|["'`]$/g, '');
  // Remove common prefixes like "Output:", "উত্তর:", etc.
  cleaned = cleaned.replace(/^(output|উত্তর|বাংলা|ফলাফল)\s*:\s*/i, '');
  return cleaned.trim();
}

/**
 * Performs ultra-fast query normalization via Groq (Mixtral-8x7b-32768 or LLaMA-3.1-8b-instant).
 * Fallback to OpenAI / Mistral or deterministic offline transliteration.
 *
 * Latency target: < 120ms with Groq inference.
 * Temperature: 0.1
 * Max tokens: 32 (< 35 tokens limit)
 */
export async function normalizeSearchQuery(rawQuery: string): Promise<NormalizedQueryResult> {
  const startTime = Date.now();
  const trimmed = (rawQuery || '').trim();

  if (!trimmed || trimmed.length < 2) {
    return {
      normalizedQuery: trimmed,
      originalQuery: trimmed,
      provider: 'passthrough',
      latencyMs: 0,
    };
  }

  // Check in-memory LRU cache
  const cacheKey = trimmed.toLowerCase();
  if (normalizationCache.has(cacheKey)) {
    const cached = normalizationCache.get(cacheKey)!;
    return {
      ...cached,
      latencyMs: 0,
    };
  }

  // 1. Try Groq (Ultra-fast inference: ~80-120ms)
  const groqApiKey = getEnvVar('GROQ_API_KEY');
  const groqModel = getEnvVar('GROQ_MODEL') || 'mixtral-8x7b-32768';

  if (groqApiKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s safety timeout

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [
            { role: 'system', content: SYSTEM_NORMALIZATION_PROMPT },
            { role: 'user', content: trimmed },
          ],
          temperature: 0.1,
          max_tokens: 32,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        const cleaned = sanitizeNormalizedOutput(content);
        if (cleaned && cleaned.length >= 2) {
          const result: NormalizedQueryResult = {
            normalizedQuery: cleaned,
            originalQuery: trimmed,
            provider: 'groq',
            latencyMs: Date.now() - startTime,
          };
          saveToCache(cacheKey, result);
          return result;
        }
      }
    } catch (err: any) {
      console.warn('[Groq Normalization Warning]:', err?.message || err);
    }
  }

  // 2. Try OpenAI gpt-4o-mini as second high-speed LLM fallback
  const openaiApiKey = getEnvVar('OPENAI_API_KEY');
  if (openaiApiKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_NORMALIZATION_PROMPT },
            { role: 'user', content: trimmed },
          ],
          temperature: 0.1,
          max_tokens: 32,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        const cleaned = sanitizeNormalizedOutput(content);
        if (cleaned && cleaned.length >= 2) {
          const result: NormalizedQueryResult = {
            normalizedQuery: cleaned,
            originalQuery: trimmed,
            provider: 'openai',
            latencyMs: Date.now() - startTime,
          };
          saveToCache(cacheKey, result);
          return result;
        }
      }
    } catch (err: any) {
      console.warn('[OpenAI Normalization Warning]:', err?.message || err);
    }
  }

  // 3. Deterministic offline fallback (0ms latency, zero API dependency)
  const deterministicFallback = getDeterministicFiqhFallback(trimmed);
  if (deterministicFallback?.canonicalBengali) {
    const result: NormalizedQueryResult = {
      normalizedQuery: deterministicFallback.canonicalBengali,
      originalQuery: trimmed,
      provider: 'offline_deterministic',
      latencyMs: Date.now() - startTime,
    };
    saveToCache(cacheKey, result);
    return result;
  }

  // 4. Offline Transliteration (for Banglish queries)
  if (isLatinScript(trimmed)) {
    const transliterated = transliterateQuery(trimmed);
    if (transliterated.primaryBengali && transliterated.primaryBengali !== trimmed) {
      const result: NormalizedQueryResult = {
        normalizedQuery: transliterated.primaryBengali,
        originalQuery: trimmed,
        provider: 'offline_deterministic',
        latencyMs: Date.now() - startTime,
      };
      saveToCache(cacheKey, result);
      return result;
    }
  }

  // 5. Safe passthrough
  const result: NormalizedQueryResult = {
    normalizedQuery: trimmed,
    originalQuery: trimmed,
    provider: 'passthrough',
    latencyMs: Date.now() - startTime,
  };
  saveToCache(cacheKey, result);
  return result;
}

function saveToCache(key: string, result: NormalizedQueryResult): void {
  if (normalizationCache.size >= MAX_CACHE_SIZE) {
    const firstKey = normalizationCache.keys().next().value;
    if (firstKey) normalizationCache.delete(firstKey);
  }
  normalizationCache.set(key, result);
}
