import { searchFatwas } from '../lib/search';

async function runTests() {
  console.log('\n--- 1. Testing Default Browse / Facets ---');
  const browseRes = await searchFatwas({ page: 1, limit: 10 });
  console.log(`Total items indexed: ${browseRes.total}`);
  console.log(`Facets sources:`, browseRes.facets.sources);
  console.log(`Facets categories:`, browseRes.facets.categories);
  console.log(`Facets scholars:`, browseRes.facets.scholars);
  if (browseRes.total < 8) {
    throw new Error(`Expected at least 8 total items, got ${browseRes.total}`);
  }

  console.log('\n--- 2. Testing Exact Full-Text Search ("সালাত") ---');
  const salatRes = await searchFatwas({ q: 'সালাত' });
  console.log(`Results found for 'সালাত': ${salatRes.total} (took ${salatRes.tookMs}ms)`);
  if (salatRes.total === 0) {
    throw new Error('Expected results for সালাত');
  }
  console.log(`Sample title: ${salatRes.results[0].title}`);
  console.log(`Snippet: ${salatRes.results[0].snippet}`);
  if (!salatRes.results[0].snippet.includes('<mark')) {
    console.warn('Warning: Snippet does not contain <mark> tag');
  } else {
    console.log('Snippet contains <mark> highlighting successfully!');
  }

  console.log('\n--- 3. Testing Keyword Search ("ইনহেলার") ---');
  const inhalerRes = await searchFatwas({ q: 'ইনহেলার' });
  console.log(`Results found for 'ইনহেলার': ${inhalerRes.total}`);
  if (inhalerRes.total === 0) {
    throw new Error('Expected results for ইনহেলার');
  }
  console.log(`Title: ${inhalerRes.results[0].title}`);
  console.log(`Snippet: ${inhalerRes.results[0].snippet}`);

  console.log('\n--- 4. Testing Source Filtering ("at-tahreek") ---');
  const tahreekRes = await searchFatwas({ source: 'at-tahreek' });
  console.log(`Results for source at-tahreek: ${tahreekRes.total}`);
  const allTahreek = tahreekRes.results.every((r) => r.source === 'at-tahreek');
  if (!allTahreek) {
    throw new Error('Found item with non-at-tahreek source in filtered search');
  }
  console.log('Source filter verified successfully!');

  console.log('\n--- 5. Testing Scholar Filtering ("ড. মুহাম্মাদ আসাদুল্লাহ আল-গালিব") ---');
  const scholarRes = await searchFatwas({ scholar: 'ড. মুহাম্মাদ আসাদুল্লাহ আল-গালিব' });
  console.log(`Results for scholar: ${scholarRes.total}`);
  if (scholarRes.total === 0) {
    throw new Error('Expected results for scholar filter');
  }
  const allScholarMatch = scholarRes.results.every((r) => r.scholar.includes('গালিব'));
  if (!allScholarMatch) {
    throw new Error('Found item with mismatched scholar in scholar-filtered search');
  }
  console.log('Scholar filter verified successfully!');

  console.log('\n--- 6. Testing Fuzzy Search (Typo Tolerance) ---');
  // Intentionally omitting/swapping characters
  const fuzzyRes = await searchFatwas({ q: 'ইনহলার' }); // Missing 'ে'
  console.log(`Fuzzy query 'ইনহলার' returned ${fuzzyRes.total} matches`);

  console.log('\nAll search tests passed successfully!');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
