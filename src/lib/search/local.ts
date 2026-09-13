import MiniSearch, { SearchResult } from 'minisearch';
import { FatwaQA, SearchQueryOptions, SearchResponse, SearchResultItem } from '@/types/fatwa';
import { getAllFatwas, getFacets } from '../db';
import { escapeRegExp } from '../utils';
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

  // Find first occurrence of any matched term
  let earliestIdx = -1;
  let bestTerm = '';

  for (const term of matchedTerms) {
    if (!term || term.length < 2) continue;
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
  const validTerms = matchedTerms
    .filter((t) => t && t.length >= 2)
    .sort((a, b) => b.length - a.length)
    .map((t) => escapeHtml(t));

  if (validTerms.length > 0) {
    const pattern = new RegExp(`(${validTerms.map(escapeRegExp).join('|')})`, 'gi');
    escaped = escaped.replace(
      pattern,
      '<mark class="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-semibold px-0.5 rounded">$1</mark>'
    );
  }

  return escaped;
}

export class LocalBengaliSearchEngine implements SearchEngine {
  public name = 'Local Bengali MiniSearch';
  private index: MiniSearch<FatwaQA> | null = null;
  private docMap: Map<string, FatwaQA> = new Map();

  private createMiniSearch(): MiniSearch<FatwaQA> {
    return new MiniSearch<FatwaQA>({
      fields: ['title', 'question', 'answer', 'category', 'source', 'scholar', 'tagsString'],
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
          title: 3.5,
          question: 2.5,
          tagsString: 2.0,
          scholar: 1.5,
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
      // Custom tokenizer matching Unicode Bengali, Arabic, and Latin alphabets with combining marks
      tokenize: (text) => {
        if (!text) return [];
        const tokens = text.match(/[\p{L}\p{M}\p{N}]+/gu);
        return tokens ? tokens.map((t) => t.toLowerCase()) : [];
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

    if (docs.length > 0) {
      newIndex.addAll(docs);
      for (const d of docs) {
        newMap.set(d.id, d);
      }
    }

    this.index = newIndex;
    this.docMap = newMap;
  }

  public async search(options: SearchQueryOptions): Promise<SearchResponse> {
    const startTime = Date.now();
    if (!this.index) {
      await this.init();
    }

    const query = (options.q || '').trim();
    const sourceFilter = options.source && options.source !== 'All' ? options.source.toLowerCase() : undefined;
    const categoryFilter = options.category && options.category !== 'All' ? options.category.toLowerCase() : undefined;
    const scholarFilter = options.scholar && options.scholar !== 'All' ? options.scholar.toLowerCase() : undefined;
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));

    let results: SearchResultItem[] = [];

    // Browse mode (empty query)
    if (!query) {
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

    // Full-text search with MiniSearch
    const filterFn = (doc: any) => {
      if (sourceFilter && doc.source.toLowerCase() !== sourceFilter) return false;
      if (categoryFilter && doc.category.toLowerCase() !== categoryFilter) return false;
      if (scholarFilter && !(doc.scholar || '').toLowerCase().includes(scholarFilter)) return false;
      return true;
    };

    let searchResults = this.index!.search(query, {
      filter: filterFn,
      combineWith: 'AND',
    });

    // Fallback to OR if strict AND yields zero results
    if (searchResults.length === 0) {
      searchResults = this.index!.search(query, {
        filter: filterFn,
        combineWith: 'OR',
        fuzzy: 0.25,
      });
    }

    const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const total = searchResults.length;
    const startIndex = (page - 1) * limit;
    const paginated = searchResults.slice(startIndex, startIndex + limit);

    results = paginated.map((sr: SearchResult) => {
      const doc = this.docMap.get(sr.id) || (sr as unknown as FatwaQA);
      const terms = Array.from(new Set([...(sr.terms || []), ...queryTerms]));

      const snippet = generateHighlightedSnippet(doc.answer || doc.question, terms, 240);
      const titleSnippet = generateHighlightedSnippet(doc.title, terms, 120);

      return {
        ...doc,
        score: sr.score,
        snippet,
        titleSnippet,
        matchedTerms: terms,
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
