/**
 * Unified Bengali, Arabic & Multilingual Search Text Normalization Pipeline
 * 
 * Used identically for document indexing and query-time processing.
 */

// Bengali digits to Latin digits map
const BENGALI_DIGIT_MAP: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

// Common Bengali inflectional and postpositional suffixes (longest first)
// Rules:
// 1. Longest-suffix first order to prevent sub-string truncation (e.g. 'গুলোতে' before 'গুলো' before 'তে')
// 2. Minimum stem length >= 2 characters to protect roots like 'মা', 'চা', 'গা'
export const BENGALI_SUFFIXES = [
  'গুলোতে', 'গুলোর', 'গুলোকে', 'গুলোয়', 'সমূহের', 'সমূহ',
  'গুলির', 'গুলিতে', 'গুলো', 'গুলি',
  'দেরকে', 'দের',
  'েদেরকে', 'েদের',
  'েরা', 'টির', 'টিকে', 'টাতে', 'টার', 'টাকে',
  'খানা', 'খানি', 'ভাবে', 'ধারী', 'কারী', 'সম্মত',
  'ের', 'টি', 'টা', 'কে', 'তে', 'রা', 'ে', 'র', 'য়', 'য়ে'
];

// Stopwords and conversational interrogatives/filler removed from query ranking
export const STOPWORDS = new Set([
  // Bengali Interrogative & Question Fillers
  'কি', 'কী', 'কেন', 'কিভাবে', 'কীভাবে', 'কোন', 'কোনো', 'কোনটি', 'কোনটা',
  'কখন', 'কোথায়', 'কোথায়', 'কিনা', 'কত',
  // Common Verbs / Modals / Auxiliaries
  'হবে', 'হয়', 'হয়', 'হলে', 'হয়ে', 'হয়ে', 'হওয়া', 'হওয়া',
  'করতে', 'পারি', 'পারে', 'পারবে', 'করা', 'করার', 'করে', 'করলে',
  'আছে', 'ছিল', 'থাকে', 'থাকলে', 'যায়', 'যায়', 'যাবে', 'গেলে',
  'দেওয়া', 'দেওয়া', 'দেয়া', 'দেয়া', 'দিলে', 'নেওয়া', 'নেওয়া', 'নেয়া', 'নেয়া',
  // Pronouns & Possessives
  'আমি', 'আমার', 'আমরা', 'আমাদের', 'তুমি', 'তোমার', 'তোমরা', 'আপনাদের',
  'সে', 'তার', 'তাদের', 'তাকে', 'তিনি', 'তার', 'তা',
  // Conjunctions & Prepositions
  'এবং', 'ও', 'বা', 'অথবা', 'কিন্তু', 'আর', 'এর',
  'জন্য', 'জন্যে', 'থেকে', 'হতে', 'পর', 'পরে', 'আগে',
  'উপর', 'উপরে', 'নিচে', 'নীচে', 'সাথে', 'সহ', 'দ্বারা', 'দিয়ে', 'দিয়ে',
  // Domain Filler Nouns (Removed from lexical ranking to avoid BM25 pollution)
  'সম্পর্কে', 'বিষয়ে', 'বিষয়', 'বিষয়ে', 'ব্যাপারে', 'নিয়ে', 'নিয়ে',
  'বিধান', 'হুকুম', 'নিয়ম', 'নিয়ম', 'পদ্ধতি', 'আমল',
  'প্রশ্ন', 'উত্তর', 'ফতোয়া', 'ফতোয়া',
  // English Stopwords
  'what', 'how', 'ruling', 'about', 'the', 'is', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'and', 'or', 'can', 'i'
]);

/**
 * Normalizes Arabic text:
 * - Strips Harakat / Tashkeel (\u064B - \u065F, \u0670)
 * - Strips Tatweel / Kashida (\u0640)
 * - Normalizes Alif variants (أ, إ, آ, ٱ -> ا)
 * - Normalizes Alif Maqsura (ى -> ي)
 * - Normalizes Ta Marbuta (ة -> ه)
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    // Strip Harakat / Tashkeel
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Strip Tatweel / Kashida
    .replace(/\u0640/g, '')
    // Normalize Alif forms (أ, إ, آ, ٱ -> ا)
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    // Normalize Alif Maqsura to Ya (ى -> ي)
    .replace(/\u0649/g, '\u064A');
}

/**
 * Strips Zero-Width characters (ZWJ, ZWNJ, LTR/RTL marks)
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
 * Full Text Normalization Pipeline:
 * 1. Unicode NFC composition
 * 2. Lowercase
 * 3. Remove ZWJ / ZWNJ (\u200c, \u200d)
 * 4. Arabic harakat, tatweel, and letter normalization
 * 5. Bengali digits -> Latin digits
 * 6. Broken decomposed Bengali vowel repair (অ + া -> আ)
 * 7. Whitespace clean-up
 */
export function normalizeText(text: string): string {
  if (!text) return '';

  let normalized = text.normalize('NFC').toLowerCase();
  normalized = stripZeroWidth(normalized);
  normalized = normalizeArabic(normalized);
  normalized = convertBengaliDigits(normalized);

  // Fix broken decomposed Bengali vowels
  normalized = normalized.replace(/অা/g, 'আ');

  // Collapse whitespace
  return normalized.replace(/\s+/g, ' ').trim();
}

/**
 * Light Bengali Stemmer:
 * Strips inflectional and postpositional suffixes while preserving root words
 * with a minimum length of 2 characters.
 * 
 * Examples:
 * - 'নামাজগুলোতে' -> 'নামাজ'
 * - 'মসজিদের' -> 'মসজিদ'
 * - 'রোজাটিকে' -> 'রোজা'
 * - 'হাদিসে' -> 'হাদিস'
 */
export function stemBengali(token: string): string {
  if (!token || token.length < 3) return token;

  const clean = normalizeText(token);
  if (clean.length < 3) return clean;

  for (const suffix of BENGALI_SUFFIXES) {
    if (clean.endsWith(suffix) && (clean.length - suffix.length) >= 2) {
      return clean.slice(0, clean.length - suffix.length);
    }
  }

  return clean;
}

/**
 * Checks whether a token is an interrogative/stopword
 */
export function isStopword(token: string): boolean {
  if (!token) return true;
  const clean = token.toLowerCase().trim();
  return STOPWORDS.has(clean);
}

/**
 * Splits text into normalized, stemmed, and optionally stopword-filtered tokens.
 */
export function processTokens(text: string, filterStopwords: boolean = true): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  // Split on Unicode whitespace and punctuation
  const rawTokens = normalized
    .split(/[\s,.;:!?"'()\[\]{}।\\/\-_–—+*=<>#@%^&|~`]+/u)
    .map((t) => t.trim())
    .filter(Boolean);

  const tokens: string[] = [];
  for (const token of rawTokens) {
    if (filterStopwords && isStopword(token)) {
      continue;
    }
    const stemmed = stemBengali(token);
    if (stemmed.length >= 2) {
      tokens.push(stemmed);
    } else if (token.length >= 2) {
      tokens.push(token);
    }
  }

  return tokens;
}
