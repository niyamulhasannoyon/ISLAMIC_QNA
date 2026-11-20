import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { getSiteUrl } from "@/lib/utils";
import {
  ShieldCheck,
  ArrowLeft,
  BookOpen,
  ExternalLink,
  GraduationCap,
  AlertTriangle,
  Scale,
  FileCheck2,
  Building2,
} from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/sources`;

  return {
    title: "উৎস ও বিষয়বস্তু ঘোষণা (Sources & Methodology) | Deen QnA",
    description:
      "Deen QnA প্ল্যাটফর্মের ফতোয়া সংগ্রহের উৎস, ক্রিপ্টোগ্রাফিক যাচাইকরণ পদ্ধতি এবং শরয়ী পরামর্শের সীমাবদ্ধতা সম্পর্কিত ঘোষণা।",
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "bn-BD": canonicalUrl,
        bn: canonicalUrl,
        en: `${canonicalUrl}?lang=en`,
        ar: `${canonicalUrl}?lang=ar`,
        "x-default": canonicalUrl,
      },
    },
    openGraph: {
      title: "উৎস ও বিষয়বস্তু ঘোষণা | Deen QnA",
      description:
        "Deen QnA প্ল্যাটফর্মে প্রদর্শিত ফতোয়া ও গবেষণা আর্কাইভের নির্ভরযোগ্য উৎসসমূহ ও শরয়ী নীতিমালা।",
      url: canonicalUrl,
      type: "website",
    },
  };
}

export default function SourcesPage() {
  const siteUrl = getSiteUrl();

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfc] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-bengali transition-colors">
      <Header />

      <main id="main-content" tabIndex={-1} className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-12 focus:outline-none">
        {/* Navigation Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>মূল পাতায় ফিরে যান</span>
          </Link>

          <span className="text-xs text-zinc-400 font-mono">
            সর্বশেষ পরিমার্জন: নভেম্বর ২০২৬
          </span>
        </nav>

        {/* Primary Article Container */}
        <article className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800/90 rounded-2xl p-6 sm:p-10 shadow-sm space-y-8">
          {/* Header */}
          <header className="pb-6 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold mb-3">
              <BookOpen className="h-3.5 w-3.5" />
              <span>প্রামাণিকতা ও উৎস নির্দেশিকা</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-bengali-serif">
              উৎস ও বিষয়বস্তু ঘোষণা (Sources & Methodology)
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Deen QnA প্ল্যাটফর্মে সংগৃহীত ফতোয়াসমূহের উৎস, ডিজিটাল আর্কাইভিং প্রক্রিয়া ও শরয়ী ব্যবহারের নীতিমালা।
            </p>
          </header>

          {/* Critical Scholar Disclaimer Callout */}
          <section className="p-5 sm:p-6 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/90 dark:border-amber-900/40 text-amber-950 dark:text-amber-200 leading-relaxed">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h2 className="text-base font-bold text-amber-900 dark:text-amber-100">
                  জরুরী শরয়ী ঘোষণা ও সতর্কতা (Essential Scholar Advisory)
                </h2>
                <p className="text-sm">
                  Deen QnA কোনো স্বাধীন ফতোয়া বোর্ড বা মুফতী প্রতিষ্ঠান নয়। এই প্ল্যাটফর্মে প্রদর্শিত সকল প্রশ্নোত্তর ও ফতোয়া নির্দিষ্ট স্বনামধন্য ও নির্ভরযোগ্য সাময়িকী ও গবেষণা প্রকাশনা থেকে সতর্কতার সাথে সংগৃহীত ও ডিজিটালাইজড করা হয়েছে।
                </p>
                <p className="text-sm font-semibold">
                  এই প্ল্যাটফর্ম কোনো অবস্থাতেই কোনো বিজ্ঞ আলেম বা মুফতীর সাথে সরাসরি ব্যক্তিগত পরামর্শের বিকল্প নয়।
                </p>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/80">
                  বিশেষ করে বিবাহ, তালাক, উত্তরাধিকার সম্পত্তি বণ্টন, ফৌজদারি বিচার কিংবা জটিল বাণিজ্যিক লেনদেনের ক্ষেত্রে ব্যক্তিগত পরিস্থিতি পুঙ্খানুপুঙ্খ মূল্যায়নের প্রয়োজন হয়। অতএব, যেকোনো বাস্তবমুখী সিদ্ধান্তের পূর্বে নির্ভরযোগ্য মুফতীর নিকট সরাসরি উপস্থিত হয়ে সমাধান গ্রহণ করা ওয়াজিব।
                </p>
              </div>
            </div>
          </section>

          {/* Section 1: Named Archival Sources */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
              <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                ১. আমাদের অনুমোদিত উৎস ও প্রকাশনাসমূহ
              </h2>
            </div>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              Deen QnA-তে অনিয়ন্ত্রিত বা অজ্ঞাত কোনো সূত্র থেকে তথ্য সন্নিবেশ করা হয় না। বর্তমান আর্কাইভে নিচের প্রধান উৎসসমূহ অন্তর্ভুক্ত:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 mb-2">
                  মাসিক আত-তাহরীক (Monthly At-Tahreek)
                </span>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  রাজশাহী থেকে প্রকাশিত সুপরিচিত ইসলামিক গবেষণা পত্রিকা। কুরআন ও সহীহ হাদীসের সরাসরি দলীলভিত্তিক তাহক্বীক্ব ও প্রশ্নোত্তর সমৃদ্ধ ফতোয়া বিভাগ।
                </p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 mb-2">
                  মাসিক আলকাউসার (Monthly Al-Kawsar)
                </span>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  মারকাযুদ দাওয়াহ আল-ইসলামিয়া ঢাকা কর্তৃক প্রকাশিত আন্তর্জাতিক মানের ফিকহী সাময়িকী। ফিকহুল হাদীস ও ফিকহে হানাফীর প্রামাণিক ফতোয়া ও প্রশ্নোত্তর।
                </p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 mb-2">
                  মাসিক আল-ইতিসাম (Monthly Al-Itisam)
                </span>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  বাংলাদেশ আহলেহাদীছ যুবসংঘের কেন্দ্রীয় মুখপত্র। সমসাময়িক বিষয়াবলী এবং সমাজ ও পারিবারিক বিষয়ে দালিলিক ফতোয়া ও ফিকহী নির্দেশনা।
                </p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 mb-2">
                  বিজ্ঞ মুফতী ও গবেষকবৃন্দ
                </span>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  প্রতিটি ফতোয়ার সাথে সংশ্লিষ্ট বিজ্ঞ মুফতী, বোর্ডের ফতোয়া সম্পাদক বা উত্তরদাতার নাম স্বচ্ছভাবে উল্লেখ করা হয়েছে।
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Cryptographic Data Integrity */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
              <FileCheck2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                ২. ক্রিপ্টোগ্রাফিক প্রামাণিকতা ও ডাটা নিরাপত্তা
              </h2>
            </div>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              তথ্য বিকৃতি বা অননুমোদিত সম্পাদনা রোধে প্রতিটি ফতোয়ার জন্য স্বয়ংক্রিয় ক্রিপ্টোগ্রাফিক SHA-256 হ্যাশ গণনা করা হয়:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-zinc-600 dark:text-zinc-400 pl-2">
              <li>
                <strong className="text-zinc-800 dark:text-zinc-200">অপরিবর্তনীয়তা:</strong> মূল উৎস থেকে সংগৃহীত প্রশ্নোত্তর সিস্টেমে প্রবেশের সময় অপরিবর্তনীয় ডিজিটাল হ্যাশ তৈরি করে সংরক্ষণ করা হয়।
              </li>
              <li>
                <strong className="text-zinc-800 dark:text-zinc-200">স্বচ্ছতা ও অডিট যোগ্যতা:</strong> পাঠকগণ প্রতিটি ফতোয়ার বিস্তারিত পাতায় SHA-256 ফিঙ্গারপ্রিন্ট দেখতে পারেন এবং মূল প্রকাশনীর লিঙ্কের সাথে তুলনা করতে পারেন।
              </li>
              <li>
                <strong className="text-zinc-800 dark:text-zinc-200">নিরাপদ স্যানিটাইজেশন:</strong> যেকোনো স্ক্রিপ্ট ইঞ্জেকশন প্রতিরোধে অনুসন্ধান হাইলাইট ব্যতীত অন্য সকল বিপজ্জনক এইচটিএমএল ট্যাগ কঠোরভাবে স্যানিটাইজ করা হয়।
              </li>
            </ul>
          </section>

          {/* Section 3: Copyright and Fair Use */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
              <Scale className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                ৩. মেধা স্বত্ব ও উন্মুক্ত দাওয়াহ নীতিমালা
              </h2>
            </div>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              Deen QnA একটি অলাভজনক ও শিক্ষামূলক ডিজিটাল লাইব্রেরি উদ্যোগ। ফতোয়াসমূহের মূল মেধা স্বত্ব সংশ্লিষ্ট পত্রিকা ও প্রকাশনা কর্তৃপক্ষের নিকট সংরক্ষিত। কোনো ফতোয়া উদ্ধৃত করার ক্ষেত্রে মূল প্রকাশনার নাম ও রেফারেন্স উল্লেখ করা বাধ্যতামূলক।
            </p>
          </section>

          {/* Section 4: Contact & Corrections */}
          <section className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                কোনো ভুল বা তথ্যের অসঙ্গতি লক্ষ্য করেছেন?
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                আমরা তথ্যের নির্ভুলতা রক্ষায় সর্বোচ্চ সচেষ্ট। যেকোনো ত্রুটি সংশোধন বা পর্যালোচনার জন্য যোগাযোগ করুন।
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shrink-0"
            >
              <span>সংশোধন বা মতামত জানান</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </section>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 py-6 text-center text-xs text-zinc-400 dark:text-zinc-500 mt-12">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>ইসলামিক ফতোয়া ও গবেষণা ডিজিটাল আর্কাইভ &bull; সর্বস্বত্ব সংরক্ষিত</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              গোপনীয়তা নীতি
            </Link>
            <span>&bull;</span>
            <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              ব্যবহারের শর্তাবলী
            </Link>
            <span>&bull;</span>
            <Link href="/sources" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors font-semibold text-emerald-600 dark:text-emerald-400">
              উৎস ও ঘোষণা
            </Link>
            <span>&bull;</span>
            <Link href="/contact" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              যোগাযোগ
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
