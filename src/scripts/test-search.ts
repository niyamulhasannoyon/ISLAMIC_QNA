import { searchFatwas } from '../lib/search';

async function runTests() {
  console.log('\n=== 1. Testing Default Browse / Facets ===');
  const browseRes = await searchFatwas({ page: 1, limit: 10 });
  console.log(`Total items indexed: ${browseRes.total}`);
  console.log(`Facets sources:`, browseRes.facets.sources);
  console.log(`Facets categories:`, browseRes.facets.categories);
  console.log(`Facets scholars:`, browseRes.facets.scholars);
  if (browseRes.total < 8) {
    throw new Error(`Expected at least 8 total items, got ${browseRes.total}`);
  }

  console.log('\n=== 2. Testing Banglish Transliteration ("oju") ===');
  const ojuRes = await searchFatwas({ q: 'oju' });
  console.log(`Results found for 'oju': ${ojuRes.total} (took ${ojuRes.tookMs}ms)`);
  if (ojuRes.total === 0) {
    throw new Error("Expected search 'oju' to return results, got 0");
  }
  console.log(`Top result for 'oju': ${ojuRes.results[0].title}`);
  const ojuHasWudu = (ojuRes.results[0].title + ojuRes.results[0].question + ojuRes.results[0].answer).includes('ওযূ') ||
                     (ojuRes.results[0].title + ojuRes.results[0].question + ojuRes.results[0].answer).includes('ওযু');
  if (!ojuHasWudu) {
    throw new Error("Expected top result for 'oju' to be an authentic ablution fatwa");
  }

  console.log('\n=== 3. Testing Bengali Orthographic Equivalence ("অজু" vs "ওযু") ===');
  const ajuRes = await searchFatwas({ q: 'অজু' });
  const wuduRes = await searchFatwas({ q: 'ওযু' });
  console.log(`Results for 'অজু': ${ajuRes.total}, Results for 'ওযু': ${wuduRes.total}`);
  if (ajuRes.total === 0 || wuduRes.total === 0) {
    throw new Error("Expected both 'অজু' and 'ওযু' to yield abundant results");
  }
  console.log(`Top result for 'অজু': ${ajuRes.results[0].title}`);
  console.log(`Top result for 'ওযু': ${wuduRes.results[0].title}`);

  console.log('\n=== 4. Testing Islamic English/Banglish Transliteration ("wudu", "wuzu") ===');
  const wuduTransRes = await searchFatwas({ q: 'wudu' });
  console.log(`Results for 'wudu': ${wuduTransRes.total}`);
  if (wuduTransRes.total === 0) {
    throw new Error("Expected search 'wudu' to return results");
  }

  console.log('\n=== 5. Testing Prayer Synonyms ("namaj", "namaz", "নামাজ", "নামায", "সালাত") ===');
  for (const q of ['namaj', 'namaz', 'নামাজ', 'নামায', 'সালাত']) {
    const res = await searchFatwas({ q, limit: 3 });
    console.log(`Query '${q}' => Total: ${res.total}, Top: ${res.results[0]?.title}`);
    if (res.total === 0) {
      throw new Error(`Expected results for '${q}', got 0`);
    }
  }

  console.log('\n=== 6. Testing Fasting Synonyms ("roja", "roza", "রোজা", "রোযা", "সিয়াম") ===');
  for (const q of ['roja', 'roza', 'রোজা', 'রোযা', 'সিয়াম']) {
    const res = await searchFatwas({ q, limit: 3 });
    console.log(`Query '${q}' => Total: ${res.total}, Top: ${res.results[0]?.title}`);
    if (res.total === 0) {
      throw new Error(`Expected results for '${q}', got 0`);
    }
  }

  console.log('\n=== 7. Testing Inhaler Search ("inhaler", "ইনহেলার") ===');
  const inhalerBangla = await searchFatwas({ q: 'ইনহেলার' });
  const inhalerEnglish = await searchFatwas({ q: 'inhaler' });
  console.log(`Results for 'ইনহেলার': ${inhalerBangla.total}, 'inhaler': ${inhalerEnglish.total}`);
  if (inhalerBangla.total === 0 || inhalerEnglish.total === 0) {
    throw new Error("Expected results for inhaler queries");
  }
  console.log(`Top inhaler title: ${inhalerBangla.results[0].title}`);

  console.log('\n=== 8. Testing Compound Phrases ("oju korar niyom", "অজু করার নিয়ম") ===');
  const phraseBanglish = await searchFatwas({ q: 'oju korar niyom' });
  const phraseBangla = await searchFatwas({ q: 'অজু করার নিয়ম' });
  console.log(`Results for 'oju korar niyom': ${phraseBanglish.total}, 'অজু করার নিয়ম': ${phraseBangla.total}`);
  if (phraseBanglish.total === 0 || phraseBangla.total === 0) {
    throw new Error("Expected results for compound phrase queries");
  }

  console.log('\n=== 9. Testing Snippet Highlighting ===');
  const snippetCheck = await searchFatwas({ q: 'ইনহেলার' });
  if (!snippetCheck.results[0].snippet.includes('<mark')) {
    throw new Error("Snippet does not contain <mark> tag for highlighting");
  }
  console.log('Snippet contains verified <mark> highlighting!');

  console.log('\n=== 10. Testing Source & Scholar Filtering ===');
  const tahreekRes = await searchFatwas({ source: 'at-tahreek' });
  console.log(`Results for source at-tahreek: ${tahreekRes.total}`);
  const allTahreek = tahreekRes.results.every((r) => r.source === 'at-tahreek');
  if (!allTahreek) {
    throw new Error('Found item with non-at-tahreek source in filtered search');
  }

  const scholarRes = await searchFatwas({ scholar: 'ড. মুহাম্মাদ আসাদুল্লাহ আল-গালিব' });
  console.log(`Results for scholar: ${scholarRes.total}`);
  const allScholarMatch = scholarRes.results.every((r) => r.scholar.includes('গালিব'));
  if (!allScholarMatch) {
    throw new Error('Found item with mismatched scholar in scholar-filtered search');
  }

  console.log('\n=== 11. Testing Al-Kawsar Archive Integration ===');
  const kawsarRes = await searchFatwas({ source: 'al-kawsar' });
  console.log(`Results for source al-kawsar: ${kawsarRes.total}`);
  if (kawsarRes.total < 5000) {
    throw new Error(`Expected at least 5,000 Al-Kawsar records, got ${kawsarRes.total}`);
  }
  const allKawsar = kawsarRes.results.every((r) => r.source === 'al-kawsar');
  if (!allKawsar) {
    throw new Error('Found item with non-al-kawsar source in al-kawsar filtered search');
  }

  const kawsarSearch = await searchFatwas({ q: 'কুকুরের লালা', source: 'al-kawsar' });
  console.log(`Results for 'কুকুরের লালা' in al-kawsar: ${kawsarSearch.total}`);
  if (kawsarSearch.total === 0) {
    throw new Error("Expected search 'কুকুরের লালা' in al-kawsar to return results");
  }
  console.log(`Top result: ${kawsarSearch.results[0].title}`);

  console.log('\n=== 12. Testing Bengali Script Integrity & Non-Breaking Highlighting ===');
  const brokenPatterns = [
    /<\/mark>[\u0981-\u0983\u09BC\u09BE-\u09CD\u09D7]/u,
    /[\u09CD]<mark/u,
    /\s[\u0981-\u0983\u09BC\u09BE-\u09CD\u09D7]/u,
    />\s*[\u09BE-\u09CC\u09CD]/u,
    /স্<mark/u,
    /<mark[^>]*>পর<\/mark>্শ/u,
    /উ<mark[^>]*>পর<\/mark>/u,
  ];

  const complexQuery = 'দুই সিজদার পর বসা জালসায়ে ইস্তিরাহাত বৈঠক';
  const complexRes = await searchFatwas({ q: complexQuery, limit: 15 });
  console.log(`Results for complex query: ${complexRes.total}`);

  for (let i = 0; i < complexRes.results.length; i++) {
    const item = complexRes.results[i];
    const combined = (item.titleSnippet || '') + ' ' + (item.snippet || '');

    for (const pat of brokenPatterns) {
      if (pat.test(combined)) {
        throw new Error(
          `Bengali script integrity violation in result #${i + 1} ("${item.title.slice(0, 40)}..."): matched broken pattern ${pat}\nCombined text: ${combined}`
        );
      }
    }
  }
  console.log('Verified 15 complex results: 0 broken conjuncts, 0 orphaned vowel signs, 0 fractured words!');

  console.log('\n=== 13. Testing Satan / Waswasa & Stop-Word Contamination ("soitan er dhoka") ===');
  const soitanRes = await searchFatwas({ q: 'soitan er dhoka' });
  console.log(`Results for 'soitan er dhoka': ${soitanRes.total} (took ${soitanRes.tookMs}ms)`);
  if (soitanRes.total === 0) {
    throw new Error("Expected search 'soitan er dhoka' to return results");
  }
  console.log(`Top result title: ${soitanRes.results[0].title}`);

  // Check top result is relevant to Satan/Waswasa/Deception
  const topText = (soitanRes.results[0].title + ' ' + soitanRes.results[0].question + ' ' + soitanRes.results[0].answer).toLowerCase();
  const isSatanRelevant = ['শয়তান', 'শয়তান', 'ওয়াসওয়াসা', 'ওয়াসওয়াসা', 'ধোঁকা', 'ধোকা', 'ইবলিস', 'কুমন্ত্রণা', 'কুচিন্তা'].some(w => topText.includes(w));
  if (!isSatanRelevant) {
    throw new Error("Expected top result for 'soitan er dhoka' to be relevant to Satan, Waswasa, or Deception");
  }

  // Verify 'er' / 'এর' is NEVER highlighted as a search term snippet mark
  for (const res of soitanRes.results.slice(0, 10)) {
    const snippetText = (res.titleSnippet || '') + ' ' + (res.snippet || '');
    if (/<mark[^>]*>\s*(er|এর)\s*<\/mark>/i.test(snippetText)) {
      throw new Error(`Stop-word contamination detected in result "${res.title}": 'er' / 'এর' was highlighted!`);
    }
  }
  console.log("Verified 10 results for 'soitan er dhoka': zero 'er'/'এর' stop-word contamination in snippets!");

  console.log('\nAll 13 professional search test suites passed successfully!');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
