"use client";

import React, { useRef, useEffect, useState } from "react";
import { Search, X, Loader2, Command, Sparkles } from "lucide-react";
import { FiqhSemanticAnalysis } from "@/types/fatwa";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

interface SearchHeroProps {
  query: string;
  onQueryChange: (q: string) => void;
  isLoading: boolean;
  totalResults?: number;
  tookMs?: number;
  semanticIntent?: FiqhSemanticAnalysis;
  isActive?: boolean;
}

const QUICK_TOPICS = [
  { label: "নামায", q: "নামায" },
  { label: "যাকাত", q: "যাকাত" },
  { label: "রোজা", q: "রোজা" },
  { label: "পারিবারিক", q: "পারিবারিক" },
  { label: "ক্রয়-বিক্রয়", q: "ক্রয় বিক্রয় লেনদেন" },
  { label: "আকীদাহ", q: "আকীদাহ" },
  { label: "পবিত্রতা", q: "তাহারাত পবিত্রতা ওযূ" },
];

export function SearchHero({
  query,
  onQueryChange,
  isLoading,
  totalResults,
  tookMs,
  semanticIntent,
  isActive,
}: SearchHeroProps) {
  const { t, lang, isRTL } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const isSearchActive = isActive !== undefined ? isActive : Boolean(query.trim().length > 0);
  const suggestions = t.searchHero.popularSuggestions;

  // Global keyboard shortcuts: 'Cmd+K', 'Ctrl+K', or '/' to focus; 'Esc' to clear & close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "k" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" && document.activeElement !== inputRef.current)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setIsDropdownOpen(true);
      }

      if (e.key === "Escape") {
        if (isDropdownOpen) {
          setIsDropdownOpen(false);
        } else if (query) {
          onQueryChange("");
        } else {
          inputRef.current?.blur();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [query, onQueryChange, isDropdownOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle arrow key navigation in suggestions dropdown
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (query.trim().length > 0) {
      if (e.key === "Enter") {
        setIsDropdownOpen(false);
      }
      return;
    }

    const itemsCount = suggestions.length;
    if (itemsCount === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsDropdownOpen(true);
      setSelectedIndex((prev) => (prev + 1 < itemsCount ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsDropdownOpen(true);
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : itemsCount - 1));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        e.preventDefault();
        onQueryChange(suggestions[selectedIndex].text);
      }
      setIsDropdownOpen(false);
    }
  };

  return (
    <section
      className={cn(
        "w-full relative flex flex-col items-center transition-all duration-300 ease-in-out",
        isSearchActive ? "pt-2 sm:pt-4 pb-1 sm:pb-2" : "pt-8 sm:pt-14 pb-4 sm:pb-6 text-center"
      )}
    >
      {/* Subtle Ambient Background Glow (Initial State) */}
      {!isSearchActive && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-48 bg-emerald-500/10 dark:bg-emerald-500/15 blur-[100px] rounded-full pointer-events-none transition-opacity duration-300" />
      )}

      {/* Editorial Masthead (Collapsible on Active Search) */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden text-center max-w-2xl mx-auto px-1",
          isSearchActive
            ? "max-h-0 opacity-0 mb-0 pointer-events-none scale-95"
            : "max-h-[500px] opacity-100 mb-5 sm:mb-8 scale-100"
        )}
      >
        {/* Top Verified Repository Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium mb-3 sm:mb-4 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            {lang === "ar"
              ? "المستودع العلمي المعتمد"
              : lang === "bn"
              ? "প্রামাণ্য ইসলামী গবেষণা ভাণ্ডার"
              : "Authentic Scholarly Repository"}
          </span>
        </div>

        {/* Headline */}
        <h1
          className={cn(
            "text-2xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-snug sm:leading-tight",
            lang === "ar" ? "font-arabic" : lang === "bn" ? "font-bengali-serif" : "font-sans"
          )}
        >
          {t.empty.authenticArchiveTitle}
        </h1>

        {/* Subtitle */}
        <p
          className={cn(
            "mt-2.5 sm:mt-3 text-xs sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl mx-auto px-2",
            lang === "ar" ? "font-arabic" : lang === "bn" ? "font-bengali" : "font-sans"
          )}
        >
          {t.empty.authenticArchiveSubtitle}
        </p>
      </div>

      {/* Modern Floating Search Bar Container */}
      <div ref={containerRef} className="w-full max-w-2xl relative group z-30">
        <div
          className={cn(
            "relative flex items-center bg-white/95 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 group-hover:border-zinc-300 dark:group-hover:border-zinc-700 focus-within:border-emerald-500/80 focus-within:ring-2 focus-within:ring-emerald-500/20 shadow-lg backdrop-blur-xl transition-all duration-200",
            isSearchActive ? "rounded-xl" : "rounded-2xl shadow-xl"
          )}
        >
          <div className="pl-3.5 sm:pl-4 pr-1.5 sm:pr-2 text-zinc-400 flex items-center justify-center pointer-events-none">
            {isLoading ? (
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 animate-spin" />
            ) : (
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 group-focus-within:text-emerald-500 transition-colors" />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onFocus={() => setIsDropdownOpen(true)}
            onChange={(e) => {
              onQueryChange(e.target.value);
              setIsDropdownOpen(true);
              setSelectedIndex(-1);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={t.searchHero.placeholder}
            dir={isRTL ? "rtl" : "ltr"}
            className={cn(
              "w-full bg-transparent border-0 outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-sm sm:text-base",
              isSearchActive ? "py-2.5 sm:py-3.5 px-2" : "py-3.5 sm:py-4 px-2",
              lang === "ar" ? "font-arabic text-base" : lang === "bn" ? "font-bengali" : "font-sans"
            )}
            autoComplete="off"
            spellCheck="false"
          />

          {/* Right Action Badges */}
          <div className="pr-3 flex items-center gap-1.5 sm:gap-2">
            {query && (
              <button
                type="button"
                onClick={() => {
                  onQueryChange("");
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title={`${t.searchHero.clearQuery} (Esc)`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            <div className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-100/70 dark:bg-zinc-800/80 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              <Command className="h-3 w-3" />
              <span>K</span>
            </div>
          </div>
        </div>

        {/* Popular Suggestions Dropdown (Shown only when query is empty) */}
        {isDropdownOpen && !query.trim() && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-[#121215]/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-98 duration-150">
            <div className="p-3">
              <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2 px-1">
                {t.searchHero.popularInquiries}
              </div>
              <div className="space-y-1">
                {suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onQueryChange(sug.text);
                      setIsDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors",
                      lang === "ar" ? "font-arabic" : lang === "bn" ? "font-bengali" : "font-sans",
                      selectedIndex === idx
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-600 dark:text-zinc-300"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                      <span>{sug.text}</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
                      {sug.category}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Topic Pills (Shown when in Initial State) */}
        {!isSearchActive && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-xs animate-in fade-in-50 duration-200">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mr-1 hidden sm:inline">
              দ্রুত অনুসন্ধান:
            </span>
            {QUICK_TOPICS.map((topic) => (
              <button
                key={topic.label}
                type="button"
                onClick={() => {
                  onQueryChange(topic.q);
                  inputRef.current?.focus();
                }}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100/90 dark:bg-zinc-800/80 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-500/30 text-zinc-700 dark:text-zinc-300 border border-zinc-200/90 dark:border-zinc-700/60 transition-all font-bengali cursor-pointer shadow-sm"
              >
                {topic.label}
              </button>
            ))}
          </div>
        )}

        {/* Clean Results Count Metadata (Latency hidden if >=100ms per user specification) */}
        {isSearchActive && totalResults !== undefined && (
          <div className="mt-2 sm:mt-2.5 px-1.5 sm:px-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-bengali">
            <span className="font-medium">
              {totalResults === 0
                ? t.empty.noResultsTitle
                : `${totalResults} ${t.searchHero.resultsFound}`}
            </span>
            {tookMs !== undefined && tookMs > 0 && tookMs < 100 && (
              <span className="font-mono text-[10px] sm:text-[11px] text-zinc-500">
                {tookMs.toFixed(0)} {t.searchHero.tookTime}
              </span>
            )}
          </div>
        )}

        {/* AI Fiqh Semantic Intent Breakdown Badge */}
        {semanticIntent && query.trim().length >= 2 && (
          <div className="mt-2.5 p-2.5 sm:p-3 rounded-xl border border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-950/20 text-zinc-800 dark:text-zinc-200 text-xs shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300 font-mono">
                    ফিক্বহী মর্মার্থ &bull; {semanticIntent.fiqh_category}
                  </span>
                </div>
                <div className="font-bengali text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed">
                  {semanticIntent.fiqh_intent}
                </div>
                {semanticIntent.technical_fiqh_terms && semanticIntent.technical_fiqh_terms.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] font-mono text-zinc-400">মূল পরিভাষা:</span>
                    {semanticIntent.technical_fiqh_terms.slice(0, 5).map((term, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onQueryChange(term)}
                        className="px-1.5 py-0.5 rounded-md bg-white dark:bg-zinc-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bengali transition-colors cursor-pointer"
                        title={`"${term}" দিয়ে অনুসন্ধান করুন`}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
