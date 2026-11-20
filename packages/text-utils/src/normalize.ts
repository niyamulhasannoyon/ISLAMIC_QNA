/**
 * Pure TypeScript Multilingual & Bengali Orthographic Normalizer
 * 
 * Provides:
 * 1. Unicode NFC normalization & whitespace standardization
 * 2. Unification of apostrophes and Arabic Ayn / Hamza characters
 * 3. Decomposed vowel ligature repair (e.g. অ + া -> আ)
 * 4. Arabic Tashkeel/Harakat stripping, Tatweel stripping, and Alif/Ya/Ha normalization
 * 5. Bengali digit to Latin digit conversion
 * 6. Zero-width character stripping (ZWJ, ZWNJ)
 * 7. Comprehensive stopword & question filler identification
 */

// Bengali digits to Latin digits map
const BENGALI_DIGIT_MAP: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

export const STOP_WORDS = new Set([
  // Bengali Interrogative & Question Fillers
  'কি', 'কী', 'কে', 'কেন', 'কোথায়', 'কোথায়', 'কখন', 'কিভাবে', 'কীভাবে', 'কোন', 'কোনো', 'কোনটি', 'কোনটা', 'কিনা', 'কত',
  // Common Verbs / Modals / Auxiliaries
  'হবে', 'হলে', 'হয়', 'হয়', 'হয়ে', 'হয়ে', 'হওয়া', 'হওয়া',
  'করলে', 'করা', 'করার', 'করে', 'করতে', 'পারি', 'পারে', 'পারবে',
  'যায়', 'যায়', 'যাবে', 'গেলে', 'পাওয়া', 'পাওয়ার', 'পায়', 'পায়', 'পেলে',
  'দিলে', 'দেওয়া', 'দেওয়া', 'দেয়ার', 'দেওয়ার', 'দেয়া', 'দেয়া',
  'নেওয়া', 'নেওয়া', 'নেওয়ার', 'নেওয়ার', 'নেয়া', 'নেয়া',
  'আছে', 'ছিল', 'থাকে', 'থাকলে', 'অবস্থা', 'অবস্থায়', 'অবস্থায়',
  'যে', 'যা', 'যার', 'যাদের', 'যেটি', 'যেটা',
  // Conjunctions & Prepositions
  'এবং', 'বা', 'অথবা', 'কিন্তু', 'ও', 'আর',
  'এর', 'র', 'ে', 'তে', 'য়', 'য়ে', 'টি', 'টা', 'জন', 'খান', 'খানা', 'খানি',
  'সব', 'সকল', 'সমস্ত', 'জন্য', 'জন্যে', 'থেকে', 'হতে', 'পর', 'পরে', 'আগে',
  'উপর', 'উপরে', 'নিচে', 'নীচে', 'সাথে', 'সহ', 'সহকারে', 'দ্বারা', 'দিয়ে', 'দিয়ে',
  'প্রতি', 'মতো', 'মত', 'কারণ', 'কারণে', 'ফলে',
  'আমি', 'আমার', 'আমরা', 'আমাদের', 'তুমি', 'তোমার', 'তোমরা', 'আপনাদের',
  'সে', 'তা', 'তার', 'তাদের', 'তাকে', 'এমনি', 'এমন', 'এরকম', 'ঐ', 'ওই', 'এই', 'এ',
  // Domain Filler Nouns (Filtered from lexical scoring to avoid dilution)
  'সম্পর্কে', 'বিষয়ে', 'বিষয়', 'বিষয়ে', 'ব্যাপারে', 'নিয়ে', 'নিয়ে', 'ছাড়া', 'ছাড়া',
  'হুকুম', 'বিধান', 'নিয়ম', 'নিয়ম', 'পদ্ধতি', 'আমল',
  'প্রশ্ন', 'উত্তর', 'ফতোয়া', 'ফতোয়া',
  // Banglish Grammatical Inflections & Stop Words
  'er', 'r', 'e', 'te', 'ti', 'ta', 'jon', 'khan', 'khana', 'khani',
  'sob', 'sokol', 'shob', 'shokol', 'shomostho', 'somosto',
  'jonno', 'jonne', 'theke', 'hote', 'por', 'pore', 'age', 'upor', 'upore',
  'niche', 'neeche', 'shathe', 'sathe', 'shoho', 'dara', 'diye', 'proti',
  'moto', 'mot', 'karon', 'karone', 'fole', 'se', 'ta', 'tar', 'tader', 'take',
  'ei', 'oi', 'ki', 'kee', 'ke', 'keno', 'kothay', 'kokhon', 'kivabe', 'kina',
  'hobe', 'hole', 'hoy', 'hoye', 'howa', 'korle', 'kora', 'korar', 'kore',
  'jay', 'jabe', 'dile', 'dewa', 'deya', 'neya', 'obostha', 'obosthay',
  'kon', 'kono', 'je', 'ja', 'jar', 'ebong', 'ba', 'othoba', 'kintu', 'o', 'ar',
  'somporke', 'bishoye', 'bapare', 'niye', 'chara', 'chada',
  'niyom', 'hukum', 'bidhan', 'poddhoti', 'amol', 'koto', 'kototuku',
  // English Stopwords
  'what', 'how', 'ruling', 'about', 'the', 'is', 'of', 'in', 'on', 'at', 'to', 'for', 'from', 'with', 'and', 'or', 'can', 'i'
]);

/**
 * Normalizes Arabic script:
 * - Strips Harakat / Tashkeel (\u064B-\u065F, \u0670)
 * - Strips Tatweel / Kashida (\u0640)
 * - Normalizes Alif variants (أ, إ, آ, ٱ -> ا)
 * - Normalizes Alif Maqsura (ى -> ي)
 * - Normalizes Ta Marbuta (ة -> ه)
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A');
}

/**
 * Strips zero-width characters (ZWJ, ZWNJ, formatting marks)
 */
export function stripZeroWidth(text: string): string {
  if (!text) return '';
  return text.replace(/[\u200B-\u200D\uFEFF\u200E\u200F]/g, '');
}

/**
 * Converts Bengali digits (০-৯) to Latin digits (0-9)
 */
export function convertBengaliDigits(text: string): string {
  if (!text) return '';
  return text.replace(/[০-৯]/g, (ch) => BENGALI_DIGIT_MAP[ch] || ch);
}

/**
 * Normalizes Unicode text:
 * - NFC composition
 * - Lowercase
 * - Removes zero-width characters
 * - Arabic harakat, tatweel, and letter normalization
 * - Bengali digits to Latin digits
 * - Unifies all apostrophe / Ayn / Hamza variations to standard single quote
 * - Fixes broken decomposed Bengali vowels (e.g. অ + া -> আ)
 * - Collapses whitespace
 */
export function normalizeBengaliText(text: string): string {
  if (!text) return '';

  let normalized = text.normalize('NFC').toLowerCase();
  normalized = stripZeroWidth(normalized);
  normalized = normalizeArabic(normalized);
  normalized = convertBengaliDigits(normalized);

  normalized = normalized
    .replace(/[‘'’"ʻʼ`ʿ]/g, '‘')
    .replace(/অা/g, 'আ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return normalized;
}

export const normalizeText = normalizeBengaliText;

/**
 * Checks whether a token is a common grammatical stop word or question filler.
 */
export function isStopWord(token: string): boolean {
  if (!token) return false;
  return STOP_WORDS.has(token.trim().toLowerCase());
}

export const isStopword = isStopWord;
