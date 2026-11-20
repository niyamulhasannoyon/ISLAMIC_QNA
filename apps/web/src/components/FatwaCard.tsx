"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SearchResultItem } from "@/types/fatwa";
import { formatDate, cn, createFatwaSlug } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { buildCacheKey, saveScrollPosition } from "@/lib/searchCache";
import { SafeHighlight } from "./SafeHighlight";
import {
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Tag,
  GraduationCap,
} from "lucide-react";

interface FatwaCardProps {
  item: SearchResultItem;
  onOpenModal: (item: SearchResultItem) => void;
}

export function FatwaCard({ item, onOpenModal }: FatwaCardProps) {
  const { t, lang } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const fatwaSlug = createFatwaSlug(item.title, item.id);

  const handleLinkClick = () => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const cacheKey = buildCacheKey({
      q: urlParams.get("q") || "",
      source: urlParams.get("source") || "All",
      category: urlParams.get("category") || "All",
      scholar: urlParams.get("scholar") || "All",
      page: urlParams.get("page") || "1",
    });
    saveScrollPosition(cacheKey, window.scrollY);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const permalink = `${window.location.origin}/fatwa/${fatwaSlug}`;
    navigator.clipboard.writeText(permalink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  const isAtTahreek = item.source.toLowerCase().includes("tahreek");
  const isAlItisam = item.source.toLowerCase().includes("itisam");
  const isAlKawsar = item.source.toLowerCase().includes("kawsar") || item.source.toLowerCase().includes("kausar");
  const displayDate = item.published_date || item.created_at;
  const hashDisplay = (item.sha256_hash || "").slice(0, 10);

  return (
    <article className="bg-white/90 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/80 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 rounded-2xl p-4 sm:p-5 hover:shadow-md transition-all duration-200 group">
      {/* Professional Editorial Meta Row: উৎস, বিভাগ, লেখক, তারিখ & Top-right Actions */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-zinc-100 dark:border-zinc-800/60">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
          {/* 1. উৎস (Source) Badge */}
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-0.5 sm:py-1 rounded-md text-[11px] font-medium border transition-colors",
              isAtTahreek
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/50 font-bengali"
                : isAlKawsar
                ? "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-400 dark:border-teal-800/50 font-bengali"
                : isAlItisam
                ? "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40 font-bengali"
                : "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/50 font-bengali"
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-semibold">
              {item.source === "at-tahreek"
                ? "আত-তাহরীক"
                : item.source === "al-kawsar"
                ? "আলকাউসার"
                : item.source === "al-itisam"
                ? "আল-ইতিসাম"
                : item.source}
            </span>
          </span>

          {/* 2. বিভাগ (Category) Badge */}
          {item.category && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:py-1 rounded-md text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/60 font-bengali">
              <span className="truncate max-w-[120px] sm:max-w-none">{item.category}</span>
            </span>
          )}

          {/* 3. লেখক / আলেম (Scholar / Author) Badge */}
          {item.scholar && (
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:py-1 rounded-md border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-800 dark:text-zinc-200 text-[11px] font-medium font-bengali">
              <GraduationCap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-medium truncate max-w-[110px] sm:max-w-none">{item.scholar}</span>
            </div>
          )}

          {/* 4. তারিখ (Date) */}
          {displayDate && (
            <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[11px] hidden sm:inline ml-1">
              &bull; {formatDate(displayDate)}
            </span>
          )}
        </div>

        {/* Soft Action Buttons: Copy & Modal Reader */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleCopyLink}
            aria-label={t.cards.copyLink}
            title={t.cards.copyLink}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-[11px] text-emerald-500 font-mono font-medium hidden sm:inline">
                  {t.cards.copied}
                </span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">
                  {t.cards.copyLink}
                </span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onOpenModal(item)}
            title={t.cards.openReaderModal}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Weighty Title Leading with font-semibold & crawlable link */}
      <h2 className="text-base sm:text-lg lg:text-xl font-bold text-zinc-900 dark:text-zinc-100 font-bengali-serif tracking-tight leading-snug mb-2">
        <Link
          href={`/fatwa/${fatwaSlug}`}
          prefetch={true}
          onClick={handleLinkClick}
          className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors block"
        >
          <SafeHighlight text={item.titleSnippet || item.title} />
        </Link>
      </h2>

      {/* Contextual Snippet with search-term highlighting and generous line height */}
      {!isExpanded && (
        <div className="text-sm text-zinc-600 dark:text-zinc-300 font-bengali leading-[1.8] line-clamp-3">
          <SafeHighlight text={item.snippet} />
        </div>
      )}

      {/* Expandable Accordion Body (Full Answer with Tailwind Typography) */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 space-y-4 animate-in fade-in-50 duration-150">
          {/* Detailed Question */}
          {item.question && item.question.trim() !== item.title.trim() && (
            <div className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 font-bengali leading-[1.82]">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">
                {t.cards.questionLabel}:
              </span>
              {item.question}
            </div>
          )}

          {/* Long-form Answer formatted with Tailwind Typography */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
              {t.cards.answerLabel}:
            </span>
            <div className="prose prose-zinc dark:prose-invert max-w-none text-sm sm:text-base font-bengali leading-[1.82] text-zinc-800 dark:text-zinc-200 whitespace-pre-line">
              {item.answer}
            </div>
          </div>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {item.tags.map((tg, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 font-bengali"
                >
                  <Tag className="h-3 w-3 text-zinc-400" />
                  {tg}
                </span>
              ))}
            </div>
          )}

          {/* Original Source Reference & Cryptographic Fingerprint */}
          <div className="pt-3 flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/60">
            <span className="font-mono text-[11px] text-zinc-400">
              SHA-256: {hashDisplay}...
            </span>
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4 transition-colors font-medium text-xs"
            >
              <span>{t.cards.viewSource} ({item.source})</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Accordion Expand / Collapse Control & Direct Dedicated Page Link */}
      <div className="mt-3 sm:mt-3.5 pt-2 sm:pt-2.5 flex items-center justify-between gap-2 border-t border-zinc-100/80 dark:border-zinc-800/40 text-xs">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 inline-flex items-center gap-1 transition-colors font-bengali"
          >
            {isExpanded ? (
              <>
                <span>{t.cards.collapse}</span>
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <span>{t.cards.readFull}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>

          <Link
            href={`/fatwa/${fatwaSlug}`}
            prefetch={true}
            onClick={handleLinkClick}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-bengali"
            title="আলাদা পেজে সম্পূর্ণ ফতোয়া পড়ুন"
          >
            <span className="hidden sm:inline">আলাদা পাতায় পড়ুন</span>
            <span className="sm:hidden">পূর্ণ পাতা</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {!isExpanded && (
          <button
            type="button"
            onClick={() => onOpenModal(item)}
            className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 inline-flex items-center gap-1 font-sans shrink-0"
          >
            <span className="hidden sm:inline">{t.cards.openReaderModal}</span>
            <span className="sm:hidden font-bengali">রিডার</span>
            <Maximize2 className="h-3 w-3" />
          </button>
        )}
      </div>

    </article>
  );
}
