/**
 * Pure TypeScript Bengali Morphological Stemmer
 * 
 * Suffix stripping (Bengali Light Stemming) while ensuring
 * the remaining root has meaningful length (minimum 2 characters).
 */

export const MULTI_SUFFIXES = [
  'গুলোর', 'গুলির', 'সমূহ', 'গুলো', 'গুলি',
  'দেরকে', 'দের', 'খানা', 'খানি', 'গুলোয়', 'গুলিতে',
  'ভাবে', 'ধারী', 'কারী', 'সম্মত',
  'গুলোতে', 'সমূহের',
  'টিতে', 'টাতে', 'টিকে', 'টাকে', 'টির', 'টার',
  'েতে', 'য়ের', 'েটি',
  '\u09C7\u09B0', // "ের" (e-kar + ro) e.g. নামাজের, হাদিসের, বৈঠকের
];

export const SHORT_SUFFIXES = [
  'য়ে', 'টা', 'টি', 'জন',
  'র', 'ে', 'য়',
];

/**
 * Strips inflectional suffixes from Bengali tokens while preserving the root word.
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
