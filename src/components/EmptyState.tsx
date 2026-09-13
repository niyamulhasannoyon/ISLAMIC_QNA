"use client";

import React from "react";
import { SearchX, ArrowRight, Compass } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  query?: string;
  onSuggestionClick: (suggestion: string) => void;
}

export function EmptyState({ query, onSuggestionClick }: EmptyStateProps) {
  const { t, lang } = useLanguage();
  const suggestions = t.empty.suggestions;

  if (query) {
    return (
      <div className="w-full max-w-xl mx-auto py-16 text-center">
        <div className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] flex items-center justify-center mx-auto text-zinc-400 mb-3.5">
          <SearchX className="h-4.5 w-4.5" />
        </div>
        <h3
          className={cn(
            "text-base font-semibold text-zinc-900 dark:text-zinc-100",
            lang === "ar" ? "font-arabic" : lang === "bn" ? "font-bengali-serif" : "font-sans"
          )}
        >
          {t.empty.noResultsTitle} &ldquo;{query}&rdquo;
        </h3>
        <p
          className={cn(
            "mt-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400",
            lang === "ar" ? "font-arabic" : lang === "bn" ? "font-bengali" : "font-sans"
          )}
        >
          {t.empty.noResultsHint}
        </p>

        <div className="mt-8 pt-6 border-t border-zinc-200/80 dark:border-zinc-800/80">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-3">
            {t.empty.suggestedQueries}
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.slice(0, 4).map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSuggestionClick(s.text)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors",
                  lang === "ar" ? "font-arabic" : lang === "bn" ? "font-bengali" : "font-sans"
                )}
              >
                {s.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto py-12 text-center">
      <div className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 mb-3.5">
        <Compass className="h-5 w-5" />
      </div>
      <h3
        className={cn(
          "text-base font-semibold text-zinc-900 dark:text-zinc-100",
          lang === "ar" ? "font-arabic text-lg" : lang === "bn" ? "font-bengali-serif" : "font-sans"
        )}
      >
        {t.empty.authenticArchiveTitle}
      </h3>
      <p
        className={cn(
          "mt-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed",
          lang === "ar" ? "font-arabic" : lang === "bn" ? "font-bengali" : "font-sans"
        )}
      >
        {t.empty.authenticArchiveSubtitle}
      </p>

      <div className="mt-6">
        <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-3">
          {t.empty.popularInquiries}
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left max-w-lg mx-auto">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSuggestionClick(s.text)}
              className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors group flex items-center justify-between"
            >
              <div>
                <div
                  className={cn(
                    "text-xs font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors",
                    lang === "ar" ? "font-arabic" : lang === "bn" ? "font-bengali" : "font-sans"
                  )}
                >
                  {s.text}
                </div>
                <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                  {s.desc}
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 rtl:rotate-180" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
