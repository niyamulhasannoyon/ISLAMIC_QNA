"use client";

import React from "react";
import { FacetCount } from "@/types/fatwa";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  selectedSource: string;
  onSelectSource: (src: string) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedScholar?: string;
  onSelectScholar?: (sch: string) => void;
  sourceFacets: FacetCount[];
  categoryFacets: FacetCount[];
  scholarFacets?: FacetCount[];
}

export function FilterBar({
  selectedSource,
  onSelectSource,
  selectedCategory,
  onSelectCategory,
  selectedScholar = "All",
  onSelectScholar,
  sourceFacets,
  categoryFacets,
  scholarFacets = [],
}: FilterBarProps) {
  const { t, lang } = useLanguage();

  const standardSources = [
    { name: "All", label: t.filters.allArchives },
    { name: "al-itisam", label: "Al-I'tisam" },
    { name: "at-tahreek", label: "At-Tahreek" },
  ];

  const getSourceCount = (srcName: string) => {
    if (srcName === "All") {
      return sourceFacets.reduce((acc, curr) => acc + curr.count, 0);
    }
    const found = sourceFacets.find(
      (f) =>
        f.name.toLowerCase() === srcName.toLowerCase() ||
        (srcName === "al-itisam" && f.name.toLowerCase().includes("itisam")) ||
        (srcName === "at-tahreek" && f.name.toLowerCase().includes("tahreek"))
    );
    return found ? found.count : 0;
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-3 pb-6">
      {/* Source Filter Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mr-1">
          {t.filters.archiveLabel}
        </span>
        {standardSources.map((src) => {
          const isSelected =
            selectedSource.toLowerCase() === src.name.toLowerCase() ||
            (selectedSource.toLowerCase().includes("itisam") && src.name === "al-itisam") ||
            (selectedSource.toLowerCase().includes("tahreek") && src.name === "at-tahreek");

          const count = getSourceCount(src.name);

          return (
            <button
              key={src.name}
              type="button"
              onClick={() => onSelectSource(src.name)}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border",
                isSelected
                  ? "bg-zinc-900 text-zinc-100 border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 shadow-sm"
                  : "bg-white dark:bg-[#121215] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              {isSelected && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              )}
              <span>{src.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-mono",
                    isSelected
                      ? "bg-zinc-800 text-zinc-300 dark:bg-zinc-200 dark:text-zinc-800"
                      : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-400 dark:text-zinc-500"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Category Chips (Horizontal Scrollable) */}
      {categoryFacets.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-1 scrollbar-none border-t border-zinc-100 dark:border-zinc-800/60">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mr-1 shrink-0">
            {t.filters.categoryLabel}
          </span>
          <button
            type="button"
            onClick={() => onSelectCategory("All")}
            className={cn(
              "shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 border",
              selectedCategory === "All"
                ? "bg-zinc-900 text-zinc-100 border-zinc-900 dark:bg-zinc-200 dark:text-zinc-900 dark:border-zinc-200"
                : "bg-transparent text-zinc-500 dark:text-zinc-400 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            )}
          >
            {t.filters.allCategories}
          </button>
          {categoryFacets.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => onSelectCategory(cat.name)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 border",
                  lang === "ar" ? "font-arabic" : "font-bengali",
                  isSelected
                    ? "bg-zinc-900 text-zinc-100 border-zinc-900 dark:bg-zinc-200 dark:text-zinc-900 dark:border-zinc-200"
                    : "bg-white dark:bg-[#121215] text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
              >
                <span>{cat.name}</span>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Scholar Chips */}
      {scholarFacets.length > 0 && onSelectScholar && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-1 scrollbar-none border-t border-zinc-100 dark:border-zinc-800/60">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mr-1 shrink-0">
            {t.filters.scholarLabel}
          </span>
          <button
            type="button"
            onClick={() => onSelectScholar("All")}
            className={cn(
              "shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 border",
              selectedScholar === "All"
                ? "bg-zinc-900 text-zinc-100 border-zinc-900 dark:bg-zinc-200 dark:text-zinc-900 dark:border-zinc-200"
                : "bg-transparent text-zinc-500 dark:text-zinc-400 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            )}
          >
            {t.filters.allScholars}
          </button>
          {scholarFacets.map((sch) => {
            const isSelected = selectedScholar === sch.name;
            return (
              <button
                key={sch.name}
                type="button"
                onClick={() => onSelectScholar(sch.name)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 border",
                  lang === "ar" ? "font-arabic" : "font-bengali",
                  isSelected
                    ? "bg-zinc-900 text-zinc-100 border-zinc-900 dark:bg-zinc-200 dark:text-zinc-900 dark:border-zinc-200"
                    : "bg-white dark:bg-[#121215] text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
              >
                <span>{sch.name}</span>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                  {sch.count}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
