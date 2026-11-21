import { describe, it, expect } from 'vitest';
import {
  hasArabicScript,
  isPredominantlyArabic,
  parseBiDiParagraphs,
} from '@/lib/bidi';

describe('BiDi & Arabic Script Direction', () => {
  it('identifies text containing Arabic characters', () => {
    expect(hasArabicScript('صلاة التراويح')).toBe(true);
    expect(hasArabicScript('আল্লাহ তাআলা বলেন: إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا')).toBe(true);
    expect(hasArabicScript('নামাজের আহকাম ও আরকান')).toBe(false);
  });

  it('determines whether text is predominantly Arabic', () => {
    const arabicAyah = 'قُلْ هُوَ اللَّهُ أَحَدٌ اللَّهُ الصَّمَدُ';
    expect(isPredominantlyArabic(arabicAyah)).toBe(true);

    const bengaliTextWithShortTerm = 'তিনি রাসূলুল্লাহ (সাল্লাল্লাহু আলাইহি ওয়া সাল্লাম)-কে জিজ্ঞেস করলেন।';
    // Short Arabic phrase in long Bengali sentence should remain predominantly Bengali (LTR)
    expect(isPredominantlyArabic(bengaliTextWithShortTerm)).toBe(false);
  });

  it('parses multi-paragraph text into correct LTR and RTL blocks', () => {
    const mixedText = `
প্রশ্ন: ওযুর দোয়া কি?
উত্তর: ওযু শুরুর সময় বলবে:
بِسْمِ اللَّهِ
এবং ওযু শেষ করার পর বলবে:
أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ
    `.trim();

    const paragraphs = parseBiDiParagraphs(mixedText);
    expect(paragraphs.length).toBe(5);

    // Paragraph 1: Bengali question (LTR)
    expect(paragraphs[0].dir).toBe('ltr');
    expect(paragraphs[0].lang).toBe('bn');

    // Paragraph 2: Bengali intro (LTR)
    expect(paragraphs[1].dir).toBe('ltr');

    // Paragraph 3: Arabic dua 1 (RTL)
    expect(paragraphs[2].dir).toBe('rtl');
    expect(paragraphs[2].lang).toBe('ar');

    // Paragraph 4: Bengali transition (LTR)
    expect(paragraphs[3].dir).toBe('ltr');

    // Paragraph 5: Arabic dua 2 (RTL)
    expect(paragraphs[4].dir).toBe('rtl');
    expect(paragraphs[4].lang).toBe('ar');
  });

  it('handles null, undefined, and empty string safely', () => {
    expect(hasArabicScript(null)).toBe(false);
    expect(isPredominantlyArabic(undefined)).toBe(false);
    expect(parseBiDiParagraphs('')).toEqual([]);
  });
});
