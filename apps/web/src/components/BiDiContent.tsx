'use client';

import React from 'react';
import { parseBiDiParagraphs } from '@/lib/bidi';
import { cn } from '@/lib/utils';

interface BiDiContentProps {
  content?: string | null;
  className?: string;
}

export function BiDiContent({ content, className }: BiDiContentProps) {
  if (!content) return null;

  const paragraphs = parseBiDiParagraphs(content);

  return (
    <div className={cn('space-y-3.5', className)}>
      {paragraphs.map((p, index) => {
        if (!p.text) return null;

        if (p.isArabic) {
          return (
            <p
              key={index}
              dir="rtl"
              lang="ar"
              className="font-arabic text-right text-lg sm:text-xl leading-[2.2] text-zinc-900 dark:text-zinc-100 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 sm:p-4 rounded-xl border-r-4 border-emerald-500 shadow-sm"
            >
              {p.text}
            </p>
          );
        }

        return (
          <p key={index} dir="ltr" lang="bn" className="font-bengali leading-[1.85]">
            {p.text}
          </p>
        );
      })}
    </div>
  );
}

export default BiDiContent;
