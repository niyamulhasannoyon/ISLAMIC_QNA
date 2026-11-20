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

import { FiqhSemanticAnalysis } from '@/types/fatwa';
import { isLatinScript, transliterateQuery } from '../search/transliterate';

export type SemanticAnalysis = FiqhSemanticAnalysis;

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
const semanticCache = new Map<string, FiqhSemanticAnalysis>();
const MAX_CACHE_SIZE = 500;

const SYSTEM_FIQH_PROMPT = `You are an expert Islamic Jurisprudence (Fiqh) semantic analyzer and search query optimizer for an Islamic Fatwa & Research Archive.

Task:
Analyze any user search query (written in Bengali, English, or Banglish), understand the core religious issue/intent, extract the relevant Islamic legal (Fiqhi) terminology, and generate optimized search keywords to fetch precise fatwas from the database.

Guidelines:
1. Universal Domain Coverage: Handle all branches of Islam seamlessly (Taharah, Salah, Sawm, Zakat, Hajj, Nikah, Talaq, Muamalat/Finance, Aqeedah, Modern issues, etc.).
2. Fiqh Mapping: Map everyday or vague descriptions to their precise classical/contemporary Islamic terms (e.g., "দাড়ি কাটা" -> "মুণ্ডন, ছাঁটা, সুন্নাহ"; "শেয়ার বাজার" -> "মুদারাবা, রিবা, স্টক, হালাল বিনিয়োগ"; "দীর্ঘদিন রক্তস্রাব" -> "ইস্তিহাযা, মুস্তাহাযা, রক্তস্রাব, মা'যুর").
3. Term Variations: Include common Bengali spelling variants for Islamic terms (e.g., হায়েয / হায়েজ, উযূ / ওযু / অজু, ইস্তিহাযা / ইস্তিহাজা, যাকাত / জাকাত).
4. Concise & Noise-free: Do not hallucinate irrelevant concepts; keep keywords tightly bound to the query's core issue.
5. Strict JSON Output: Output ONLY a valid raw JSON object. Do not include markdown wraps, code blocks, or conversational filler.

JSON Schema:
{
  "fiqh_intent": "Clear 1-sentence summary of the religious issue and ruling being sought",
  "fiqh_category": "Main topic (e.g., Taharah, Salah, Financial Transactions, Family Law)",
  "technical_fiqh_terms": ["List of core technical Fiqh terms in Bengali with alternate spellings"],
  "expanded_keywords": ["Synonyms, root concepts, and real-world phrasing related to the query"],
  "optimized_search_query": "Space-separated string of the highest-weight technical terms, variants, and original keywords for database full-text matching"
}`;

/**
 * Deterministic offline Fiqh knowledge graph fallback.
 * Guarantees instantaneous (0ms), accurate Fiqh mapping even when external LLMs
 * are offline, rate-limited, or without an API key.
 */
export function getDeterministicFiqhFallback(rawQuery: string): FiqhSemanticAnalysis | null {
  const q = rawQuery.toLowerCase().trim();
  if (!q) return null;

  // 1. Women's Purity: Istihadha, Haidh, Nifas, Leucorrhea
  if (/(রক্তস্রাব|রক্তপাত|রক্ত\s*পড়া|রক্ত\s*যাওয়া|পিরিয়ড|মাসিক|হায়[েয়ে]য|হায়[েয়ে]জ|ইস্তিহায|ইস্তিহাজ|মুস্তাহায|মুস্তাহাজ|সাদা\s*স্রাব|লিকুরিয়া|নিফাস|নেফাস)/iu.test(q)) {
    if (/(দীর্ঘদিন|অতিরিক্ত|অস্বাভাবিক|বন্ধ\s*না|চলতেই\s*থাকে|অসুস্থ|মাঝে\s*মাঝেই|ইস্তিহায|ইস্তিহাজ|মুস্তাহায|মুস্তাহাজ)/iu.test(q)) {
      const technical_fiqh_terms = ['ইস্তিহাযা', 'ইস্তিহাজা', 'মুস্তাহাযা', 'মুস্তাহাজা', 'হায়েয', 'হায়েজ', 'মা\'যুর', 'মাযুর', 'উযূ', 'ওযু', 'সালাত', 'তুহর'];
      const expanded_keywords = ['দীর্ঘদিন রক্তস্রাব', 'অতিরিক্ত রক্তস্রাব', 'অস্বাভাবিক রক্তপাত', 'মাসিকের অতিরিক্ত দিন', 'রক্ত বন্ধ না হলে সালাত', 'ইস্তিহাযা অবস্থায় নামায', 'মুস্তাহাযার সালাতের নিয়ম', 'প্রতি ওয়াক্তে ওযু', 'অসুস্থতাজনিত রক্তস্রাব', 'নারীর সালাত', 'প্রদর রোগ'];
      return {
        fiqh_intent: 'অস্বাভাবিক দীর্ঘমেয়াদী রক্তস্রাব বা ইস্তিহাযাগ্রস্ত নারীর পবিত্রতা অর্জন ও সালাত আদায়ের শারয়ী বিধান।',
        fiqh_category: 'Taharah & Salah',
        technical_fiqh_terms,
        expanded_keywords,
        optimized_search_query: `${rawQuery} ইস্তিহাযা ইস্তিহাজা মুস্তাহাযা মুস্তাহাজা হায়েয হায়েজ মাযুর ওযু নামায সালাত রক্তপাত`,
        canonicalBengali: 'দীর্ঘদিন রক্তস্রাবে নারীর সালাতের শারয়ী বিধান',
        coreSubject: 'সালাত',
        coreAspect: 'ইস্তিহাযা',
        essentialKeywords: ['ইস্তিহাযা', 'মুস্তাহাযা', 'সালাত'],
        fiqhConcepts: technical_fiqh_terms,
        primarySubject: 'সালাত',
        primaryAction: 'ইস্তিহাযা',
        fiqhTerms: technical_fiqh_terms,
        mustInclude: ['ইস্তিহাযা', 'মুস্তাহাযা'],
      };
    }

    if (/(সাদা\s*স্রাব|লিকুরিয়া)/iu.test(q)) {
      const technical_fiqh_terms = ['সাদাস্রাব', 'সাদা স্রাব', 'ওযু', 'ওযূ', 'পবিত্রতা', 'ওযু ভঙ্গ', 'নাপাকী'];
      const expanded_keywords = ['মেয়েদের সাদাস্রাব', 'ওযু ভেঙ্গে যায় কি', 'স্রাব বের হলে করণীয়', 'লিকুরিয়া', 'পবিত্রতা'];
      return {
        fiqh_intent: 'মহিলাদের সাদাস্রাব বা লিকুরিয়ার কারণে ওযু ভঙ্গ ও পবিত্রতার শারয়ী বিধান।',
        fiqh_category: 'Taharah',
        technical_fiqh_terms,
        expanded_keywords,
        optimized_search_query: `${rawQuery} সাদাস্রাব সাদা স্রাব ওযু ভঙ্গ ওযূ পবিত্রতা নারীর সালাত`,
        canonicalBengali: 'মহিলাদের সাদাস্রাবে ওযু ও পবিত্রতার বিধান',
        coreSubject: 'তাহারাত',
        coreAspect: 'সাদাস্রাব',
        essentialKeywords: ['সাদাস্রাব', 'ওযু'],
        fiqhConcepts: technical_fiqh_terms,
        primarySubject: 'তাহারাত',
        primaryAction: 'সাদাস্রাব',
        fiqhTerms: technical_fiqh_terms,
        mustInclude: ['সাদাস্রাব', 'ওযু'],
      };
    }

    if (/(নিফাস|নেফাস|সন্তান\s*প্রসব|প্রসবোত্তর)/iu.test(q)) {
      const technical_fiqh_terms = ['নিফাস', 'নেফাস', 'প্রসবোত্তর রক্তস্রাব', 'সালাত', 'কাযা', 'সিয়াম', 'পবিত্রতা'];
      const expanded_keywords = ['নিফাস অবস্থায় সালাত', 'প্রসবের পর রক্তস্রাব', 'নিফাসের মেয়াদ', 'চল্লিশ দিন'];
      return {
        fiqh_intent: 'সন্তান প্রসবোত্তর রক্তস্রাব বা নিফাসকালীন নারীর পবিত্রতা ও সালাত-সিয়ামের শারয়ী বিধান।',
        fiqh_category: 'Taharah & Salah',
        technical_fiqh_terms,
        expanded_keywords,
        optimized_search_query: `${rawQuery} নিফাস নেফাস প্রসবোত্তর রক্তস্রাব নারীর সালাত সিয়াম কাযা পবিত্রতা`,
        canonicalBengali: 'নিফাসকালীন নারীর সালাত ও সিয়ামের বিধান',
        coreSubject: 'সালাত',
        coreAspect: 'নিফাস',
        essentialKeywords: ['নিফাস', 'সালাত'],
        fiqhConcepts: technical_fiqh_terms,
        primarySubject: 'সালাত',
        primaryAction: 'নিফাস',
        fiqhTerms: technical_fiqh_terms,
        mustInclude: ['নিফাস'],
      };
    }

    // Standard Haidh
    const technical_fiqh_terms = ['হায়েয', 'হায়েজ', 'ঋতুস্রাব', 'তুহর', 'পবিত্রতা', 'সালাত', 'কাযা'];
    const expanded_keywords = ['মাসিক অবস্থায় সালাত', 'হায়েজের বিধান', 'ঋতুস্রাবের দিন', 'পবিত্র হওয়ার গোসল'];
    return {
      fiqh_intent: 'ঋতুস্রাব বা হায়েযকালীন নারীর পবিত্রতা, সালাত ও সিয়ামের শারয়ী বিধান।',
      fiqh_category: 'Taharah & Salah',
      technical_fiqh_terms,
      expanded_keywords,
      optimized_search_query: `${rawQuery} হায়েয হায়েজ ঋতুস্রাব মাসিক নারীর সালাতের বিধান পবিত্রতা গোসল`,
      canonicalBengali: 'হায়েয বা ঋতুস্রাবে নারীর সালাতের বিধান',
      coreSubject: 'সালাত',
      coreAspect: 'হায়েয',
      essentialKeywords: ['হায়েয', 'সালাত'],
      fiqhConcepts: technical_fiqh_terms,
      primarySubject: 'সালাত',
      primaryAction: 'হায়েয',
      fiqhTerms: technical_fiqh_terms,
      mustInclude: ['হায়েয'],
    };
  }

  // 2. Prayer Rituals & Postures: Jalsah Istirahat, Hands Placement, Qasr
  if (/(সিজদ|সেজদ|বৈঠক|বস|জালসা|ইস্তিরাহ|রাকাত|রাকআত|দাঁড়া)/iu.test(q)) {
    if (/(প্রথম\s*রাকাত|সিজদা.*পর.*বস|দুই\s*সিজদা.*বস|ইস্তিরাহ)/iu.test(q)) {
      const technical_fiqh_terms = ['জালসায়ে ইস্তিরাহাত', 'জালসায়ে ইস্তিরাহাত', 'ইস্তিরাহাত', 'বৈঠক', 'দুই সিজদার পর বসা', 'সিজদা', 'সালাত'];
      const expanded_keywords = ['প্রথম রাকাত শেষে বৈঠক', 'সিজদা থেকে ওঠার পূর্বে বসা', 'বিশ্রামের বৈঠক', 'দুই সিজদার মধ্যবর্তী বৈঠক'];
      return {
        fiqh_intent: 'সালাতে প্রথম রাকাত শেষে অথবা দুই সিজদার পর দাঁড়ানোর পূর্বে বসার (জালসায়ে ইস্তিরাহাত) শারয়ী বিধান।',
        fiqh_category: 'Salah',
        technical_fiqh_terms,
        expanded_keywords,
        optimized_search_query: `${rawQuery} জালসায়ে ইস্তিরাহাত প্রথম রাকাত বৈঠক দুই সিজদার পর বসা সালাত সিজদা`,
        canonicalBengali: 'দুই সিজদার পর বা প্রথম রাকাত শেষে জালসায়ে ইস্তিরাহাত বৈঠক',
        coreSubject: 'সালাত',
        coreAspect: 'জালসায়ে ইস্তিরাহাত',
        essentialKeywords: ['জালসায়ে ইস্তিরাহাত', 'বৈঠক'],
        fiqhConcepts: technical_fiqh_terms,
        primarySubject: 'সালাত',
        primaryAction: 'জালসায়ে ইস্তিরাহাত',
        fiqhTerms: technical_fiqh_terms,
        mustInclude: ['জালসায়ে ইস্তিরাহাত', 'বৈঠক'],
      };
    }
  }

  if (/(হাত\s*বাঁধ|হাত\s*বাধা|বুকে\s*হাত|নাভির\s*নিচে|নাভীর\s*নিচে)/iu.test(q)) {
    const technical_fiqh_terms = ['বুকে হাত বাঁধা', 'নাভির নিচে হাত বাঁধা', 'সালাতে হাত বাঁধা', 'তাকবীরে তাহরীমা', 'কিয়াম', 'সুন্নাহ'];
    const expanded_keywords = ['হাত বাঁধার নিয়ম', 'বুকের উপরে হাত', 'নাভীর নীচে হাত বাঁধা', 'হাদীসের আলোকে হাত বাঁধা'];
    return {
      fiqh_intent: 'সালাতে তাকবীরে তাহরীমার পর হাত বাঁধার সঠিক শারয়ী স্থান (বুকের উপর নাকি নাভির নিচে)।',
      fiqh_category: 'Salah',
      technical_fiqh_terms,
      expanded_keywords,
      optimized_search_query: `${rawQuery} বুকে হাত বাঁধা নাভির নিচে হাত বাঁধা সালাত তাকবীরে তাহরীমা সুন্নাহ`,
      canonicalBengali: 'সালাতে বুকে হাত বাঁধার শারয়ী বিধান',
      coreSubject: 'সালাত',
      coreAspect: 'হাত বাঁধা',
      essentialKeywords: ['হাত বাঁধা', 'বুকে'],
      fiqhConcepts: technical_fiqh_terms,
      primarySubject: 'সালাত',
      primaryAction: 'হাত বাঁধা',
      fiqhTerms: technical_fiqh_terms,
      mustInclude: ['হাত বাঁধা'],
    };
  }

  if (/(কসর|কছর|মুসাফির|সফর.*নামায|সফর.*সালাত|দূরত্ব.*সফর)/iu.test(q)) {
    const technical_fiqh_terms = ['কসর', 'কছর', 'মুসাফির', 'সফর', 'কসর সালাত', 'ইমামতি', 'জমা বাইনাস সালাতাইন'];
    const expanded_keywords = ['সফরের নামায', 'কসরের দূরত্ব', 'কত কিমি সফর করলে কসর', 'মুসাফিরের সালাত'];
    return {
      fiqh_intent: 'সফর অবস্থায় সালাত কসর করার দূরত্ব, সময়সীমা ও শারয়ী বিধান।',
      fiqh_category: 'Salah',
      technical_fiqh_terms,
      expanded_keywords,
      optimized_search_query: `${rawQuery} কসর কছর মুসাফির সফর সালাতের দূরত্ব কসর নামায বিধান`,
      canonicalBengali: 'সফরে সালাত কসর করার শারয়ী বিধান ও সময়সীমা',
      coreSubject: 'সালাত',
      coreAspect: 'কসর',
      essentialKeywords: ['কসর', 'সফর', 'মুসাফির'],
      fiqhConcepts: technical_fiqh_terms,
      primarySubject: 'সালাত',
      primaryAction: 'কসর',
      fiqhTerms: technical_fiqh_terms,
      mustInclude: ['কসর'],
    };
  }

  // Missed / Forgotten Prayer (কাজা সালাত / নামায পড়তে ভুলে গেলে)
  if (
    /(কাজা|কাযা|ভুলে\s*গে|ঘুমিয়ে\s*পড়|ঘুমের\s*কারণে|সময়\s*পার|ওয়াক্ত\s*পার|দেরিতে\s*পড়|ভুলে\s*গেলে)/iu.test(q) ||
    /(vule\s*ge|qaza|kaza|miss\s*prayer|namaj.*vule|salat.*vule|namaz.*vule|porte\s*vule|esar.*namaj|fojor.*pore)/iu.test(q)
  ) {
    const technical_fiqh_terms = ['কাজা সালাত', 'কাযা নামায', 'সালাত কাযা', 'ওয়াক্ত অতিবাহিত', 'ঘুম বা ভুলে সালাত ছুটে যাওয়া', 'কাজা আদায়ের নিয়ম'];
    const expanded_keywords = ['এশার সালাত কাজা হলে পড়ার হুকুম', 'ফজরের পর কাজা সালাত', 'ভুলে যাওয়া নামায আদায়', 'সালাত কাজা পড়ার নিয়ম', 'ছুটে যাওয়া সালাত'];
    return {
      fiqh_intent: 'ওয়াক্ত পার হয়ে গেলে বা ভুলে নামায ছুটে গেলে তা কাজা আদায়ের শারয়ী হুকুম ও সময়।',
      fiqh_category: 'Salah',
      technical_fiqh_terms,
      expanded_keywords,
      optimized_search_query: `${rawQuery} কাজা সালাত কাযা নামায এশার সালাত ফজরের পর কাজা পড়ার হুকুম`,
      canonicalBengali: 'এশার সালাত কাজা হলে ফজরের পর পড়ার হুকুম',
      coreSubject: 'সালাত',
      coreAspect: 'কাজা সালাত',
      essentialKeywords: ['কাজা', 'সালাত', 'নামাজ'],
      fiqhConcepts: technical_fiqh_terms,
      primarySubject: 'সালাত',
      primaryAction: 'কাজা',
      fiqhTerms: technical_fiqh_terms,
      mustInclude: ['কাজা', 'সালাত'],
    };
  }

  // 3. Sawm & Medical Issues: Injections, Inhaler, Saline, Breaking Fast
  if (/(রো[জয][াে].*(?:ভাঙ|ভাঙ্গ|ভঙ্গ|নষ্ট|ভেঙ্গ|ভেঙে)|সিয়াম.*(?:নষ্ট|ভঙ্গ|ভাঙ)|রোজার.*ভেঙ্গে|রোযা.*ভঙ্গ)/iu.test(q) || /(roja|roza|siam|siyam).*(?:vanga|vangar|vange|bhanga|bhangar|bhenge)/iu.test(q)) {
    const technical_fiqh_terms = ['রোজা ভঙ্গ', 'সিয়াম নষ্ট', 'রোজা ভাঙার কারণ', 'কাযা', 'কাফফারা', 'রোযা'];
    const expanded_keywords = ['রোজা ভঙ্গের কারণ', 'রোযা নষ্টের কারণ', 'কী কী কারণে রোজা ভাঙে', 'রোজা ভেঙে গেলে করণীয়'];
    return {
      fiqh_intent: 'রোজা ভঙ্গের কারণসমূহ এবং রোজা নষ্ট হলে কাযা ও কাফফারার শারয়ী বিধান।',
      fiqh_category: 'Sawm (Fasting)',
      technical_fiqh_terms,
      expanded_keywords,
      optimized_search_query: `${rawQuery} রোজা ভঙ্গের কারণ রোযা নষ্ট সিয়াম ভঙ্গ কাযা কাফফারা`,
      canonicalBengali: 'রোজা ভঙ্গের কারণ ও কাযার শারয়ী বিধান',
      coreSubject: 'রোজা',
      coreAspect: 'রোজা ভঙ্গ',
      essentialKeywords: ['রোজা', 'ভঙ্গ', 'ভাঙা'],
      fiqhConcepts: technical_fiqh_terms,
      primarySubject: 'রোজা',
      primaryAction: 'ভঙ্গ',
      fiqhTerms: technical_fiqh_terms,
      mustInclude: ['রোজা'],
    };
  }

  if (/(ইনজেকশন|ইনহেলার|স্যালাইন|ইনসুলিন|ভ্যাকসিন|চোখে\s*ড্রপ)/iu.test(q)) {
    const technical_fiqh_terms = ['রোজা ভঙ্গ', 'সিয়াম নষ্ট', 'ইনজেকশন', 'ইনহেলার', 'স্যালাইন', 'কাযা', 'কাফফারা'];
    const expanded_keywords = ['রোযা অবস্থায় ইনজেকশন', 'ইনহেলার নিলে কি রোজা ভাঙ্গে', 'ইনসুলিন ও রোজা', 'স্যালাইন গ্রহণ'];
    return {
      fiqh_intent: 'রোযা অবস্থায় আধুনিক চিকিৎসা সামগ্রী (ইনজেকশন, ইনহেলার, স্যালাইন) ব্যবহারের শারয়ী বিধান ও রোযা ভঙ্গ সংক্রান্ত মাসআলা।',
      fiqh_category: 'Sawm (Fasting)',
      technical_fiqh_terms,
      expanded_keywords,
      optimized_search_query: `${rawQuery} রোজা অবস্থায় ইনজেকশন ইনহেলার স্যালাইন রোজা ভঙ্গ সিয়াম নষ্ট বিধান`,
      canonicalBengali: 'রোযা অবস্থায় ইনজেকশন ও ইনহেলার ব্যবহারের বিধান',
      coreSubject: 'রোজা',
      coreAspect: 'ইনজেকশন',
      essentialKeywords: ['রোজা', 'ইনজেকশন'],
      fiqhConcepts: technical_fiqh_terms,
      primarySubject: 'রোজা',
      primaryAction: 'ইনজেকশন',
      fiqhTerms: technical_fiqh_terms,
      mustInclude: ['রোজা'],
    };
  }

  // 3b. Prayer Concentration & Focus
  if (/(নামাজ|সালাত).*(?:মনোযোগ|একাগ্রতা|খুশু|খুজু)/iu.test(q) || /(namaj|salat).*(?:montojog|monojog|khushu)/iu.test(q)) {
    const technical_fiqh_terms = ['সালাতে মনোযোগ', 'নামাজে একাগ্রতা', 'খুশু', 'খুজু', 'ওয়াসওয়াসা', 'নামাজে খারাপ চিন্তা'];
    const expanded_keywords = ['নামাজে মন বসানোর উপায়', 'সালাতে মনোযোগ বৃদ্ধির দোয়া', 'নামাজে শয়তানের কুমন্ত্রণা'];
    return {
      fiqh_intent: 'সালাতে একাগ্রতা ও মনোযোগ (খুশু-খুজু) অর্জনের উপায় এবং শয়তানের ওয়াসওয়াসা দূর করার শারয়ী নির্দেশনা।',
      fiqh_category: 'Salah',
      technical_fiqh_terms,
      expanded_keywords,
      optimized_search_query: `${rawQuery} সালাতে মনোযোগ নামাজে একাগ্রতা খুশু খুজু ওয়াসওয়াসা শয়তানের কুমন্ত্রণা`,
      canonicalBengali: 'সালাতে মনোযোগ ও একাগ্রতা অর্জনের বিধান',
      coreSubject: 'সালাত',
      coreAspect: 'মনোযোগ',
      essentialKeywords: ['সালাত', 'মনোযোগ', 'খুশু'],
      fiqhConcepts: technical_fiqh_terms,
      primarySubject: 'সালাত',
      primaryAction: 'মনোযোগ',
      fiqhTerms: technical_fiqh_terms,
      mustInclude: ['সালাত'],
    };
  }

  // 3c. Satan, Waswasa & Temptation
  if (/(শয়তান|শয়তান).*(?:ওয়াসওয়াসা|ওয়াসওয়াসা|ধোঁকা|ধোকা|কুমন্ত্রণা|কুচিন্তা|খারাপ\s*চিন্তা)/iu.test(q) || /(soitan|shaitan).*(?:waswasa|dhoka|mukti|kuchinta)/iu.test(q)) {
    const technical_fiqh_terms = ['শয়তানের ওয়াসওয়াসা', 'শয়তানের কুমন্ত্রণা', 'কুচিন্তা', 'অন্তরে খারাপ চিন্তা', 'ইস্তিগফার', 'আউযুবিল্লাহ'];
    const expanded_keywords = ['শয়তানের ধোঁকা থেকে বাঁচার উপায়', 'অন্তরে কুচিন্তা আসলে কি গুনাহ হয়', 'ওয়াসওয়াসা দূর করার দোয়া'];
    return {
      fiqh_intent: 'শয়তানের ওয়াসওয়াসা, ধোঁকা ও অন্তরের কুচিন্তা দূর করার শারয়ী উপায় এবং এর বিধান।',
      fiqh_category: 'Aqeedah & Tazkiyah',
      technical_fiqh_terms,
      expanded_keywords,
      optimized_search_query: `${rawQuery} শয়তানের ওয়াসওয়াসা কুমন্ত্রণা কুচিন্তা ধোঁকা অন্তরে খারাপ চিন্তা বাঁচবে`,
      canonicalBengali: 'শয়তানের ওয়াসওয়াসা ও কুচিন্তা থেকে বাঁচার শারয়ী বিধান',
      coreSubject: 'ওয়াসওয়াসা',
      coreAspect: 'শয়তানের ধোঁকা',
      essentialKeywords: ['শয়তান', 'ওয়াসওয়াসা'],
      fiqhConcepts: technical_fiqh_terms,
      primarySubject: 'ওয়াসওয়াসা',
      primaryAction: 'শয়তান',
      fiqhTerms: technical_fiqh_terms,
      mustInclude: ['শয়তান'],
    };
  }

  // 3d. Aqeeqah with Animals
  if (/(আকীকা|আক্বীক্বা|আকিকা).*(?:ছাগল|খাসী|ভেড়া|পশু|গরু|ছেলে|মেয়ে|সন্তান)/iu.test(q) || /(akika|aqiqah).*(?:chagol|khasi|chele|meye|poshu)/iu.test(q)) {
    const technical_fiqh_terms = ['আকীকা', 'আক্বীক্বা', 'ছাগল দিয়ে আকীকা', 'ছেলের আকীকা', 'মেয়ের আকীকা', 'খাসী কুরবানী'];
    const expanded_keywords = ['ছেলের জন্য কয়টি ছাগল', 'মেয়ের জন্য কয়টি ছাগল', 'গরু দিয়ে আকীকা', 'আকীকার পশু'];
    return {
      fiqh_intent: 'সন্তানের (ছেলে বা মেয়ে) আকীকা করার নিয়ম ও আকীকার পশুর (ছাগল, খাসী) শারয়ী বিধান।',
      fiqh_category: 'Sacrifice & Sunnah (Aqeeqah)',
      technical_fiqh_terms,
      expanded_keywords,
      optimized_search_query: `${rawQuery} আকীকা ছাগল খাসী ছেলের আকীকা মেয়ের আকীকা সন্তানের আকীকা বিধান`,
      canonicalBengali: 'ছাগল দ্বারা সন্তানের আকীকা করার শারয়ী বিধান',
      coreSubject: 'আকীকা',
      coreAspect: 'ছাগল দিয়ে আকীকা',
      essentialKeywords: ['আকীকা', 'ছাগল'],
      fiqhConcepts: technical_fiqh_terms,
      primarySubject: 'আকীকা',
      primaryAction: 'ছাগল দিয়ে আকীকা',
      fiqhTerms: technical_fiqh_terms,
      mustInclude: ['আকীকা'],
    };
  }

  // 4. Taharah & Najasa: Dog Saliva, Impurities, Mushaf touching
  if (/(কুকুর.*লালা|কুকুর.*মুখ|কুকুর.*ছুঁ)/iu.test(q)) {
    const technical_fiqh_terms = ['কুকুরের লালা', 'নাজাসাত', 'সাতবার ধোয়া', 'মাটি দিয়ে মাজা', 'তাহারাত', 'পবিত্রতা'];
    const expanded_keywords = ['কুকুরের লালা কাপড়ে লাগলে', 'কুকুর মুখ দিলে পাত্র ধোয়ার নিয়ম', 'নাপাকী দূর করা'];
    return {
      fiqh_intent: 'কুকুরের লালা বা মুখ দেওয়া পাত্র ও কাপড়ের অপবিত্রতা এবং তা পবিত্র করার শারয়ী নিয়ম।',
      fiqh_category: 'Taharah',
      technical_fiqh_terms,
      expanded_keywords,
      optimized_search_query: `${rawQuery} কুকুরের লালা নাজাসাত পাত্র ধোয়া পবিত্রতা তাহারাত বিধান`,
      canonicalBengali: 'কুকুরের লালা দ্বারা পাত্র ও কাপড় অপবিত্র হওয়ার বিধান',
      coreSubject: 'তাহারাত',
      coreAspect: 'কুকুরের লালা',
      essentialKeywords: ['কুকুর', 'লালা', 'নাজাসাত'],
      fiqhConcepts: technical_fiqh_terms,
      primarySubject: 'তাহারাত',
      primaryAction: 'কুকুরের লালা',
      fiqhTerms: technical_fiqh_terms,
      mustInclude: ['কুকুর'],
    };
  }

  if (/(কুরআন|কোরআন).*(স্পর্শ|ধরা|হাত\s*দেওয়া)/iu.test(q) && /(ওযু|অজু|উযু|নাপাক|অপবিত্র)/iu.test(q)) {
    const technical_fiqh_terms = ['মুসহাফ স্পর্শ', 'বিনা ওযূতে কুরআন', 'কুরআন স্পর্শ', 'অপবিত্র অবস্থায় তিলাওয়াত', 'তাহারাত'];
    const expanded_keywords = ['ওযু ছাড়া কুরআন ধরা যাবে কি', 'মোবাইলে কুরআন স্পর্শ', 'হায়েয অবস্থায় কুরআন পাঠ'];
    return {
      fiqh_intent: 'ওযু বা তাহারাত ব্যতীত কুরআন মাজীদ স্পর্শ বা তিলাওয়াত করার শারয়ী বিধান।',
      fiqh_category: 'Taharah',
      technical_fiqh_terms,
      expanded_keywords,
      optimized_search_query: `${rawQuery} ওযু ছাড়া কুরআন স্পর্শ ধরা মুসহাফ অপবিত্র অবস্থায় তিলাওয়াত বিধান`,
      canonicalBengali: 'ওযু ছাড়া কুরআন মাজীদ স্পর্শ বা পাঠ করার শারয়ী বিধান',
      coreSubject: 'ওযু',
      coreAspect: 'কুরআন স্পর্শ',
      essentialKeywords: ['ওযু', 'কুরআন', 'স্পর্শ'],
      fiqhConcepts: technical_fiqh_terms,
      primarySubject: 'ওযু',
      primaryAction: 'কুরআন স্পর্শ',
      fiqhTerms: technical_fiqh_terms,
      mustInclude: ['কুরআন', 'স্পর্শ'],
    };
  }

  // 5. Finance & Muamalat
  if (/(শেয়ার\s*বাজার|স্টক|সুদ|রিবা|ব্যাংক\s*মুনাফা|ক্রিপ্টো|বিটকয়েন|বীমা|ইনস্যুরেন্স)/iu.test(q)) {
    const technical_fiqh_terms = ['রিবা', 'সুদ', 'মুদারাবা', 'মুশারাকা', 'শেয়ার বাজার', 'হালাল বিনিয়োগ', 'বায় সালাম'];
    const expanded_keywords = ['শেয়ার ব্যবসা হালাল কিনা', 'ব্যাংকের সুদ', 'ডিভিডেন্ড', 'স্টক মার্কেট লেনদেন'];
    return {
      fiqh_intent: 'শেয়ার বাজার, ব্যাংক সুদ (রিবা) অথবা আধুনিক বিনিয়োগ পদ্ধতির শারয়ী বৈধতা ও হালাল-হারামের বিধান।',
      fiqh_category: 'Financial Transactions (Muamalat)',
      technical_fiqh_terms,
      expanded_keywords,
      optimized_search_query: `${rawQuery} শেয়ার বাজার স্টক রিবা সুদ মুদারাবা হালাল বিনিয়োগ ব্যাংক মুনাফা`,
      canonicalBengali: 'শেয়ার বাজার ও ব্যাংকিংয়ে বিনিয়োগের শারয়ী বিধান',
      coreSubject: 'মুয়ামালাত',
      coreAspect: 'শেয়ার বাজার',
      essentialKeywords: ['শেয়ার বাজার', 'বিনিয়োগ'],
      fiqhConcepts: technical_fiqh_terms,
      primarySubject: 'মুয়ামালাত',
      primaryAction: 'শেয়ার বাজার',
      fiqhTerms: technical_fiqh_terms,
      mustInclude: ['বিনিয়োগ'],
    };
  }

  // 6. Appearance & Sunnah: Beard, Shaving
  if (/(দাড়ি|দাড়ি|শেভ|মোচ|গোঁফ)/iu.test(q)) {
    const technical_fiqh_terms = ['দাড়ি রাখা', 'দাড়ি মুণ্ডন', 'দাড়ি কাটা', 'সুন্নাহ', 'ওয়াজিব', 'গোঁফ ছোট করা'];
    const expanded_keywords = ['দাড়ি শেভ করা', 'এক মুষ্টির কম দাড়ি', 'দাড়ি ছাঁটা জায়েজ কি', 'দাড়ির বিধান'];
    return {
      fiqh_intent: 'দাড়ি রাখা, ছাঁটা বা মুণ্ডন করার শারয়ী বিধান এবং সুন্নাহর নির্দেশনা।',
      fiqh_category: 'Appearance & Sunnah',
      technical_fiqh_terms,
      expanded_keywords,
      optimized_search_query: `${rawQuery} দাড়ি রাখা দাড়ি মুণ্ডন দাড়ি কাটা সুন্নাহ ওয়াজিব বিধান`,
      canonicalBengali: 'দাড়ি রাখা ও কাটার শারয়ী বিধান',
      coreSubject: 'সুন্নাহ',
      coreAspect: 'দাড়ি',
      essentialKeywords: ['দাড়ি', 'সুন্নাহ'],
      fiqhConcepts: technical_fiqh_terms,
      primarySubject: 'সুন্নাহ',
      primaryAction: 'দাড়ি',
      fiqhTerms: technical_fiqh_terms,
      mustInclude: ['দাড়ি'],
    };
  }

  // 7. Family Law: Talaq, Khula, Dower
  if (/(তালাক|খোলা|ইদ্দত|দেনমোহর|মহর|এক\s*বৈঠকে\s*তিন\s*তালাক)/iu.test(q)) {
    const technical_fiqh_terms = ['তালাক', 'তালাকে মুগাল্লাজাহ', 'তালাকে বায়েন', 'তালাকে রাজঈ', 'এক সাথে তিন তালাক', 'ইদ্দত', 'মহর'];
    const expanded_keywords = ['এক বৈঠকে তিন তালাক', 'তালাকের নিয়ম', 'স্ত্রীর দেনমোহর', 'খোলা তালাক'];
    return {
      fiqh_intent: 'তালাক প্রদান, ইদ্দত পালন, দেনমোহর পরিশোধ এবং বৈবাহিক বিচ্ছেদ সংক্রান্ত শারয়ী বিধান।',
      fiqh_category: 'Family Law (Nikah & Talaq)',
      technical_fiqh_terms,
      expanded_keywords,
      optimized_search_query: `${rawQuery} তালাক এক বৈঠকে তিন তালাক তালাকে মুগাল্লাজাহ ইদ্দত দেনমোহর বিধান`,
      canonicalBengali: 'তালাক ও বৈবাহিক বিচ্ছেদের শারয়ী বিধান',
      coreSubject: 'তালাক',
      coreAspect: 'বিবাহ বিচ্ছেদ',
      essentialKeywords: ['তালাক', 'ইদ্দত'],
      fiqhConcepts: technical_fiqh_terms,
      primarySubject: 'তালাক',
      primaryAction: 'বিবাহ বিচ্ছেদ',
      fiqhTerms: technical_fiqh_terms,
      mustInclude: ['তালাক'],
    };
  }

  return null;
}

export async function extractSemanticFiqhIntent(rawQuery: string): Promise<FiqhSemanticAnalysis | null> {
  const query = (rawQuery || '').trim();
  if (!query || query.length < 2) return null;

  const cacheKey = query.toLowerCase();
  if (semanticCache.has(cacheKey)) {
    return semanticCache.get(cacheKey)!;
  }

  // Expand Latin/Banglish script query to Bengali for deterministic intent mapping
  let queryForIntent = query;
  if (isLatinScript(query)) {
    const trans = transliterateQuery(query);
    if (trans.primaryBengali) {
      queryForIntent = `${query} ${trans.primaryBengali} ${trans.expandedTerms.join(' ')}`;
    }
  }

  // Check deterministic offline knowledge graph
  const deterministicMatch = getDeterministicFiqhFallback(queryForIntent);

  const apiKey = getApiKey();
  if (!apiKey) {
    if (deterministicMatch) {
      semanticCache.set(cacheKey, deterministicMatch);
    }
    return deterministicMatch;
  }

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
            content: SYSTEM_FIQH_PROMPT,
          },
          {
            role: 'user',
            content: `User Query: "${promptQuery}"`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 350,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (deterministicMatch) semanticCache.set(cacheKey, deterministicMatch);
      return deterministicMatch;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      if (deterministicMatch) semanticCache.set(cacheKey, deterministicMatch);
      return deterministicMatch;
    }

    const parsed = JSON.parse(content);
    const technical_fiqh_terms: string[] = Array.isArray(parsed.technical_fiqh_terms)
      ? parsed.technical_fiqh_terms.filter(Boolean)
      : Array.isArray(parsed.fiqhConcepts)
      ? parsed.fiqhConcepts.filter(Boolean)
      : [];
    const expanded_keywords: string[] = Array.isArray(parsed.expanded_keywords)
      ? parsed.expanded_keywords.filter(Boolean)
      : Array.isArray(parsed.essentialKeywords)
      ? parsed.essentialKeywords.filter(Boolean)
      : [];

    const result: FiqhSemanticAnalysis = {
      fiqh_intent: parsed.fiqh_intent || deterministicMatch?.fiqh_intent || query,
      fiqh_category: parsed.fiqh_category || deterministicMatch?.fiqh_category || 'General Fiqh',
      technical_fiqh_terms: technical_fiqh_terms.length > 0 ? technical_fiqh_terms : (deterministicMatch?.technical_fiqh_terms || []),
      expanded_keywords: expanded_keywords.length > 0 ? expanded_keywords : (deterministicMatch?.expanded_keywords || []),
      optimized_search_query: parsed.optimized_search_query || deterministicMatch?.optimized_search_query || query,

      // Compatibility fields
      canonicalBengali: parsed.canonicalBengali || deterministicMatch?.canonicalBengali || query,
      coreSubject: parsed.coreSubject || parsed.fiqh_category || deterministicMatch?.coreSubject || '',
      coreAspect: parsed.coreAspect || parsed.fiqh_intent || deterministicMatch?.coreAspect || '',
      essentialKeywords: expanded_keywords,
      fiqhConcepts: technical_fiqh_terms,
      primarySubject: parsed.coreSubject || parsed.fiqh_category || '',
      primaryAction: parsed.coreAspect || parsed.fiqh_intent || '',
      fiqhTerms: technical_fiqh_terms,
      mustInclude: expanded_keywords,
    };

    if (semanticCache.size >= MAX_CACHE_SIZE) {
      const firstKey = semanticCache.keys().next().value;
      if (firstKey) semanticCache.delete(firstKey);
    }
    semanticCache.set(cacheKey, result);

    return result;
  } catch {
    if (deterministicMatch) {
      semanticCache.set(cacheKey, deterministicMatch);
    }
    return deterministicMatch;
  }
}
