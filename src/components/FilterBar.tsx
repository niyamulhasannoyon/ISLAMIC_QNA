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

  // Helper renderers for dropdown lists
  const renderSourceList = () => (
    <>
      <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase text-zinc-400 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
        <span>{t.filters.archiveLabel}</span>
        <button
          type="button"
          onClick={() => setOpenDropdown(null)}
          className="sm:hidden text-zinc-400 hover:text-zinc-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
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
                  "text-[10px] font-mono px-1.5 py-0.5 rounded",
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
    </>
  );

  const renderCategoryList = () => (
    <>
      <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase text-zinc-400 border-b border-zinc-100 dark:border-zinc-800/60 sticky top-0 bg-white dark:bg-[#16161a] flex items-center justify-between">
        <span>{t.filters.categoryLabel}</span>
        <button
          type="button"
          onClick={() => setOpenDropdown(null)}
          className="sm:hidden text-zinc-400 hover:text-zinc-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
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
                "text-[10px] font-mono px-1.5 py-0.5 rounded",
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
    </>
  );

  const renderScholarList = () => (
    <>
      <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase text-zinc-400 border-b border-zinc-100 dark:border-zinc-800/60 sticky top-0 bg-white dark:bg-[#16161a] flex items-center justify-between">
        <span>{t.filters.scholarLabel}</span>
        <button
          type="button"
          onClick={() => setOpenDropdown(null)}
          className="sm:hidden text-zinc-400 hover:text-zinc-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
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
                "text-[10px] font-mono px-1.5 py-0.5 rounded",
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
    </>
  );

  return (
    <div ref={containerRef} className="w-full max-w-3xl mx-auto mb-3.5 sm:mb-6">
      {/* ========================================================================= */}
      {/* 1. MOBILE HORIZONTAL FILTER BAR (Takes only 38px instead of 180px)        */}
      {/* ========================================================================= */}
      <div className="sm:hidden relative">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-0.5 -mx-0.5">
          {/* Mobile Filter Pill: উৎস */}
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === "source" ? null : "source")}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150",
              selectedSource !== "All"
                ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                : "bg-white dark:bg-[#121215] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            )}
          >
            <Layers className="h-3 w-3 text-zinc-400 shrink-0" />
            <span className="font-bengali text-xs">
              {selectedSource === "All" ? t.filters.allArchives : getSelectedSourceLabel()}
            </span>
            <ChevronDown
              className={cn(
                "h-3 w-3 text-zinc-400 transition-transform duration-150 shrink-0",
                openDropdown === "source" ? "rotate-180" : ""
              )}
            />
          </button>

          {/* Mobile Filter Pill: বিভাগ */}
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === "category" ? null : "category")}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150",
              selectedCategory !== "All"
                ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                : "bg-white dark:bg-[#121215] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            )}
          >
            <BookOpen className="h-3 w-3 text-zinc-400 shrink-0" />
            <span className="font-bengali text-xs truncate max-w-[120px]">
              {selectedCategory === "All" ? t.filters.allCategories : selectedCategory}
            </span>
            <ChevronDown
              className={cn(
                "h-3 w-3 text-zinc-400 transition-transform duration-150 shrink-0",
                openDropdown === "category" ? "rotate-180" : ""
              )}
            />
          </button>

          {/* Mobile Filter Pill: গবেষক / আলেম */}
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === "scholar" ? null : "scholar")}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150",
              selectedScholar && selectedScholar !== "All"
                ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                : "bg-white dark:bg-[#121215] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            )}
          >
            <GraduationCap className="h-3 w-3 text-zinc-400 shrink-0" />
            <span className="font-bengali text-xs truncate max-w-[120px]">
              {selectedScholar === "All" ? t.filters.allScholars : selectedScholar}
            </span>
            <ChevronDown
              className={cn(
                "h-3 w-3 text-zinc-400 transition-transform duration-150 shrink-0",
                openDropdown === "scholar" ? "rotate-180" : ""
              )}
            />
          </button>

          {/* Mobile Reset Pill */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800/80 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span className="font-bengali text-xs">
                {lang === "ar" ? "إعادة تعيين" : lang === "bn" ? "রিসেট" : "Reset"}
              </span>
            </button>
          )}
        </div>

        {/* Mobile Dropdown Popover */}
        {openDropdown && (
          <div className="mt-1.5 bg-white dark:bg-[#16161a] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-1.5 space-y-1 max-h-64 overflow-y-auto animate-in fade-in-50 zoom-in-98 duration-150 z-40">
            {openDropdown === "source" && renderSourceList()}
            {openDropdown === "category" && renderCategoryList()}
            {openDropdown === "scholar" && renderScholarList()}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP 3-COLUMN FILTER GRID                                           */}
      {/* ========================================================================= */}
      <div className="hidden sm:block bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 sm:p-2.5 shadow-sm transition-all duration-200">
        <div className="grid grid-cols-3 gap-2 relative">
          
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

            {/* Desktop Source Popover */}
            {openDropdown === "source" && (
              <div className="absolute top-full left-0 right-0 sm:w-64 mt-1.5 bg-white dark:bg-[#16161a] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in-50 zoom-in-98 duration-150">
                {renderSourceList()}
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

            {/* Desktop Category Popover */}
            {openDropdown === "category" && (
              <div className="absolute top-full left-0 right-0 sm:w-72 mt-1.5 bg-white dark:bg-[#16161a] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 p-1.5 space-y-1 max-h-64 overflow-y-auto animate-in fade-in-50 zoom-in-98 duration-150">
                {renderCategoryList()}
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

            {/* Desktop Scholar Popover */}
            {openDropdown === "scholar" && (
              <div className="absolute top-full right-0 sm:w-72 mt-1.5 bg-white dark:bg-[#16161a] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 p-1.5 space-y-1 max-h-64 overflow-y-auto animate-in fade-in-50 zoom-in-98 duration-150">
                {renderScholarList()}
              </div>
            )}
          </div>

        </div>

        {/* Desktop Active Filter Chips & Clear Action */}
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
