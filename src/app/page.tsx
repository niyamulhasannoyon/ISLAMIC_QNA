"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { SearchHero } from "@/components/SearchHero";
import { FilterBar } from "@/components/FilterBar";
import { FatwaCard } from "@/components/FatwaCard";
import { FatwaModal } from "@/components/FatwaModal";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { EmptyState } from "@/components/EmptyState";
import { useLanguage } from "@/context/LanguageContext";
import { SearchResponse, SearchResultItem, FacetCount, FiqhSemanticAnalysis } from "@/types/fatwa";
import { ChevronLeft, ChevronRight, ShieldCheck, RotateCw } from "lucide-react";
import {
  buildCacheKey,
  getCachedSearch,
  setCachedSearch,
  getSavedScrollPosition,
  clearSavedScrollPosition,
} from "@/lib/searchCache";

function getInitialParams() {
  if (typeof window === "undefined") {
    return { q: "", source: "All", category: "All", scholar: "All", page: 1 };
  }
  const urlParams = new URLSearchParams(window.location.search);
  return {
    q: urlParams.get("q") || "",
    source: urlParams.get("source") || "All",
    category: urlParams.get("category") || "All",
    scholar: urlParams.get("scholar") || "All",
    page: parseInt(urlParams.get("page") || "1", 10) || 1,
  };
}

export default function Home() {
  const { t, isRTL, lang } = useLanguage();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedScholar, setSelectedScholar] = useState("All");
  const [page, setPage] = useState(1);

  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [totalResults, setTotalResults] = useState<number | undefined>(undefined);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [tookMs, setTookMs] = useState<number | undefined>(undefined);
  const [sourceFacets, setSourceFacets] = useState<FacetCount[]>([]);
  const [categoryFacets, setCategoryFacets] = useState<FacetCount[]>([]);
  const [scholarFacets, setScholarFacets] = useState<FacetCount[]>([]);
  const [semanticIntent, setSemanticIntent] = useState<FiqhSemanticAnalysis | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isHydrated, setIsHydrated] = useState(false);

  const [activeModalItem, setActiveModalItem] = useState<SearchResultItem | null>(null);
  const isInitialMount = useRef(true);
  const hasRestoredScroll = useRef(false);

  // Initialize client state from URL and cache once hydration completes safely
  useEffect(() => {
    setIsHydrated(true);
    const p = getInitialParams();
    setQuery(p.q);
    setDebouncedQuery(p.q);
    setSelectedSource(p.source);
    setSelectedCategory(p.category);
    setSelectedScholar(p.scholar);
    setPage(p.page);

    const initialCacheKey = buildCacheKey({
      q: p.q,
      source: p.source,
      category: p.category,
      scholar: p.scholar,
      page: p.page,
    });
    const cached = getCachedSearch(initialCacheKey);
    if (cached) {
      setResults(cached.results || []);
      setTotalResults(cached.total);
      setTotalPages(cached.totalPages || 1);
      setTookMs(cached.tookMs);
      if (cached.facets) {
        setSourceFacets(cached.facets.sources || []);
        setCategoryFacets(cached.facets.categories || []);
        setScholarFacets(cached.facets.scholars || []);
      }
      setIsLoading(false);
    }
  }, []);

  // Fast client-side debouncing (180ms)
  useEffect(() => {
    if (!isHydrated) return;
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 180);

    return () => clearTimeout(handler);
  }, [query, isHydrated]);

  // Execute Search API call with Stale-While-Revalidate pattern
  const performSearch = useCallback(async () => {
    const currentCacheKey = buildCacheKey({
      q: debouncedQuery,
      source: selectedSource,
      category: selectedCategory,
      scholar: selectedScholar,
      page,
    });

    const cached = getCachedSearch(currentCacheKey);
    if (cached) {
      setResults(cached.results || []);
      setTotalResults(cached.total);
      setTotalPages(cached.totalPages || 1);
      setTookMs(cached.tookMs);
      setSemanticIntent(cached.semanticIntent);
      if (cached.facets) {
        setSourceFacets(cached.facets.sources || []);
        setCategoryFacets(cached.facets.categories || []);
        setScholarFacets(cached.facets.scholars || []);
      }
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (selectedSource && selectedSource !== "All") params.set("source", selectedSource);
      if (selectedCategory && selectedCategory !== "All") params.set("category", selectedCategory);
      if (selectedScholar && selectedScholar !== "All") params.set("scholar", selectedScholar);
      params.set("page", page.toString());
      params.set("limit", "10");

      const res = await fetch(`/api/v1/search?${params.toString()}`);
      if (!res.ok) throw new Error("Search request failed");

      const data: SearchResponse = await res.json();
      setResults(data.results || []);
      setTotalResults(data.total);
      setTotalPages(data.totalPages || 1);
      setTookMs(data.tookMs);
      setSemanticIntent(data.semanticIntent);
      if (data.facets) {
        setSourceFacets(data.facets.sources || []);
        setCategoryFacets(data.facets.categories || []);
        setScholarFacets(data.facets.scholars || []);
      }

      // Update cache
      setCachedSearch(currentCacheKey, data);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, selectedSource, selectedCategory, selectedScholar, page]);

  useEffect(() => {
    if (isHydrated) {
      performSearch();
    }
  }, [performSearch, isHydrated]);

  // Restore saved scroll position after cached/fresh results render
  useEffect(() => {
    if (typeof window === "undefined" || hasRestoredScroll.current) return;
    const currentCacheKey = buildCacheKey({
      q: debouncedQuery,
      source: selectedSource,
      category: selectedCategory,
      scholar: selectedScholar,
      page,
    });
    const savedY = getSavedScrollPosition(currentCacheKey);
    if (savedY !== null && results.length > 0) {
      hasRestoredScroll.current = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: savedY, behavior: "instant" });
          clearSavedScrollPosition();
        });
      });
    }
  }, [debouncedQuery, selectedSource, selectedCategory, selectedScholar, page, results.length]);

  // Handle browser popstate events (Back / Forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const p = getInitialParams();
      setQuery(p.q);
      setDebouncedQuery(p.q);
      setSelectedSource(p.source);
      setSelectedCategory(p.category);
      setSelectedScholar(p.scholar);
      setPage(p.page);
      hasRestoredScroll.current = false;
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Check URL query parameters for deep linking modal (?id=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const initialId = urlParams.get("id");

    if (initialId) {
      fetch(`/api/v1/fatwa/${initialId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((item) => {
          if (item) {
            setActiveModalItem({
              ...item,
              score: 1.0,
              snippet: item.answer,
              matchedTerms: [],
            });
          }
        })
        .catch((e) => console.error("Could not fetch deep linked item:", e));
    }
  }, []);

  // Sync browser URL query without reloading
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const url = new URL(window.location.href);
    if (debouncedQuery) {
      url.searchParams.set("q", debouncedQuery);
    } else {
      url.searchParams.delete("q");
    }
    if (selectedSource !== "All") {
      url.searchParams.set("source", selectedSource);
    } else {
      url.searchParams.delete("source");
    }
    if (selectedCategory !== "All") {
      url.searchParams.set("category", selectedCategory);
    } else {
      url.searchParams.delete("category");
    }
    if (selectedScholar !== "All") {
      url.searchParams.set("scholar", selectedScholar);
    } else {
      url.searchParams.delete("scholar");
    }
    if (page > 1) {
      url.searchParams.set("page", page.toString());
    } else {
      url.searchParams.delete("page");
    }
    window.history.replaceState({}, "", url.toString());
  }, [debouncedQuery, selectedSource, selectedCategory, selectedScholar, page]);

  const handleSourceChange = (src: string) => {
    setSelectedSource(src);
    setPage(1);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setPage(1);
  };

  const handleRefreshBrowse = () => {
    setIsLoading(true);
    fetch(`/api/v1/search?page=1&limit=10&_t=${Date.now()}`)
      .then((r) => r.json())
      .then((data) => {
        setResults(data.results || []);
        setTotalResults(data.total);
        setTotalPages(data.totalPages || 1);
        setTookMs(data.tookMs);
        if (data.facets) {
          setSourceFacets(data.facets.sources || []);
          setCategoryFacets(data.facets.categories || []);
          setScholarFacets(data.facets.scholars || []);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  const isSearchActive = Boolean(
    query.trim() ||
    debouncedQuery.trim() ||
    selectedSource !== "All" ||
    selectedCategory !== "All" ||
    (selectedScholar && selectedScholar !== "All")
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfc] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 pb-16 sm:pb-20">
        {/* Command-style Search Hero with State Separation (Initial vs Active) */}
        <SearchHero
          query={query}
          onQueryChange={setQuery}
          isLoading={isLoading}
          totalResults={totalResults}
          tookMs={tookMs}
          semanticIntent={semanticIntent}
          isActive={isSearchActive}
        />

        {/* Tactile Filter Bar: Sleek Horizontal Inline Chips */}
        <FilterBar
          selectedSource={selectedSource}
          onSelectSource={handleSourceChange}
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategoryChange}
          selectedScholar={selectedScholar}
          onSelectScholar={(sch) => {
            setSelectedScholar(sch);
            setPage(1);
          }}
          sourceFacets={sourceFacets}
          categoryFacets={categoryFacets}
          scholarFacets={scholarFacets}
        />

        {/* Results Container with Optimistic Skeleton */}
        <div className="w-full max-w-3xl mx-auto space-y-3 sm:space-y-4">
          {/* Subtle label when browsing without search query */}
          {!isSearchActive && results.length > 0 && !isLoading && (
            <div className="pt-2 pb-1.5 flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500 font-mono border-b border-zinc-200/60 dark:border-zinc-800/60 mb-1">
              <span className="font-bengali font-medium">নির্বাচিত ফতোয়াসমূহ (পর্যায়ক্রমে সংকলিত)</span>
              <button
                type="button"
                onClick={handleRefreshBrowse}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bengali text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors cursor-pointer"
                title="নতুন বিভিন্ন প্রশ্ন দেখুন"
              >
                <RotateCw className="h-3 w-3" />
                <span>নতুন প্রশ্ন দেখুন</span>
              </button>
            </div>
          )}

          {isLoading && results.length === 0 ? (
            <SkeletonLoader />
          ) : results.length > 0 ? (
            <div className="space-y-2.5 sm:space-y-3.5">
              {results.map((item) => (
                <FatwaCard
                  key={item.id}
                  item={item}
                  onOpenModal={setActiveModalItem}
                />
              ))}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pt-4 sm:pt-6 pb-2 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs font-medium text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:pointer-events-none hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    <span>{t.pagination.previous}</span>
                  </button>

                  <span className="text-xs text-zinc-500 font-mono">
                    {t.pagination.pageOf} {page} / {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs font-medium text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:pointer-events-none hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <span>{t.pagination.next}</span>
                    {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              query={debouncedQuery}
              onSuggestionClick={(sug) => {
                setQuery(sug);
                setDebouncedQuery(sug);
                setSelectedSource("All");
                setSelectedCategory("All");
                setSelectedScholar("All");
              }}
            />
          )}
        </div>
      </main>

      {/* Reader Modal */}
      <FatwaModal
        item={activeModalItem}
        onClose={() => {
          setActiveModalItem(null);
          const url = new URL(window.location.href);
          url.searchParams.delete("id");
          window.history.replaceState({}, "", url.toString());
        }}
      />

      {/* Editorial Archive Footer */}
      <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 py-4 sm:py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className={lang === "ar" ? "font-arabic" : lang === "bn" ? "font-bengali" : "font-sans"}>
              {t.footer.archiveNotice}
            </span>
          </div>
          <div className="flex items-center gap-3 font-bengali text-xs">
            <Link href="/privacy" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
              গোপনীয়তা নীতি
            </Link>
            <span>&bull;</span>
            <Link href="/terms" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
              ব্যবহারের শর্তাবলী
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
