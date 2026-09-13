"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useLanguage } from "@/context/LanguageContext";
import {
  Home,
  Search,
  ArrowLeft,
  ArrowRight,
  FileQuestion,
  ShieldCheck,
  Compass,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function NotFound() {
  const { t, isRTL, lang } = useLanguage();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/");
    }
  };

  const handleTopicClick = (topicText: string) => {
    router.push(`/?q=${encodeURIComponent(topicText)}`);
  };

  // Popular topics for quick recovery links
  const popularTopics = t.empty.suggestions || [];

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfc] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors selection:bg-emerald-500/20 selection:text-emerald-200">
      {/* Platform Navigation Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-12 sm:py-20 relative overflow-hidden">
        {/* Background Ambient Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-emerald-500/10 dark:bg-emerald-500/15 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] bg-teal-500/10 dark:bg-teal-500/10 blur-[90px] rounded-full pointer-events-none -z-10" />

        <div className="w-full max-w-2xl mx-auto text-center space-y-6 sm:space-y-8 z-10">
          {/* Top Decorative Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-medium shadow-sm">
            <FileQuestion className="w-3.5 h-3.5 animate-bounce text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>ERROR 404 &bull; URL_NOT_FOUND</span>
          </div>

          {/* Large Stylish 404 Hero Visual & Text */}
          <div className="relative space-y-2">
            <h1 className="text-7xl sm:text-9xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-500 dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-600 font-mono select-none drop-shadow-sm">
              {t.notFound.code}
            </h1>
            <h2
              className={cn(
                "text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50",
                lang === "ar"
                  ? "font-arabic text-3xl"
                  : lang === "bn"
                  ? "font-bengali font-bold"
                  : "font-sans"
              )}
            >
              {t.notFound.title}
            </h2>
            <p
              className={cn(
                "max-w-lg mx-auto text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed",
                lang === "ar"
                  ? "font-arabic"
                  : lang === "bn"
                  ? "font-bengali"
                  : "font-sans"
              )}
            >
              {t.notFound.subtitle}
            </p>
          </div>

          {/* Direct Search Bar Component for 404 Recovery */}
          <div className="max-w-xl mx-auto w-full pt-2">
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center shadow-lg shadow-zinc-900/5 dark:shadow-black/40 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white/90 dark:bg-[#121215]/90 backdrop-blur-md focus-within:ring-2 focus-within:ring-emerald-500/40 focus-within:border-emerald-500 transition-all group overflow-hidden"
            >
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 dark:text-zinc-500 group-focus-within:text-emerald-500 transition-colors ml-3.5 sm:ml-4 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.notFound.searchPlaceholder}
                className={cn(
                  "w-full py-3.5 sm:py-4 pl-3 pr-24 bg-transparent text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none",
                  lang === "ar" ? "font-arabic" : lang === "bn" ? "font-bengali" : "font-sans"
                )}
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 sm:px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-600/20 shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">খুঁজুন</span>
              </button>
            </form>
          </div>

          {/* Core Navigation Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/"
              className={cn(
                "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-zinc-100 dark:text-zinc-900 font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5",
                lang === "ar" ? "font-arabic" : lang === "bn" ? "font-bengali" : "font-sans"
              )}
            >
              <Home className="h-4 w-4" />
              <span>{t.notFound.backHome}</span>
              {isRTL ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            </Link>

            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-[#121215]/70 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-sm transition-all duration-200"
            >
              <Compass className="h-4 w-4 text-emerald-500" />
              <span>পূর্বের পৃষ্ঠায় ফিরুন</span>
            </button>
          </div>

          {/* Quick Popular Topic Pills */}
          {popularTopics.length > 0 && (
            <div className="pt-6 border-t border-zinc-200/60 dark:border-zinc-800/60 space-y-3">
              <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className={lang === "ar" ? "font-arabic" : lang === "bn" ? "font-bengali" : "font-sans"}>
                  {t.notFound.popularTopicsTitle}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl mx-auto">
                {popularTopics.map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleTopicClick(sug.text)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-[#121215]/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition-all duration-150 group"
                  >
                    <BookOpen className="w-3 h-3 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                    <span className={lang === "ar" ? "font-arabic" : lang === "bn" ? "font-bengali" : "font-sans"}>
                      {sug.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Editorial Archive Footer */}
      <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 py-4 sm:py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className={lang === "ar" ? "font-arabic" : lang === "bn" ? "font-bengali" : "font-sans"}>
              {t.footer.archiveNotice}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 font-mono text-[10px] sm:text-[11px]">
            <span>STATUS: 404 NOT FOUND</span>
            <span>&bull;</span>
            <span className={lang === "ar" ? "font-arabic" : lang === "bn" ? "font-bengali" : "font-sans"}>
              {t.footer.apiInfo}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
