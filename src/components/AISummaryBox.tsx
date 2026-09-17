"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Loader2, Copy, Check, ChevronDown, ChevronUp, BookOpen, AlertCircle } from "lucide-react";
import { SearchResultItem } from "@/types/fatwa";

interface AISummaryBoxProps {
  query: string;
  results: SearchResultItem[];
  onOpenModal?: (item: SearchResultItem) => void;
}

export function AISummaryBox({ query, results, onOpenModal }: AISummaryBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [sources, setSources] = useState<Array<{ id: string; title: string; scholar: string; source: string }>>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedQuery, setCachedQuery] = useState<string>("");

  // Reset if query changes
  useEffect(() => {
    if (query !== cachedQuery) {
      setIsOpen(false);
      setSummary(null);
      setError(null);
    }
  }, [query, cachedQuery]);

  if (!query || query.trim().length < 2 || results.length === 0) {
    return null;
  }

  const handleGenerateSummary = async () => {
    if (summary && query === cachedQuery) {
      setIsOpen(!isOpen);
      return;
    }

    setIsOpen(true);
    setIsLoading(true);
    setError(null);

    try {
      const topTwo = results.slice(0, 2);
      const res = await fetch("/api/v1/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: query,
          fatwaIds: topTwo.map((r) => r.id),
          contextLimit: 2,
        }),
      });

      if (!res.ok) {
        throw new Error("সারসংক্ষেপ তৈরিতে সমস্যা হয়েছে");
      }

      const data = await res.json();
      setSummary(data.answer || "কোনো সারসংক্ষেপ পাওয়া যায়নি।");
      setSources(data.sources || []);
      setCachedQuery(query);
    } catch (err: any) {
      setError(err.message || "সারসংক্ষেপ তৈরিতে সাময়িক সমস্যা হয়েছে");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full mb-3 rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/30 dark:from-emerald-950/20 dark:via-[#121215] dark:to-emerald-950/10 shadow-sm overflow-hidden transition-all">
      {/* Header bar / Trigger */}
      <div className="px-3.5 sm:px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 font-bengali">
              শীর্ষ ফতোয়ার আলোকে সংক্ষেপ
            </span>
            <span className="hidden sm:inline-block text-[11px] text-zinc-400 dark:text-zinc-500 font-bengali ml-2">
              (সারসংক্ষেপ পেতে ক্লিক করুন)
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerateSummary}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium font-bengali shadow-sm transition-all shrink-0 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>বিশ্লেষণ চলছে...</span>
            </>
          ) : isOpen ? (
            <>
              <span>লুকান</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>সংক্ষেপে উত্তর দাও</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Expandable summary body */}
      {isOpen && (
        <div className="px-3.5 sm:px-4 pb-3.5 pt-1 border-t border-emerald-500/15 text-xs text-zinc-800 dark:text-zinc-200 font-bengali animate-in fade-in duration-150">
          {isLoading ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              <span className="text-xs font-bengali">
                শীর্ষ ফতোয়া বিশ্লেষণ করে নির্ভরযোগ্য উত্তর সংক্ষেপ করা হচ্ছে...
              </span>
            </div>
          ) : error ? (
            <div className="py-2 text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : summary ? (
            <div className="space-y-3">
              <div className="text-[13px] leading-relaxed whitespace-pre-line text-zinc-800 dark:text-zinc-200 bg-white/70 dark:bg-zinc-900/60 p-3 rounded-lg border border-emerald-500/10">
                {summary}
              </div>

              {/* Source attribution & Copy action */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-zinc-400 font-mono uppercase">রেফারেন্স:</span>
                  {sources.slice(0, 2).map((s, idx) => (
                    <button
                      key={s.id || idx}
                      type="button"
                      onClick={() => {
                        const target = results.find((r) => r.id === s.id);
                        if (target && onOpenModal) onOpenModal(target);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium border border-zinc-200 dark:border-zinc-700 transition-colors"
                    >
                      <BookOpen className="w-3 h-3 text-emerald-600" />
                      <span className="max-w-[200px] truncate">{s.title}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-medium">কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>কপি করুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
