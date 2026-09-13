import { SearchResponse } from "@/types/fatwa";

const CACHE_PREFIX = "fatwa_search_cache_v1_";
const SCROLL_KEY = "fatwa_search_scroll_state";
const MAX_CACHE_ENTRIES = 30;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CacheEntry {
  data: SearchResponse;
  timestamp: number;
}

interface ScrollState {
  searchKey: string;
  scrollY: number;
  timestamp: number;
}

// In-memory fallback cache
const memoryCache = new Map<string, CacheEntry>();

/**
 * Normalizes query params to create a unique, deterministic cache key
 */
export function buildCacheKey(params: {
  q?: string;
  source?: string;
  category?: string;
  scholar?: string;
  page?: number | string;
}): string {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q.trim());
  if (params.source && params.source !== "All") searchParams.set("source", params.source);
  if (params.category && params.category !== "All") searchParams.set("category", params.category);
  if (params.scholar && params.scholar !== "All") searchParams.set("scholar", params.scholar);
  if (params.page && params.page.toString() !== "1") searchParams.set("page", params.page.toString());
  return searchParams.toString();
}

/**
 * Fetches cached search results for a given search params object or query string
 */
export function getCachedSearch(cacheKey: string): SearchResponse | null {
  if (typeof window === "undefined") return null;

  // 1. Check in-memory cache
  const mem = memoryCache.get(cacheKey);
  if (mem && Date.now() - mem.timestamp < CACHE_TTL_MS) {
    return mem.data;
  }

  // 2. Check sessionStorage
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + cacheKey);
    if (!raw) return null;

    const parsed: CacheEntry = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
      // Re-populate in-memory cache for faster subsequent hits
      memoryCache.set(cacheKey, parsed);
      return parsed.data;
    } else {
      sessionStorage.removeItem(CACHE_PREFIX + cacheKey);
    }
  } catch (err) {
    console.warn("Failed to read search cache from sessionStorage:", err);
  }

  return null;
}

/**
 * Stores search response data into memory and sessionStorage
 */
export function setCachedSearch(cacheKey: string, data: SearchResponse): void {
  if (typeof window === "undefined") return;

  const entry: CacheEntry = {
    data,
    timestamp: Date.now(),
  };

  memoryCache.set(cacheKey, entry);

  try {
    // Evict old entries if limit reached
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keys.push(key);
      }
    }

    if (keys.length >= MAX_CACHE_ENTRIES) {
      // Remove oldest cache entry
      keys.sort();
      sessionStorage.removeItem(keys[0]);
    }

    sessionStorage.setItem(CACHE_PREFIX + cacheKey, JSON.stringify(entry));
  } catch (err) {
    console.warn("Failed to write search cache to sessionStorage:", err);
  }
}

/**
 * Saves current scroll position and current search key
 */
export function saveScrollPosition(cacheKey: string, scrollY: number): void {
  if (typeof window === "undefined") return;

  const state: ScrollState = {
    searchKey: cacheKey,
    scrollY,
    timestamp: Date.now(),
  };

  try {
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify(state));
    // Also save last search URL so back link can navigate directly to it
    const currentUrl = window.location.pathname + window.location.search;
    sessionStorage.setItem("fatwa_last_search_url", currentUrl);
  } catch (err) {
    console.warn("Failed to save scroll position:", err);
  }
}

/**
 * Gets saved scroll position if it matches the current cacheKey
 */
export function getSavedScrollPosition(cacheKey: string): number | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(SCROLL_KEY);
    if (!raw) return null;

    const state: ScrollState = JSON.parse(raw);
    // Only restore if saved within last 1 hour and matches current search key
    if (state.searchKey === cacheKey && Date.now() - state.timestamp < CACHE_TTL_MS) {
      return state.scrollY;
    }
  } catch (err) {
    console.warn("Failed to get scroll position:", err);
  }

  return null;
}

/**
 * Clears saved scroll position once consumed
 */
export function clearSavedScrollPosition(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SCROLL_KEY);
  } catch (err) {
    // Ignore
  }
}
