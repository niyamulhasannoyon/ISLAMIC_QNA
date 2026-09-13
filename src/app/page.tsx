"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/Header";
import { SearchHero } from "@/components/SearchHero";
import { FilterBar } from "@/components/FilterBar";
import { FatwaCard } from "@/components/FatwaCard";
import { FatwaModal } from "@/components/FatwaModal";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { EmptyState } from "@/components/EmptyState";
import { useLanguage } from "@/context/LanguageContext";
import { SearchResponse, SearchResultItem, FacetCount } from "@/types/fatwa";
import { ChevronLeft, ChevronRight, ShieldCheck, Database } from "lucide-react";

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
  const [totalPages, setTotalPages] = useState(1);
  const [tookMs, setTookMs] = useState<number | undefined>(undefined);
  const [sourceFacets, setSourceFacets] = useState<FacetCount[]>([]);
  const [categoryFacets, setCategoryFacets] = useState<FacetCount[]>([]);
  const [scholarFacets, setScholarFacets] = useState<FacetCount[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [activeModalItem, setActiveModalItem] = useState<SearchResultItem | null>(null);
  const isInitialMount = useRef(true);

  // Fast client-side debouncing (180ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 180);

    return () => clearTimeout(handler);
  }, [query]);

  // Execute Search API call
  const performSearch = useCallback(async () => {
    setIsLoading(true);
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
      if (data.facets) {
        setSourceFacets(data.facets.sources || []);
        setCategoryFacets(data.facets.categories || []);
        setScholarFacets(data.facets.scholars || []);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, selectedSource, selectedCategory, selectedScholar, page]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  // Check URL query parameters for deep linking (?id=... or ?q=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const initialId = urlParams.get("id");
    const initialQ = urlParams.get("q");
    const initialSource = urlParams.get("source");

    if (initialSource && isInitialMount.current) {
      setSelectedSource(initialSource);
    }

    if (initialQ && isInitialMount.current) {
      setQuery(initialQ);
      setDebouncedQuery(initialQ);
    }

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

    isInitialMount.current = false;
  }, []);

  // Update browser URL query without reloading
  useEffect(() => {
    if (isInitialMount.current) return;
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
    window.history.replaceState({}, "", url.toString());
  }, [debouncedQuery, selectedSource]);

  const handleSourceChange = (src: string) => {
    setSelectedSource(src);
    setPage(1);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setPage(1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfc] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pb-20">
        {/* Command-style Search Hero with instant previews */}
        <SearchHero
          query={query}
          onQueryChange={setQuery}
          isLoading={isLoading}
          totalResults={totalResults}
          tookMs={tookMs}
          previewResults={results}
          onSelectPreviewItem={(item) => setActiveModalItem(item)}
        />

        {/* Tactile Filter Bar: Sources, Categories & Scholars */}
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
        <div className="w-full max-w-3xl mx-auto space-y-4">
          {isLoading && results.length === 0 ? (
            <SkeletonLoader />
          ) : results.length > 0 ? (
            <div className="space-y-3.5">
              {results.map((item) => (
                <FatwaCard
                  key={item.id}
                  item={item}
                  onOpenModal={setActiveModalItem}
                />
              ))}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pt-6 pb-2 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800">
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
      <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className={lang === "ar" ? "font-arabic" : lang === "bn" ? "font-bengali" : "font-sans"}>
              {t.footer.archiveNotice}
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>GET /api/v1/search</span>
            <span>&bull;</span>
            <span className={lang === "ar" ? "font-arabic" : lang === "bn" ? "font-bengali" : "font-sans"}>
              {t.footer.apiInfo}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
