import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { getSiteUrl } from "@/lib/utils";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Deen QnA - ইসলামিক ফতোয়া ও প্রশ্নোত্তর আর্কাইভ | ২০,০০০+ প্রামাণিক সমাধান",
    template: "%s | Deen QnA - ইসলামিক প্রশ্নোত্তর ও ফতোয়া",
  },
  description:
    "Deen QnA (দ্বীন কিউএনএ) - আল-ইতিসাম, আত-তাহরীক ও মাসিক আলকাউসারের ২০,০০০+ প্রামাণ্য ইসলামিক ফতোয়া ও প্রশ্নোত্তর ডিজিটাল আর্কাইভ। কুরআন ও সহীহ সুন্নাহ ভিত্তিক শরয়ী সমাধান।",
  keywords: [
    "Deen QnA",
    "DeenQnA",
    "deen qna",
    "deen qa",
    "দ্বীন কিউএনএ",
    "দীন কিউএনএ",
    "দ্বীন প্রশ্নোত্তর",
    "Deen Q&A",
    "ফতোয়া",
    "ইসলামিক প্রশ্ন উত্তর",
    "Fatwa",
    "Islamic Fatwa",
    "Islamic Q&A",
    "Al-I'tisam",
    "At-Tahreek",
    "আল-ইতিসাম",
    "আত-তাহরীক",
    "মাসিক আলকাউসার",
    "ফিকহ",
    "হাদীস",
    "সালাত",
    "সিয়াম",
    "যাকাত",
    "শরীয়া সমাধান",
    "Scholarly Fatwa Archive Bangladesh",
    "deenqna.vercel.app",
  ],
  authors: [{ name: "Deen QnA Editorial Team" }],
  creator: "Deen QnA",
  publisher: "Deen QnA",
  verification: {
    google: "4mbgGQs3PoTcMTbCYLFypmE_u9bbwfwW4_F85kWGmXA",
  },
  alternates: {
    canonical: "/",
    languages: {
      "bn-BD": "/",
      "ar": "/?lang=ar",
      "en": "/?lang=en",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "bn_BD",
    alternateLocale: ["ar_SA", "en_US"],
    url: siteUrl,
    siteName: "Deen QnA | ইসলামিক ফতোয়া ও গবেষণা আর্কাইভ",
    title: "Deen QnA - ইসলামিক ফতোয়া ও প্রশ্নোত্তর ডিজিটাল আর্কাইভ",
    description:
      "আল-ইতিসাম, আত-তাহরীক ও মাসিক আলকাউসারের ২০,০০০+ প্রামাণিক ফতোয়া ও শরয়ী সমাধান। কুরআন ও সহীহ হাদীসের আলোকে অনুসন্ধান করুন।",
  },
  twitter: {
    card: "summary_large_image",
    title: "Deen QnA - ইসলামিক ফতোয়া ও প্রশ্নোত্তর ডিজিটাল আর্কাইভ",
    description:
      "আল-ইতিসাম, আত-তাহরীক ও মাসিক আলকাউসারের ২০,০০০+ প্রামাণিক ফতোয়া ও শরয়ী সমাধান।",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLdWebsite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Deen QnA",
    alternateName: [
      "DeenQnA",
      "deen qna",
      "দ্বীন কিউএনএ",
      "দীন কিউএনএ",
      "Deen Q&A",
      "ইসলামিক ফতোয়া ও গবেষণা আর্কাইভ",
    ],
    url: siteUrl,
    inLanguage: ["bn", "ar", "en"],
    description:
      "Deen QnA - আল-ইতিসাম, আত-তাহরীক ও নির্ভরযোগ্য ইসলামিক স্কলারদের ২০,০০০+ প্রামাণিক ফতোয়া ও প্রশ্নোত্তর ডিজিটাল আর্কাইভ।",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const jsonLdOrg = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Deen QnA",
    alternateName: ["DeenQnA", "Islamic Fatwa & Research Archive"],
    url: siteUrl,
    logo: `${siteUrl}/icon.svg`,
    description: "Digital archive preserving verified Islamic rulings and fatwas.",
  };

  return (
    <html lang="bn" className="dark scroll-smooth">
      <head>
        {/* Explicit Google Site Verification meta tag */}
        <meta
          name="google-site-verification"
          content="4mbgGQs3PoTcMTbCYLFypmE_u9bbwfwW4_F85kWGmXA"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Anek+Bangla:wght@400;500;600;700&family=Hind+Siliguri:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Noto+Serif+Bengali:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebsite) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
        />
        {/* Google Identity Services SDK for Sign in with Google */}
        <script src="https://accounts.google.com/gsi/client" async defer />
      </head>
      <body className="min-h-screen bg-[#09090b] text-zinc-100 font-sans antialiased selection:bg-emerald-500/25 selection:text-emerald-950 dark:selection:bg-emerald-500/35 dark:selection:text-emerald-100">
        <LanguageProvider>
          <Suspense fallback={null}>
            <AnalyticsTracker />
          </Suspense>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}

