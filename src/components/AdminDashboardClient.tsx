'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  GraduationCap,
  Calendar,
  Layers,
  Lock,
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

interface AdminDashboardClientProps {
  initialCount: number;
  sources: Array<{ name: string; count: number }>;
  categories: Array<{ name: string; count: number }>;
  scholars: Array<{ name: string; count: number }>;
}

export function AdminDashboardClient({
  initialCount,
  sources,
  categories,
  scholars,
}: AdminDashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'manage' | 'add' | 'system'>('overview');

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

      // Reset form
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-semibold">মোট ভেরিফাইড ফতোয়া</span>
                <Database className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                {totalCount.toLocaleString()}
              </p>
            </div>

            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-semibold">উৎস পত্রিকা সমূহ</span>
                <BarChart3 className="h-5 w-5 text-teal-600" />
              </div>
              <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                {sources.length}
              </p>
            </div>

            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-semibold">স্কলার প্যানেল</span>
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
              </div>
              <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                {scholars.length}
              </p>
            </div>
          </div>

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
