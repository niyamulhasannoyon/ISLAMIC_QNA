"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import {
  Mail,
  MessageSquare,
  ShieldCheck,
  ArrowLeft,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileText,
  Clock,
  Sparkles,
} from "lucide-react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "general_inquiry",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.message.trim() || formData.message.trim().length < 5) {
      setError("বার্তাটি অত্যন্ত সংক্ষিপ্ত। অনুগ্রহ করে বিস্তারিত লিখুন।");
      return;
    }

    setSubmitting(true);
    try {
      // Simulate/submit inquiry
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSuccess(true);
      setFormData({ name: "", email: "", subject: "general_inquiry", message: "" });
    } catch {
      setError("বার্তা পাঠাতে সমস্যা হয়েছে। কিছুক্ষণ পর পুনরায় চেষ্টা করুন।");
    } finally {
      setSubmitting(false);
    }
  };

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
          <span className="text-xs text-zinc-400 font-mono">সহায়তা ও যোগাযোগ</span>
        </nav>

        {/* Primary Container */}
        <article className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800/90 rounded-2xl p-6 sm:p-10 shadow-sm space-y-8">
          {/* Header */}
          <header className="pb-6 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold mb-3">
              <Mail className="h-3.5 w-3.5" />
              <span>যোগাযোগ ও প্রতিক্রিয়া</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-bengali-serif">
              যোগাযোগ ও রিপোর্ট (Contact & Feedback)
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Deen QnA প্ল্যাটফর্মের কোনো তথ্যে ত্রুটি লক্ষ্য করলে, নতুন উৎস সংযুক্তির পরামর্শ থাকলে কিংবা সাধারণ অনুসন্ধানে আমাদের সাথে যোগাযোগ করুন।
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Contact Details & Info */}
            <div className="md:col-span-1 space-y-4">
              <div className="p-4 rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                  <Mail className="h-4 w-4" />
                  <span>ইমেইল যোগাযোগ</span>
                </div>
                <div className="text-xs space-y-1.5 text-zinc-600 dark:text-zinc-400">
                  <p>
                    <strong className="text-zinc-800 dark:text-zinc-200">সম্পাদকীয় টিম:</strong>
                    <br />
                    <a
                      href="mailto:editorial@deenqna.org"
                      className="text-emerald-600 dark:text-emerald-400 hover:underline font-mono"
                    >
                      editorial@deenqna.org
                    </a>
                  </p>
                  <p className="pt-2">
                    <strong className="text-zinc-800 dark:text-zinc-200">কারিগরি ও সহায়তা:</strong>
                    <br />
                    <a
                      href="mailto:support@deenqna.org"
                      className="text-emerald-600 dark:text-emerald-400 hover:underline font-mono"
                    >
                      support@deenqna.org
                    </a>
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                  <Clock className="h-4 w-4" />
                  <span>প্রতিক্রিয়া সময়</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  আমরা সাধারণত ২৪ থেকে ৪৮ কর্মঘণ্টার মধ্যে প্রাপ্ত বার্তা ও ত্রুটি রিপোর্ট পর্যালোচনা করে প্রয়োজনীয় ব্যবস্থা গ্রহণ করি।
                </p>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  <HelpCircle className="h-4 w-4" />
                  <span>নির্দিষ্ট ফতোয়ার ত্রুটি?</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  নির্দিষ্ট কোনো ফতোয়ার ভুল বা টাইপো রিপোর্ট করতে ফতোয়া পৃষ্ঠায় থাকা <strong className="text-zinc-800 dark:text-zinc-200">সমস্যা জানান</strong> বোতামটি ব্যবহার করতে পারেন।
                </p>
              </div>
            </div>

            {/* Submission Form */}
            <div className="md:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-4">
                {success && (
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm flex items-start gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">বার্তা সফলভাবে পাঠানো হয়েছে!</p>
                      <p className="text-xs mt-0.5">
                        আপনার মতামতের জন্য আন্তরিক জাযাকাল্লাহু খাইরান। আমাদের টিম দ্রুত এটি পর্যালোচনা করবে।
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs sm:text-sm flex items-start gap-2.5">
                    <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">ত্রুটি</p>
                      <p className="text-xs mt-0.5">{error}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      আপনার নাম (ঐচ্ছিক)
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="উদা: আব্দুল্লাহ"
                      className="w-full px-3.5 py-2 rounded-lg text-xs sm:text-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      ইমেইল ঠিকানা (ঐচ্ছিক)
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="you@example.com"
                      className="w-full px-3.5 py-2 rounded-lg text-xs sm:text-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    বার্তার বিষয়
                  </label>
                  <select
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg text-xs sm:text-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  >
                    <option value="general_inquiry">সাধারণ জিজ্ঞাসা ও যোগাযোগ</option>
                    <option value="content_error">ফতোয়ায় ভুল বা অসংগতি সংশোধন</option>
                    <option value="suggest_source">নতুন নির্ভরযোগ্য উৎস বা পত্রিকা প্রস্তাব</option>
                    <option value="tech_issue">ওয়েবসাইট বা সার্চ সমস্যা</option>
                    <option value="partnership">সহযোগিতা বা দাওয়াহ সমন্বয়</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    বার্তা বা বিবরণ <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    rows={5}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="আপনার বার্তা বা প্রস্তাব বিস্তারিতভাবে লিখুন..."
                    className="w-full px-3.5 py-2 rounded-lg text-xs sm:text-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium text-xs sm:text-sm transition-colors shadow-sm"
                >
                  <Send className="h-4 w-4" />
                  <span>{submitting ? "পাঠানো হচ্ছে..." : "বার্তা পাঠান"}</span>
                </button>
              </form>
            </div>
          </div>
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
            <Link href="/sources" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              উৎস ও ঘোষণা
            </Link>
            <span>&bull;</span>
            <Link href="/contact" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors font-semibold text-emerald-600 dark:text-emerald-400">
              যোগাযোগ
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
