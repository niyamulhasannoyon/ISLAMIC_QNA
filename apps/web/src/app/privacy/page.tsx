import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { getSiteUrl } from "@/lib/utils";
import { ShieldCheck, ArrowLeft, Lock, Database, Eye, FileText, CheckCircle2 } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/privacy`;

  return {
    title: "গোপনীয়তা নীতি (Privacy Policy) | ইসলামিক ফতোয়া ও গবেষণা আর্কাইভ",
    description: "ইসলামিক ফতোয়া ও গবেষণা আর্কাইভ (DeenQNA) এর গোপনীয়তা নীতি, ডাটা সুরক্ষা ও ব্যবহারের নিয়মাবলী।",
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: "গোপনীয়তা নীতি | ইসলামিক ফতোয়া ও গবেষণা আর্কাইভ",
      description: "DeenQNA প্ল্যাটফর্মের গোপনীয়তা নীতি ও ডাটা সুরক্ষা সংক্রান্ত তথ্যাবলী।",
      url: canonicalUrl,
      type: "website",
    },
  };
}

export default function PrivacyPolicyPage() {
  const siteUrl = getSiteUrl();

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfc] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-bengali transition-colors">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {/* Navigation Bar */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>মূল পাতায় ফিরে যান</span>
          </Link>

          <span className="text-xs text-zinc-400 font-mono">
            সর্বশেষ আপডেট: সেপ্টেম্বর ২০২৬
          </span>
        </nav>

        {/* Page Container */}
        <article className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800/90 rounded-2xl p-6 sm:p-10 shadow-sm space-y-8">
          {/* Main Title Header */}
          <header className="pb-6 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold mb-3">
              <Lock className="h-3.5 w-3.5" />
              <span>গোপনীয়তা ও ডাটা সুরক্ষা</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-bengali-serif">
              গোপনীয়তা নীতি (Privacy Policy)
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              ইসলামিক ফতোয়া ও গবেষণা প্ল্যাটফর্মে (DeenQNA) ব্যবহারকারীদের তথ্য সুরক্ষা ও গোপনীয়তা বজায় রাখার নির্দেশিকা।
            </p>
          </header>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>১. ভূমিকা ও সাধারণ নীতিমালা</span>
            </h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              ইসলামিক ফতোয়া ও গবেষণা ডিজিটাল আর্কাইভ (DeenQNA) আপনার ব্যক্তিগত গোপনীয়তাকে অত্যন্ত গুরুত্ব প্রদান করে। এই গোপনীয়তা নীতির মাধ্যমে আমরা স্পষ্ট করছি যে, প্ল্যাটফর্মটি ব্যবহার করার সময় আপনার কোন কোন তথ্য সংগৃহীত হয় এবং কীভাবে সেগুলো প্রক্রিয়াজাত বা সুরক্ষিত রাখা হয়।
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Eye className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>২. সংগৃহীত তথ্য ও ব্যবহারের উদ্দেশ্য</span>
            </h2>
            <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              <p>আমরা কেবল সেবা প্রদান ও মানোন্নয়নের লক্ষ্যে সীমিত পরিমাণে তথ্য গ্রহণ করি:</p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-600 dark:text-zinc-400">
                <li><strong className="text-zinc-800 dark:text-zinc-200">অনুসন্ধান কোয়েরি (Search Queries):</strong> ব্যবহারকারীর সার্চ অভিজ্ঞতা দ্রুততর করার জন্য এবং দ্রুত ফলাফল প্রদর্শনের জন্য সার্চ কোয়েরি তাৎক্ষণিকভাবে প্রসেস করা হয়।</li>
                <li><strong className="text-zinc-800 dark:text-zinc-200">একাউন্ট ও গুগল সাইন-ইন তথ্য:</strong> আপনি যদি ইমেইল বা Google Sign-In এর মাধ্যমে একাউন্ট খোলেন, তবে কেবল আপনার নাম, ইমেইল ঠিকানা ও প্রোফাইল ছবি সংরক্ষিত হয়।</li>
                <li><strong className="text-zinc-800 dark:text-zinc-200">পছন্দসমূহ (Preferences):</strong> থিম নির্বাচন (Dark/Light mode) ও ভাষা পছন্দ (বাংলা, ইংরেজি, আরবি) আপনার ডিভাইসে সংরক্ষিত থাকে।</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>৩. কুকি ও লোকাল স্টোরেজ (Cookies & Storage)</span>
            </h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              DeenQNA সিস্টেমে দুই ধরনের সেশন টেকনোলজি ব্যবহার করা হয়:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60">
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-1">ক্যাশ স্টোরেজ (SessionStorage)</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  পেজে দ্রুত নেভিগেশন ও ব্যাক বাটনে চাপলে সার্চ রেজাল্ট তাৎক্ষণিক প্রদর্শনের জন্য সেশন ক্যাশ ব্যবহৃত হয়।
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60">
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-1">সিকিউর সেশন কুকি (HTTP-Only)</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  ইউজার ও এডমিন সেশনের নিরাপত্তার জন্য এনক্রিপ্টেড HTTP-Only কুকি ব্যবহার করা হয় যা পুরোপুরি সুরক্ষিত।
                </div>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Lock className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>৪. গুগল সাইন-ইন ও থার্ড-পার্টি সেবা</span>
            </h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              আমরা গুগল অথেনটিকেশন (Google OAuth System) ব্যবহার করি যাতে ব্যবহারকারীরা নিরাপদভাবে এবং কোনো অতিরিক্ত পাসওয়ার্ড ঝামেলা ছাড়াই প্রবেশ করতে পারেন। আপনার গুগল পাসওয়ার্ড বা কোনো সংবেদনশীল তথ্য আমাদের সার্ভারে সংরক্ষিত হয় না।
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>৫. ক্রিপ্টোগ্রাফিক প্রামাণিকতা ও তথ্য সুরক্ষা</span>
            </h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              আমাদের আর্কাইভে থাকা প্রতিটি ফতোয়া ও গবেষণাপত্রের ক্রিপ্টোগ্রাফিক SHA-256 ফিঙ্গারপ্রিন্ট সংরক্ষিত থাকে, যা তথ্যের বিকৃতি রোধ করে এবং মূল সূত্রের সাথে সঠিকতা নিশ্চিত করে।
            </p>
          </section>

          {/* Footer Link section */}
          <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>DeenQNA &bull; সর্বস্বত্ব সংরক্ষিত</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-100 underline transition-colors">
                ব্যবহারের শর্তাবলী (Terms of Service)
              </Link>
              <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                হোমপেজ
              </Link>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}
