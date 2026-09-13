import { FatwaQA, SearchQueryOptions, SearchResponse, SearchResultItem } from '@/types/fatwa';
import { SearchEngine } from './types';
import { getFacets } from '../db';
import { generateHighlightedSnippet } from './local';

export class MeilisearchEngine implements SearchEngine {
  public name = 'Meilisearch (Bengali Optimized)';
  private host: string;
  private apiKey: string;
  private indexName = 'fatwas';

  constructor() {
    this.host = process.env.MEILISEARCH_HOST || 'http://localhost:7700';
    this.apiKey = process.env.MEILISEARCH_API_KEY || '';
  }

  public async init(): Promise<void> {
    try {
      // Configure index settings: searchable attributes, ranking rules, filterable attributes
      await fetch(`${this.host}/indexes/${this.indexName}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          searchableAttributes: ['title', 'question', 'answer', 'scholar', 'category', 'tags'],
          filterableAttributes: ['source', 'category', 'scholar', 'tags'],
          sortableAttributes: ['published_date', 'created_at'],
          rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
          distinctAttribute: 'sha256_hash',
        }),
      });
    } catch (err) {
      console.warn('[MeilisearchEngine] Warning: Could not initialize Meilisearch index settings:', err);
    }
  }

  public async indexDocuments(docs: FatwaQA[]): Promise<void> {
    try {
      await fetch(`${this.host}/indexes/${this.indexName}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(docs),
      });
    } catch (err) {
      console.warn('[MeilisearchEngine] Document indexing error:', err);
    }
  }

  public async search(options: SearchQueryOptions): Promise<SearchResponse> {
    const startTime = Date.now();
    const query = options.q || '';
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));

    const filters: string[] = [];
    if (options.source && options.source !== 'All') {
      filters.push(`source = "${options.source.toLowerCase()}"`);
    }
    if (options.category && options.category !== 'All') {
      filters.push(`category = "${options.category}"`);
    }
    if (options.scholar && options.scholar !== 'All') {
      filters.push(`scholar = "${options.scholar}"`);
    }

    try {
      const response = await fetch(`${this.host}/indexes/${this.indexName}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          q: query,
          filter: filters.length > 0 ? filters.join(' AND ') : undefined,
          offset: (page - 1) * limit,
          limit,
          attributesToHighlight: ['title', 'question', 'answer'],
          highlightPreTag: '<mark class="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-semibold px-0.5 rounded">',
          highlightPostTag: '</mark>',
        }),
      });

      if (!response.ok) {
        throw new Error(`Meilisearch returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const results: SearchResultItem[] = (data.hits || []).map((hit: any) => {
        const snippet = hit._formatted?.answer || hit._formatted?.question || hit.answer;
        const titleSnippet = hit._formatted?.title || hit.title;
        return {
          ...hit,
          score: hit._rankingScore || 1.0,
          snippet,
          titleSnippet,
          matchedTerms: query.split(/\s+/).filter(Boolean),
        };
      });

      return {
        results,
        total: data.estimatedTotalHits || results.length,
        page,
        limit,
        totalPages: Math.ceil((data.estimatedTotalHits || results.length) / limit) || 1,
        tookMs: Date.now() - startTime,
        engine: this.name,
        facets: getFacets(),
      };
    } catch (err) {
      console.warn('[MeilisearchEngine] Fallback to local search due to error:', err);
      // If remote Meilisearch instance fails or is offline, fallback gracefully to Local engine
      const { LocalBengaliSearchEngine } = await import('./local');
      const local = new LocalBengaliSearchEngine();
      return local.search(options);
    }
  }
}
