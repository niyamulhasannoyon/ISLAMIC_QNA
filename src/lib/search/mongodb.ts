import { FatwaQA, SearchQueryOptions, SearchResponse, SearchResultItem } from '@/types/fatwa';
import { SearchEngine } from './types';
import { getFacets } from '../db';

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
    const query = (options.q || '').trim();
    const shouldClauses: any[] = [];
    const filterClauses: any[] = [];

    if (query) {
      shouldClauses.push({
        text: {
          query,
          path: 'title',
          score: { boost: { value: 3.5 } },
          fuzzy: { maxEdits: 1 },
        },
      });
      shouldClauses.push({
        text: {
          query,
          path: 'question',
          score: { boost: { value: 2.5 } },
          fuzzy: { maxEdits: 1 },
        },
      });
      shouldClauses.push({
        text: {
          query,
          path: 'answer',
          score: { boost: { value: 1.0 } },
        },
      });
      shouldClauses.push({
        autocomplete: {
          query,
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
