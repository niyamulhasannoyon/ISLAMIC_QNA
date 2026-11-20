import { createApiClient, type SearchResponse, type FatwaDetail } from '@repo/api-client';
import { getDatabase } from '../db/database';
import { searchOfflineFatwas, getLocalFatwaById } from '../db/fatwaRepo';
import type { LocalFatwa, ReportIssuePayload } from '../types';
import Constants from 'expo-constants';

const defaultBaseUrl =
  Constants.expoConfig?.extra?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  'https://deenqna.vercel.app';

export const apiClient = createApiClient({
  baseUrl: defaultBaseUrl,
});

/**
 * Unified search handler:
 * Queries remote API v2 when online; falls back immediately to SQLite FTS5 when offline or on network failure.
 */
export async function executeSearch(
  query: string,
  options: {
    source?: string;
    category?: string;
    page?: number;
    limit?: number;
    forceOffline?: boolean;
  } = {}
): Promise<{ results: LocalFatwa[]; total: number; isOfflineResult: boolean; intent?: any }> {
  const db = await getDatabase();

  if (options.forceOffline) {
    const offlineRes = await searchOfflineFatwas(db, query, {
      source: options.source,
      category: options.category,
      limit: options.limit || 20,
    });
    return { ...offlineRes, isOfflineResult: true };
  }

  try {
    const response = await apiClient.searchV2({
      q: query,
      source: options.source,
      category: options.category,
      page: options.page || 1,
      limit: options.limit || 20,
    });

    const results: LocalFatwa[] = response.results.map((r: any) => ({
      id: r.id,
      source: r.source,
      source_url: r.source_url,
      title: r.title,
      question: r.question,
      answer: r.answer,
      category: r.category,
      tags: r.tags || [],
      scholar: r.scholar || '',
      published_date: r.published_date,
      scraped_at: r.scraped_at,
      sha256_hash: r.sha256_hash,
      score: r.score,
      snippet: r.snippet,
    }));

    return {
      results,
      total: response.total,
      isOfflineResult: false,
      intent: response.intent,
    };
  } catch (err) {
    console.warn('[Search] Online request failed, falling back to local SQLite FTS5 store:', err);
    const offlineRes = await searchOfflineFatwas(db, query, {
      source: options.source,
      category: options.category,
      limit: options.limit || 20,
    });
    return { ...offlineRes, isOfflineResult: true };
  }
}

/**
 * Unified fatwa fetcher by ID:
 * Queries remote API, with offline local SQLite fallback.
 */
export async function executeGetFatwaById(
  id: string
): Promise<{ fatwa: LocalFatwa | null; isOfflineResult: boolean }> {
  const db = await getDatabase();

  try {
    const remote = await apiClient.getFatwa(id);
    const localFatwa: LocalFatwa = {
      id: remote.id,
      source: remote.source,
      source_url: remote.source_url,
      title: remote.title,
      question: remote.question,
      answer: remote.answer,
      category: remote.category,
      tags: remote.tags || [],
      scholar: remote.scholar || '',
      published_date: remote.published_date,
      scraped_at: remote.scraped_at,
      sha256_hash: remote.sha256_hash,
    };
    return { fatwa: localFatwa, isOfflineResult: false };
  } catch {
    const offlineRecord = await getLocalFatwaById(db, id);
    return { fatwa: offlineRecord, isOfflineResult: true };
  }
}

/**
 * Report issue on a fatwa
 */
export async function executeReportIssue(
  payload: ReportIssuePayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await apiClient.reportFatwa(payload);
    return { success: res.success };
  } catch (err: any) {
    return { success: false, error: err.message || 'প্রতিবেদন জমা দেওয়া যায়নি' };
  }
}
