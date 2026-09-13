'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createFatwaSlug } from '@/lib/utils';
import {
  Database,
  BarChart3,
  ShieldCheck,
  Search,
  PlusCircle,
  Edit,
  Trash2,
  Eye,
  LogOut,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Folder,
  Layers,
  Lock,
  Users,
  TrendingUp,
  Activity,
  Smartphone,
  Laptop,
  Tablet,
  Globe,
  UserCheck,
  UserX,
  FileText,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface FatwaItem {
  id: string;
  source: string;
  source_url: string;
  title: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  scholar: string;
  published_date: string;
  sha256_hash: string;
}

interface AnalyticsOverview {
  timeframe: 'today' | '7d' | '30d' | 'all';
  summary: {
    todayVisitors: number;
    todayPageviews: number;
    loggedInVisitorsToday: number;
    guestVisitorsToday: number;
    activeUsers15m: number;
    periodVisitors: number;
    periodPageviews: number;
    totalVisitorsAllTime: number;
    totalPageviewsAllTime: number;
  };
  trends: Array<{
    date: string;
    pageviews: number;
    visitors: number;
    logged_in: number;
    guest: number;
  }>;
  topFatwas: Array<{
    fatwa_id: string;
    title: string;
    source: string;
    category: string;
    view_count: number;
    unique_visitors: number;
  }>;
  topPages: Array<{
    path: string;
    title: string;
    views: number;
    visitors: number;
  }>;
  topSearches: Array<{
    search_query: string;
    count: number;
  }>;
  userBreakdown: {
    loggedIn: number;
    guest: number;
    total: number;
  };
  deviceBreakdown: Array<{
    device_type: string;
    count: number;
  }>;
  browserBreakdown: Array<{
    browser: string;
    count: number;
  }>;
  recentLogs: Array<{
    id: string;
    visitor_id: string;
    user_type: string;
    user_name: string | null;
    user_email: string | null;
    path: string;
    page_title: string;
    fatwa_id: string | null;
    device_type: string;
    browser: string;
    os: string;
    created_at: string;
  }>;
}

interface AdminDashboardClientProps {
  initialCount: number;
  sources: Array<{ name: string; count: number }>;
  categories: Array<{ name: string; count: number }>;
  scholars: Array<{ name: string; count: number }>;
}

function formatRelativeTimeBn(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 10) return 'এখনই';
  if (diffSec < 60) return `${diffSec} সে. পূর্বে`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} মি. পূর্বে`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} ঘণ্টা পূর্বে`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} দিন পূর্বে`;
}

export function AdminDashboardClient({
  initialCount,
  sources,
  categories,
  scholars,
}: AdminDashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'manage' | 'add'>('overview');

  // Analytics State
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'today' | '7d' | '30d' | 'all'>('today');
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Management State
  const [items, setItems] = useState<FatwaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(initialCount);

  // Modals & Form State
  const [viewingItem, setViewingItem] = useState<FatwaItem | null>(null);
  const [editingItem, setEditingItem] = useState<FatwaItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Fatwa Form State
  const [formTitle, setFormTitle] = useState('');
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formSource, setFormSource] = useState('at-tahreek');
  const [formSourceUrl, setFormSourceUrl] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [formScholar, setFormScholar] = useState('ড. মুহাম্মাদ আসাদুল্লাহ আল-গালিব');
  const [formTags, setFormTags] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  const fetchAnalytics = async (tf: 'today' | '7d' | '30d' | 'all' = analyticsTimeframe) => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/analytics?timeframe=${tf}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('[Analytics Fetch Error]:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchFatwas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        source: selectedSource,
        category: selectedCategory,
        page: page.toString(),
        limit: '12',
      });
      const res = await fetch(`/api/v1/admin/fatwa?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load fatwas');
      const data = await res.json();
      setItems(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchAnalytics(analyticsTimeframe);
    }
  }, [activeTab, analyticsTimeframe]);

  useEffect(() => {
    if (activeTab === 'manage') {
      fetchFatwas();
    }
  }, [activeTab, searchQuery, selectedSource, selectedCategory, page]);

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      router.push('/admin/login');
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSaving(true);
    setStatusMessage(null);

    try {
      const payload = {
        id: editingItem ? editingItem.id : undefined,
        title: formTitle,
        question: formQuestion,
        answer: formAnswer,
        source: formSource,
        source_url: formSourceUrl,
        category: formCategory,
        scholar: formScholar,
        tags: formTags.split(',').map((t) => t.trim()).filter(Boolean),
      };

      const res = await fetch('/api/v1/admin/fatwa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'সংরক্ষণ ব্যর্থ হয়েছে');

      setStatusMessage({ type: 'success', text: data.message || 'সফলভাবে সংরক্ষিত হয়েছে!' });

      setEditingItem(null);
      setFormTitle('');
      setFormQuestion('');
      setFormAnswer('');
      setFormSourceUrl('');
      setFormTags('');

      if (activeTab === 'manage') {
        fetchFatwas();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'ত্রুটি ঘটেছে' });
    } finally {
      setFormSaving(false);
    }
  };

  const startEdit = (item: FatwaItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormQuestion(item.question);
    setFormAnswer(item.answer);
    setFormSource(item.source);
    setFormSourceUrl(item.source_url);
    setFormCategory(item.category);
    setFormScholar(item.scholar);
    setFormTags((item.tags || []).join(', '));
    setActiveTab('add');
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/admin/fatwa?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteConfirmId(null);
        setStatusMessage({ type: 'success', text: 'ফতোয়া মুছে ফেলা হয়েছে' });
        fetchFatwas();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Chart max value calculation
  const maxTrendVal = Math.max(
    1,
    ...(analytics?.trends.map((t) => Math.max(t.pageviews, t.visitors)) || [10])
  );

  return (
    <div className="space-y-6 font-bengali">
      {/* Top Bar with Session Badge & Logout */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
            <Lock className="h-3.5 w-3.5" />
            <span>Admin Control Panel</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            ইসলামিক ফতোয়া আর্কাইভ সিস্টেম এডমিন
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>এডমিন সেশন সক্রিয়</span>
          </span>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 hover:bg-rose-100 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>লগআউট</span>
          </button>
        </div>
      </div>

      {/* Global Status Alert Message */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'overview'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>ড্যাশবোর্ড ও অ্যানালিটিক্স</span>
        </button>

        <button
          onClick={() => setActiveTab('manage')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'manage'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>ফতোয়া ব্যবস্থাপনা ({totalCount.toLocaleString()})</span>
        </button>

        <button
          onClick={() => {
            setEditingItem(null);
            setActiveTab('add');
          }}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'add'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <PlusCircle className="h-4 w-4" />
          <span>{editingItem ? 'ফতোয়া সম্পাদনা' : 'নতুন ফতোয়া যোগ করুন'}</span>
        </button>
      </div>

      {/* Tab 1: Overview & Analytics */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Analytics Control Bar */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl flex flex-wrap gap-4 items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600 animate-pulse" />
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                ট্রাফিক ও ভিজিটর বিশ্লেষণ
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full font-medium border border-emerald-200 dark:border-emerald-800/60">
                রিয়েল-টাইম ট্র্যাকিং সক্রিয়
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Timeframe Selector Pills */}
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium">
                <button
                  onClick={() => setAnalyticsTimeframe('today')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    analyticsTimeframe === 'today'
                      ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  আজকে
                </button>
                <button
                  onClick={() => setAnalyticsTimeframe('7d')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    analyticsTimeframe === '7d'
                      ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  গত ৭ দিন
                </button>
                <button
                  onClick={() => setAnalyticsTimeframe('30d')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    analyticsTimeframe === '30d'
                      ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  গত ৩০ দিন
                </button>
                <button
                  onClick={() => setAnalyticsTimeframe('all')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    analyticsTimeframe === 'all'
                      ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  সর্বমোট
                </button>
              </div>

              <button
                onClick={() => fetchAnalytics(analyticsTimeframe)}
                disabled={analyticsLoading}
                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                title="ডাটা রিফ্রেশ করুন"
              >
                <RefreshCw className={`h-4 w-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* 5 Main Analytics KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: Today's Visitors */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs">
                <span className="font-semibold">আজকের ভিজিটর ( Visitors )</span>
                <Users className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {analytics?.summary.todayVisitors.toLocaleString() || '0'}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-medium">
                <span className="text-blue-500 font-semibold">{analytics?.summary.loggedInVisitorsToday || 0} লগইন</span>
                <span>•</span>
                <span className="text-zinc-400">{analytics?.summary.guestVisitorsToday || 0} গেস্ট</span>
              </div>
            </div>

            {/* Card 2: Today's Pageviews */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs">
                <span className="font-semibold">আজকের পেজভিউ ( Pageviews )</span>
                <Eye className="h-4 w-4 text-teal-500" />
              </div>
              <p className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {analytics?.summary.todayPageviews.toLocaleString() || '0'}
              </p>
              <p className="text-[11px] text-zinc-400">কয়টি পেজ ব্রাউজ করা হয়েছে</p>
            </div>

            {/* Card 3: Real-Time Active (Last 15m) */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs">
                <span className="font-semibold">অনলাইন ভিজিটর ( Live )</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {analytics?.summary.activeUsers15m || 0}
              </p>
              <p className="text-[11px] text-zinc-400">গত ১৫ মিনিটে অ্যাক্টিভ</p>
            </div>

            {/* Card 4: Period Total Pageviews */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs">
                <span className="font-semibold">মোট পেজভিউ ({analyticsTimeframe.toUpperCase()})</span>
                <TrendingUp className="h-4 w-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {analytics?.summary.periodPageviews.toLocaleString() || '0'}
              </p>
              <p className="text-[11px] text-zinc-400">সিলেক্টেড পিরিয়ডে মোট হিট</p>
            </div>

            {/* Card 5: Verified Fatwas in DB */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs">
                <span className="font-semibold">মোট ফতোয়া ভান্ডার</span>
                <Database className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {totalCount.toLocaleString()}
              </p>
              <p className="text-[11px] text-zinc-400">ডাটাবেজে সংরক্ষিত</p>
            </div>
          </div>

          {/* Daily Traffic & Pageview Trend Graph */}
          {analytics?.trends && analytics.trends.length > 0 && (
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                  <span>দৈনিক পেজভিউ ও ভিজিটর ট্রেন্ড (Traffic Trends)</span>
                </h3>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                    <span className="text-zinc-600 dark:text-zinc-400">পেজভিউ</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-teal-400 inline-block" />
                    <span className="text-zinc-600 dark:text-zinc-400">ইউনিক ভিজিটর</span>
                  </div>
                </div>
              </div>

              {/* Bar Chart Visualization */}
              <div className="h-48 flex items-end gap-2 pt-6 pb-2 px-2 overflow-x-auto">
                {analytics.trends.map((t) => {
                  const pvHeightPercent = Math.max(8, Math.min(100, (t.pageviews / maxTrendVal) * 100));
                  const visHeightPercent = Math.max(8, Math.min(100, (t.visitors / maxTrendVal) * 100));

                  return (
                    <div key={t.date} className="flex-1 min-w-[36px] flex flex-col items-center gap-2 group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                        <div className="bg-zinc-900 text-white text-[10px] py-1 px-2.5 rounded-lg shadow-lg border border-zinc-700 whitespace-nowrap">
                          <p className="font-bold text-emerald-400">{t.date}</p>
                          <p>পেজভিউ: {t.pageviews}</p>
                          <p>ভিজিটর: {t.visitors} ({t.logged_in} লগইন, {t.guest} গেস্ট)</p>
                        </div>
                      </div>

                      {/* Bars */}
                      <div className="w-full flex items-end justify-center gap-1 h-36">
                        <div
                          className="w-1/2 bg-emerald-500/90 dark:bg-emerald-500 rounded-t transition-all group-hover:bg-emerald-400"
                          style={{ height: `${pvHeightPercent}%` }}
                        />
                        <div
                          className="w-1/2 bg-teal-400/80 dark:bg-teal-400 rounded-t transition-all group-hover:bg-teal-300"
                          style={{ height: `${visHeightPercent}%` }}
                        />
                      </div>

                      {/* Date label */}
                      <span className="text-[10px] font-mono text-zinc-400 truncate max-w-full">
                        {t.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2-Column Section: Top Fatwas Viewed & Top Searches */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Fatwas Viewed (কি কি দেখলো) */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  <span>শীর্ষ পঠিত ফতোয়া ও পেজসমূহ (Top Viewed Content)</span>
                </h3>
                <span className="text-xs text-zinc-400">সর্বোচ্চ ভিউ</span>
              </div>

              {!analytics?.topFatwas || analytics.topFatwas.length === 0 ? (
                <div className="text-xs text-center text-zinc-400 py-8">
                  এখনো কোনো ফতোয়া ভিউ রেকর্ড হয়নি
                </div>
              ) : (
                <div className="space-y-2.5">
                  {analytics.topFatwas.map((item, idx) => (
                    <div
                      key={item.fatwa_id || idx}
                      className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {item.source}
                          </span>
                          <span className="text-[11px] text-zinc-500 truncate">{item.category}</span>
                        </div>
                        <Link
                          href={`/fatwa/${createFatwaSlug(item.title, item.fatwa_id)}`}
                          target="_blank"
                          className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-400 truncate block transition-colors"
                        >
                          {item.title}
                        </Link>
                      </div>

                      <div className="text-right font-mono text-xs">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          {item.view_count} ভিউ
                        </div>
                        <div className="text-[10px] text-zinc-400">{item.unique_visitors} ভিজিটর</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Searches & User Breakdown */}
            <div className="space-y-6">
              {/* Top Search Queries */}
              <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <Search className="h-4 w-4 text-teal-600" />
                  <span>শীর্ষ অনুসন্ধানের কি-ওয়ার্ডসমূহ (Top Searches)</span>
                </h3>

                {!analytics?.topSearches || analytics.topSearches.length === 0 ? (
                  <div className="text-xs text-center text-zinc-400 py-6">
                    কোনো সার্চ কি-ওয়ার্ড ডাটা নেই
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {analytics.topSearches.map((s) => (
                      <div
                        key={s.search_query}
                        className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs flex items-center gap-2"
                      >
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{s.search_query}</span>
                        <span className="font-mono text-[11px] text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/80 px-1.5 py-0.5 rounded font-bold">
                          {s.count} হিট
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* User Type & Device Distribution */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* User Type Split */}
                <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-blue-500" />
                    <span>ইউজার টাইপ (Logged in / Guest)</span>
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>লগইন ব্যবহারকারী</span>
                      <span className="font-mono font-bold text-blue-600">{analytics?.userBreakdown.loggedIn || 0} জন</span>
                    </div>
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>গেস্ট/অ্যানোনিমাস</span>
                      <span className="font-mono font-bold text-zinc-500">{analytics?.userBreakdown.guest || 0} জন</span>
                    </div>
                    {analytics?.userBreakdown.total ? (
                      <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                        <div
                          className="bg-blue-500 h-full"
                          style={{
                            width: `${(analytics.userBreakdown.loggedIn / analytics.userBreakdown.total) * 100}%`,
                          }}
                        />
                        <div
                          className="bg-zinc-400 h-full"
                          style={{
                            width: `${(analytics.userBreakdown.guest / analytics.userBreakdown.total) * 100}%`,
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Device Breakdown */}
                <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5 text-purple-500" />
                    <span>ডিভাইস ব্যবহার (Device Stats)</span>
                  </h4>
                  <div className="space-y-2 text-xs">
                    {analytics?.deviceBreakdown.map((d) => (
                      <div key={d.device_type} className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                        <span className="flex items-center gap-1">
                          {d.device_type === 'Mobile' ? (
                            <Smartphone className="h-3 w-3 text-emerald-500" />
                          ) : d.device_type === 'Tablet' ? (
                            <Tablet className="h-3 w-3 text-teal-500" />
                          ) : (
                            <Laptop className="h-3 w-3 text-indigo-500" />
                          )}
                          <span>{d.device_type}</span>
                        </span>
                        <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{d.count} হিট</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Real-Time Live Activity Feed Table */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm space-y-0">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-600" />
                <span>লাইভ ভিজিটর অ্যাক্টিভিটি ফিড (Real-Time Visitor Log)</span>
              </h3>
              <span className="text-xs font-mono text-zinc-400">সর্বশেষ ৩০টি পেজভিউ</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
                  <tr>
                    <th className="p-3.5">ইউজার / পরিচয়</th>
                    <th className="p-3.5">ব্রাউজ করা পেজ / ফতোয়া</th>
                    <th className="p-3.5">ডিভাইস ও ওএস</th>
                    <th className="p-3.5 text-right">সময়</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-sans">
                  {!analytics?.recentLogs || analytics.recentLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-zinc-400">
                        এখনো কোনো ব্রাউজিং হিস্ট্রি রেকর্ড হয়নি
                      </td>
                    </tr>
                  ) : (
                    analytics.recentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                        <td className="p-3.5">
                          {log.user_type === 'logged_in' ? (
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs">
                                {(log.user_name || log.user_email || 'U')[0].toUpperCase()}
                              </span>
                              <div>
                                <p className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                  <span>{log.user_name || 'Logged-in User'}</span>
                                  <span className="px-1.5 py-0.2 text-[9px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded">
                                    লগইন ইউজার
                                  </span>
                                </p>
                                <p className="text-[11px] text-zinc-500 font-mono">{log.user_email || ''}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold flex items-center justify-center text-xs">
                                G
                              </span>
                              <div>
                                <p className="font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                  <span>গেস্ট ভিজিটর</span>
                                  <span className="px-1.5 py-0.2 text-[9px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 rounded">
                                    অ্যানোনিমাস
                                  </span>
                                </p>
                                <p className="text-[10px] text-zinc-400 font-mono truncate max-w-[120px]">
                                  ID: {log.visitor_id.slice(-8)}
                                </p>
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="p-3.5 max-w-xs">
                          <Link
                            href={log.path}
                            target="_blank"
                            className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-400 truncate block"
                          >
                            {log.page_title || log.path}
                          </Link>
                          <span className="text-[10px] text-zinc-400 font-mono truncate block">{log.path}</span>
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-medium text-xs">
                            {log.device_type === 'Mobile' ? (
                              <Smartphone className="h-3.5 w-3.5 text-emerald-500" />
                            ) : log.device_type === 'Tablet' ? (
                              <Tablet className="h-3.5 w-3.5 text-teal-500" />
                            ) : (
                              <Laptop className="h-3.5 w-3.5 text-indigo-500" />
                            )}
                            <span>
                              {log.device_type} ({log.browser} on {log.os})
                            </span>
                          </div>
                        </td>

                        <td className="p-3.5 text-right font-mono text-zinc-500 text-xs">
                          {formatRelativeTimeBn(log.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Existing Distribution Summary (Sources & Categories) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sources Breakdown */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <Folder className="h-4 w-4 text-emerald-600" />
                <span>উৎস অনুযায়ী ফতোয়া বন্টন (Sources Distribution)</span>
              </h3>

              <div className="space-y-3">
                {sources.map((s) => (
                  <div key={s.name} className="space-y-1 text-xs">
                    <div className="flex justify-between font-medium">
                      <span>{s.name}</span>
                      <span className="font-mono text-zinc-500">{s.count.toLocaleString()} টি</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${Math.min(100, (s.count / totalCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Categories */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <Folder className="h-4 w-4 text-teal-600" />
                <span>শীর্ষ ফতোয়া বিভাগসমূহ (Top Categories)</span>
              </h3>

              <div className="flex flex-wrap gap-2">
                {categories.slice(0, 15).map((c) => (
                  <div
                    key={c.name}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs flex items-center gap-2"
                  >
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{c.name}</span>
                    <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded">
                      {c.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Manage Fatwas */}
      {activeTab === 'manage' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl flex flex-wrap gap-3 items-center justify-between">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="ফতোয়া খুঁজুন (শিরোনাম / প্রশ্ন / মুফতী)..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedSource}
                onChange={(e) => {
                  setSelectedSource(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none"
              >
                <option value="All">সকল উৎস</option>
                <option value="at-tahreek">আত-তাহরীক</option>
                <option value="al-kawsar">আলকাউসার</option>
                <option value="al-itisam">আল-ইতিসাম</option>
              </select>

              <button
                onClick={fetchFatwas}
                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
                  <tr>
                    <th className="p-3.5">শিরোনাম / প্রশ্ন</th>
                    <th className="p-3.5">উৎস</th>
                    <th className="p-3.5">বিভাগ</th>
                    <th className="p-3.5">স্কলার / মুফতী</th>
                    <th className="p-3.5 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-zinc-400">
                        ফতোয়া ডাটা লোড হচ্ছে...
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-zinc-400">
                        কোনো ফতোয়া পাওয়া যায়নি
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                        <td className="p-3.5 font-medium text-zinc-900 dark:text-zinc-100 max-w-xs truncate">
                          {item.title}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {item.source}
                          </span>
                        </td>
                        <td className="p-3.5 text-zinc-600 dark:text-zinc-400">{item.category}</td>
                        <td className="p-3.5 text-zinc-600 dark:text-zinc-400">{item.scholar || '-'}</td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingItem(item)}
                              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 text-zinc-600"
                              title="দেখুন"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => startEdit(item)}
                              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600"
                              title="সম্পাদনা"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600"
                              title="মুছুন"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
              <span>
                পৃষ্ঠা {page} / {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 disabled:opacity-40"
                >
                  পূর্ববর্তী
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 disabled:opacity-40"
                >
                  পরবর্তী
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Add / Edit Form */}
      {activeTab === 'add' && (
        <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-emerald-600" />
            <span>{editingItem ? 'ফতোয়া তথ্য সম্পাদনা করুন' : 'নতুন ফতোয়া এন্ট্রি করুন'}</span>
          </h2>

          <form onSubmit={handleCreateOrUpdate} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  শিরোনাম (Title) *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="ফতোয়ার সংক্ষিপ্ত শিরোনাম..."
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  উৎস পত্রিকা (Source Journal) *
                </label>
                <select
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none"
                >
                  <option value="at-tahreek">মাসিক আত-তাহরীক</option>
                  <option value="al-kawsar">মাসিক আলকাউসার</option>
                  <option value="al-itisam">আল-ইতিসাম</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  বিভাগ (Category)
                </label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="যেমন: সালাত, রোজা, আকীকা..."
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  মুফতী / লেখক (Scholar)
                </label>
                <input
                  type="text"
                  value={formScholar}
                  onChange={(e) => setFormScholar(e.target.value)}
                  placeholder="যেমন: মারকাযুদ দাওয়াহ / আল-গালিব..."
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  উৎস লিঙ্ক (Source URL)
                </label>
                <input
                  type="url"
                  value={formSourceUrl}
                  onChange={(e) => setFormSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                প্রশ্ন (Question Text) *
              </label>
              <textarea
                required
                rows={3}
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                placeholder="প্রশ্নটি বিস্তারিত লিখুন..."
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                শরয়ী উত্তর (Answer Text) *
              </label>
              <textarea
                required
                rows={6}
                value={formAnswer}
                onChange={(e) => setFormAnswer(e.target.value)}
                placeholder="ফতোয়ার পূর্ণাঙ্গ উত্তর লিখুন..."
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                ট্যাগসমূহ (Comma separated tags)
              </label>
              <input
                type="text"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="সালাত, ওযু, হাত বাঁধা..."
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setActiveTab('manage');
                }}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium rounded-xl"
              >
                বাতিল করুন
              </button>
              <button
                type="submit"
                disabled={formSaving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md disabled:opacity-50"
              >
                {formSaving ? 'সংরক্ষণ হচ্ছে...' : editingItem ? 'আপডেট করুন' : 'ফতোয়া সেভ করুন'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View Detail Modal */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <span className="text-xs font-mono text-emerald-600">ID: {viewingItem.id}</span>
              <button onClick={() => setViewingItem(null)} className="p-1 text-zinc-400 hover:text-zinc-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">{viewingItem.title}</h3>
              <p className="text-xs text-zinc-500 mb-4">{viewingItem.question}</p>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-line leading-relaxed">
              {viewingItem.answer}
            </div>

            <div className="text-[11px] text-zinc-400 font-mono pt-2">
              SHA-256: {viewingItem.sha256_hash}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-rose-600 mx-auto" />
            <h3 className="text-base font-bold">আপনি কি এই ফতোয়াটি মুছে ফেলতে চান?</h3>
            <p className="text-xs text-zinc-500">এই অ্যাকশনটি ফিরিয়ে নেওয়া সম্ভব নয়।</p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs bg-zinc-100 dark:bg-zinc-800 rounded-xl"
              >
                না, রাখুন
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 text-xs bg-rose-600 text-white font-medium rounded-xl"
              >
                হ্যাঁ, মুছে ফেলুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
