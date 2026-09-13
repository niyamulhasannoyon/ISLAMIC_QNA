import MiniSearch, { SearchResult } from 'minisearch';
import { FatwaQA, SearchQueryOptions, SearchResponse, SearchResultItem } from '@/types/fatwa';
import { getAllFatwas, getFacets } from '../db';
import { escapeRegExp } from '../utils';
import { normalizeBengaliText, stemBengaliToken, isStopWord } from './normalizer';
import { encodeBengaliPhonetic, extractPhoneticTokens } from './phonetic';
import { transliterateQuery, isLatinScript } from './transliterate';
import { getSynonymsAndVariants, isAblutionTerm } from './synonyms';
import { SearchEngine } from './types';

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Extracts a contextual window around matched search terms and highlights them via regex.
 */
export function generateHighlightedSnippet(
  text: string,
  matchedTerms: string[],
  maxLength: number = 220
): string {
  if (!text) return '';

  const cleanText = text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (!matchedTerms || matchedTerms.length === 0) {
    const truncated = cleanText.slice(0, maxLength);
    return escapeHtml(truncated) + (cleanText.length > maxLength ? '...' : '');
  }

  // Filter and sort terms by length descending for greedy matching
  const validTerms = Array.from(
    new Set(
      matchedTerms
        .filter((t) => t && t.trim().length >= 2 && !isStopWord(t))
        .map((t) => t.trim())
    )
  ).sort((a, b) => b.length - a.length);

  if (validTerms.length === 0) {
    const truncated = cleanText.slice(0, maxLength);
    return escapeHtml(truncated) + (cleanText.length > maxLength ? '...' : '');
  }

  // Find first occurrence of any matched term
  let earliestIdx = -1;
  let bestTerm = '';

  for (const term of validTerms) {
    const idx = cleanText.toLowerCase().indexOf(term.toLowerCase());
    if (idx !== -1 && (earliestIdx === -1 || idx < earliestIdx)) {
      earliestIdx = idx;
      bestTerm = term;
    }
  }

  let start = 0;
  let end = cleanText.length;

  if (earliestIdx !== -1) {
    const halfWindow = Math.floor(maxLength / 2);
    start = Math.max(0, earliestIdx - halfWindow);
    end = Math.min(cleanText.length, start + maxLength);

    if (start > 0) {
      const prevSpace = cleanText.indexOf(' ', start);
      if (prevSpace !== -1 && prevSpace < earliestIdx) {
        start = prevSpace + 1;
      }
    }

    if (end < cleanText.length) {
      const nextSpace = cleanText.lastIndexOf(' ', end);
      if (nextSpace !== -1 && nextSpace > earliestIdx + bestTerm.length) {
        end = nextSpace;
      }
    }
  } else {
    end = Math.min(cleanText.length, maxLength);
  }

  let snippetWindow = cleanText.slice(start, end);
  if (start > 0) snippetWindow = '...' + snippetWindow;
  if (end < cleanText.length) snippetWindow = snippetWindow + '...';

  let escaped = escapeHtml(snippetWindow);

  // Apply subtle editorial regex highlighting
  const escapedTerms = validTerms.map((t) => escapeHtml(t));
  const pattern = new RegExp(`(${escapedTerms.map(escapeRegExp).join('|')})`, 'gi');
  escaped = escaped.replace(
    pattern,
    '<mark class="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-semibold px-0.5 rounded">$1</mark>'
  );

  return escaped;
}

interface IndexedDoc extends FatwaQA {
  searchKeywords: string;
  phoneticCodes: string;
  stemmedTokens: string;
}

export class LocalBengaliSearchEngine implements SearchEngine {
  public name = 'Professional Bengali Phonetic Engine';
  private index: MiniSearch<IndexedDoc> | null = null;
  private docMap: Map<string, FatwaQA> = new Map();

  private createMiniSearch(): MiniSearch<IndexedDoc> {
    return new MiniSearch<IndexedDoc>({
      fields: [
        'title',
        'question',
        'answer',
        'category',
        'source',
        'scholar',
        'tagsString',
        'searchKeywords',
        'phoneticCodes',
        'stemmedTokens',
      ],
      storeFields: [
        'id',
        'source',
        'source_url',
        'title',
        'question',
        'answer',
        'category',
        'tags',
        'scholar',
        'published_date',
        'sha256_hash',
        'scraped_at',
      ],
      searchOptions: {
        boost: {
          title: 4.5,
          searchKeywords: 3.5,
          question: 2.5,
          tagsString: 2.0,
          scholar: 1.5,
          stemmedTokens: 1.5,
          phoneticCodes: 1.2,
          answer: 1.0,
        },
        fuzzy: 0.2,
        prefix: true,
        combineWith: 'AND',
      },
      extractField: (doc, fieldName) => {
        if (fieldName === 'tagsString') {
          return Array.isArray(doc.tags) ? doc.tags.join(' ') : '';
        }
        return (doc as any)[fieldName] || '';
      },
      // Unicode-aware tokenizer supporting Bengali, Latin, Arabic, and numbers
      tokenize: (text) => {
        if (!text) return [];
        const norm = normalizeBengaliText(text).toLowerCase();
        const tokens = norm.match(/[\p{L}\p{M}\p{N}]+/gu);
        return tokens ? tokens : [];
      },
    });
  }

  public async init(): Promise<void> {
    const all = getAllFatwas();
    await this.indexDocuments(all);
  }

  public async indexDocuments(docs: FatwaQA[]): Promise<void> {
    const newIndex = this.createMiniSearch();
    const newMap = new Map<string, FatwaQA>();
    const indexedDocs: IndexedDoc[] = [];

    for (const d of docs) {
      newMap.set(d.id, d);

      const titleWords = (d.title || '').split(/[\s,.;:!?"'()\-–—\/\\]+/).filter(Boolean);
      const questionWords = (d.question || '').split(/[\s,.;:!?"'()\-–—\/\\]+/).filter(Boolean);
      const tagsList = Array.isArray(d.tags) ? d.tags : [];

      const keywordsSet = new Set<string>();
      const phoneticSet = new Set<string>();
      const stemSet = new Set<string>();

      // Extract title & question keywords and expand with domain synonyms
      for (const word of [...titleWords, ...tagsList, ...questionWords.slice(0, 30)]) {
        if (word.length < 2) continue;
        const normWord = normalizeBengaliText(word).toLowerCase();
        const stemmed = stemBengaliToken(normWord);
        stemSet.add(stemmed);

        const synonyms = getSynonymsAndVariants(normWord);
        synonyms.forEach((s) => keywordsSet.add(s));

        const phonetic = encodeBengaliPhonetic(normWord);
        if (phonetic && phonetic.length >= 2) {
          phoneticSet.add(phonetic);
        }
      }

      // Also extract phonetics from full title
      extractPhoneticTokens(d.title).forEach((p) => phoneticSet.add(p));

      indexedDocs.push({
        ...d,
        searchKeywords: Array.from(keywordsSet).join(' '),
        phoneticCodes: Array.from(phoneticSet).join(' '),
        stemmedTokens: Array.from(stemSet).join(' '),
      });
    }

    if (indexedDocs.length > 0) {
      newIndex.addAll(indexedDocs);
    }

    this.index = newIndex;
    this.docMap = newMap;
  }

  public async search(options: SearchQueryOptions): Promise<SearchResponse> {
    const startTime = Date.now();
    if (!this.index) {
      await this.init();
    }

    const rawQuery = (options.q || '').trim();
    const sourceFilter = options.source && options.source !== 'All' ? options.source.toLowerCase() : undefined;
    const categoryFilter = options.category && options.category !== 'All' ? options.category.toLowerCase() : undefined;
    const scholarFilter = options.scholar && options.scholar !== 'All' ? options.scholar.toLowerCase() : undefined;
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));

    let results: SearchResultItem[] = [];

    // Browse mode (empty query)
    if (!rawQuery) {
      let docs = Array.from(this.docMap.values());

      if (sourceFilter) {
        docs = docs.filter((d) => d.source.toLowerCase() === sourceFilter);
      }
      if (categoryFilter) {
        docs = docs.filter((d) => d.category.toLowerCase() === categoryFilter);
      }
      if (scholarFilter) {
        docs = docs.filter((d) => (d.scholar || '').toLowerCase().includes(scholarFilter));
      }

      docs.sort((a, b) => new Date(b.published_date || b.created_at || '').getTime() - new Date(a.published_date || a.created_at || '').getTime());

      const total = docs.length;
      const startIndex = (page - 1) * limit;
      const paginated = docs.slice(startIndex, startIndex + limit);

      results = paginated.map((doc) => ({
        ...doc,
        score: 1.0,
        snippet: generateHighlightedSnippet(doc.answer || doc.question, []),
        titleSnippet: escapeHtml(doc.title),
        matchedTerms: [],
      }));

      const facets = getFacets();

      return {
        results,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        tookMs: Date.now() - startTime,
        engine: this.name,
        facets,
      };
    }

    // Step 1: Query Pre-Processing & Transliteration
    const transliterated = transliterateQuery(rawQuery);
    const primaryQuery = transliterated.primaryBengali || rawQuery;
    const normalizedQuery = normalizeBengaliText(primaryQuery);

    const rawTokens = normalizedQuery.split(/[\s,.;:!?"'()\-–—\/\\]+/).filter(Boolean);
    const nonStopTokens = rawTokens.filter((t) => !isStopWord(t));
    const queryTokens = nonStopTokens.length > 0 ? nonStopTokens : rawTokens;

    // Step 2: Query Expansion (Synonyms, Stemmed roots, Phonetic codes)
    const expandedSynonyms = new Set<string>();
    const expandedPhonetics = new Set<string>();
    const expandedStems = new Set<string>();
    const highlightTerms = new Set<string>();

    // Add transliteration candidates
    transliterated.expandedTerms.forEach((t) => {
      highlightTerms.add(t);
      const synonyms = getSynonymsAndVariants(t);
      synonyms.forEach((s) => expandedSynonyms.add(s));
    });

    for (const token of queryTokens) {
      highlightTerms.add(token);
      const stemmed = stemBengaliToken(token);
      expandedStems.add(stemmed);

      const synonyms = getSynonymsAndVariants(token);
      synonyms.forEach((s) => {
        expandedSynonyms.add(s);
        highlightTerms.add(s);
      });

      const phonetic = encodeBengaliPhonetic(token);
      if (phonetic && phonetic.length >= 2) {
        expandedPhonetics.add(phonetic);
      }
    }

    // Check if query is targeting ablution/wudu
    const queryIsAblution =
      transliterated.isBanglish && ['oju', 'ojoo', 'wudu', 'wuzu', 'wudhu'].some((w) => rawQuery.toLowerCase().includes(w))
      || queryTokens.some((t) => isAblutionTerm(t));

    // Step 3: Multi-layer MiniSearch Search
    const filterFn = (doc: any) => {
      if (sourceFilter && doc.source.toLowerCase() !== sourceFilter) return false;
      if (categoryFilter && doc.category.toLowerCase() !== categoryFilter) return false;
      if (scholarFilter && !(doc.scholar || '').toLowerCase().includes(scholarFilter)) return false;
      return true;
    };

    // Construct synthesized search query combining primary words + key synonyms
    const topSynonyms = Array.from(expandedSynonyms).slice(0, 8);
    const searchString = Array.from(new Set([primaryQuery, ...queryTokens, ...topSynonyms])).join(' ');

    let searchResults = this.index!.search(searchString, {
      filter: filterFn,
      combineWith: 'OR',
      fuzzy: 0.25,
      prefix: true,
    });

    // Step 4: Intelligent Re-ranking & Precision Relevance Scoring
    const scoredDocs: Array<{ doc: FatwaQA; finalScore: number; matchedTerms: string[] }> = [];

    for (const sr of searchResults) {
      const doc = this.docMap.get(sr.id);
      if (!doc) continue;

      let score = sr.score;
      const titleLower = (doc.title || '').toLowerCase();
      const questionLower = (doc.question || '').toLowerCase();
      const answerLower = (doc.answer || '').toLowerCase();
      const matchedForDoc = new Set<string>();

      // Check for exact primary phrase in title
      if (titleLower.includes(normalizedQuery.toLowerCase())) {
        score += 80.0;
      }

      // Check token and synonym matches
      for (const token of queryTokens) {
        if (titleLower.includes(token)) {
          score += 35.0;
          matchedForDoc.add(token);
        }
        if (questionLower.includes(token)) {
          score += 15.0;
          matchedForDoc.add(token);
        }
      }

      for (const syn of expandedSynonyms) {
        if (titleLower.includes(syn)) {
          score += 30.0;
          matchedForDoc.add(syn);
        } else if (questionLower.includes(syn)) {
          score += 12.0;
          matchedForDoc.add(syn);
        } else if (answerLower.includes(syn)) {
          score += 3.0;
          matchedForDoc.add(syn);
        }
      }

      // Check phonetic code matches
      const docPhonetics = extractPhoneticTokens(doc.title + ' ' + (doc.question || '').slice(0, 100));
      for (const p of expandedPhonetics) {
        if (docPhonetics.includes(p)) {
          score += 18.0;
        }
      }

      // Domain-specific disambiguation & False-Positive suppression:
      // When searching for ablution ('ওযু'/'অজু'/'oju'/'wudu'), heavily boost docs containing
      // genuine ablution words and penalize docs that only match substrings of unrelated words like 'অজুহাত' (excuse).
      if (queryIsAblution) {
        const hasAblutionInTitle = ['ওযু', 'অজু', 'উযু', 'উজু', 'ওজু', 'ওযূ', 'উযূ'].some((w) =>
          new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, 'u').test(titleLower)
        );
        const hasAblutionInQuestion = ['ওযু', 'অজু', 'উযু', 'উজু', 'ওজু', 'ওযূ', 'উযূ'].some((w) =>
          new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, 'u').test(questionLower)
        );
        const hasAblutionInAnswer = ['ওযু', 'অজু', 'উযু', 'উজু', 'ওজু', 'ওযূ', 'উযূ'].some((w) =>
          new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, 'u').test(answerLower)
        );

        if (hasAblutionInTitle) {
          score += 100.0;
        } else if (hasAblutionInQuestion) {
          score += 50.0;
        } else if (hasAblutionInAnswer) {
          score += 20.0;
        } else {
          // Matched only accidental substring (e.g. 'অজুহাত' or 'জু‘ফী')
          score = score * 0.05;
        }
      }

      scoredDocs.push({
        doc,
        finalScore: score,
        matchedTerms: Array.from(matchedForDoc),
      });
    }

    // Sort by final relevance score descending
    scoredDocs.sort((a, b) => b.finalScore - a.finalScore);

    const total = scoredDocs.length;
    const startIndex = (page - 1) * limit;
    const paginated = scoredDocs.slice(startIndex, startIndex + limit);

    const allHighlightPool = Array.from(
      new Set([...Array.from(highlightTerms), ...queryTokens, ...topSynonyms])
    );

    results = paginated.map(({ doc, finalScore, matchedTerms }) => {
      const termsForDoc = Array.from(new Set([...matchedTerms, ...allHighlightPool]));
      const snippet = generateHighlightedSnippet(doc.answer || doc.question, termsForDoc, 240);
      const titleSnippet = generateHighlightedSnippet(doc.title, termsForDoc, 120);

      return {
        ...doc,
        score: finalScore,
        snippet,
        titleSnippet,
        matchedTerms: termsForDoc,
      };
    });

    const facets = getFacets();

    return {
      results,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      tookMs: Date.now() - startTime,
      engine: this.name,
      facets,
    };
  }
}
