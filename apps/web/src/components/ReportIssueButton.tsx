'use client';

import React, { useState } from 'react';
import { Flag } from 'lucide-react';
import { ReportIssueModal } from './ReportIssueModal';

interface ReportIssueButtonProps {
  fatwaId: string;
  fatwaTitle: string;
}

export function ReportIssueButton({ fatwaId, fatwaTitle }: ReportIssueButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors font-bengali font-medium px-2.5 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-800"
        title="সমস্যা রিপোর্ট করুন বা সংশোধন প্রস্তাব দিন"
      >
        <Flag className="h-3.5 w-3.5 text-amber-500" />
        <span>সমস্যা জানান</span>
      </button>

      <ReportIssueModal
        fatwaId={fatwaId}
        fatwaTitle={fatwaTitle}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
