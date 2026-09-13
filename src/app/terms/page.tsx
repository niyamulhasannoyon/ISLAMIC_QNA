import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { getSiteUrl } from "@/lib/utils";
import { ShieldCheck, ArrowLeft, FileText, BookOpen, ExternalLink, Scale, CheckCircle2 } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/terms`;

  return {
    title: "ব্যবহারের শর্তাবলী (Terms of Service) | ইসলামিক ফতোয়া ও গবেষণা আর্কাইভ",
    description: "ইসলামিক ফতোয়া ও গবেষণা আর্কাইভ (DeenQNA) ব্যবহারের শর্তাবলী, মেধা স্বত্ব ও দিকনির্দেশনা।",
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: "ব্যবহারের শর্তাবলী | ইসলামিক ফতোয়া ও গবেষণা আর্কাইভ",
      description: "DeenQNA পোর্টালে ফতোয়া ও গবেষণা ব্যবহারের নিয়মাবলী ও শরয়ী দায়িত্বের শর্তাবলী।",
      url: canonicalUrl,
      type: "website",
    },
  };
}

export default function TermsOfServicePage() {
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
              <Scale className="h-3.5 w-3.5" />
              <span>নীতিমালা ও শর্তাবলী</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-bengali-serif">
              ব্যবহারের শর্তাবলী (Terms of Service)
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              DeenQNA প্ল্যাটফর্ম ও ফতোয়া আর্কাইভ ব্যবহারের সাধারণ নিয়মাবলী ও আইনি দিকনির্দেশনা।
            </p>
          </header>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>১. শর্তাবলী সম্মতি</span>
            </h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              ইসলামিক ফতোয়া ও গবেষণা ডিজিটাল আর্কাইভ (DeenQNA) ব্রাউজ, অনুসন্ধান বা ব্যবহার করার মাধ্যমে আপনি এই ব্যবহারের শর্তাবলীর সাথে সম্পূর্ণ সম্মত হচ্ছেন। আপনি যদি এই শর্তাবলীতে সম্মত না হন, তবে অনুগ্রহ করে সেবাটি গ্রহণ করা থেকে বিরত থাকুন।
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>২. ফতোয়া ও গবেষণার উৎস এবং প্রামাণিকতা</span>
            </h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              এই আর্কাইভে প্রকাশিত সকল প্রশ্ন, উত্তর ও গবেষণা নির্ভরযোগ্য ইসলামী উৎসসমূহ (যেমনঃ মাসিক আলকাউসার, মাসিক আত-তাহরীক, আল-ইতিসাম ইত্যাদি) থেকে সরাসরি সংগ্রহ করা হয়েছে।
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400 pl-2">
              <li>আর্কাইভে সংরক্ষিত প্রতিটি ফতোয়ার সাথে মূল উফৎস ও সংশ্লিষ্ট মুফতী/লেখকের নাম প্রদান করা রয়েছে।</li>
              <li>ফতোয়ার ক্রিপ্টোগ্রাফিক SHA-256 ফিঙ্গারপ্রিন্ট দ্বারা তথ্যের অবিকলতা নিশ্চিত করা হয়।</li>
              <li>ব্যক্তিগত আমল বা শরয়ী মাসআলা বোঝার ক্ষেত্রে প্রয়োজনে সরাসরি অভিজ্ঞ আলেম ও মুফতী সাহেবের শরণাপন্ন হওয়ার পরামর্শ দেওয়া হয়।</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>৩. মেধা স্বত্ব ও মূল উৎসের রেফারেন্স</span>
            </h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              আর্কাইভটি কেবল ইসলামিক গবেষণা, শিক্ষা ও দাওয়াহ কাজের সুবিধার উদ্দেশ্যে তৈরি। সকল ফতোয়া ও আর্টিকেলের মূল মেধা স্বত্ব তাদের নিজ নিজ মূল প্রকাশক ও ফতোয়া বোর্ডের নিকট সংরক্ষিত। যেকোনো ফতোয়া উদ্ধৃত করার সময় মূল উৎসের রেফারেন্স প্রদান করা বাধ্যতামূলক।
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>৪. একাউন্ট ও সিকিউরিটি দায়িত্ব</span>
            </h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              ব্যবহারকারীগণ নিজেদের একাউন্টের নিরাপত্তা বজায় রাখতে দায়ী থাকবেন। সিস্টেমে অননুমোদিত অ্যাক্সেস, বট স্প্যামিং বা অনৈতিক উপায়ে ডাটাবেজ স্ক্র্যাপ করার চেষ্টা করা কঠোরভাবে নিষিদ্ধ।
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>৫. শর্তাবলীর পরিমার্জন</span>
            </h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              DeenQNA কতৃপক্ষ যেকোনো সময় এই শর্তাবলী আপডেট বা পরিমার্জন করার অধিকার সংরক্ষণ করে। যেকোনো পরিবর্তনের পর সাইট ব্যবহার অব্যাহত রাখলে পরিবর্তিত শর্তাবলী গ্রহণযোগ্য বলে বিবেচিত হবে।
            </p>
          </section>

          {/* Footer Link section */}
          <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>DeenQNA &bull; সর্বস্বত্ব সংরক্ষিত</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-100 underline transition-colors">
                গোপনীয়তা নীতি (Privacy Policy)
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
