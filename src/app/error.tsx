'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RotateCcw, Home as HomeIcon } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application Error Boundary caught error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#fcfcfc] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-bengali">
      <div className="max-w-md w-full bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 mb-4 shadow-inner">
          <AlertCircle className="h-7 w-7" />
        </div>

        <h1 className="text-xl font-bold mb-2">
          একটি অপ্রত্যাশিত সমস্যা দেখা দিয়েছে
        </h1>

        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
          পৃষ্ঠাটি রিলোড করে পুনরায় চেষ্টা করুন। সমস্যাটি অব্যাহত থাকলে হোমপেজে ফিরে যান।
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>পুনরায় চেষ্টা করুন</span>
          </button>

          <Link
            href="/"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/';
              }
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-all"
          >
            <HomeIcon className="h-3.5 w-3.5" />
            <span>মূল পাতায় ফিরে যান</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
