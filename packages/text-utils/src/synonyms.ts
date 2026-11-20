/**
 * Pure TypeScript Islamic Domain Synonym & Orthographic Equivalence Registry
 * 
 * Maps Bengali, Arabic, English, and Banglish words to their authentic religious synonyms,
 * common spelling variations (e.g. ওযু vs অজু vs উযু vs ওজু, নামায vs নামাজ vs সালাত),
 * and related legal / ritual terminology.
 */

import { normalizeBengaliText } from './normalize';

export interface SynonymGroup {
  canonical: string;
  variants: string[];
}

export const SYNONYM_GROUPS: SynonymGroup[] = [
  // ── 1. Taharah & Purity (পবিত্রতা ও ওযু) ──────────────────────────
  {
    canonical: 'ওযু',
    variants: ['অজু', 'উযু', 'উজু', 'ওজু', 'ওযূ', 'উযূ', 'wudu', 'wuzu', 'wudhu', 'oju', 'ojoo', 'وضوء'],
  },
  {
    canonical: 'পবিত্রতা',
    variants: ['পাক', 'পবিত্র', 'পবিত্রতার', 'তাহরাত', 'ত্বহারাত', 'তাহারাত', 'taharah', 'purity', 'cleanliness', 'pure', 'طهارة'],
  },
  {
    canonical: 'কুকুর',
    variants: ['dog', 'dogs', 'কুকুরের', 'কুত্তা', 'كلب', 'كلاب'],
  },
  {
    canonical: 'লালা',
    variants: ['saliva', 'লালার', 'থুতু', 'لعاب'],
  },
  {
    canonical: 'তায়াম্মুম',
    variants: ['তায়াম্মুম', 'তায়ামুম', 'তায়ামুম', 'tayammum', 'tayammam', 'تيمم'],
  },
  {
    canonical: 'গোসল',
    variants: ['গোসলে', 'ফরজ গোসল', 'ফরয গোসল', 'ghusl', 'gosol', 'গসল', 'غسل'],
  },
  {
    canonical: 'নাপাক',
    variants: ['নাপাকী', 'অপবিত্র', 'অপবিত্রতা', 'নাজাসাত', 'najasat', 'impure', 'impurity', 'نجاسة'],
  },
  {
    canonical: 'ইস্তিহাযা',
    variants: ['ইস্তিহাজা', 'মুস্তাহাযা', 'মুস্তাহাজা', 'অস্বাভাবিক রক্তস্রাব', 'দীর্ঘদিন রক্তস্রাব', 'istihadha', 'istihaza', 'প্রদর রোগ', 'استحاضة'],
  },
  {
    canonical: 'হায়েয',
    variants: ['হায়েয', 'হায়েজ', 'হায়েজ', 'হায়েস', 'ঋতুস্রাব', 'মাসিক', 'পিরিয়ড', 'period', 'menstruation', 'haidh', 'hayez', 'حيض'],
  },
  {
    canonical: 'নিফাস',
    variants: ['নেফাস', 'প্রসবোত্তর রক্তস্রাব', 'nifas', 'nefas', 'lochia', 'نفاس'],
  },
  {
    canonical: 'মাযুর',
    variants: ['মা‘যুর', 'মা’যুর', 'উযর', 'ওজর', 'অক্ষম', 'excused', 'mazur', 'majur', 'معذور'],
  },
  {
    canonical: 'মিসওয়াক',
    variants: ['মেসওয়াক', 'মেসওয়াক', 'মিসওয়াক', 'দাঁতন', 'miswak', 'meswak', 'سواك'],
  },
  {
    canonical: 'মোজা মাসেহ',
    variants: ['মোজার উপর মাসেহ', 'মাসেহ', 'মাসাহ', 'masah', 'khuffayn', 'مسح'],
  },

  // ── 2. Salah & Prayer (সালাত ও নামায) ──────────────────────────
  {
    canonical: 'সালাত',
    variants: ['ছালাত', 'নামাজ', 'নামায', 'salat', 'salah', 'namaz', 'namaj', 'صلاة'],
  },
  {
    canonical: 'তাহাজ্জুদ',
    variants: ['তাহাজ্জুদের', 'কিয়ামুল লাইল', 'কিয়ামুল্লায়ল', 'ক্বিয়ামুল লাইল', 'tahajjud', 'qiyamul layl', 'night prayer', 'تهجد'],
  },
  {
    canonical: 'তারাবীহ',
    variants: ['তারাবী', 'তারাবিহ', 'তারাবি', 'কিয়ামু রমাদান', 'taraweeh', 'tarabi', 'tarabih', 'تراويح'],
  },
  {
    canonical: 'বিতর',
    variants: ['বেতের', 'বেত্র', 'বিতরের', 'witr', 'biter', 'وتر'],
  },
  {
    canonical: 'জানাযা',
    variants: ['জানাজা', 'জানাযার', 'জানাজার', 'দাফন', 'কাফন', 'janaza', 'janazah', 'funeral', 'جنازة'],
  },
  {
    canonical: 'জুমুআ',
    variants: ['জুমু‘আ', 'জুমা', 'জুমার', 'juma', 'jummah', 'friday prayer', 'جمعة'],
  },
  {
    canonical: 'সিজদা',
    variants: ['সেজদা', 'সিজদাহ', 'সাজদা', 'sijdah', 'sajdah', 'prostration', 'سجود'],
  },
  {
    canonical: 'সাহু সিজদা',
    variants: ['সিজদায়ে সাহু', 'সেজদায়ে সাহু', 'সাহু সেজদা', 'sahu sijda', 'sajda sahw', 'سجود السهو'],
  },
  {
    canonical: 'বৈঠক',
    variants: ['বসা', 'জালসা', 'জালসায়ে ইস্তিরাহাত', 'ইস্তিরাহাত', 'বিশ্রামের বৈঠক', 'tashahhud', 'sitting in prayer', 'جلسة'],
  },
  {
    canonical: 'কওমা',
    variants: ['দাঁড়ানো', 'সোজা হয়ে দাঁড়ানো', 'রুকুর পর দাঁড়ানো', 'standing from ruku', 'قومه'],
  },
  {
    canonical: 'রুকু',
    variants: ['রুকূ', 'রুকুর', 'ruku', 'bowing', 'ركوع'],
  },
  {
    canonical: 'রাফউল ইয়াদাইন',
    variants: ['রাফয়ে ইয়াদাইন', 'রফউল ইয়াদায়েন', 'হাত উঠানো', 'হাত তোলা', 'raf al yaddayn', 'raising hands', 'رفع اليدين'],
  },
  {
    canonical: 'হাত বাঁধা',
    variants: ['হাত বাধা', 'বুকে হাত', 'বুকের উপর হাত', 'নাভির নিচে হাত', 'বুকের উপরে', 'tying hands', 'chest hands'],
  },
  {
    canonical: 'আমীন',
    variants: ['আমিন', 'আমীন জোরে বলা', 'আমিন বলা', 'জোরে আমিন', 'ameen', 'amin', 'آمين'],
  },
  {
    canonical: 'ইমাম',
    variants: ['ইমামতি', 'মুক্তাদী', 'মুকতাদী', 'ইমামের পিছনে', 'imam', 'muqtadi', 'إمام'],
  },
  {
    canonical: 'আযান',
    variants: ['আজান', 'ইক্বামাত', 'ইকামত', 'মুয়াযযিন', 'মুয়াজ্জিন', 'adhan', 'azan', 'iqamah', 'أذان'],
  },
  {
    canonical: 'কসর',
    variants: ['ক্বছর', 'মুসাফির', 'সফরের সালাত', 'মুসাফিরের সালাত', 'qasr', 'shortening prayer', 'قصر'],
  },
  {
    canonical: 'সুত্রাহ',
    variants: ['সুতরা', 'ছুতরা', 'সালাতের সামনে পর্দা', 'sutrah', 'sutra', 'سترة'],
  },
  {
    canonical: 'সূরা ফাতিহা',
    variants: ['সূরা ফাতেহা', 'ফাতিহা', 'ফাতেহা', 'আলহামদু সূরা', 'fatiha', 'surah fatiha', 'فاتحة'],
  },
  {
    canonical: 'কুরআন তিলাওয়াত',
    variants: ['কেরাত', 'ক্বিরাআত', 'ক্বেরাআত', 'কুরআন পাঠ', 'qiraat', 'recitation', 'قراءة'],
  },
  {
    canonical: 'তাশাহহুদ',
    variants: ['আত্তাহিয়্যাতু', 'আত্তাহিয়্যাতু', 'দুরুদ', 'দরূদ', 'দোয়া মাসূরা', 'tashahhud', 'attahiyyat', 'تشهد'],
  },
  {
    canonical: 'কাযা সালাত',
    variants: ['কাজা সালাত', 'ছুটে যাওয়া সালাত', 'উমরী কাযা', 'qadha', 'missed prayer', 'قضاء'],
  },

  // ── 3. Sawm & Fasting (সিয়াম ও রোজা) ──────────────────────────
  {
    canonical: 'সিয়াম',
    variants: ['সিয়াম', 'ছিয়াম', 'ছিয়াম', 'রোজা', 'রোযা', 'রোজার', 'সওম', 'ছওম', 'roza', 'roja', 'siyam', 'sawm', 'fasting', 'صيام'],
  },
  {
    canonical: 'রমযান',
    variants: ['রমজান', 'মাহে রমজান', 'ramadan', 'ramzan', 'رمضان'],
  },
  {
    canonical: 'সাহরী',
    variants: ['সেহরী', 'সেহরি', 'সাহরি', 'sehri', 'suhoor', 'sahur', 'سحور'],
  },
  {
    canonical: 'ইফতার',
    variants: ['ইফতারের', 'ইফতারী', 'iftar', 'iftari', 'إفطار'],
  },
  {
    canonical: 'ইতিকাফ',
    variants: ['ই‘তিকাফ', 'এতেকাফ', 'itikaf', 'eitekaf', 'اعتكاف'],
  },
  {
    canonical: 'কাফফারা',
    variants: ['ফিদ্‌য়াহ', 'ফিদইয়া', 'ফিদিয়া', 'রোজার ফিদয়া', 'kaffarah', 'fidya', 'fidyah', 'كفارة'],
  },

  // ── 4. Zakat & Charity (যাকাত ও সাদাকাহ) ──────────────────────────
  {
    canonical: 'যাকাত',
    variants: ['জাকাত', 'zakat', 'jakat', 'poor due', 'زكاة'],
  },
  {
    canonical: 'যাকাতুল ফিতর',
    variants: [
      'ফিতরা', 'ফিৎরা', 'ফিত্বর', 'সাদাকাতুল ফিতর', 'সদকাতুল ফিতর',
      'ছাদাক্বাতুল ফিত্বর', 'ছাদাকাতুল ফিতর', 'fitra', 'fitrah',
      'zakat al fitr', 'زكاة الفطر', 'الفطر', 'فطر'
    ],
  },
  {
    canonical: 'নিসাব',
    variants: ['নেসাব', 'যাকাতের নিসাব', 'nisab', 'nesab', 'نصاب'],
  },
  {
    canonical: 'সাদাকাহ',
    variants: ['সদকা', 'দান', 'খয়রাত', 'সাদাকায়ে জারিয়া', 'charity', 'sadaqah', 'sadqa', 'صدقة'],
  },
  {
    canonical: 'উশর',
    variants: ['ওশর', 'ফসলের যাকাত', 'ushr', 'ushur', 'عشر'],
  },

  // ── 5. Hajj, Umrah & Qurbani (হজ্জ ও কুরবানী) ──────────────────
  {
    canonical: 'হজ্জ',
    variants: ['হজ', 'হজের', 'হজ্জের', 'hajj', 'haj', 'pilgrimage', 'حج'],
  },
  {
    canonical: 'উমরাহ',
    variants: ['ওমরাহ', 'উমরা', 'ওমরা', 'umrah', 'omra', 'عمرة'],
  },
  {
    canonical: 'ইহরাম',
    variants: ['এহরাম', 'ihram', 'ehram', 'إحرام'],
  },
  {
    canonical: 'তাওয়াফ',
    variants: ['তাওয়াফ', 'বায়তুল্লাহ তাওয়াফ', 'tawaf', 'طواف'],
  },
  {
    canonical: 'সাঈ',
    variants: ['সাফা মারওয়া', 'সাফা ও মারওয়া সাঈ', 'sai', 'safwah marwah', 'سعي'],
  },
  {
    canonical: 'কুরবানী',
    variants: ['কোরবানী', 'কোরবানি', 'কুরবানি', 'উযহিয়্যাহ', 'উদ্বহিয়্যাহ', 'qurbani', 'korbani', 'udhiyah', 'sacrifice', 'أضحية'],
  },
  {
    canonical: 'আকীকা',
    variants: ['আক্বীক্বা', 'আকিকা', 'aqeeqah', 'akika', 'aqika', 'عقيقة'],
  },

  // ── 6. Mu'amalat & Finance (মুয়ামালাত ও লেনদেন) ────────────────
  {
    canonical: 'সুদ',
    variants: ['রিবা', 'সূদ', 'সুদী', 'মুনাফা', 'ব্যাংক প্রফিট', 'riba', 'interest', 'usury', 'bank interest', 'ربا'],
  },
  {
    canonical: 'বীমা',
    variants: ['ইনস্যুরেন্স', 'ইন্স্যুরেন্স', 'লাইফ ইন্স্যুরেন্স', 'insurance', 'takaful', 'تأمين'],
  },
  {
    canonical: 'শেয়ার বাজার',
    variants: ['স্টক', 'শেয়ার', 'শেয়ার মার্কেট', 'stock market', 'shares', 'মুদারাবা', 'মুশারাকা'],
  },
  {
    canonical: 'ক্রিপ্টোকারেন্সি',
    variants: ['বিটকয়েন', 'ক্রিপ্টো', 'bitcoin', 'crypto', 'cryptocurrency'],
  },
  {
    canonical: 'ঘুষ',
    variants: ['উৎকোচ', 'ঘুষের টাকা', 'bribe', 'bribery', 'rishwah', 'رشوة'],
  },
  {
    canonical: 'জুয়া',
    variants: ['লটারি', 'বাজি', 'মাইসার', 'gambling', 'lottery', 'qimar', 'maysir', 'قمار'],
  },

  // ── 7. Family, Marriage & Modesty (পারিবারিক, বিবাহ ও পর্দা) ────
  {
    canonical: 'বিবাহ',
    variants: ['বিয়ে', 'নিকাহ', 'শাদী', 'marriage', 'nikah', 'biye', 'نكاح'],
  },
  {
    canonical: 'তালাক',
    variants: ['ডিভোর্স', 'খোলা', 'ইদ্দত', 'divorce', 'talaq', 'talak', 'khula', 'طلاق'],
  },
  {
    canonical: 'মোহর',
    variants: ['মহর', 'দেনমোহর', 'mahr', 'dower', 'dowry', 'مهر'],
  },
  {
    canonical: 'পর্দা',
    variants: ['হিজাব', 'নিকাব', 'নেকাব', 'বোরকা', 'বোরখা', 'veil', 'hijab', 'niqab', 'modesty', 'حجاب'],
  },
  {
    canonical: 'যিনা',
    variants: ['জিনা', 'ব্যভিচার', 'ব্যাভিচার', 'পরকীয়া', 'zina', 'adultery', 'fornication', 'زنا'],
  },

  // ── 8. Creed, Scripture & Sunnah (আকীদাহ ও বিশ্বাস) ──────────────
  {
    canonical: 'শিরক',
    variants: ['শিরিক', 'কুফর', 'কুফরী', 'মুশরিক', 'shirk', 'polytheism', 'شرك'],
  },
  {
    canonical: 'বিদআত',
    variants: ['বিদ‘আত', 'বিদাত', 'বেদাত', 'কুসংস্কার', 'bidah', 'innovation', 'بدعة'],
  },
  {
    canonical: 'তাওহীদ',
    variants: ['তাওহিদ', 'একত্ববাদ', 'ঈমান', 'ইমান', 'monotheism', 'tawheed', 'tawhid', 'توحيد'],
  },
  {
    canonical: 'কুরআন',
    variants: ['কুর‘আন', 'কোরআন', 'কোরান', 'কালামুল্লাহ', 'quran', 'koran', 'قرآن'],
  },
  {
    canonical: 'হাদীস',
    variants: ['হাদিস', 'হাদীছ', 'হাদিছ', 'সুন্নাহ', 'সুন্নত', 'hadith', 'sunnah', 'حديث'],
  },
  {
    canonical: 'দুআ',
    variants: ['দু‘আ', 'দোয়া', 'দোয়া', 'মুনাজাত', 'প্রার্থনা', 'dua', 'supplication', 'دعاء'],
  },
  {
    canonical: 'যিকির',
    variants: ['জিকির', 'তাসবীহ', 'তাসবিহ', 'dhikr', 'zikr', 'ذكر'],
  },
  {
    canonical: 'তাওবাহ',
    variants: ['তওবা', 'তাওবা', 'ইস্তিগফার', 'এস্তেগফার', 'ক্ষমাপ্রার্থনা', 'repentance', 'istighfar', 'tawbah', 'توبة'],
  },
  {
    canonical: 'শয়তান',
    variants: ['শয়তান', 'ইবলিস', 'ধোঁকা', 'ধোকা', 'ওয়াসওয়াসা', 'ওয়াসওয়াসা', 'কুমন্ত্রণা', 'satan', 'devil', 'waswasa', 'shaytan', 'شيطان'],
  },
  {
    canonical: 'তাবিজ',
    variants: ['তাভীয', 'কবজ', 'ঝাড়ফুঁক', 'রুকইয়াহ', 'রুকিয়া', 'amulet', 'taweez', 'ruqyah', 'تميمة'],
  },
  {
    canonical: 'কসম',
    variants: ['শপথ', 'হলফ', 'মানত', 'নযর', 'oath', 'vow', 'qasam', 'nadhr', 'قسم'],
  },

  // ── 9. Food, Health & Contemporary (খাদ্য, চিকিৎসা ও সমকালীন) ──
  {
    canonical: 'হারাম খাদ্য',
    variants: ['শূকর', 'মদ', 'অ্যালকোহল', 'হারাম খাবার', 'pork', 'alcohol', 'wine', 'intoxicant', 'خنزير', 'خمر'],
  },
  {
    canonical: 'জবাই',
    variants: ['যবেহ', 'যবাই', 'হালাল গোশত', 'slaughter', 'halal meat', 'ذبح'],
  },
  {
    canonical: 'ইনহেলার',
    variants: ['ইনহেলার ব্যবহার', 'শ্বাসকষ্টের ওষুধ', 'inhaler', 'inhelar'],
  },
  {
    canonical: 'ইনজেকশন',
    variants: ['ইনজেকশান', 'ইনসুলিন', 'স্যালাইন', 'ভ্যাকসিন', 'টিকা', 'injection', 'saline', 'vaccine'],
  },
  {
    canonical: 'ধূমপান',
    variants: ['ধুমপান', 'বিড়ি', 'বিড়ি', 'সিগারেট', 'তামাক', 'জর্দা', 'smoking', 'cigarette', 'tobacco'],
  },
  {
    canonical: 'দাড়ি',
    variants: ['দাড়ি', 'দাঁড়ি', 'দাড়ি রাখা', 'দাড়ি কাটা', 'দাড়ি ছাঁটা', 'মুণ্ডন', 'beard', 'shaving beard', 'لحية'],
  },
  {
    canonical: 'কুকুর',
    variants: ['কুকুরের লালা', 'কুকুর স্পর্শ', 'কুকুরের মুখ দেওয়া', 'dog', 'dog saliva', 'canine', 'كلব'],
  },
  {
    canonical: 'গান বাজনা',
    variants: ['সঙ্গীত', 'গান', 'বাদ্যযন্ত্র', 'মিউজিক', 'music', 'songs', 'musical instruments', 'موسيقى', 'غناء'],
  },
  {
    canonical: 'ছবি তোলা',
    variants: ['ফটোগ্রাফি', 'মূর্তি', 'ভাস্কর্য', 'ছবি আঁকা', 'photography', 'pictures', 'statue', 'تصوير'],
  },
];

// Pre-computed lookup index: normalized variant -> canonical term
const VARIANT_TO_CANONICAL = new Map<string, string>();
// Pre-computed reverse index: canonical term -> all normalized variants (including canonical)
const CANONICAL_TO_VARIANTS = new Map<string, Set<string>>();

// Initialize lookup caches
for (const group of SYNONYM_GROUPS) {
  const normCanonical = normalizeBengaliText(group.canonical);
  if (!CANONICAL_TO_VARIANTS.has(normCanonical)) {
    CANONICAL_TO_VARIANTS.set(normCanonical, new Set([normCanonical]));
  }
  const set = CANONICAL_TO_VARIANTS.get(normCanonical)!;

  for (const variant of [group.canonical, ...group.variants]) {
    const normVariant = normalizeBengaliText(variant);
    if (!normVariant) continue;

    VARIANT_TO_CANONICAL.set(normVariant, normCanonical);
    set.add(normVariant);
  }
}

/**
 * Returns the canonical term for any given synonym/variant,
 * or the normalized term itself if no canonical mapping exists.
 */
export function getCanonicalTerm(term: string): string {
  if (!term) return '';
  const norm = normalizeBengaliText(term);
  if (VARIANT_TO_CANONICAL.has(norm)) {
    return VARIANT_TO_CANONICAL.get(norm)!;
  }
  // If Arabic word with definite article 'ال' (Al-)
  if (norm.startsWith('ال') && norm.length > 3) {
    const withoutAl = norm.slice(2);
    if (VARIANT_TO_CANONICAL.has(withoutAl)) {
      return VARIANT_TO_CANONICAL.get(withoutAl)!;
    }
  }
  return norm;
}

/**
 * Expands a term into its full list of synonyms and variants (including canonical).
 */
export function expandSynonyms(term: string): string[] {
  if (!term) return [];
  const canonical = getCanonicalTerm(term);
  const variants = CANONICAL_TO_VARIANTS.get(canonical);

  if (variants && variants.size > 0) {
    return Array.from(variants);
  }

  return [normalizeBengaliText(term)];
}

/**
 * Backward compatibility alias for existing code
 */
export function getSynonymsAndVariants(term: string): string[] {
  return expandSynonyms(term);
}

/**
 * Helper to check whether a term is an ablution/wudu related term
 */
export function isAblutionTerm(term: string): boolean {
  return getCanonicalTerm(term) === 'ওযু';
}
