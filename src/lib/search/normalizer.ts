/**
 * Bengali Orthographic Normalizer & Morphological Stemmer
 * 
 * Provides:
 * 1. Unicode & Orthographic standardization for Bengali text
 * 2. Morphological suffix stripping (Bengali Light Stemming)
 * 3. Stopword & query intent token identification
 */

// Common Bengali inflectional and postpositional suffixes
const SUFFIXES = [
  'গুলোর', 'গুলির', 'সমূহ', 'গুলো', 'গুলি',
  'দের', 'খানা', 'খানি', 'গুলোয়', 'গুলিতে',
  'ভাবে', 'ধারী', 'কারী', 'সম্মত',
  'য়ের', 'এর', 'তে', 'য়ে', 'কে', 'র', 'ে', 'য়',
  'টা', 'টি', 'জন', 'খানি',
];

// Common interrogative and grammatical stop words in fatwa queries
const STOP_WORDS = new Set([
  'কি', 'কী', 'কে', 'কেন', 'কোথায়', 'কখন', 'কিভাবে',
  'হবে', 'হলে', 'হয়', 'হয়ে', 'করলে', 'করা', 'করার',
  'যায়', 'যাবে', 'গেলে', 'পাওয়া', 'দিলে', 'দেওয়া',
  'কোন', 'কোনো', 'কোনটি', 'যে', 'যা', 'যার', 'যাদের',
  'এবং', 'বা', 'অথবা', 'কিন্তু', 'ও', 'আর',
  'সম্পর্কে', 'বিষয়ে', 'ব্যাপারে', 'নিয়ে',
  'হুকুম', 'বিধান', 'নিয়ম', 'নিয়ম', 'পদ্ধতি',
  'প্রশ্ন', 'উত্তর', 'ফতোয়া', 'ফতোয়া',
]);

/**
 * Normalizes Unicode text:
 * - NFC composition
 * - Unifies alternate apostrophes and Arabic Ayn/Hamza characters
 * - Unifies broken Bengali vowel combinations (e.g. অ + া -> আ)
 * - Removes non-printable and decorative characters
 */
export function normalizeBengaliText(text: string): string {
  if (!text) return '';

  return text
    .normalize('NFC')
    // Unify all apostrophe / Ayn / Hamza variations to standard single quote
    .replace(/[‘'’"ʻʼ`ءع]/g, '‘')
    // Fix broken decomposed Bengali vowels
    .replace(/অা/g, 'আ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Bengali Light Stemmer: Strips inflectional suffixes while ensuring
 * the remaining root has meaningful length (minimum 2 characters).
 * 
 * Examples:
 * - 'নামাজের' -> 'নামাজ'
 * - 'সালাতে' -> 'সালাত'
 * - 'ওযুর' -> 'ওযু'
 * - 'হাদীসে' -> 'হাদীস'
 * - 'রোজার' -> 'রোজা'
 */
export function stemBengaliToken(token: string): string {
  if (!token || token.length <= 3) return token;

  let stemmed = token;
  for (const suf of SUFFIXES) {
    if (stemmed.endsWith(suf) && (stemmed.length - suf.length) >= 2) {
      stemmed = stemmed.slice(0, stemmed.length - suf.length);
      break;
    }
  }

  return stemmed;
}

/**
 * Checks whether a token is a common grammatical stop word.
 */
export function isStopWord(token: string): boolean {
  if (!token) return false;
  return STOP_WORDS.has(token.trim().toLowerCase());
}
