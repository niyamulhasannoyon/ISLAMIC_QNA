import React from "react";
import { Header } from "@/components/Header";

export default function FatwaLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfc] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-8">
        {/* Navigation & Breadcrumb Bar Skeleton */}
        <div className="flex items-center justify-between gap-4 mb-4 sm:mb-6 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="h-8 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
            <div className="h-4 w-4 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-5 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
          </div>
          <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
        </div>

        {/* Primary Article Container Skeleton */}
        <article className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800/90 rounded-xl sm:rounded-2xl p-4 sm:p-8 shadow-sm animate-pulse">
          {/* Metadata Header Row */}
          <header className="pb-5 mb-6 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {/* Source Badge */}
              <div className="h-6 w-24 bg-emerald-500/15 dark:bg-emerald-950/40 rounded-md border border-emerald-500/20" />
              {/* Category Badge */}
              <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-800/80 rounded-md" />
              {/* Scholar Badge */}
              <div className="h-6 w-36 bg-zinc-200 dark:bg-zinc-800/80 rounded-md" />
              {/* Date */}
              <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded ml-2" />
            </div>

            {/* Main Title Skeleton (H1) */}
            <div className="space-y-2.5 max-w-3xl">
              <div className="h-8 sm:h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-full" />
              <div className="h-8 sm:h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-3/4" />
            </div>
          </header>

          {/* Question Box Skeleton */}
          <div className="mb-8 p-4 sm:p-5 rounded-xl bg-zinc-50/90 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2">
            <div className="h-4 w-20 bg-emerald-500/20 rounded" />
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6" />
          </div>

          {/* Answer Body Skeleton */}
          <section className="space-y-4 mb-8">
            <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded pb-2" />
            <div className="space-y-3 pt-2">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-11/12" />
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-4/5" />
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-9/12" />
            </div>
          </section>

          {/* Tags Skeleton */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex gap-2">
            <div className="h-6 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
            <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
            <div className="h-6 w-14 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
          </div>
        </article>

        {/* Related Fatwas Skeleton */}
        <section className="mt-12 space-y-4 animate-pulse">
          <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="h-28 rounded-xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800/80 p-4" />
            <div className="h-28 rounded-xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800/80 p-4" />
          </div>
        </section>
      </main>
    </div>
  );
}
