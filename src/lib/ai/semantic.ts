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
  coreSubject: string;
  coreAspect: string;
  essentialKeywords: string[];
  fiqhConcepts: string[];
  primarySubject: string;
  primaryAction: string;
  fiqhTerms: string[];
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

import { isLatinScript, transliterateQuery } from '../search/transliterate';

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
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    let promptQuery = query;
    if (isLatinScript(query)) {
      const trans = transliterateQuery(query);
      if (trans.primaryBengali && trans.primaryBengali !== query) {
        promptQuery = `${query} (বাংলায়: ${trans.primaryBengali})`;
      }
    }

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
            content: `You are an expert Islamic fiqh query analyzer for a verified fatwa research archive (containing Al-Itisam, At-Tahreek, Al-Kawsar).
Analyze the user's search query (Banglish or colloquial Bengali) and identify the core fiqh legal issue (মর্মার্থ).
Output ONLY a compact JSON object with:
{
  "canonicalBengali": "formal concise Bengali question title",
  "coreSubject": "broad topic (e.g. রোজা, সালাত, আকীকা, জানাযা, তাহাজ্জুদ, সিজদা, ওযু, তালাক, যাকাত, পর্দা, ধূমপান, দাড়ি)",
  "coreAspect": "specific aspect/question (e.g. ইনজেকশন, ছাগল সংখ্যা, সূরা ফাতিহা, রাকাত সংখ্যা, বৈঠক, ইনহেলার, হাত বাঁধা, হারাম, কাটা)",
  "essentialKeywords": ["2-3 crucial Bengali words that MUST be in the fatwa question or answer"],
  "fiqhConcepts": ["3-5 authentic fiqh concepts and spelling variations across Bangladeshi Islamic journals"]
}
Examples:
- 'protom rakaat sese uthe daranor age boithok e bosa' -> {"canonicalBengali": "প্রথম রাকাত শেষে দাঁড়ানোর পূর্বে বৈঠক বা বসার বিধান", "coreSubject": "সালাত", "coreAspect": "জালসায়ে ইস্তিরাহাত", "essentialKeywords": ["প্রথম রাকাত", "বৈঠক", "দাঁড়ানোর পূর্বে"], "fiqhConcepts": ["জালসায়ে ইস্তিরাহাত", "প্রথম রাকাতের বৈঠক", "ইস্তিরাহাত", "সিজদা থেকে দাঁড়ানোর পূর্বে বৈঠক"]}
- 'dui sijdar por bosa' -> {"canonicalBengali": "দুই সিজদার পর বৈঠক বা বসার বিধান", "coreSubject": "সিজদা", "coreAspect": "বসা", "essentialKeywords": ["সিজদা", "বসা"], "fiqhConcepts": ["জালসায়ে ইস্তিরাহাত", "দুই সিজদার মধ্যবর্তী বৈঠক", "সিজদার পর বসা", "বৈঠক"]}
- 'roza obosthay injection neya jabe ki' -> {"canonicalBengali": "রোযা অবস্থায় ইনজেকশন নেওয়ার বিধান", "coreSubject": "রোজা", "coreAspect": "ইনজেকশন", "essentialKeywords": ["রোজা", "ইনজেকশন"], "fiqhConcepts": ["রোযা ভঙ্গ", "ইনসুলিন", "টিকা", "রোযা নষ্ট"]}
- 'cheler akika koyta chagol' -> {"canonicalBengali": "ছেলে সন্তানের আকীকায় ছাগলের সংখ্যা", "coreSubject": "আকীকা", "coreAspect": "ছাগল", "essentialKeywords": ["আকীকা", "ছাগল", "পুত্র"], "fiqhConcepts": ["আক্বীক্বা", "পশুর সংখ্যা", "পুত্র সন্তান", "দুটি ছাগল"]}
- 'janajar namaje sura fateha' -> {"canonicalBengali": "জানাযার সালাতে সূরা ফাতিহা পাঠের বিধান", "coreSubject": "জানাযা", "coreAspect": "সূরা ফাতিহা", "essentialKeywords": ["জানাযা", "সূরা ফাতিহা"], "fiqhConcepts": ["জানাযার নামায", "সূরা ফাতিহা", "সালাতুল জানাযা", "ক্বিরাআত"]}
- 'hath badha buker upor na nabir niche' -> {"canonicalBengali": "সালাতে হাত বাঁধার স্থান (বুকের উপর নাকি নাভির নিচে)", "coreSubject": "সালাত", "coreAspect": "হাত বাঁধা", "essentialKeywords": ["হাত বাঁধা", "বুকের উপর", "নাভির নিচে"], "fiqhConcepts": ["বুকে হাত বাঁধা", "নাভীর নীচে হাত বাঁধা", "সালাতে হাত বাঁধা", "তাকবীরে তাহরীমা"]}
- 'dhum pan kora haram kina' -> {"canonicalBengali": "ধূমপান ও বিড়ি-সিগারেট খাওয়ার শারয়ী বিধান", "coreSubject": "হালাল-হারাম", "coreAspect": "ধূমপান", "essentialKeywords": ["ধূমপান", "বিড়ি", "সিগারেট"], "fiqhConcepts": ["ধূমপানের হুকুম", "তামাক", "মাদক", "হারাম"]}
- 'oju chara quran dhora jabe ki' -> {"canonicalBengali": "ওযু ছাড়া কুরআন মাজীদ স্পর্শ বা পাঠ করার বিধান", "coreSubject": "ওযু", "coreAspect": "কুরআন স্পর্শ", "essentialKeywords": ["ওযু", "কুরআন", "স্পর্শ"], "fiqhConcepts": ["মুসহাফ স্পর্শ", "বিনা ওযূতে কুরআন", "অপবিত্র অবস্থায় কুরআন", "পবিত্রতা"]}
- 'soitan er dhoka' -> {"canonicalBengali": "শয়তানের ধোঁকা ও ওয়াসওয়াসা থেকে বাঁচার উপায়", "coreSubject": "শয়তান", "coreAspect": "ধোঁকা", "essentialKeywords": ["শয়তান", "ধোঁকা", "ওয়াসওয়াসা"], "fiqhConcepts": ["শয়তানের কুমন্ত্রণা", "ওয়াসওয়াসা", "ইবলিস", "কুচিন্তা", "শয়তানের ধোঁকা"]}
- 'tahajjud koy rakat' -> {"canonicalBengali": "তাহাজ্জুদ সালাতের রাকাত সংখ্যা", "coreSubject": "তাহাজ্জুদ", "coreAspect": "রাকাত সংখ্যা", "essentialKeywords": ["তাহাজ্জুদ", "রাকাত"], "fiqhConcepts": ["কিয়ামুল লাইল", "নফল সালাত", "আট রাকাত", "বিতর"]}`,
          },
          {
            role: 'user',
            content: promptQuery,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 300,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    const coreSubject = parsed.coreSubject || parsed.primarySubject || '';
    const coreAspect = parsed.coreAspect || parsed.primaryAction || '';
    const fiqhConcepts = Array.isArray(parsed.fiqhConcepts)
      ? parsed.fiqhConcepts.filter(Boolean)
      : Array.isArray(parsed.fiqhTerms)
      ? parsed.fiqhTerms.filter(Boolean)
      : [];
    const essentialKeywords = Array.isArray(parsed.essentialKeywords)
      ? parsed.essentialKeywords.filter(Boolean)
      : Array.isArray(parsed.mustInclude)
      ? parsed.mustInclude.filter(Boolean)
      : [];

    const result: SemanticAnalysis = {
      canonicalBengali: parsed.canonicalBengali || query,
      coreSubject,
      coreAspect,
      essentialKeywords,
      fiqhConcepts,
      primarySubject: coreSubject,
      primaryAction: coreAspect,
      fiqhTerms: fiqhConcepts,
      mustInclude: essentialKeywords,
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
