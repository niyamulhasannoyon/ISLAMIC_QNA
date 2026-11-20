import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  normalizeArabic,
  stripZeroWidth,
  convertBengaliDigits,
  stemBengali,
  isStopword,
  processTokens,
} from '../normalize';

describe('Search Text Normalization Pipeline', () => {
  it('strips zero-width characters (ZWJ/ZWNJ)', () => {
    const raw = 'সালা\u200Cত ও \u200Dরোজা';
    expect(stripZeroWidth(raw)).toBe('সালাত ও রোজা');
  });

  it('converts Bengali digits to Latin digits', () => {
    expect(convertBengaliDigits('২০২৪ সালের ১২টি বই')).toBe('2024 সালের 12টি বই');
  });

  it('strips Arabic Harakat, Tatweel, and normalizes Alif variants', () => {
    // Stretched with tatweel and with tashkeel
    const vocalized = 'صَلَاةُ التَّرَاوِيحِ';
    const stretched = 'صـــــلاة';
    const alifVariants = 'أحمد إبراهيم آمنة ٱتقوا';

    expect(normalizeArabic(vocalized)).toBe('صلاة التراويح');
    expect(normalizeArabic(stretched)).toBe('صلاة');
    expect(normalizeArabic(alifVariants)).toBe('احمد ابراهيم امنه اتقوا');
  });

  it('normalizes Arabic Alif Maqsura to Ya and Ta Marbuta to Ha', () => {
    expect(normalizeArabic('فتوى')).toBe('فتوي');
    expect(normalizeArabic('صلاة')).toBe('صلاه');
  });

  it('applies full normalizeText pipeline', () => {
    const mixed = '  صَلَاةُ   \u200Cনামাজের ১২টি নিয়ম!  ';
    const normalized = normalizeText(mixed);
    expect(normalized).toBe('صلاه নামাজের 12টি নিয়ম!');
  });

  it('stems Bengali common suffixes while preserving min stem length 2', () => {
    // Suffixes: গুলোতে, দেরকে, ের, তে, ইত্যাদি
    expect(stemBengali('মসজিদগুলোতে')).toBe('মসজিদ');
    expect(stemBengali('নামাজীদেরকে')).toBe('নামাজী');
    expect(stemBengali('হাদিসের')).toBe('হাদিস');
    expect(stemBengali('সালাতে')).toBe('সালাত');
    expect(stemBengali('রোজাটিকে')).toBe('রোজা');
    expect(stemBengali('বৈঠকে')).toBe('বৈঠক');

    // Root with length 2 should NOT be over-stemmed
    expect(stemBengali('মা')).toBe('মা');
    expect(stemBengali('চা')).toBe('চা');
  });

  it('identifies stopwords and interrogatives accurately', () => {
    expect(isStopword('কি')).toBe(true);
    expect(isStopword('কী')).toBe(true);
    expect(isStopword('কেন')).toBe(true);
    expect(isStopword('কিভাবে')).toBe(true);
    expect(isStopword('হবে')).toBe(true);
    expect(isStopword('বিধান')).toBe(true);
    expect(isStopword('ruling')).toBe(true);
    expect(isStopword('about')).toBe(true);

    expect(isStopword('সালাত')).toBe(false);
    expect(isStopword('ইনহেলার')).toBe(false);
    expect(isStopword('সুদ')).toBe(false);
  });

  it('processes text into normalized, stemmed, stopword-filtered tokens', () => {
    const query = 'রোজা রেখে রক্ত দিলে কি রোজা ভেঙ্গে যাবে?';
    const tokens = processTokens(query, true);

    // Stopwords 'রেখে', 'দিলে', 'কি', 'যাবে' should be filtered out
    expect(tokens).toContain('রোজ'); // 'রোজা' stemmed with suffix stripped or root
    expect(tokens).toContain('রক্ত');
    expect(tokens).not.toContain('কি');
  });
});
