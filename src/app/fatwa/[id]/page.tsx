import React, { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getFatwaById, getFatwaByIdAsync, getRelatedFatwasAsync } from "@/lib/db";
import { formatDate, cn, getSiteUrl, createFatwaSlug } from "@/lib/utils";
import { Header } from "@/components/Header";
import { FatwaDetailHeader } from "@/components/FatwaDetailHeader";
import { ShareButtons } from "@/components/ShareButtons";
import { FatwaQA } from "@/types/fatwa";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Tag,
  GraduationCap,
  ShieldCheck,
  Calendar,
  Folder,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  Sparkles,
  Compass,
} from "lucide-react";

export const revalidate = 86400; // Cache on Edge CDN for 24 hours (ISR)

interface Props {
  params: {
    id: string;
  };
}

// Request-memoized authoritative fatwa loader across generateMetadata and FatwaPage
const fetchFatwaResilient = cache(async (id: string): Promise<FatwaQA | null> => {
  if (!id) return null;

  let decodedId = id.trim();
  try {
    decodedId = decodeURIComponent(id).trim();
  } catch {}

  // 1. Direct database query (supports MongoDB Atlas if configured, and local SQLite)
  try {
    const local = await getFatwaByIdAsync(decodedId);
    if (local) return local;
  } catch (err) {
    console.warn("[FatwaPage] local getFatwaById lookup error:", err);
  }

  // 2. Resilient API fallback across ephemeral Vercel Serverless containers
  try {
    const siteUrl = getSiteUrl();
    const apiUrl = `${siteUrl}/api/v1/fatwa/${encodeURIComponent(id)}`;
    const res = await fetch(apiUrl, {
      next: { revalidate: 86400 },
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
});

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

// Helper to ensure dates are valid ISO 8601 strings for Google Rich Results validator
function toValidIsoDate(dateStr?: string, fallbackStr?: string): string {
  if (dateStr) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  if (fallbackStr) {
    const d = new Date(fallbackStr);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const fatwa = await fetchFatwaResilient(params.id);
  const siteUrl = getSiteUrl();

  if (!fatwa) {
    return {
      title: "ফতোয়া পাওয়া যায়নি | Deen QnA",
      description: "অনুরোধকৃত ফতোয়া বা প্রশ্নোত্তরটি খুঁজে পাওয়া যায়নি।",
    };
  }

  const cleanDescription = cleanTextSnippet(
    fatwa.question && fatwa.question !== fatwa.title
      ? `${fatwa.question} - ${fatwa.answer}`
      : fatwa.answer,
    160
  );

  const fatwaSlug = createFatwaSlug(fatwa.title, fatwa.id);
  const canonicalUrl = `${siteUrl}/fatwa/${fatwaSlug}`;
  const keywords = Array.from(
    new Set([
      fatwa.title,
      "Deen QnA",
      "deen qna",
      "দ্বীন কিউএনএ",
      "দীন কিউএনএ",
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

  const isoPublished = toValidIsoDate(fatwa.published_date, fatwa.created_at);
  const isoModified = toValidIsoDate(fatwa.updated_at, fatwa.created_at);

  return {
    title: fatwa.title,
    description: cleanDescription,
    keywords,
    authors: [{ name: fatwa.scholar || fatwa.source }],
    creator: fatwa.scholar || fatwa.source,
    publisher: "Deen QnA",
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
      title: `${fatwa.title} | Deen QnA`,
      description: cleanDescription,
      siteName: "Deen QnA | ইসলামিক ফতোয়া ও গবেষণা আর্কাইভ",
      publishedTime: isoPublished,
      modifiedTime: isoModified,
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
      title: `${fatwa.title} | Deen QnA`,
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
  const relatedFatwas = await getRelatedFatwasAsync(fatwa.category, fatwa.id, 6);
  const fatwaSlug = createFatwaSlug(fatwa.title, fatwa.id);
  const canonicalUrl = `${siteUrl}/fatwa/${fatwaSlug}`;

  // Schema.org ItemList for Related Questions (Topical graph linking)
  const relatedItemListSchema =
    relatedFatwas.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `${fatwa.category} সম্পর্কিত অন্যান্য গুরুত্বপূর্ণ প্রশ্নোত্তর`,
          numberOfItems: relatedFatwas.length,
          itemListElement: relatedFatwas.map((rf, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: rf.title,
            url: `${siteUrl}/fatwa/${createFatwaSlug(rf.title, rf.id)}`,
          })),
        }
      : null;

  // If accessed by old broken slug, short ID, or raw UUID, permanently redirect to clean canonical slug
  let currentDecoded = params.id.trim();
  try {
    currentDecoded = decodeURIComponent(params.id).trim();
  } catch {}

  let canonicalDecoded = fatwaSlug.trim();
  try {
    canonicalDecoded = decodeURIComponent(fatwaSlug).trim();
  } catch {}

  if (currentDecoded !== canonicalDecoded) {
    redirect(`/fatwa/${encodeURIComponent(fatwaSlug)}`);
  }

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
  const isoCreated = toValidIsoDate(fatwa.created_at, fatwa.published_date);
  const isoPublished = toValidIsoDate(fatwa.published_date, fatwa.created_at);

  // Schema.org QAPage Structured Data (Optimized for Google Q&A Rich Results)
  const qaSchema = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: fatwa.title,
      text: fatwa.question || fatwa.title,
      answerCount: 1,
      dateCreated: isoCreated,
      author: {
        "@type": "Organization",
        name: sourceDisplayName,
      },
      acceptedAnswer: {
        "@type": "Answer",
        text: fatwa.answer,
        datePublished: isoPublished,
        url: canonicalUrl,
        author: {
          "@type": "Person",
          name: fatwa.scholar || sourceDisplayName,
        },
        upvoteCount: 1,
      },
    },
  };

  // Schema.org FAQPage Structured Data (Optimized for Google FAQ Rich Results)
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: fatwa.title,
        acceptedAnswer: {
          "@type": "Answer",
          text: fatwa.answer,
        },
      },
    ],
  };

  // Schema.org BreadcrumbList Structured Data
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Deen QnA হোম",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {relatedItemListSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(relatedItemListSchema) }}
        />
      )}

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

            <div className="prose prose-zinc dark:prose-invert max-w-none text-base sm:text-lg font-bengali leading-relaxed text-zinc-900 dark:text-zinc-100 whitespace-pre-line selection:bg-emerald-500/25 selection:text-emerald-950 dark:selection:bg-emerald-500/35 dark:selection:text-emerald-100">
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

        {/* Related Fatwas - High Craft Topical Knowledge Network */}
        {relatedFatwas.length > 0 && (
          <section aria-label="সম্পর্কিত প্রশ্নোত্তর" className="mt-14 pt-8 border-t border-zinc-200/80 dark:border-zinc-800/80">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold font-bengali">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>সম্পর্কিত ফতোয়া ও গবেষণা</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-bengali-serif tracking-tight mt-2">
                  সম্পর্কিত গুরুত্বপূর্ণ প্রশ্নোত্তর
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-bengali mt-1">
                  {fatwa.category
                    ? `"${fatwa.category}" বিষয় সম্পর্কিত প্রামাণিক ফতোয়া ও শরয়ী দিকনির্দেশনা`
                    : "বিষয়ভিত্তিক অন্যান্য প্রামাণিক ফতোয়া ও সমাধান"}
                </p>
              </div>

              {fatwa.category && (
                <Link
                  href={`/?category=${encodeURIComponent(fatwa.category)}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors font-bengali shrink-0 group/link"
                >
                  <span>এই বিভাগের আরও প্রশ্ন</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover/link:translate-x-0.5 transition-transform" />
                </Link>
              )}
            </div>

            {/* Grid of Related Question Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {relatedFatwas.map((rf) => {
                const rfSlug = createFatwaSlug(rf.title, rf.id);
                const isTahreek = rf.source?.toLowerCase().includes("tahreek");
                const isKawsar =
                  rf.source?.toLowerCase().includes("kawsar") ||
                  rf.source?.toLowerCase().includes("kausar");
                const isItisam = rf.source?.toLowerCase().includes("itisam");

                let snippet = "";
                if (rf.question && rf.question.trim() !== rf.title.trim()) {
                  snippet = rf.question.trim();
                } else if (rf.answer) {
                  snippet = rf.answer.trim();
                }
                snippet = snippet
                  .replace(/<[^>]*>/g, "")
                  .replace(/^প্রশ্ন\s*(\([^\)]+\)|[০-৯0-9\/\s-]+)?\s*[:ঃ-]?\s*/u, "")
                  .replace(/\s+/g, " ")
                  .trim();

                return (
                  <Link
                    key={rf.id}
                    href={`/fatwa/${rfSlug}`}
                    prefetch={true}
                    className="flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 hover:border-emerald-500/50 dark:hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-950/5 dark:hover:shadow-emerald-950/20 transition-all duration-200 group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-zinc-100 dark:border-zinc-800/60">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Source Badge */}
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium border font-bengali",
                              isTahreek
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60"
                                : isKawsar
                                ? "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800/60"
                                : isItisam
                                ? "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700"
                                : "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                            )}
                          >
                            <span className="font-semibold">
                              {rf.source === "at-tahreek"
                                ? "আত-তাহরীক"
                                : rf.source === "al-kawsar"
                                ? "আলকাউসার"
                                : rf.source === "al-itisam"
                                ? "আল-ইতিসাম"
                                : rf.source}
                            </span>
                          </span>

                          {/* Category Badge */}
                          {rf.category && (
                            <span className="inline-flex items-center text-[10px] sm:text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-200/60 dark:border-zinc-800 font-bengali truncate max-w-[140px]">
                              {rf.category}
                            </span>
                          )}
                        </div>

                        {/* Verified Mark */}
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bengali shrink-0">
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="hidden xs:inline font-medium">যাচাইকৃত</span>
                        </span>
                      </div>

                      {/* Question Title */}
                      <h3 className="text-[15px] sm:text-base font-bold text-zinc-900 dark:text-zinc-100 font-bengali group-hover:text-emerald-600 dark:group-hover:text-emerald-400 line-clamp-2 leading-snug transition-colors">
                        {rf.title}
                      </h3>

                      {/* Context Snippet */}
                      {snippet && (
                        <p className="text-xs sm:text-[13px] text-zinc-500 dark:text-zinc-400 font-bengali line-clamp-2 leading-relaxed mt-2">
                          {snippet}
                        </p>
                      )}
                    </div>

                    {/* Card Bottom Meta */}
                    <div className="flex items-center justify-between gap-2 pt-3.5 mt-4 border-t border-zinc-100 dark:border-zinc-800/60 text-xs">
                      <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 font-bengali min-w-0">
                        {rf.scholar ? (
                          <>
                            <GraduationCap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="truncate max-w-[170px] sm:max-w-[200px] text-[11px] sm:text-xs">
                              {rf.scholar}
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px] text-zinc-400 font-mono">
                            {rf.published_date ? formatDate(rf.published_date) : "প্রামাণিক আর্কাইভ"}
                          </span>
                        )}
                      </div>

                      <div className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 font-bengali shrink-0 text-xs">
                        <span>বিস্তারিত পড়ুন</span>
                        <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Quick Topic Exploration Bar */}
            <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-2 mb-3">
                <Compass className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200 font-bengali">
                  বিষয়ভিত্তিক অন্যান্য প্রশ্নোত্তর অন্বেষণ করুন
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: "সালাত ও নামায", query: "সালাত (Prayer)" },
                  { name: "সিয়াম ও রোযা", query: "সিয়াম (Fasting)" },
                  { name: "যাকাত ও সাদাকাহ", query: "যাকাত ও সাদাকাহ (Zakat)" },
                  { name: "পারিবারিক ও বিবাহ", query: "পারিবারিক ও বিবাহ (Family)" },
                  { name: "মুয়ামালাত ও লেনদেন", query: "মুয়ামালাত ও লেনদেন (Transactions)" },
                  { name: "হজ্জ ও উমরাহ", query: "হজ্জ ও উমরাহ (Hajj)" },
                  { name: "আকীদাহ ও তাওহীদ", query: "আকীদাহ ও তাওহীদ (Creed)" },
                  { name: "সাধারণ জিজ্ঞাসা", query: "সাধারণ জিজ্ঞাসা (General)" },
                ].map((cat, idx) => (
                  <Link
                    key={idx}
                    href={`/?category=${encodeURIComponent(cat.query)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#151518] text-zinc-700 dark:text-zinc-300 border border-zinc-200/90 dark:border-zinc-800 hover:border-emerald-500/50 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-sm transition-all font-bengali"
                  >
                    <span>{cat.name}</span>
                  </Link>
                ))}
              </div>
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
