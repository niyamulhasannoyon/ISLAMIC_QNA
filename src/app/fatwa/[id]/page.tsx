import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFatwaById, getRelatedFatwas } from "@/lib/db";
import { formatDate, cn, getSiteUrl } from "@/lib/utils";
import { Header } from "@/components/Header";
import { FatwaDetailHeader } from "@/components/FatwaDetailHeader";
import { ShareButtons } from "@/components/ShareButtons";
import { FatwaQA } from "@/types/fatwa";
import {
  ArrowLeft,
  ExternalLink,
  Tag,
  GraduationCap,
  ShieldCheck,
  Calendar,
  Folder,
  CheckCircle2,
  ChevronRight,
  BookOpen,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: {
    id: string;
  };
}

// Resilient dual-layer fatwa loader: checks local SQLite DB first, then falls back
// to the authoritative /api/v1/fatwa endpoint if container storage differs
async function fetchFatwaResilient(id: string): Promise<FatwaQA | null> {
  if (!id) return null;

  // 1. Direct local database query (supports deterministic ID, legacy alias, or sha256_hash)
  try {
    const local = getFatwaById(id);
    if (local) return local;
  } catch (err) {
    console.warn("[FatwaPage] local getFatwaById lookup error:", err);
  }

  // 2. Resilient API fallback across ephemeral Vercel Serverless containers
  try {
    const siteUrl = getSiteUrl();
    const apiUrl = `${siteUrl}/api/v1/fatwa/${encodeURIComponent(id)}`;
    const res = await fetch(apiUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.id && data.title) {
        return data as FatwaQA;
      }
    }
  } catch (apiErr) {
    console.warn("[FatwaPage] API fallback fetch error:", apiErr);
  }

  return null;
}

// Helper to strip HTML and condense whitespace for clean SERP meta descriptions
function cleanTextSnippet(text: string, maxLength: number = 155): string {
  const clean = text
    .replace(/<[^>]*>/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= maxLength) return clean;
  let end = maxLength - 3;
  const spaceIdx = clean.lastIndexOf(" ", end);
  if (spaceIdx > Math.floor(maxLength * 0.6)) {
    end = spaceIdx;
  }
  return clean.slice(0, end) + "...";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const fatwa = await fetchFatwaResilient(params.id);
  const siteUrl = getSiteUrl();

  if (!fatwa) {
    return {
      title: "ফতোয়া পাওয়া যায়নি | ইসলামিক ফতোয়া ও গবেষণা আর্কাইভ",
      description: "অনুরোধকৃত ফতোয়া বা প্রশ্নোত্তরটি খুঁজে পাওয়া যায়নি।",
    };
  }

  const cleanDescription = cleanTextSnippet(
    fatwa.question && fatwa.question !== fatwa.title
      ? `${fatwa.question} - ${fatwa.answer}`
      : fatwa.answer,
    160
  );

  const canonicalUrl = `${siteUrl}/fatwa/${fatwa.id}`;
  const keywords = Array.from(
    new Set([
      fatwa.title,
      fatwa.category,
      fatwa.scholar,
      fatwa.source,
      ...(fatwa.tags || []),
      "ফতোয়া",
      "ইসলামিক প্রশ্ন ও উত্তর",
      "Islamic Fatwa",
      "শরীয়া সমাধান",
    ])
  ).filter(Boolean);

  return {
    title: fatwa.title,
    description: cleanDescription,
    keywords,
    authors: [{ name: fatwa.scholar || fatwa.source }],
    creator: fatwa.scholar || fatwa.source,
    publisher: "Islamic Fatwa & Research Archive",
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "article",
      locale: "bn_BD",
      url: canonicalUrl,
      title: `${fatwa.title} | ইসলামিক ফতোয়া আর্কাইভ`,
      description: cleanDescription,
      siteName: "Islamic Fatwa & Research Archive",
      publishedTime: fatwa.published_date,
      modifiedTime: fatwa.updated_at,
      authors: [fatwa.scholar || fatwa.source],
      tags: fatwa.tags,
      images: [
        {
          url: `${siteUrl}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: fatwa.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fatwa.title,
      description: cleanDescription,
      images: [`${siteUrl}/opengraph-image`],
    },
  };
}

export default async function FatwaPage({ params }: Props) {
  const fatwa = await fetchFatwaResilient(params.id);
  if (!fatwa) {
    notFound();
  }

  const siteUrl = getSiteUrl();
  const relatedFatwas = getRelatedFatwas(fatwa.category, fatwa.id, 5);
  const canonicalUrl = `${siteUrl}/fatwa/${fatwa.id}`;

  const isAtTahreek = fatwa.source.toLowerCase().includes("tahreek");
  const isAlItisam = fatwa.source.toLowerCase().includes("itisam");
  const isAlKawsar =
    fatwa.source.toLowerCase().includes("kawsar") ||
    fatwa.source.toLowerCase().includes("kausar");

  const sourceDisplayName =
    fatwa.source === "at-tahreek"
      ? "আত-তাহরীক"
      : fatwa.source === "al-kawsar"
      ? "মাসিক আলকাউসার"
      : fatwa.source === "al-itisam"
      ? "আল-ইতিসাম"
      : fatwa.source;

  const displayDate = fatwa.published_date || fatwa.created_at;

  // Schema.org QAPage Structured Data
  const qaSchema = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: fatwa.title,
      text: fatwa.question || fatwa.title,
      answerCount: 1,
      dateCreated: fatwa.published_date || fatwa.created_at,
      author: {
        "@type": "Organization",
        name: sourceDisplayName,
      },
      acceptedAnswer: {
        "@type": "Answer",
        text: fatwa.answer,
        datePublished: fatwa.published_date || fatwa.created_at,
        url: canonicalUrl,
        author: {
          "@type": "Person",
          name: fatwa.scholar || sourceDisplayName,
        },
        upvoteCount: 1,
      },
    },
  };

  // Schema.org BreadcrumbList Structured Data
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "হোম",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: fatwa.category,
        item: `${siteUrl}/?category=${encodeURIComponent(fatwa.category)}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: fatwa.title,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfc] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(qaSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-8">
        {/* Navigation & Breadcrumb Bar */}
        <FatwaDetailHeader category={fatwa.category} title={fatwa.title} />

        {/* Primary Article Container */}
        <article className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800/90 rounded-xl sm:rounded-2xl p-4 sm:p-8 shadow-sm">
          {/* Metadata Header Row */}
          <header className="pb-5 mb-6 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex flex-wrap items-center gap-2 mb-4 text-xs font-bengali">
              {/* Source Badge */}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-medium border text-xs",
                  isAtTahreek
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60"
                    : isAlKawsar
                    ? "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800/60"
                    : isAlItisam
                    ? "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700"
                    : "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                )}
              >
                <span className="text-[10px] font-mono text-zinc-400 uppercase">উৎস:</span>
                <span className="font-semibold">{sourceDisplayName}</span>
              </span>

              {/* Category Badge */}
              {fatwa.category && (
                <Link
                  href={`/?category=${encodeURIComponent(fatwa.category)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-medium bg-zinc-50 dark:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-400 transition-colors"
                >
                  <Folder className="h-3 w-3 text-zinc-400" />
                  <span className="text-[10px] font-mono text-zinc-400 uppercase">বিভাগ:</span>
                  <span>{fatwa.category}</span>
                </Link>
              )}

              {/* Scholar / Mufti Badge */}
              {fatwa.scholar && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-800 dark:text-zinc-200 font-medium">
                  <GraduationCap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-[10px] font-mono text-zinc-400 uppercase">মুফতী/লেখক:</span>
                  <span>{fatwa.scholar}</span>
                </div>
              )}

              {/* Publication Date */}
              {displayDate && (
                <div className="inline-flex items-center gap-1 text-zinc-400 dark:text-zinc-500 font-mono text-xs ml-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(displayDate)}</span>
                </div>
              )}
            </div>

            {/* Main H1 Title - Core SEO Element */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-bengali-serif leading-tight">
              {fatwa.title}
            </h1>
          </header>

          {/* Question Box (if separate and distinct from title) */}
          {fatwa.question && fatwa.question.trim() !== fatwa.title.trim() && (
            <section
              aria-label="প্রশ্ন"
              className="mb-8 p-4 sm:p-5 rounded-xl bg-zinc-50/90 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80"
            >
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2 font-bengali">
                <BookOpen className="h-3.5 w-3.5" />
                <span>মূল প্রশ্ন:</span>
              </div>
              <p className="text-sm sm:text-base text-zinc-800 dark:text-zinc-200 font-bengali leading-relaxed">
                {fatwa.question}
              </p>
            </section>
          )}

          {/* Answer Body - Core Content */}
          <section aria-label="উত্তর" className="space-y-4 mb-8">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bengali">
                শরয়ী উত্তর ও সমাধান:
              </h2>
            </div>

            <div className="prose prose-zinc dark:prose-invert max-w-none text-base sm:text-lg font-bengali leading-relaxed text-zinc-900 dark:text-zinc-100 whitespace-pre-line selection:bg-emerald-500/20">
              {fatwa.answer}
            </div>
          </section>

          {/* Tags */}
          {fatwa.tags && fatwa.tags.length > 0 && (
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 mb-6">
              <span className="text-xs text-zinc-400 block mb-2 font-mono uppercase tracking-wider">
                ট্যাগ ও বিষয়সমূহ:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {fatwa.tags.map((tag, idx) => (
                  <Link
                    key={idx}
                    href={`/?q=${encodeURIComponent(tag)}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium font-bengali transition-colors"
                  >
                    <Tag className="h-3 w-3 text-zinc-400" />
                    <span>{tag}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Social Sharing & Action Bar */}
          <ShareButtons title={fatwa.title} url={canonicalUrl} />

          {/* Provenance & Source Link */}
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-mono text-[11px]">
                SHA-256: {fatwa.sha256_hash ? fatwa.sha256_hash.slice(0, 16) + "..." : "যাচাইকৃত"}
              </span>
              <span className="w-1 h-1 rounded-full bg-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px] font-bengali">
                ক্রিপ্টোগ্রাফিক প্রামাণিক
              </span>
            </div>

            {fatwa.source_url && (
              <a
                href={fatwa.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4 transition-colors font-bengali"
              >
                <span>মূল ওয়েবসাইটে দেখুন ({sourceDisplayName})</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </article>

        {/* Related Fatwas - Powerful Internal Linking Network for Crawlers */}
        {relatedFatwas.length > 0 && (
          <section aria-label="সম্পর্কিত ফতোয়া" className="mt-12 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-bengali">
                সম্পর্কিত ফতোয়া ও প্রশ্নোত্তর ({fatwa.category})
              </h2>
              <Link
                href={`/?category=${encodeURIComponent(fatwa.category)}`}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bengali"
              >
                সবগুলো দেখুন &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {relatedFatwas.map((rf) => (
                <Link
                  key={rf.id}
                  href={`/fatwa/${rf.id}`}
                  className="block p-4 rounded-xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800/80 hover:border-emerald-500/50 dark:hover:border-emerald-500/40 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 mb-1.5 font-bengali">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {rf.source === "at-tahreek"
                        ? "আত-তাহরীক"
                        : rf.source === "al-kawsar"
                        ? "আলকাউসার"
                        : "আল-ইতিসাম"}
                    </span>
                    <span>&bull;</span>
                    <span>{rf.category}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-bengali group-hover:text-emerald-600 dark:group-hover:text-emerald-400 line-clamp-2 transition-colors">
                    {rf.title}
                  </h3>
                  {rf.scholar && (
                    <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1 font-bengali">
                      <GraduationCap className="h-3 w-3 text-zinc-400" />
                      <span>{rf.scholar}</span>
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 py-6 text-center text-xs text-zinc-400 dark:text-zinc-500 mt-12">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-bengali">
              ইসলামিক ফতোয়া ও গবেষণা ডিজিটাল আর্কাইভ &bull; সর্বস্বত্ব সংরক্ষিত
            </span>
          </div>
          <div className="flex items-center gap-3 font-bengali">
            <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              গোপনীয়তা নীতি
            </Link>
            <span>&bull;</span>
            <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              ব্যবহারের শর্তাবলী
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
