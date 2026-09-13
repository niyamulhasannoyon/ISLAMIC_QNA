import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/auth';
import { getFatwaCount, getFacets } from '@/lib/db';
import { Header } from '@/components/Header';
import { AdminDashboardClient } from '@/components/AdminDashboardClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'এডমিন ড্যাশবোর্ড | ইসলামিক ফতোয়া আর্কাইভ',
  description: 'সিস্টেম এডমিন পোর্টাল ও ডাটাবেজ ড্যাশবোর্ড',
};

export default async function AdminPage() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    notFound();
  }

  const count = getFatwaCount();
  const facets = getFacets();

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfc] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <AdminDashboardClient
          initialCount={count}
          sources={facets.sources || []}
          categories={facets.categories || []}
          scholars={facets.scholars || []}
        />
      </main>
    </div>
  );
}
