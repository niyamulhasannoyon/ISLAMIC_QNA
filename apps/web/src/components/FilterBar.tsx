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
  X,
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
    { name: "al-kawsar", label: "Al-Kawsar (আলকাউসার)" },
  ];

  const getSourceCount = (srcName: string) => {
    if (srcName === "All") {
      return sourceFacets.reduce((acc, curr) => acc + curr.count, 0);
    }
    const found = sourceFacets.find(
      (f) =>
        f.name.toLowerCase() === srcName.toLowerCase() ||
        (srcName === "al-itisam" && f.name.toLowerCase().includes("itisam")) ||
        (srcName === "at-tahreek" && f.name.toLowerCase().includes("tahreek")) ||
        (srcName === "al-kawsar" && (f.name.toLowerCase().includes("kawsar") || f.name.toLowerCase().includes("kausar")))
    );
    return found ? found.count : 0;
  };

  const getSelectedSourceLabel = () => {
    if (selectedSource === "All") return t.filters.allArchives;
    if (selectedSource.toLowerCase().includes("itisam")) return "আল-ইতিসাম";
    if (selectedSource.toLowerCase().includes("tahreek")) return "আত-তাহরীক";
    if (selectedSource.toLowerCase().includes("kawsar") || selectedSource.toLowerCase().includes("kausar")) return "আলকাউসার";
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
    <div ref={containerRef} className="w-full max-w-2xl mx-auto my-3 sm:my-3.5 relative z-20">
      {/* Sleek Horizontal Filter Chips Bar */}
      <div className="flex items-center justify-center flex-wrap gap-1.5 sm:gap-2 text-xs">
        
        {/* 1. উৎস (Source) Chip */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === "source" ? null : "source")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border shadow-sm transition-all duration-150 cursor-pointer select-none",
              selectedSource !== "All"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shadow-emerald-500/5 font-semibold"
                : "bg-white/80 dark:bg-zinc-900/80 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 border-zinc-200/90 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
            )}
          >
            <Layers className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <span className="font-bengali truncate max-w-[130px] sm:max-w-[150px]">
              {getSelectedSourceLabel()}
            </span>
            <ChevronDown
              className={cn(
                "h-3 w-3 text-zinc-400 transition-transform duration-150 shrink-0",
                openDropdown === "source" ? "rotate-180" : ""
              )}
            />
          </button>

          {openDropdown === "source" && (
            <div className="absolute top-full left-0 sm:left-auto sm:right-auto mt-1.5 w-64 bg-white/95 dark:bg-[#16161a]/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 p-1.5 space-y-0.5 animate-in fade-in-50 zoom-in-95 duration-150">
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-zinc-400 border-b border-zinc-100 dark:border-zinc-800/60 mb-1">
                {t.filters.archiveLabel}
              </div>
              {standardSources.map((src) => {
                const isSelected =
                  selectedSource.toLowerCase() === src.name.toLowerCase() ||
                  (selectedSource.toLowerCase().includes("itisam") && src.name === "al-itisam") ||
                  (selectedSource.toLowerCase().includes("tahreek") && src.name === "at-tahreek") ||
                  ((selectedSource.toLowerCase().includes("kawsar") || selectedSource.toLowerCase().includes("kausar")) && src.name === "al-kawsar");
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
                      <span
                        className={cn(
                          "text-[10px] font-mono px-1.5 py-0.2 rounded",
                          isSelected
                            ? "bg-zinc-800 text-zinc-200 dark:bg-zinc-200 dark:text-zinc-800"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. বিভাগ (Category) Chip */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === "category" ? null : "category")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border shadow-sm transition-all duration-150 cursor-pointer select-none",
              selectedCategory !== "All"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shadow-emerald-500/5 font-semibold"
                : "bg-white/80 dark:bg-zinc-900/80 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 border-zinc-200/90 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
            )}
          >
            <BookOpen className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <span className="font-bengali truncate max-w-[130px] sm:max-w-[150px]">
              {selectedCategory === "All" ? t.filters.allCategories : selectedCategory}
            </span>
            <ChevronDown
              className={cn(
                "h-3 w-3 text-zinc-400 transition-transform duration-150 shrink-0",
                openDropdown === "category" ? "rotate-180" : ""
              )}
            />
          </button>

          {openDropdown === "category" && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-72 max-h-72 overflow-y-auto bg-white/95 dark:bg-[#16161a]/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 p-1.5 space-y-0.5 animate-in fade-in-50 zoom-in-95 duration-150">
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-zinc-400 border-b border-zinc-100 dark:border-zinc-800/60 mb-1 sticky top-0 bg-white/95 dark:bg-[#16161a]/95">
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
                    <span
                      className={cn(
                        "text-[10px] font-mono px-1.5 py-0.2 rounded",
                        isSelected
                          ? "bg-zinc-800 text-zinc-200 dark:bg-zinc-200 dark:text-zinc-800"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                      )}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. গবেষক / আলেম (Scholar) Chip */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === "scholar" ? null : "scholar")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border shadow-sm transition-all duration-150 cursor-pointer select-none",
              selectedScholar && selectedScholar !== "All"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shadow-emerald-500/5 font-semibold"
                : "bg-white/80 dark:bg-zinc-900/80 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 border-zinc-200/90 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
            )}
          >
            <GraduationCap className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <span className="font-bengali truncate max-w-[120px] sm:max-w-[140px]">
              {selectedScholar === "All" ? t.filters.allScholars : selectedScholar}
            </span>
            <ChevronDown
              className={cn(
                "h-3 w-3 text-zinc-400 transition-transform duration-150 shrink-0",
                openDropdown === "scholar" ? "rotate-180" : ""
              )}
            />
          </button>

          {openDropdown === "scholar" && (
            <div className="absolute top-full right-0 sm:left-auto mt-1.5 w-72 max-h-72 overflow-y-auto bg-white/95 dark:bg-[#16161a]/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 p-1.5 space-y-0.5 animate-in fade-in-50 zoom-in-95 duration-150">
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-zinc-400 border-b border-zinc-100 dark:border-zinc-800/60 mb-1 sticky top-0 bg-white/95 dark:bg-[#16161a]/95">
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
              {scholarFacets.slice(0, 50).map((sch) => {
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
                    <span
                      className={cn(
                        "text-[10px] font-mono px-1.5 py-0.2 rounded",
                        isSelected
                          ? "bg-zinc-800 text-zinc-200 dark:bg-zinc-200 dark:text-zinc-800"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                      )}
                    >
                      {sch.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Separator & Reset Button (When any filter is active) */}
        {hasActiveFilters && (
          <>
            <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline select-none">|</span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 bg-zinc-100/80 hover:bg-zinc-200/70 dark:bg-zinc-800/70 dark:hover:bg-zinc-700/70 transition-colors cursor-pointer"
              title="সকল ফিল্টার রিসেট করুন"
            >
              <RotateCcw className="h-3 w-3 text-zinc-400" />
              <span className="font-bengali">
                {lang === "ar" ? "إعادة تعيين" : lang === "bn" ? "রিসেট" : "Reset"}
              </span>
            </button>
          </>
        )}

      </div>
    </div>
  );
}
