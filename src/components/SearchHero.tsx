"use client";

import React, { useRef, useEffect, useState } from "react";
import { Search, X, Loader2, Command, CornerDownLeft, BookOpen } from "lucide-react";
import { SearchResultItem } from "@/types/fatwa";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

interface SearchHeroProps {
  query: string;
  onQueryChange: (q: string) => void;
  isLoading: boolean;
  totalResults?: number;
  tookMs?: number;
  previewResults?: SearchResultItem[];
  onSelectPreviewItem?: (item: SearchResultItem) => void;
}

export function SearchHero({
  query,
  onQueryChange,
  isLoading,
  totalResults,
  tookMs,
  previewResults = [],
  onSelectPreviewItem,
}: SearchHeroProps) {
  const { t, lang, isRTL } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

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

  // Handle arrow key navigation in preview dropdown
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const itemsCount = previewResults.length > 0 ? previewResults.length : suggestions.length;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsDropdownOpen(true);
      setSelectedIndex((prev) => (prev + 1 < itemsCount ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsDropdownOpen(true);
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : itemsCount - 1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      if (previewResults.length > 0 && onSelectPreviewItem) {
        onSelectPreviewItem(previewResults[selectedIndex]);
      } else if (suggestions[selectedIndex]) {
        onQueryChange(suggestions[selectedIndex].text);
      }
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className="w-full pt-4 sm:pt-10 pb-3 sm:pb-6 flex flex-col items-center">
      {/* Editorial Masthead with Asymmetrical Craft */}
      <div className="text-center max-w-2xl mx-auto mb-4 sm:mb-8 px-1">
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 text-[10px] sm:text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mb-2.5 sm:mb-4 tracking-wider uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>
            {lang === "ar"
              ? "المستودع العلمي المعتمد"
              : lang === "bn"
              ? "প্রামাণ্য ইসলামী গবেষণা ভাণ্ডার"
              : "Authentic Scholarly Repository"}
          </span>
        </div>
        <h1
          className={cn(
            "text-2xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-snug sm:leading-tight",
            lang === "ar" ? "font-arabic" : lang === "bn" ? "font-bengali-serif" : "font-sans"
          )}
        >
          {t.empty.authenticArchiveTitle}
        </h1>
        <p
          className={cn(
            "mt-2 sm:mt-3 text-xs sm:text-base text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xl mx-auto px-2 line-clamp-2 sm:line-clamp-none",
            lang === "ar" ? "font-arabic" : lang === "bn" ? "font-bengali" : "font-sans"
          )}
        >
          {t.empty.authenticArchiveSubtitle}
        </p>
      </div>

      {/* Prominent Command-style Search Bar with Dropdown Container */}
      <div ref={containerRef} className="w-full max-w-2xl relative">
        <div className="relative flex items-center bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 focus-within:border-zinc-400 dark:focus-within:border-zinc-600 focus-within:ring-2 focus-within:ring-zinc-100 dark:focus-within:ring-zinc-800/80 rounded-xl shadow-sm transition-all duration-200">
          <div className="pl-3 sm:pl-4 pr-1.5 sm:pr-2 text-zinc-400 flex items-center justify-center pointer-events-none">
            {isLoading ? (
              <Loader2 className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-emerald-500 animate-spin" />
            ) : (
              <Search className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-zinc-400" />
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
              "w-full py-2.5 sm:py-3.5 px-2 text-sm sm:text-base bg-transparent border-0 outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
              lang === "ar" ? "font-arabic text-base" : lang === "bn" ? "font-bengali" : "font-sans"
            )}
            autoComplete="off"
            spellCheck="false"
          />

          {/* Right Action Badges */}
          <div className="pr-3 flex items-center gap-2">
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

            <div className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-[10px] font-mono text-zinc-400">
              <Command className="h-3 w-3" />
              <span>K</span>
            </div>
          </div>
        </div>

        {/* Instant Dropdown Preview Panel */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-40 overflow-hidden animate-in fade-in-50 zoom-in-98 duration-150">
            {query.trim().length > 0 && previewResults.length > 0 ? (
              <div className="p-2 space-y-1">
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 mb-1">
                  <span>{t.searchHero.previewHeading}</span>
                  <span className="text-[10px]">↑↓ ↵</span>
                </div>
                {previewResults.slice(0, 4).map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (onSelectPreviewItem) onSelectPreviewItem(item);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-start gap-2.5 transition-colors ${
                      selectedIndex === idx
                        ? "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <BookOpen className="h-4 w-4 mt-0.5 text-zinc-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold font-bengali line-clamp-1">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5 flex items-center gap-2">
                        <span>{item.source}</span>
                        <span>&bull;</span>
                        <span>{item.category}</span>
                        {item.scholar && (
                          <>
                            <span>&bull;</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-sans">{item.scholar}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <CornerDownLeft className="h-3 w-3 text-zinc-400 mt-1 opacity-60 shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
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
            )}
          </div>
        )}

        {/* Telemetry & Response Timing Bar */}
        {totalResults !== undefined && (
          <div className="mt-2 sm:mt-2.5 px-1.5 sm:px-2 flex items-center justify-between text-[11px] sm:text-xs text-zinc-400 font-bengali">
            <span>
              {totalResults === 0
                ? t.empty.noResultsTitle
                : `${totalResults} ${t.searchHero.resultsFound}`}
            </span>
            {tookMs !== undefined && tookMs >= 0 && (
              <span className="font-mono text-[10px] sm:text-[11px] text-zinc-500">
                {tookMs.toFixed(1)} {t.searchHero.tookTime}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
