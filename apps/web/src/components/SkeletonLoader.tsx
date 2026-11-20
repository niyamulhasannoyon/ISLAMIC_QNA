import React from "react";

export function SkeletonLoader() {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-3.5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/90 rounded-xl p-5 animate-pulse space-y-3"
        >
          {/* Header metadata row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-5 w-28 bg-zinc-200/80 dark:bg-zinc-800/80 rounded" />
              <div className="h-5 w-20 bg-zinc-200/60 dark:bg-zinc-800/60 rounded" />
              <div className="h-4 w-16 bg-zinc-100 dark:bg-zinc-800/40 rounded" />
            </div>
            <div className="h-5 w-12 bg-zinc-100 dark:bg-zinc-800/40 rounded" />
          </div>

          {/* Title line */}
          <div className="h-6 w-4/5 bg-zinc-200 dark:bg-zinc-800 rounded" />

          {/* Snippet body lines */}
          <div className="space-y-2 pt-1">
            <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800/50 rounded" />
            <div className="h-4 w-11/12 bg-zinc-100 dark:bg-zinc-800/50 rounded" />
          </div>

          {/* Bottom control bar */}
          <div className="pt-2 flex justify-between items-center border-t border-zinc-100 dark:border-zinc-800/40">
            <div className="h-4 w-28 bg-zinc-100 dark:bg-zinc-800/40 rounded" />
            <div className="h-4 w-20 bg-zinc-100 dark:bg-zinc-800/40 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
