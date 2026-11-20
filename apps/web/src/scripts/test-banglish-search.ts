import { searchFatwas } from '../lib/search';
import { transliterateQuery, decomposeBanglishMorphology, isLatinScript } from '../lib/search/transliterate';

async function runBanglishTests() {
  console.log('===========================================================');
  console.log('🕌 PROFESSIONAL BANGLISH SEARCH VERIFICATION TEST SUITE 🕌');
  console.log('===========================================================\n');

  // --- 1. Morphological Decomposition & Transliteration Unit Tests ---
  console.log('=== Suite 1: Morphological Decomposition & Inflection Handling ===');
  const morphTests = [
    { input: 'wudur', expectedStem: 'wudu', expectedBengali: 'ওযুর' },
    { input: 'namajer', expectedStem: 'namaj', expectedBengali: 'নামাজের' },
    { input: 'rojay', expectedStem: 'roja', expectedBengali: 'রোজায়' },
    { input: 'maslay', expectedStem: 'masla', expectedBengali: 'মাসলায়' },
    { input: 'hadise', expectedStem: 'hadis', expectedBengali: 'হাদিসে' },
    { input: 'quraner', expectedStem: 'quran', expectedBengali: 'কুরআনের' },
    { input: 'soitaner', expectedStem: 'soitan', expectedBengali: 'শয়তানের' },
  ];

  for (const t of morphTests) {
    const decomp = decomposeBanglishMorphology(t.input);
    if (!decomp.foundInDict) {
      throw new Error(`Expected '${t.input}' to be decomposed and found in dict`);
    }
    const hasExpected = decomp.bengaliExpansions.some((b) => b.includes(t.expectedBengali) || t.expectedBengali.includes(b));
    if (!hasExpected) {
      throw new Error(`Expected '${t.input}' expansions to include '${t.expectedBengali}', got [${decomp.bengaliExpansions.join(', ')}]`);
    }
    console.log(`  ✓ Decomposed '${t.input}' -> stem: '${decomp.stem}', expansions: [${decomp.bengaliExpansions.slice(0, 3).join(', ')}]`);
  }

  // --- 2. Multi-Word Banglish Idiom & Phrase Recognition ---
  console.log('\n=== Suite 2: Multi-Word Banglish Phrase Recognition ===');
  const phraseTests = [
    { input: 'wudur niyom', mustInclude: 'ওযুর নিয়ম' },
    { input: 'namaje montojog', mustInclude: 'নামাজে মনোযোগ' },
    { input: 'roja vangar karon', mustInclude: 'রোজা ভাঙার কারণ' },
    { input: 'bank interest ki haram', mustInclude: 'ব্যাংক সুদ' },
    { input: 'chagol diye akika', mustInclude: 'ছাগল দিয়ে আকীকা' },
    { input: 'ayatul kursi', mustInclude: 'আয়াতুল কুরসি' },
    { input: 'dua qunoot', mustInclude: 'দোয়া কুনূত' },
    { input: 'soitaner waswasa theke mukti', mustInclude: 'শয়তানের ওয়াসওয়াসা' },
  ];

  for (const pt of phraseTests) {
    const trans = transliterateQuery(pt.input);
    if (!trans.isBanglish) {
      throw new Error(`Expected '${pt.input}' to be recognized as Banglish`);
    }
    const match = trans.primaryBengali.includes(pt.mustInclude) || trans.expandedTerms.some((e) => e.includes(pt.mustInclude));
    if (!match) {
      throw new Error(`Expected '${pt.input}' to produce '${pt.mustInclude}', got primary='${trans.primaryBengali}'`);
    }
    console.log(`  ✓ Transliterated '${pt.input}' -> '${trans.primaryBengali}'`);
  }

  // --- 3. End-to-End Fatwa Search on Real-World Banglish Queries ---
  console.log('\n=== Suite 3: End-to-End Search Quality Across Core Islamic Domains ===');
  const searchTestSuites: Array<{
    category: string;
    query: string;
    expectedKeywords: string[];
  }> = [
    // Purity & Ablution
    { category: 'Ablution', query: 'wudur niyom', expectedKeywords: ['ওযু', 'ওযূ', 'পবিত্রতা', 'গোসল'] },
    { category: 'Ablution', query: 'ojur foroj koyti', expectedKeywords: ['ওযু', 'ওযূ', 'ফরয', 'ফরজ'] },
    { category: 'Purity', query: 'kapor napak hole', expectedKeywords: ['কাপড়', 'নাপাক', 'অপবিত্র', 'পবিত্রতা'] },
    { category: 'Purity & Women', query: 'haiz obosthay quran pora', expectedKeywords: ['হায়েয', 'কুরআন', 'তিলাওয়াত'] },

    // Prayer & Postures
    { category: 'Salah', query: 'namajer somoy', expectedKeywords: ['সালাত', 'ছালাত', 'নামাজ', 'নামায', 'ওয়াক্ত'] },
    { category: 'Salah', query: 'namaje montojog', expectedKeywords: ['সালাত', 'ছালাত', 'নামাজ', 'মনোযোগ', 'একাগ্রতা', 'খুশু'] },
    { category: 'Salah', query: 'tahajjut namaj', expectedKeywords: ['তাহাজ্জুদ', 'সালাত', 'ছালাত', 'নামাজ'] },
    { category: 'Salah', query: 'sijdah sahu er niyom', expectedKeywords: ['সিজদা', 'সেজদা', 'সাহু'] },
    { category: 'Salah Posture', query: 'buke hath badha', expectedKeywords: ['হাত', 'বুকে', 'বাঁধা', 'রাখা'] },
    { category: 'Salah Posture', query: 'nabir niche hath', expectedKeywords: ['নাভি', 'নাভীর', 'নিচে', 'হাত'] },
    { category: 'Salah Recitation', query: 'surah fatiha chara namaj hobe kina', expectedKeywords: ['সূরা ফাতিহা', 'ফাতিহা', 'সালাত', 'ছালাত'] },
    { category: 'Special Prayer', query: 'janajar namaj porar niyom', expectedKeywords: ['জানাযা', 'জানাজা', 'সালাত', 'ছালাত'] },
    { category: 'Travel Prayer', query: 'vromon kale qasr namaz', expectedKeywords: ['কসর', 'মুসাফির', 'সফর', 'সালাত', 'ছালাত'] },
    { category: 'Travel Prayer', query: 'musafirer namaj', expectedKeywords: ['মুসাফির', 'কসর', 'সালাত', 'ছালাত'] },

    // Fasting & Medical
    { category: 'Sawm', query: 'roja vangar karon', expectedKeywords: ['রোজা', 'রোযা', 'ছিয়াম', 'সিয়াম', 'ভাঙ', 'ভঙ্গ', 'নষ্ট'] },
    { category: 'Sawm Medical', query: 'roja obosthay injection', expectedKeywords: ['রোজা', 'রোযা', 'ছিয়াম', 'সিয়াম', 'ইনজেকশন'] },
    { category: 'Sawm Medical', query: 'inhaler nile ki roja vange', expectedKeywords: ['ইনহেলার', 'রোজা', 'রোযা', 'ছিয়াম', 'সিয়াম'] },
    { category: 'Sawm Habits', query: 'cigarette khele ki roja vange', expectedKeywords: ['রোজা', 'রোযা', 'ছিয়াম', 'সিয়াম', 'সিগারেট', 'ধূমপান'] },

    // Sacrifice & Charity
    { category: 'Aqeeqah', query: 'chagol diye akika', expectedKeywords: ['আকীকা', 'আক্বীক্বা', 'ছাগল', 'পশু'] },
    { category: 'Zakat', query: 'jakat kon somoy dite hoy', expectedKeywords: ['যাকাত', 'জাকাত'] },

    // Finance & Modern Rulings
    { category: 'Finance', query: 'bank interest ki haram', expectedKeywords: ['ব্যাংক', 'সুদ', 'রিবা', 'মুনাফা'] },
    { category: 'Finance', query: 'insurance kora ki jaiz', expectedKeywords: ['বীমা', 'ইনস্যুরেন্স', 'বিনিয়োগ', 'ব্যাংক', 'জায়েয'] },
    { category: 'Finance', query: 'share market e biniyog', expectedKeywords: ['শেয়ার', 'স্টক', 'বিনিয়োগ'] },

    // Modesty & Family Law
    { category: 'Modesty', query: 'dari kata ki gunah', expectedKeywords: ['দাড়ি', 'দাড়ি', 'দাঁড়ি', 'সুন্নাহ', 'মুণ্ডন'] },
    { category: 'Modesty', query: 'meye der porda', expectedKeywords: ['পর্দা', 'হিজাব', 'বোরকা', 'নারী', 'মহিলা', 'মেয়ে'] },
    { category: 'Family', query: 'porokiya kora jay kina', expectedKeywords: ['পরকীয়া', 'যিনা', 'জিনা', 'ব্যাভিচার', 'ব্যভিচার'] },
    { category: 'Family', query: 'chele meye prem kora', expectedKeywords: ['সম্পর্ক', 'বিবাহ', 'যিনা', 'জিনা', 'পাপ', 'প্রেম'] },
    { category: 'Family', query: 'talaq er niyom', expectedKeywords: ['তালাক', 'ইদ্দত'] },

    // Belief & Satan
    { category: 'Aqeedah', query: 'soitaner waswasa theke mukti', expectedKeywords: ['শয়তান', 'ওয়াসওয়াসা', 'কুমন্ত্রণা'] },
    { category: 'Quran', query: 'ayatul kursi', expectedKeywords: ['আয়াতুল কুরসি', 'কুরআন', 'আয়াত'] },
    { category: 'Dua', query: 'dua qunoot', expectedKeywords: ['কুনূত', 'দোয়া', 'বিতর', 'ছালাত', 'সালাত'] },
  ];

  for (const st of searchTestSuites) {
    const res = await searchFatwas({ q: st.query, limit: 3 });
    if (res.total === 0) {
      throw new Error(`Expected results for Banglish query '${st.query}', got 0!`);
    }

    const top = res.results[0];
    const topText = (top.title + ' ' + top.question + ' ' + top.answer).toLowerCase();
    const hasRelevance = st.expectedKeywords.some((kw) => topText.includes(kw.toLowerCase()));

    if (!hasRelevance) {
      throw new Error(
        `Top result for '${st.query}' lacked expected keywords [${st.expectedKeywords.join(', ')}]. Top title: "${top.title}"`
      );
    }

    console.log(`  ✓ [${st.category}] '${st.query}' -> Total: ${res.total} (Top: "${top.title.slice(0, 55)}...")`);
  }

  // --- 4. Bengali Script Integrity & Non-Breaking Highlighting ---
  console.log('\n=== Suite 4: Bengali Script Integrity & Non-Breaking Highlighting ===');
  const brokenPatterns = [
    /<\/mark>[\u0981-\u0983\u09BC\u09BE-\u09CD\u09D7]/u,
    /[\u09CD]<mark/u,
    /\s[\u0981-\u0983\u09BC\u09BE-\u09CD\u09D7]/u,
    />\s*[\u09BE-\u09CC\u09CD]/u,
    /স্<mark/u,
    /<mark[^>]*>পর<\/mark>্শ/u,
    /উ<mark[^>]*>পর<\/mark>/u,
  ];

  const banglishIntegrityQueries = [
    'wudur niyom',
    'roja vangar karon',
    'buke hath badha',
    'soitaner waswasa theke mukti',
  ];

  for (const q of banglishIntegrityQueries) {
    const res = await searchFatwas({ q, limit: 10 });
    for (let i = 0; i < res.results.length; i++) {
      const item = res.results[i];
      const combined = (item.titleSnippet || '') + ' ' + (item.snippet || '');

      for (const pat of brokenPatterns) {
        if (pat.test(combined)) {
          throw new Error(
            `Script integrity violation in result #${i + 1} for query '${q}': matched broken pattern ${pat}\nCombined text: ${combined}`
          );
        }
      }
    }
    console.log(`  ✓ Zero script fractures / orphaned vowel signs in top 10 results for '${q}'`);
  }

  // --- 5. Stop-Word Contamination Verification ---
  console.log('\n=== Suite 5: Stop-Word Contamination Verification ===');
  const stopWordQueries = [
    'soitaner waswasa theke mukti',
    'talaq er niyom',
    'biri khele ki oju venge jay',
  ];

  for (const q of stopWordQueries) {
    const res = await searchFatwas({ q, limit: 5 });
    for (const item of res.results) {
      const text = (item.titleSnippet || '') + ' ' + (item.snippet || '');
      if (/<mark[^>]*>\s*(theke|থেকে|er|এর|ki|কি|কী|jay|যায়|যায়)\s*<\/mark>/i.test(text)) {
        throw new Error(`Stop-word contamination detected in result "${item.title}": grammatical stop-word was highlighted!`);
      }
    }
    console.log(`  ✓ Zero stop-word contamination in snippets for '${q}'`);
  }

  console.log('\n===========================================================');
  console.log('✅ ALL BANGLISH SEARCH OPTIMIZATION TEST SUITES PASSED! ✅');
  console.log('===========================================================\n');
}

runBanglishTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
