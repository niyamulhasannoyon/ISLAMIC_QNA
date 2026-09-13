"use client";

import React, { useState, useRef, useEffect } from "react";
import { FacetCount } from "@/types/fatwa";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import {
  Layers,
  BookOpen,
  GraduationCap,
  ChevronDown,
  Check,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";

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
  const [openDropdown, setOpenDropdown] = useState<"source" | "category" | "scholar" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const standardSources = [
    { name: "All", label: t.filters.allArchives },
    { name: "al-itisam", label: "Al-I'tisam (আল-ইতিসাম)" },
    { name: "at-tahreek", label: "At-Tahreek (আত-তাহরীক)" },
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

  const getSelectedSourceLabel = () => {
    if (selectedSource === "All") return t.filters.allArchives;
    if (selectedSource.toLowerCase().includes("itisam")) return "Al-I'tisam";
    if (selectedSource.toLowerCase().includes("tahreek")) return "At-Tahreek";
    return selectedSource;
  };

  const hasActiveFilters =
    selectedSource !== "All" ||
    selectedCategory !== "All" ||
    (selectedScholar && selectedScholar !== "All");

  const handleResetFilters = () => {
    onSelectSource("All");
    onSelectCategory("All");
    if (onSelectScholar) onSelectScholar("All");
    setOpenDropdown(null);
  };

  return (
    <div ref={containerRef} className="w-full max-w-3xl mx-auto mb-6">
      {/* Professional Single Row Filter Bar Container */}
      <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 sm:p-2.5 shadow-sm transition-all duration-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 relative">
          
          {/* 1. উৎস (Source) Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === "source" ? null : "source")}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-150",
                selectedSource !== "All"
                  ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 dark:border-emerald-500/30"
                  : "bg-zinc-50/70 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Layers className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                <div className="flex flex-col text-left truncate">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider leading-none mb-0.5">
                    {t.filters.archiveLabel.replace(":", "")}
                  </span>
                  <span className="truncate font-bengali font-semibold text-xs">
                    {getSelectedSourceLabel()}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-zinc-400 transition-transform duration-150 shrink-0",
                  openDropdown === "source" ? "rotate-180" : ""
                )}
              />
            </button>

            {/* Source Popover */}
            {openDropdown === "source" && (
              <div className="absolute top-full left-0 right-0 sm:w-64 mt-1.5 bg-white dark:bg-[#16161a] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in-50 zoom-in-98 duration-150">
                <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-zinc-400 border-b border-zinc-100 dark:border-zinc-800/60">
                  {t.filters.archiveLabel}
                </div>
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
                      onClick={() => {
                        onSelectSource(src.name);
                        setOpenDropdown(null);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                        isSelected
                          ? "bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-medium"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400 dark:text-emerald-600" />}
                        <span className="truncate font-bengali">{src.label}</span>
                      </div>
                      {count > 0 && (
                        <span className={cn(
                          "text-[10px] font-mono px-1.5 py-0.5 rounded",
                          isSelected
                            ? "bg-zinc-800 text-zinc-200 dark:bg-zinc-200 dark:text-zinc-800"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                        )}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. বিভাগ (Category) Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === "category" ? null : "category")}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-150",
                selectedCategory !== "All"
                  ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 dark:border-emerald-500/30"
                  : "bg-zinc-50/70 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                <div className="flex flex-col text-left truncate">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider leading-none mb-0.5">
                    {t.filters.categoryLabel.replace(":", "")}
                  </span>
                  <span className="truncate font-bengali font-semibold text-xs">
                    {selectedCategory === "All" ? t.filters.allCategories : selectedCategory}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-zinc-400 transition-transform duration-150 shrink-0",
                  openDropdown === "category" ? "rotate-180" : ""
                )}
              />
            </button>

            {/* Category Popover */}
            {openDropdown === "category" && (
              <div className="absolute top-full left-0 right-0 sm:w-72 mt-1.5 bg-white dark:bg-[#16161a] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 p-1.5 space-y-1 max-h-64 overflow-y-auto animate-in fade-in-50 zoom-in-98 duration-150">
                <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-zinc-400 border-b border-zinc-100 dark:border-zinc-800/60 sticky top-0 bg-white dark:bg-[#16161a]">
                  {t.filters.categoryLabel}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSelectCategory("All");
                    setOpenDropdown(null);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                    selectedCategory === "All"
                      ? "bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-medium"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    {selectedCategory === "All" && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400 dark:text-emerald-600" />}
                    <span className="truncate font-bengali">{t.filters.allCategories}</span>
                  </div>
                </button>
                {categoryFacets.map((cat) => {
                  const isSelected = selectedCategory === cat.name;
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => {
                        onSelectCategory(cat.name);
                        setOpenDropdown(null);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                        isSelected
                          ? "bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-medium"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400 dark:text-emerald-600" />}
                        <span className="truncate font-bengali">{cat.name}</span>
                      </div>
                      <span className={cn(
                        "text-[10px] font-mono px-1.5 py-0.5 rounded",
                        isSelected
                          ? "bg-zinc-800 text-zinc-200 dark:bg-zinc-200 dark:text-zinc-800"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                      )}>
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. লেখক / আলেম (Scholar / Author) Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === "scholar" ? null : "scholar")}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-150",
                selectedScholar && selectedScholar !== "All"
                  ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 dark:border-emerald-500/30"
                  : "bg-zinc-50/70 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <GraduationCap className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                <div className="flex flex-col text-left truncate">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider leading-none mb-0.5">
                    {t.filters.scholarLabel.replace(":", "")}
                  </span>
                  <span className="truncate font-bengali font-semibold text-xs">
                    {selectedScholar === "All" ? t.filters.allScholars : selectedScholar}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-zinc-400 transition-transform duration-150 shrink-0",
                  openDropdown === "scholar" ? "rotate-180" : ""
                )}
              />
            </button>

            {/* Scholar Popover */}
            {openDropdown === "scholar" && (
              <div className="absolute top-full right-0 sm:w-72 mt-1.5 bg-white dark:bg-[#16161a] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 p-1.5 space-y-1 max-h-64 overflow-y-auto animate-in fade-in-50 zoom-in-98 duration-150">
                <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-zinc-400 border-b border-zinc-100 dark:border-zinc-800/60 sticky top-0 bg-white dark:bg-[#16161a]">
                  {t.filters.scholarLabel}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectScholar) onSelectScholar("All");
                    setOpenDropdown(null);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                    selectedScholar === "All"
                      ? "bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-medium"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    {selectedScholar === "All" && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400 dark:text-emerald-600" />}
                    <span className="truncate font-bengali">{t.filters.allScholars}</span>
                  </div>
                </button>
                {scholarFacets.map((sch) => {
                  const isSelected = selectedScholar === sch.name;
                  return (
                    <button
                      key={sch.name}
                      type="button"
                      onClick={() => {
                        if (onSelectScholar) onSelectScholar(sch.name);
                        setOpenDropdown(null);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                        isSelected
                          ? "bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-medium"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400 dark:text-emerald-600" />}
                        <span className="truncate font-bengali">{sch.name}</span>
                      </div>
                      <span className={cn(
                        "text-[10px] font-mono px-1.5 py-0.5 rounded",
                        isSelected
                          ? "bg-zinc-800 text-zinc-200 dark:bg-zinc-200 dark:text-zinc-800"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                      )}>
                        {sch.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Active Filter Chips & Clear Action */}
        {hasActiveFilters && (
          <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono text-zinc-400 uppercase mr-1">
                ফিল্টারসমূহ:
              </span>
              {selectedSource !== "All" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-[11px] font-medium border border-emerald-200 dark:border-emerald-800/60 font-bengali">
                  <span>উৎস: {getSelectedSourceLabel()}</span>
                </span>
              )}
              {selectedCategory !== "All" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-[11px] font-medium border border-emerald-200 dark:border-emerald-800/60 font-bengali">
                  <span>বিভাগ: {selectedCategory}</span>
                </span>
              )}
              {selectedScholar && selectedScholar !== "All" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-[11px] font-medium border border-emerald-200 dark:border-emerald-800/60 font-bengali">
                  <span>লেখক: {selectedScholar}</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-medium px-2 py-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ml-auto"
            >
              <RotateCcw className="h-3 w-3 text-zinc-400" />
              <span>রিসেট করুন</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
