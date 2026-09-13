"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Folder } from "lucide-react";

interface FatwaDetailHeaderProps {
  category: string;
  title: string;
}

export function FatwaDetailHeader({ category, title }: FatwaDetailHeaderProps) {
  const router = useRouter();
  const [backUrl, setBackUrl] = useState<string>("/");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("fatwa_last_search_url");
      if (saved) {
        setBackUrl(saved);
      }
    }
  }, []);

  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(backUrl);
    }
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 sm:mb-6 flex items-center justify-between flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400"
    >
      <div className="flex items-center gap-1.5 flex-wrap font-bengali">
        <a
          href={backUrl}
          onClick={handleBackClick}
          className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors font-medium cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>ফিরে যান</span>
        </a>
        <ChevronRight className="h-3 w-3 text-zinc-400" />
        <Link
          href={`/?category=${encodeURIComponent(category)}`}
          className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors inline-flex items-center gap-1"
        >
          <Folder className="h-3 w-3 text-zinc-400" />
          <span>{category}</span>
        </Link>
        <ChevronRight className="h-3 w-3 text-zinc-400" />
        <span className="text-zinc-700 dark:text-zinc-300 font-medium truncate max-w-[150px] sm:max-w-xs">
          {title}
        </span>
      </div>

      <a
        href={backUrl}
        onClick={handleBackClick}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-bengali cursor-pointer"
      >
        <span>অনুসন্ধান তালিকা</span>
      </a>
    </nav>
  );
}
