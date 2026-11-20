'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, CheckCircle2, Send, Flag, Loader2 } from 'lucide-react';
import { ReportIssueType } from '@/types/fatwa';

interface ReportIssueModalProps {
  fatwaId: string;
  fatwaTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

const ISSUE_OPTIONS: Array<{ value: ReportIssueType; label: string; desc: string }> = [
  { value: 'typo', label: 'বানান বা টাইপো ভুল', desc: 'অক্ষর বা শব্দের বানান ভুল রয়েছে' },
  { value: 'factual_error', label: 'তথ্য বা উদ্ধৃতিতে অসঙ্গতি', desc: 'হাদিস নম্বর, আয়াত রেফারেন্স বা তথ্যের ভুল' },
  { value: 'broken_link', label: 'মূল উৎসের লিঙ্ক কাজ করছে না', desc: 'অরিজিনাল সাইটের লিঙ্কটি ৪০৪ বা অকার্যকর' },
  { value: 'wrong_category', label: 'ভুল ক্যাটাগরি', desc: 'ফতোয়াটি ভুল বিষয়ে অন্তর্ভুক্ত হয়েছে' },
  { value: 'scholarly_dispute', label: 'শারয়ী আপত্তি বা মন্তব্য', desc: 'আলেমগণের ভিন্ন পর্যালোচনা প্রয়োজন' },
  { value: 'other', label: 'অন্যান্য সমস্যা', desc: 'অন্য কোনো সমস্যা বা সাধারণ মতামত' },
];

export function ReportIssueModal({ fatwaId, fatwaTitle, isOpen, onClose }: ReportIssueModalProps) {
  const [mounted, setMounted] = useState(false);
  const [issueType, setIssueType] = useState<ReportIssueType>('typo');
  const [description, setDescription] = useState('');
  const [proposedCorrection, setProposedCorrection] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock scroll
  useEffect(() => {
    if (isOpen && mounted) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, mounted]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || description.trim().length < 5) {
      setStatusMessage({ type: 'error', text: 'অনুগ্রহ করে সমস্যার বিবরণ বিস্তারিত লিখুন (কমপক্ষে ৫ অক্ষর)।' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/v1/fatwa/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fatwaId,
          issueType,
          description: description.trim(),
          proposedCorrection: proposedCorrection.trim() || null,
          reporterName: reporterName.trim() || null,
          reporterEmail: reporterEmail.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'রিপোর্ট পাঠাতে ব্যর্থ হয়েছে');
      }

      setStatusMessage({
        type: 'success',
        text: data.message || 'আপনার রিপোর্টটি সফলভাবে গ্রহণ করা হয়েছে। জাযাকাল্লাহু খাইরান!',
      });

      // Clear fields on success
      setTimeout(() => {
        onClose();
        setDescription('');
        setProposedCorrection('');
        setStatusMessage(null);
      }, 2500);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'নেটওয়ার্ক ত্রুটি, পরে চেষ্টা করুন।' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 overflow-hidden font-bengali">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-white dark:bg-[#141417] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-[#18181c]/60">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Flag className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                সমস্যা রিপোর্ট বা সংশোধন প্রস্তাব
              </h3>
              <p className="text-xs text-zinc-500 truncate max-w-[280px] sm:max-w-[360px]">
                {fatwaTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          {statusMessage && (
            <div
              className={`p-3 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Issue Type Selection */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-800 dark:text-zinc-200">
              সমস্যার ধরন নির্বাচন করুন <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ISSUE_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setIssueType(opt.value)}
                  className={`text-left p-2.5 rounded-xl border transition-all ${
                    issueType === opt.value
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <p className="font-medium text-xs">{opt.label}</p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Problem Description */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-800 dark:text-zinc-200">
              সমস্যার বিস্তারিত বিবরণ <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="কোথায় কী ভুল দেখতে পাচ্ছেন তা নির্দিষ্ট করে লিখুন..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-xs sm:text-sm"
            />
          </div>

          {/* Proposed Correction */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
              <span>সঠিক পাঠ বা সমাধান (ঐচ্ছিক)</span>
              <span className="text-[11px] text-zinc-400 font-normal">জানা থাকলে দিন</span>
            </label>
            <textarea
              rows={2}
              value={proposedCorrection}
              onChange={(e) => setProposedCorrection(e.target.value)}
              placeholder="সঠিক বানান, রেফারেন্স বা সংশোধিত বাক্যটি এখানে লিখতে পারেন..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-xs sm:text-sm"
            />
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="space-y-1">
              <label className="text-xs text-zinc-600 dark:text-zinc-400">আপনার নাম (ঐচ্ছিক)</label>
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="নাম"
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-600 dark:text-zinc-400">ইমেইল (ঐচ্ছিক)</label>
              <input
                type="email"
                value={reporterEmail}
                onChange={(e) => setReporterEmail(e.target.value)}
                placeholder="example@mail.com"
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>পাঠানো হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>রিপোর্ট জমা দিন</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
