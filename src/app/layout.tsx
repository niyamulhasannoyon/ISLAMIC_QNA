import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";

export const metadata: Metadata = {
  title: "Islamic Fatwa & Research Archive | Al-I'tisam & At-Tahreek",
  description: "An editorial-grade digital research archive and search engine aggregating authentic fatwas and Islamic Q&As from Al-I'tisam, At-Tahreek, and verified scholarly collections.",
  keywords: ["Fatwa", "Islamic Q&A", "Al-I'tisam", "At-Tahreek", "ফিকহ", "সালাত", "যাকাত", "হাদীস", "Search", "Editorial Archive"],
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon", type: "image/png", sizes: "180x180" },
    ],
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" className="dark scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Hind+Siliguri:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Noto+Serif+Bengali:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#09090b] text-zinc-100 font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-200">
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
