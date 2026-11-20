/**
 * BiDi & Arabic Script Detection Utilities
 * Detects whether text segments are predominantly Arabic, ensuring proper
 * dir="rtl", lang="ar", and Arabic font application according to WCAG 2.1 AA.
 */

// Unicode ranges for Arabic scripts (Arabic, Arabic Supplement, Extended-A, Presentation Forms)
export const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/**
 * Returns true if the string contains any Arabic characters.
 */
export function hasArabicScript(text?: string | null): boolean {
  if (!text || typeof text !== 'string') return false;
  return ARABIC_REGEX.test(text);
}

/**
 * Returns true if a paragraph or text segment is predominantly Arabic (> 35% Arabic characters),
 * warranting full block-level RTL rendering.
 */
export function isPredominantlyArabic(text?: string | null): boolean {
  if (!text || typeof text !== 'string') return false;
  const clean = text.replace(/[\s\d\p{P}]/gu, '');
  if (!clean) return false;

  const arabicMatches = clean.match(new RegExp(ARABIC_REGEX.source, 'g')) || [];
  return arabicMatches.length / clean.length > 0.35;
}

/**
 * Splits text into paragraphs and classifies them by direction and language.
 */
export function parseBiDiParagraphs(rawText?: string | null): Array<{
  text: string;
  isArabic: boolean;
  dir: 'rtl' | 'ltr';
  lang: 'ar' | 'bn';
}> {
  if (!rawText || typeof rawText !== 'string') return [];

  const paragraphs = rawText.split(/\n+/);
  return paragraphs.map((p) => {
    const trimmed = p.trim();
    const isArabic = isPredominantlyArabic(trimmed);
    return {
      text: trimmed,
      isArabic,
      dir: isArabic ? 'rtl' : 'ltr',
      lang: isArabic ? 'ar' : 'bn',
    };
  });
}
