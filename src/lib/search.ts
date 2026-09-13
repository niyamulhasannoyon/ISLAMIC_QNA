import { SearchQueryOptions, SearchResponse, FatwaQA } from '@/types/fatwa';
import { SearchEngine } from './search/types';
import { LocalBengaliSearchEngine, generateHighlightedSnippet } from './search/local';
import { MeilisearchEngine } from './search/meilisearch';
import { MongoAtlasSearchEngine } from './search/mongodb';
import { getAllFatwas } from './db';

// Singleton instance across hot reloads in Next.js
declare global {
  // eslint-disable-next-line no-var
  var __globalSearchEngine: SearchEngine | undefined;
}

export function createSearchEngine(): SearchEngine {
  const provider = (process.env.SEARCH_ENGINE || 'local').toLowerCase();

  if (provider === 'meilisearch' && process.env.MEILISEARCH_HOST) {
    return new MeilisearchEngine();
  }

  if (provider === 'mongodb' && process.env.MONGODB_URI) {
    return new MongoAtlasSearchEngine();
  }

  return new LocalBengaliSearchEngine();
}

export function getSearchEngine(): SearchEngine {
  if (!global.__globalSearchEngine) {
    global.__globalSearchEngine = createSearchEngine();
  }
  return global.__globalSearchEngine;
}

/**
 * Executes a search using the active modular search engine.
 */
export async function searchFatwas(options: SearchQueryOptions): Promise<SearchResponse> {
  const engine = getSearchEngine();
  return engine.search(options);
}

/**
 * Re-indexes all data from SQLite into the active search engine.
 */
export async function refreshSearchIndex(): Promise<void> {
  const engine = getSearchEngine();
  const all = getAllFatwas();
  await engine.indexDocuments(all);
}

// Re-export snippet generator for cards / modals / tests
export const generateSnippet = generateHighlightedSnippet;
export { generateHighlightedSnippet };
export * from './search/types';
export { LocalBengaliSearchEngine } from './search/local';
export { MeilisearchEngine } from './search/meilisearch';
export { MongoAtlasSearchEngine } from './search/mongodb';

