import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getFatwaCount, getFacets } from '@/lib/db';
import { Header } from '@/components/Header';
import { Database, ShieldAlert, RefreshCw, BarChart3, Lock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'এডমিন পোর্টাল | ইসলামিক ফতোয়া আর্কাইভ',
  description: 'সিস্টেম এডমিন পোর্টাল ও ডাটাবেজ ড্যাশবোর্ড',
};

export default async function AdminPage() {
  const count = getFatwaCount();
  const facets = getFacets();

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfc] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-5 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
              <Lock className="h-3.5 w-3.5" />
              <span>RBAC System Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-bengali">এডমিন কন্ট্রোল ড্যাশবোর্ড</h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bengali">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>এডমিন সেশন সক্রিয়</span>
            </span>
          </div>
        </div>

        {/* System Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8 font-bengali">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl shadow-sm">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">মোট ভেরিফাইড ফতোয়া</span>
              <Database className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">
              {count.toLocaleString()}
            </p>
          </div>

          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl shadow-sm">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">উৎস পত্রিকা সংখ্যা</span>
              <BarChart3 className="h-4 w-4 text-teal-600" />
            </div>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">
              {(facets.sources || []).length}
            </p>
          </div>

          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl shadow-sm">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">স্কলার / লেখক প্যানেল</span>
              <ShieldAlert className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">
              {(facets.scholars || []).length}
            </p>
          </div>
        </div>

        {/* Administration Actions */}
        <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm mb-8 font-bengali">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-emerald-600" />
            <span>সিস্টেম ম্যানেজমেন্ট ও ইনজেশন টুলস</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-200 mb-1">
                ইনক্রিমেন্টাল ডাটা ইনজেশন এপিআই Endpoint
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-3">
                GitHub Actions থেকে স্বয়ংক্রিয়ভাবে ফতোয়া আপডেট গ্রহণ করতে Bearer Secret Token ব্যবহার করুন।
              </p>
              <code className="block bg-zinc-900 text-emerald-400 font-mono text-[11px] p-2.5 rounded border border-zinc-800 overflow-x-auto">
                POST /api/v1/ingest
                <br />
                Authorization: Bearer INGESTION_SECRET_TOKEN
              </code>
            </div>

            <div className="p-4 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-200 mb-1">
                Vector RAG & AI Semantic Assistant
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-3">
                Mistral AI ও Atlas Vector Search এর মাধ্যমে জেনারেটিভ উত্তর তৈরি করতে API কল ব্যবহার করুন।
              </p>
              <code className="block bg-zinc-900 text-emerald-400 font-mono text-[11px] p-2.5 rounded border border-zinc-800 overflow-x-auto">
                POST /api/v1/rag
                <br />
                Content-Type: application/json
              </code>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
