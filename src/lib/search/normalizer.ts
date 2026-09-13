/**
 * Bengali Orthographic Normalizer & Morphological Stemmer
 * 
 * Provides:
 * 1. Unicode & Orthographic standardization for Bengali text
 * 2. Morphological suffix stripping (Bengali Light Stemming)
 * 3. Stopword & query intent token identification
 */

// Multi-character Bengali inflectional and postpositional suffixes
// Ordered from longest to shortest.
// Note: In Bengali, suffixes attached to consonant-ending stems use vowel signs (e.g. ের \u09C7\u09B0, ে \u09C7)
// whereas suffixes attached to vowel-ending stems use consonant letters (e.g. র, তে, কে)
const MULTI_SUFFIXES = [
  'গুলোর', 'গুলির', 'সমূহ', 'গুলো', 'গুলি',
  'দেরকে', 'দের', 'খানা', 'খানি', 'গুলোয়', 'গুলিতে',
  'ভাবে', 'ধারী', 'কারী', 'সম্মত',
  'গুলোতে', 'সমূহের',
  'টিতে', 'টাতে', 'টিকে', 'টাকে', 'টির', 'টার',
  'েতে', 'য়ের', 'েটি',
  '\u09C7\u09B0', // "ের" (e-kar + ro) e.g. নামাজের, হাদিসের, বৈঠকের
];

const SHORT_SUFFIXES = [
  'য়ে', 'টা', 'টি', 'জন',
  'র', 'ে', 'য়',
];

// Common interrogative, grammatical stop words, possessives, and postpositions in fatwa queries
const STOP_WORDS = new Set([
  'কি', 'কী', 'কে', 'কেন', 'কোথায়', 'কোথায়', 'কখন', 'কিভাবে', 'কীভাবে', 'কিনা',
  'হবে', 'হলে', 'হয়', 'হয়', 'হয়ে', 'হয়ে', 'হওয়া', 'হওয়া', 'করলে', 'করা', 'করার', 'করে',
  'যায়', 'যায়', 'যাবে', 'গেলে', 'পাওয়া', 'পাওয়ার', 'পায়', 'পায়', 'পেলে',
  'দিলে', 'দেওয়া', 'দেওয়া', 'দেয়ার', 'দেওয়ার', 'দেয়া', 'দেয়া',
  'নেওয়া', 'নেওয়া', 'নেওয়ার', 'নেওয়ার', 'নেয়া', 'নেয়া',
  'অবস্থা', 'অবস্থায়', 'অবস্থায়',
  'কোন', 'কোনো', 'কোনটি', 'কোনটা', 'যে', 'যা', 'যার', 'যাদের', 'যেটি', 'যেটা',
  'এবং', 'বা', 'অথবা', 'কিন্তু', 'ও', 'আর',
  'সম্পর্কে', 'বিষয়ে', 'বিষয়', 'বিষয়ে', 'ব্যাপারে', 'নিয়ে', 'নিয়ে', 'ছাড়া', 'ছাড়া',
  'হুকুম', 'বিধান', 'নিয়ম', 'নিয়ম', 'পদ্ধতি',
  'প্রশ্ন', 'উত্তর', 'ফতোয়া', 'ফতোয়া',
  // Grammatical Case Markers & Postpositions
  'এর', 'র', 'ে', 'তে', 'য়', 'য়ে', 'টি', 'টা', 'জন', 'খান', 'খানা', 'খানি',
  'সব', 'সকল', 'সমস্ত', 'জন্য', 'জন্যে', 'থেকে', 'হতে', 'পর', 'পরে', 'আগে',
  'উপর', 'উপরে', 'নিচে', 'নীচে', 'সাথে', 'সহ', 'সহকারে', 'দ্বারা', 'দিয়ে', 'দিয়ে',
  'প্রতি', 'মতো', 'মত', 'কারণ', 'কারণে', 'ফলে',
  'সে', 'তা', 'তার', 'তাদের', 'তাকে', 'এমনি', 'এমন', 'এরকম', 'ঐ', 'ওই', 'এই', 'এ',
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
 * - 'বৈঠকে' -> 'বৈঠক'
 */
export function stemBengaliToken(token: string): string {
  if (!token || token.length <= 3) return token;

  let stemmed = token;

  for (const suf of MULTI_SUFFIXES) {
    if (stemmed.endsWith(suf) && (stemmed.length - suf.length) >= 2) {
      return stemmed.slice(0, stemmed.length - suf.length);
    }
  }

  // Handle "কে" vs locative "-ে":
  // If the word ends in "কে" and the character before it is a vowel, vowel sign,
  // or double "ক" (like "শিক্ষককে"), the suffix is "-কে".
  // Otherwise, it is locative "-ে" on a noun ending in "ক" (e.g. "বৈঠকে" -> "বৈঠক", "পুস্তকে" -> "পুস্তক").
  if (stemmed.endsWith('কে') && (stemmed.length - 2) >= 2) {
    const beforeK = stemmed.slice(0, -2);
    const lastChar = beforeK[beforeK.length - 1];
    const isVowelOrKar = /[\u0985-\u0994\u09BE-\u09CC\u09D7]/u.test(lastChar);
    const isDoubleK = beforeK.endsWith('ক');
    if (isVowelOrKar || isDoubleK || !/[\u0995-\u09B9]/u.test(lastChar)) {
      return beforeK;
    } else {
      return stemmed.slice(0, -1);
    }
  }

  for (const suf of SHORT_SUFFIXES) {
    if (stemmed.endsWith(suf) && (stemmed.length - suf.length) >= 2) {
      return stemmed.slice(0, stemmed.length - suf.length);
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
