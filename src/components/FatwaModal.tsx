"use client";

import React, { useEffect, useState } from "react";
import { SearchResultItem } from "@/types/fatwa";
import { formatDate, cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Tag,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";

interface FatwaModalProps {
  item: SearchResultItem | null;
  onClose: () => void;
}

export function FatwaModal({ item, onClose }: FatwaModalProps) {
  const { t, lang, isRTL } = useLanguage();
  const [copied, setCopied] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Lock scroll when open
  useEffect(() => {
    if (item) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [item]);

  if (!item) return null;

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("id", item.id);
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isAtTahreek = item.source.toLowerCase().includes("tahreek");
  const isAlItisam = item.source.toLowerCase().includes("itisam");
  const isAlKawsar = item.source.toLowerCase().includes("kawsar") || item.source.toLowerCase().includes("kausar");
  const displayDate = item.published_date || item.created_at;
  const fullHash = item.sha256_hash || "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Reader Modal Card */}
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-98 duration-150"
      >
        {/* Editorial Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-[#121215]/90 backdrop-blur">
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. উৎস (Source) */}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border",
                isAtTahreek
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60 font-bengali"
                  : isAlKawsar
                  ? "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800/60 font-bengali"
                  : isAlItisam
                  ? "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700 font-bengali"
                  : "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 font-bengali"
              )}
            >
              <span className="text-[10px] font-mono text-zinc-400 uppercase">উৎস:</span>
              <span className="font-semibold">
                {item.source === "at-tahreek"
                  ? "আত-তাহরীক"
                  : item.source === "al-kawsar"
                  ? "মাসিক আলকাউসার"
                  : item.source === "al-itisam"
                  ? "আল-ইতিসাম"
                  : item.source}
              </span>
            </span>

            {/* 2. বিভাগ (Category) */}
            {item.category && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 font-bengali">
                <span className="text-[10px] font-mono text-zinc-400 uppercase">বিভাগ:</span>
                <span>{item.category}</span>
              </span>
            )}

            {/* 3. লেখক / আলেম (Scholar / Author) */}
            {item.scholar && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-[11px] font-medium font-bengali">
                <GraduationCap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-[10px] font-mono text-zinc-400 uppercase">লেখক:</span>
                <span className="font-medium">{item.scholar}</span>
              </div>
            )}

            {/* 4. তারিখ (Date) */}
            {displayDate && (
              <span className="text-xs text-zinc-400 font-mono hidden sm:inline ml-1">
                &bull; {formatDate(displayDate)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              title={t.cards.copyLink}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-mono">{t.cards.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>{t.cards.copyLink}</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label={t.modal.close}
              title={t.modal.close}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Editorial Body */}
        <div className="overflow-y-auto px-6 sm:px-8 py-6 space-y-6">
          {/* Question Title */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-bengali-serif leading-tight">
              {item.title}
            </h1>
          </div>

          {/* Full Question */}
          {item.question && item.question.trim() !== item.title.trim() && (
            <div className="p-4 rounded-xl bg-zinc-50/90 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1.5">
                {t.cards.questionLabel}:
              </span>
              <p className="text-sm sm:text-base text-zinc-800 dark:text-zinc-200 font-bengali leading-relaxed">
                {item.question}
              </p>
            </div>
          )}

          {/* Answer with refined typography ergonomics */}
          <div className="space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 block">
              {t.modal.fullAnswer}:
            </span>
            <div className="prose prose-zinc dark:prose-invert max-w-none text-base sm:text-lg font-bengali leading-relaxed text-zinc-900 dark:text-zinc-100 whitespace-pre-line">
              {item.answer}
            </div>
          </div>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="pt-2">
              <span className="text-xs text-zinc-400 block mb-2 font-mono">{t.modal.tags}:</span>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 font-medium font-bengali"
                  >
                    <Tag className="h-3 w-3 text-zinc-400" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reader Footer with Cryptographic Provenance */}
        <div className="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#121215] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-mono text-[11px] text-zinc-400">
              SHA-256: {fullHash ? `${fullHash.slice(0, 16)}...${fullHash.slice(-8)}` : t.cards.verifiedBadge}
            </span>
            <span className="w-1 h-1 rounded-full bg-emerald-500" />
            <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">{t.cards.verifiedBadge}</span>
          </div>

          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <span>{t.modal.originalFatwa} ({item.source})</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
