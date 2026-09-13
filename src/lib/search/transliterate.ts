/**
 * Banglish (Latin Script) to Bengali Transliteration Engine
 * 
 * Supports:
 * 1. Curated Islamic domain vocabulary & alias mapping
 * 2. Avro / Ridmik phonetic transliteration rule-set for general Bengali text
 */

// Curated Islamic dictionary mapping common English/Banglish spellings to Bengali canonical forms & variants
const ISLAMIC_BANGLISH_DICT: Record<string, string[]> = {
  // Ablution
  'oju': ['ওযু', 'অজু', 'উযু', 'উজু', 'ওজু'],
  'ojoo': ['ওযু', 'অজু', 'উযু', 'উজু'],
  'ojhu': ['ওযু', 'অজু', 'উযু'],
  'ozhu': ['ওযু', 'অজু', 'উযু'],
  'ozzu': ['ওযু', 'অজু'],
  'wudu': ['ওযু', 'অজু', 'উযু', 'উজু', 'ওজু'],
  'wudhu': ['ওযু', 'অজু', 'উযু', 'উজু'],
  'wuzu': ['ওযু', 'অজু', 'উযু', 'উজু'],
  'wuzoo': ['ওযু', 'অজু', 'উযু'],
  'woodoo': ['ওযু', 'অজু', 'উযু'],
  'vudu': ['ওযু', 'অজু', 'উযু'],

  // Prayer
  'namaj': ['সালাত', 'ছালাত', 'নামাজ', 'নামায'],
  'namaz': ['সালাত', 'ছালাত', 'নামাজ', 'নামায'],
  'namazer': ['নামাজের', 'নামাযের', 'সালাতের', 'ছালাতের'],
  'namaje': ['নামাজে', 'নামাযে', 'সালাতে', 'ছালাতে'],
  'salat': ['সালাত', 'ছালাত', 'নামাজ', 'নামায'],
  'solat': ['সালাত', 'ছালাত', 'নামাজ', 'নামায'],
  'salah': ['সালাত', 'ছালাত', 'নামাজ', 'নামায'],
  'shalaat': ['সালাত', 'ছালাত'],
  'sholat': ['সালাত', 'ছালাত'],
  'tahajjud': ['তাহাজ্জুদ', 'তাহাজ্জুদের', 'কিয়ামুল লাইল'],
  'tahajut': ['তাহাজ্জুদ'],
  'tahajjut': ['তাহাজ্জুদ'],
  'tarabi': ['তারাবীহ', 'তারাবী', 'তারাবিহ', 'তারাবি'],
  'tarabih': ['তারাবীহ', 'তারাবিহ'],
  'taraweeh': ['তারাবীহ', 'তারাবিহ'],
  'tarawih': ['তারাবীহ', 'তারাবিহ'],
  'witr': ['বিতর', 'বেতের'],
  'bitor': ['বিতর', 'বেতের'],
  'beter': ['বিতর', 'বেতের'],
  'juma': ['জুমু‘আ', 'জুমা', 'জুমুআ'],
  'jummah': ['জুমু‘আ', 'জুমা', 'জুমুআ'],
  'jumuah': ['জুমু‘আ', 'জুমুআ', 'জুমা'],
  'janaza': ['জানাযা', 'জানাজা', 'দাফন', 'কাফন'],
  'janazah': ['জানাযা', 'জানাজা'],
  'janaja': ['জানাযা', 'জানাজা'],
  'raful': ['রাফউল', 'রাফয়ে'],
  'yadain': ['ইয়াদাইন', 'ইয়াদায়েন'],
  'ameen': ['আমিন', 'আমীন'],
  'amin': ['আমিন', 'আমীন'],
  'sijdah': ['সিজদা', 'সেজদা', 'সিজদাহ'],
  'sajda': ['সিজদা', 'সেজদা', 'সিজদাহ'],
  'sejda': ['সেজদা', 'সিজদা'],

  // Fasting
  'roja': ['রোজা', 'রোযা', 'সিয়াম', 'সিয়াম', 'সওম'],
  'roza': ['রোজা', 'রোযা', 'সিয়াম', 'সিয়াম', 'সওম'],
  'rojar': ['রোজার', 'রোযার', 'সিয়ামের'],
  'rozar': ['রোজার', 'রোযার', 'সিয়ামের'],
  'siam': ['সিয়াম', 'সিয়াম', 'রোজা', 'রোযা', 'সওম'],
  'siyam': ['সিয়াম', 'সিয়াম', 'রোজা', 'রোযা'],
  'saum': ['সওম', 'সিয়াম', 'রোজা'],
  'sehri': ['সেহরী', 'সাহরী', 'সেহরি'],
  'sahri': ['সাহরী', 'সেহরী'],
  'iftar': ['ইফতার', 'ইফতারের'],
  'iftari': ['ইফতারী', 'ইফতার'],
  'itikaf': ['ই‘তিকাফ', 'ইতিকাফ'],

  // Zakat & Charity
  'zakat': ['যাকাত', 'জাকাত', 'ফিতরা'],
  'jakat': ['যাকাত', 'জাকাত', 'ফিতরা'],
  'fitra': ['ফিতরা', 'যাকাতুল ফিতর', 'সাদাকাতুল ফিতর'],
  'fitrah': ['ফিতরা', 'সাদাকাহ'],
  'sadqah': ['সাদাকাহ', 'সদকা', 'দান'],
  'sadaqah': ['সাদাকাহ', 'সদকা'],

  // Hajj & Umrah
  'hajj': ['হজ', 'হজ্জ', 'উমরাহ', 'ওমরাহ'],
  'haj': ['হজ', 'হজ্জ'],
  'umrah': ['উমরাহ', 'ওমরাহ', 'উমরা'],
  'omrah': ['ওমরাহ', 'উমরাহ'],
  'qurbani': ['কুরবানী', 'কোরবানী', 'কোরবানি', 'কুরবানি'],
  'kurbani': ['কুরবানী', 'কোরবানী', 'কুরবানি'],
  'akika': ['আকীকা', 'আক্বীক্বা', 'আকিকা'],
  'aqiqah': ['আকীকা', 'আক্বীক্বা'],

  // Scripture & Creed
  'quran': ['কুরআন', 'কুর‘আন', 'কোরআন', 'কোরান'],
  'koran': ['কুরআন', 'কুর‘আন', 'কোরআন'],
  'hadis': ['হাদীস', 'হাদিস', 'হাদীছ', 'হাদিছ'],
  'hadith': ['হাদীস', 'হাদিস', 'হাদীছ'],
  'hadees': ['হাদীস', 'হাদিস'],
  'sunnah': ['সুন্নাহ', 'সুন্নত'],
  'sunnat': ['সুন্নত', 'সুন্নাহ'],
  'dua': ['দু‘আ', 'দুআ', 'দোয়া', 'দোয়া', 'মুনাজাত'],
  'doa': ['দোয়া', 'দোয়া', 'দু‘আ', 'দুআ'],
  'doya': ['দোয়া', 'দোয়া', 'দু‘আ'],
  'munajat': ['মুনাজাত', 'দু‘আ', 'দোয়া'],
  'bidat': ['বিদ‘আত', 'বিদআত', 'বিদাত', 'বেদাত'],
  'bidah': ['বিদ‘আত', 'বিদআত'],
  'bidayat': ['বিদ‘আত', 'বিদআত'],
  'shirk': ['শিরক', 'শিরিক'],
  'shirik': ['শিরিক', 'শিরক'],
  'kufr': ['কুফর', 'কুফরী'],
  'kufri': ['কুফরী', 'কুফর'],
  'tawbah': ['তাওবাহ', 'তওবা', 'ইস্তিগফার'],
  'toba': ['তওবা', 'তাওবাহ'],
  'touba': ['তাওবাহ', 'তওবা'],
  'istighfar': ['ইস্তিগফার', 'এস্তেগফার'],
  'iman': ['ঈমান', 'ইমান'],
  'eman': ['ঈমান', 'ইমান'],
  'tawheed': ['তাওহীদ', 'তাওহিদ'],
  'tawhid': ['তাওহীদ', 'তাওহিদ'],

  // Modern & Fiqh Issues
  'inhaler': ['ইনহেলার'],
  'inhailer': ['ইনহেলার'],
  'inheler': ['ইনহেলার'],
  'crypto': ['ক্রিপ্টো', 'ক্রিপ্টোকারেন্সি', 'বিটকয়েন'],
  'bitcoin': ['বিটকয়েন', 'ক্রিপ্টো'],
  'share': ['শেয়ার', 'স্টক'],
  'stock': ['স্টক', 'শেয়ার'],
  'sud': ['সুদ', 'রিবা', 'সুদী'],
  'sood': ['সুদ', 'রিবা'],
  'riba': ['রিবা', 'সুদ'],
  'insurance': ['বীমা', 'ইনস্যুরেন্স'],
  'bima': ['বীমা', 'ইনস্যুরেন্স'],
  'tabij': ['তাবিজ', 'তাভীয', 'কবজ', 'রুকইয়াহ'],
  'tabiz': ['তাবিজ', 'রুকইয়াহ'],
  'ruqyah': ['রুকইয়াহ', 'ঝাড়ফুঁক', 'রুকিয়া'],
  'rukia': ['রুকইয়াহ', 'রুকিয়া'],
  'porda': ['পর্দা', 'হিজাব', 'নিকাব', 'বোরকা'],
  'pordah': ['পর্দা', 'হিজাব'],
  'hijab': ['হিজাব', 'পর্দা', 'বোরকা'],
  'burqa': ['বোরকা', 'বোরখা', 'হিজাব'],
  'borkha': ['বোরখা', 'বোরকা'],
  'niqab': ['নিকাব', 'নেকাব'],
  'talaq': ['তালাক', 'ইদ্দত', 'খোলা'],
  'talak': ['তালাক', 'ইদ্দত'],
  'biye': ['বিবাহ', 'বিয়ে', 'নিকাহ'],
  'bibaho': ['বিবাহ', 'বিয়ে'],
  'nikah': ['নিকাহ', 'বিবাহ', 'বিয়ে'],
  'porokiya': ['পরকীয়া', 'যিনা', 'ব্যাভিচার'],
  'zina': ['যিনা', 'জিনা', 'ব্যাভিচার'],
  'jina': ['যিনা', 'জিনা'],
  'sobr': ['সবর', 'ধৈর্য'],
  'shobor': ['সবর'],
  'sabr': ['সবর', 'ধৈর্য'],
  'sohih': ['সহীহ', 'সহিহ'],
  'sahih': ['সহীহ', 'সহিহ'],
  'zaif': ['যঈফ', 'জয়ীফ', 'দুর্বল'],
  'daif': ['যঈফ', 'দুর্বল'],
  'masala': ['মাসআলা', 'মাসয়ালা', 'মাসলা'],
  'fatwa': ['ফতোয়া', 'ফতোয়া', 'বিধান'],
  'fatwah': ['ফতোয়া', 'ফতোয়া'],

  // Query Intent & Grammar Words
  'korar': ['করার', 'পড়ার'],
  'kora': ['করা'],
  'korle': ['করলে', 'করার'],
  'niyom': ['নিয়ম', 'নিয়ম', 'পদ্ধতি', 'বিধান'],
  'bidhan': ['বিধান', 'হুকুম'],
  'hukom': ['হুকুম', 'বিধান'],
  'hobe': ['হবে', 'হবে কি'],
  'ki': ['কি', 'কী'],
  'jayez': ['জায়েয', 'জায়েয', 'জায়েজ', 'জায়েজের'],
  'jayej': ['জায়েজ', 'জায়েয', 'জায়েয'],
  'haram': ['হারাম', 'অবৈধ'],
  'halal': ['হালাল', 'বৈধ'],
  'somoy': ['সময়', 'সময়'],
  'somoyer': ['সময়ের', 'সময়ের'],
  'shomoy': ['সময়', 'সময়'],
};

// Phonetic mapping rules (Avro/Ridmik simplified) for arbitrary latin text
const PHONETIC_PATTERNS: Array<[RegExp, string]> = [
  [/kkh/gi, 'ক্ষ'],
  [/cch/gi, 'চ্ছ'],
  [/sh/gi, 'শ'],
  [/th/gi, 'থ'],
  [/dh/gi, 'ধ'],
  [/bh/gi, 'ভ'],
  [/ch/gi, 'চ'],
  [/jh/gi, 'ঝ'],
  [/kh/gi, 'খ'],
  [/gh/gi, 'ঘ'],
  [/ph/gi, 'ফ'],
  [/ng/gi, 'ঙ'],
  [/nj/gi, 'ঞ্জ'],
  [/tt/gi, 'ট্ট'],
  [/dd/gi, 'ড্ড'],
  [/rr/gi, 'রর'],
  [/ll/gi, 'ল্ল'],
  [/mm/gi, 'ম্ম'],
  [/nn/gi, 'ন্ন'],
  [/ss/gi, 'স্স'],
  [/jj/gi, 'জ্জ'],
  [/bb/gi, 'ব্ব'],
  [/pp/gi, 'প্প'],

  // Vowels
  [/aa/gi, 'া'],
  [/ee/gi, 'ী'],
  [/oo/gi, 'ূ'],
  [/oi/gi, 'ৈ'],
  [/ou/gi, 'ৌ'],
  [/a/gi, 'া'],
  [/i/gi, 'ি'],
  [/u/gi, 'ু'],
  [/e/gi, 'ে'],
  [/o/gi, 'ো'],

  // Consonants
  [/k/gi, 'ক'],
  [/q/gi, 'ক'],
  [/g/gi, 'গ'],
  [/j/gi, 'জ'],
  [/z/gi, 'য'],
  [/t/gi, 'ত'],
  [/d/gi, 'দ'],
  [/n/gi, 'ন'],
  [/p/gi, 'প'],
  [/f/gi, 'ফ'],
  [/b/gi, 'ব'],
  [/v/gi, 'ভ'],
  [/m/gi, 'ম'],
  [/r/gi, 'র'],
  [/l/gi, 'ল'],
  [/s/gi, 'স'],
  [/h/gi, 'হ'],
  [/y/gi, 'য়'],
  [/w/gi, 'ও'],
];

/**
 * Checks whether a text is written in Latin (English/Banglish) script.
 */
export function isLatinScript(text: string): boolean {
  if (!text) return false;
  // If >50% of alphabetical characters are ASCII / Latin
  const latinCount = (text.match(/[a-zA-Z]/g) || []).length;
  const bengaliCount = (text.match(/[\u0980-\u09FF]/g) || []).length;
  return latinCount > 0 && latinCount >= bengaliCount;
}

/**
 * Transliterates an arbitrary Banglish string to candidate Bengali words.
 */
export function phoneticTransliterateWord(word: string): string {
  const w = word.toLowerCase().trim();
  if (!w) return '';

  let out = w;
  for (const [pattern, repl] of PHONETIC_PATTERNS) {
    out = out.replace(pattern, repl);
  }

  // If word begins with a Kar sign, fix initial vowel
  if (out.startsWith('া')) out = 'আ' + out.slice(1);
  else if (out.startsWith('ি')) out = 'ই' + out.slice(1);
  else if (out.startsWith('ী')) out = 'ঈ' + out.slice(1);
  else if (out.startsWith('ু')) out = 'উ' + out.slice(1);
  else if (out.startsWith('ূ')) out = 'ঊ' + out.slice(1);
  else if (out.startsWith('ে')) out = 'এ' + out.slice(1);
  else if (out.startsWith('ো')) out = 'ও' + out.slice(1);

  return out;
}

/**
 * Main transliteration engine entrypoint.
 * Converts Banglish queries (e.g. "oju", "namaz", "oju korar niyom")
 * into high-precision Bengali candidate queries and term sets.
 */
export function transliterateQuery(query: string): {
  primaryBengali: string;
  expandedTerms: string[];
  isBanglish: boolean;
} {
  const trimmed = query.trim();
  if (!trimmed) {
    return { primaryBengali: '', expandedTerms: [], isBanglish: false };
  }

  if (!isLatinScript(trimmed)) {
    return { primaryBengali: trimmed, expandedTerms: [trimmed], isBanglish: false };
  }

  const tokens = trimmed.toLowerCase().split(/[\s,.;:!?"'()\-–—\/\\]+/).filter(Boolean);
  const phraseCandidates: string[][] = [];
  const allTerms = new Set<string>();

  for (const token of tokens) {
    if (ISLAMIC_BANGLISH_DICT[token]) {
      const matches = ISLAMIC_BANGLISH_DICT[token];
      phraseCandidates.push(matches);
      matches.forEach((m) => allTerms.add(m));
    } else {
      const phonetic = phoneticTransliterateWord(token);
      if (phonetic) {
        phraseCandidates.push([phonetic]);
        allTerms.add(phonetic);
      } else {
        phraseCandidates.push([token]);
        allTerms.add(token);
      }
    }
  }

  // Construct primary synthesized Bengali query
  const primaryBengali = phraseCandidates.map((c) => c[0]).join(' ');
  allTerms.add(primaryBengali);

  return {
    primaryBengali,
    expandedTerms: Array.from(allTerms),
    isBanglish: true,
  };
}
