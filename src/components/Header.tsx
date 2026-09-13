"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

export function Header() {
  const [isDark, setIsDark] = useState(true);
  const { t, lang } = useLanguage();

  useEffect(() => {
    const root = document.documentElement;
    if (root.classList.contains("dark")) {
      setIsDark(true);
    } else {
      setIsDark(false);
    }
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove("dark");
      setIsDark(false);
    } else {
      root.classList.add("dark");
      setIsDark(true);
    }
  };

  return (
    <header className="border-b border-zinc-200/70 dark:border-zinc-800/80 bg-white/80 dark:bg-[#09090b]/85 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-5xl mx-auto px-3.5 sm:px-6 h-13 sm:h-14 flex items-center justify-between gap-2">
        {/* Brand & Editorial Archive Masthead */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0 shrink hover:opacity-90 transition-opacity">
          <Logo size="sm" />
          <div className="flex items-baseline gap-2 min-w-0">
            {/* Desktop Full Brand Title */}
            <span
              className={cn(
                "hidden sm:inline font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 whitespace-nowrap",
                lang === "ar" ? "font-arabic text-base" : lang === "bn" ? "font-bengali font-bold" : "font-sans"
              )}
            >
              {t.header.brandTitle}
            </span>
            {/* Mobile Concise Brand Title (Prevents multi-line wrapping) */}
            <span
              className={cn(
                "sm:hidden font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 truncate whitespace-nowrap",
                lang === "ar" ? "font-arabic text-sm" : lang === "bn" ? "font-bengali font-bold" : "font-sans"
              )}
            >
              {t.header.brandShortTitle}
            </span>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono hidden md:inline-block">
              {t.header.brandSubtitle}
            </span>
          </div>
        </Link>

        {/* Right Action: Language Switcher, Status Pill & Theme Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Multi-language Selector (Bengali, English, Arabic) */}
          <LanguageSwitcher />

          {/* Status Pill with subtle warm emerald accent - hidden on mobile to conserve space */}
          <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 text-[11px] font-mono font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="hidden lg:inline">{t.header.archiveStatus}</span>
            <span className="lg:hidden">{t.header.archiveStatusShort}</span>
          </div>

          <button
            onClick={toggleTheme}
            aria-label={t.header.toggleTheme}
            title={t.header.toggleTheme}
            className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors shrink-0"
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
