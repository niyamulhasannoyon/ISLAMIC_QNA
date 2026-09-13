"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Language } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";
import { Globe } from "lucide-react";

interface LanguageOption {
  code: Language;
  label: string;
  nativeName: string;
  fontClass?: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: "bn", label: "বাং", nativeName: "বাংলা", fontClass: "font-bengali" },
  { code: "en", label: "EN", nativeName: "English", fontClass: "font-sans" },
  { code: "ar", label: "عربي", nativeName: "العربية", fontClass: "font-arabic" },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={cn(
        "inline-flex items-center p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900/90 text-xs",
        className
      )}
      role="group"
      aria-label="Language Switcher"
    >
      <div className="px-1.5 text-zinc-400 dark:text-zinc-500 hidden sm:flex items-center">
        <Globe className="h-3 w-3" />
      </div>
      {LANGUAGES.map((item) => {
        const isActive = lang === item.code;
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => setLang(item.code)}
            title={item.nativeName}
            className={cn(
              "px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-medium transition-all duration-150 relative",
              item.fontClass,
              isActive
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm font-semibold border border-zinc-200/60 dark:border-zinc-700/60"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/40"
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
