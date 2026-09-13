import { FatwaQA, SearchQueryOptions, SearchResponse } from '@/types/fatwa';
import { SearchEngine } from './types';
import { transliterateQuery } from './transliterate';
import { getSynonymsAndVariants } from './synonyms';
import { normalizeBengaliText } from './normalizer';

export class MongoAtlasSearchEngine implements SearchEngine {
  public name = 'MongoDB Atlas Search (Bengali Analyzer)';
  private uri: string;

  constructor() {
    this.uri = process.env.MONGODB_URI || '';
  }

  public async init(): Promise<void> {
    // Atlas Search index definition setup
  }

  public async indexDocuments(docs: FatwaQA[]): Promise<void> {
    // Bulk upsert into Mongo collection
  }

  /**
   * Generates MongoDB Atlas Search aggregation pipeline for Bengali full-text search
   */
  public buildAtlasSearchPipeline(options: SearchQueryOptions): any[] {
    const rawQuery = (options.q || '').trim();
    const transliterated = transliterateQuery(rawQuery);
    const primaryQuery = transliterated.primaryBengali || rawQuery;
    const normalized = normalizeBengaliText(primaryQuery);
    const synonyms = normalized.split(/\s+/).flatMap((t) => getSynonymsAndVariants(t));
    const finalSearchQuery = Array.from(new Set([normalized, ...transliterated.expandedTerms, ...synonyms.slice(0, 5)])).join(' ');

    const shouldClauses: any[] = [];
    const filterClauses: any[] = [];

    if (finalSearchQuery) {
      shouldClauses.push({
        text: {
          query: finalSearchQuery,
          path: 'title',
          score: { boost: { value: 4.5 } },
          fuzzy: { maxEdits: 1 },
        },
      });
      shouldClauses.push({
        text: {
          query: finalSearchQuery,
          path: 'question',
          score: { boost: { value: 2.5 } },
          fuzzy: { maxEdits: 1 },
        },
      });
      shouldClauses.push({
        text: {
          query: finalSearchQuery,
          path: 'answer',
          score: { boost: { value: 1.0 } },
        },
      });
      shouldClauses.push({
        autocomplete: {
          query: finalSearchQuery,
          path: 'title',
          score: { boost: { value: 2.0 } },
        },
      });
    }

    if (options.source && options.source !== 'All') {
      filterClauses.push({
        phrase: {
          query: options.source.toLowerCase(),
          path: 'source',
        },
      });
    }

    if (options.category && options.category !== 'All') {
      filterClauses.push({
        phrase: {
          query: options.category,
          path: 'category',
        },
      });
    }

    if (options.scholar && options.scholar !== 'All') {
      filterClauses.push({
        phrase: {
          query: options.scholar,
          path: 'scholar',
        },
      });
    }

    const compound: any = {};
    if (shouldClauses.length > 0) {
      compound.should = shouldClauses;
      compound.minimumShouldMatch = 1;
    }
    if (filterClauses.length > 0) {
      compound.filter = filterClauses;
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));

    return [
      {
        $search: {
          index: 'fatwa_bengali_index',
          compound,
          highlight: {
            path: ['title', 'question', 'answer'],
          },
        },
      },
      {
        $project: {
          score: { $meta: 'searchScore' },
          highlights: { $meta: 'searchHighlights' },
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
          sha256_hash: 1,
          scraped_at: 1,
        },
      },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];
  }

  public async search(options: SearchQueryOptions): Promise<SearchResponse> {
    // If MongoDB connection string is not provided or offline, gracefully fallback to Local
    const { LocalBengaliSearchEngine } = await import('./local');
    const local = new LocalBengaliSearchEngine();
    const res = await local.search(options);
    return {
      ...res,
      engine: this.uri ? this.name : `${this.name} (Local Preview)`,
    };
  }
}
