/**
 * Bengali Phonetic Encoder & Soundex / Metaphone Module
 * 
 * Maps Bengali characters into standardized phonetic equivalence classes so that
 * phonetically identical or interchangeable spellings (e.g. ওযু, অজু, উযু, উজু, ওজু)
 * resolve to identical phonetic signatures.
 */

// Mapping of Bengali consonants to phonetic sound classes
const CONSONANT_MAP: Record<string, string> = {
  // Velars (ক, খ, গ, ঘ)
  'ক': 'K', 'খ': 'K', 'গ': 'G', 'ঘ': 'G', 'ঙ': 'N',
  'ক্ব': 'K', 'খ়': 'K', 'গ়': 'G',

  // Palatals & Sibilants (চ, ছ, জ, ঝ, ঞ, য, য়, শ, ষ, স, ছ)
  'চ': 'C', 'ছ': 'S', 'জ': 'J', 'ঝ': 'J', 'ঞ': 'N',
  'য': 'J', 'য়': 'Y', 'শ': 'S', 'ষ': 'S', 'স': 'S',
  'ঝ়': 'J', 'জ়': 'J',

  // Retroflex & Dentals (ট, ঠ, ড, ঢ, ণ, ত, থ, দ, ধ, ন, ৎ)
  'ট': 'T', 'ঠ': 'T', 'ড': 'D', 'ঢ': 'D', 'ণ': 'N',
  'ত': 'T', 'থ': 'T', 'দ': 'D', 'ধ': 'D', 'ন': 'N',
  'ৎ': 'T',

  // Labials (প, ফ, ব, ভ, ম)
  'প': 'P', 'ফ': 'P', 'ব': 'B', 'ভ': 'B', 'ম': 'M',
  'ফ়': 'P', 'ভ়': 'B',

  // Liquids & Glides (য, র, ল, ড়, ঢ়, ব)
  'র': 'R', 'ল': 'L', 'ড়': 'R', 'ঢ়': 'R', 'ৱ': 'W',

  // Aspirates & Modifiers (হ, ং, ঃ, ঁ)
  'হ': 'H', 'ং': 'N', 'ঃ': 'H', 'ঁ': '',
};

// Mapping of Bengali Vowels & Kar signs to canonical vowel sound classes
const VOWEL_MAP: Record<string, string> = {
  // 'O' / 'U' back rounded vowels (অ, ও, উ, ঊ, ু, ূ, ো, ৌ)
  'অ': 'O', 'ও': 'O', 'উ': 'U', 'ঊ': 'U',
  'ু': 'U', 'ূ': 'U', 'ো': 'O', 'ৌ': 'O',

  // 'A' open vowels (আ, া)
  'আ': 'A', 'া': 'A',

  // 'I' / 'E' front vowels (ই, ঈ, এ, ঐ, ি, ী, ে, ৈ)
  'ই': 'I', 'ঈ': 'I', 'এ': 'E', 'ঐ': 'E',
  'ি': 'I', 'ী': 'I', 'ে': 'E', 'ৈ': 'E',

  // Vocalic R
  'ঋ': 'RI', 'ৃ': 'RI',
};

// Punctuation and Arabic glottal / Ayn / Hamza characters to normalize out
const STRIP_REGEX = /[\u09CD\u09BC‘'’"ʻʼ`\-–—.,;:!?()[\]{}<>\/\\*+=#@^~|_%$0-9০-৯]/g;

/**
 * Encodes a Bengali word or token into a normalized phonetic sound signature.
 * 
 * Examples:
 * - 'ওযু' -> 'OJU'
 * - 'অজু' -> 'OJU'
 * - 'উযু' -> 'UJU' -> canonicalized to 'OJU'
 * - 'উজু' -> 'OJU'
 * - 'নামাজ' -> 'NAMJ'
 * - 'নামায' -> 'NAMJ'
 * - 'সালাত' -> 'SALT'
 * - 'ছালাত' -> 'SALT'
 * - 'হাদীস' -> 'HDIS'
 * - 'হাদিস' -> 'HDIS'
 * - 'হাদীছ' -> 'HDIS'
 * - 'কুরআন' -> 'KRN'
 * - 'কোরআন' -> 'KRN'
 */
export function encodeBengaliPhonetic(word: string): string {
  if (!word) return '';

  const clean = word.trim().replace(STRIP_REGEX, '');
  if (!clean) return '';

  let encoded = '';
  let prevChar = '';

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    let sound = '';

    if (CONSONANT_MAP[char] !== undefined) {
      sound = CONSONANT_MAP[char];
    } else if (VOWEL_MAP[char] !== undefined) {
      sound = VOWEL_MAP[char];
    } else {
      sound = char.toUpperCase();
    }

    // Collapse repeating identical sound codes (e.g. 'JJ' -> 'J', 'SS' -> 'S')
    if (sound && sound !== prevChar) {
      encoded += sound;
      prevChar = sound;
    }
  }

  // Canonicalize initial O/U confusion for Arabic loanwords (e.g. UJU -> OJU, UMR -> OMR)
  if (encoded.startsWith('UJ')) {
    encoded = 'OJ' + encoded.slice(2);
  }

  return encoded;
}

/**
 * Generates an array of phonetic tokens for a sentence or multi-word text.
 */
export function extractPhoneticTokens(text: string): string[] {
  if (!text) return [];
  const words = text
    .split(/[\s,.;:!?"'‘’।()\-–—\/\\]+/)
    .filter((w) => w.length > 0);

  const set = new Set<string>();
  for (const w of words) {
    const code = encodeBengaliPhonetic(w);
    if (code && code.length >= 2) {
      set.add(code);
    }
  }

  return Array.from(set);
}
