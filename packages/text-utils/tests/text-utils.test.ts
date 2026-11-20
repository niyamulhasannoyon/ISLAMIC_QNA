import assert from 'node:assert';
import {
  normalizeBengaliText,
  normalizeArabic,
  stripZeroWidth,
  convertBengaliDigits,
  stemBengaliToken,
  isStopWord,
  SYNONYM_GROUPS,
  getCanonicalTerm,
  expandSynonyms,
  isAblutionTerm,
} from '../src';

console.log('Running @repo/text-utils test suite...');

// 1. Normalization tests
assert.strictEqual(normalizeBengaliText('নামায'), 'নামায');
assert.strictEqual(normalizeBengaliText('অাচ্ছা'), 'আচ্ছা');
assert.strictEqual(normalizeBengaliText('  সালাত   রোজা  '), 'সালাত রোজা');
assert.strictEqual(normalizeBengaliText('মা‘যুর'), 'মা‘যুর');
assert.strictEqual(stripZeroWidth('সালা\u200Cত ও \u200Dরোজা'), 'সালাত ও রোজা');
assert.strictEqual(convertBengaliDigits('২০২৪ সালের ১২টি বই'), '2024 সালের 12টি বই');
console.log('✓ Normalization & digits tests passed');

// 2. Arabic normalization
const vocalized = 'صَلَاةُ التَّرَاوِيحِ';
assert.strictEqual(normalizeArabic(vocalized), 'صلاة التراويح');
assert.strictEqual(normalizeArabic('صـــــلاة'), 'صلاة');
assert.strictEqual(normalizeArabic('أحمد إبراهيم آمنة ٱتقوا'), 'احمد ابراهيم امنة اتقوا');
console.log('✓ Arabic vocalization and ligatures passed');

// 3. Stemmer tests
assert.strictEqual(stemBengaliToken('নামাজের'), 'নামাজ');
assert.strictEqual(stemBengaliToken('সালাতে'), 'সালাত');
assert.strictEqual(stemBengaliToken('ওযুর'), 'ওযু');
assert.strictEqual(stemBengaliToken('হাদীসে'), 'হাদীস');
assert.strictEqual(stemBengaliToken('রোজার'), 'রোজা');
assert.strictEqual(stemBengaliToken('মসজিদগুলোতে'), 'মসজিদ');
assert.strictEqual(stemBengaliToken('বই'), 'বই');
console.log('✓ Stemmer tests passed');

// 4. Stopwords tests
assert.strictEqual(isStopWord('কি'), true);
assert.strictEqual(isStopWord('কী'), true);
assert.strictEqual(isStopWord('কেন'), true);
assert.strictEqual(isStopWord('হবে'), true);
assert.strictEqual(isStopWord('বিধান'), true);
assert.strictEqual(isStopWord('from'), true);
assert.strictEqual(isStopWord('নামাজ'), false);
console.log('✓ Stopword tests passed');

// 5. Synonyms tests
assert.ok(SYNONYM_GROUPS.length >= 60, 'Should have >= 60 synonym groups');
assert.strictEqual(getCanonicalTerm('নামাজ'), 'সালাত');
assert.strictEqual(getCanonicalTerm('namaz'), 'সালাত');
assert.strictEqual(getCanonicalTerm('রোজা'), 'সিয়াম');
assert.strictEqual(getCanonicalTerm('roza'), 'সিয়াম');
assert.strictEqual(getCanonicalTerm('অজু'), 'ওযু');
assert.strictEqual(getCanonicalTerm('wudu'), 'ওযু');
assert.strictEqual(getCanonicalTerm('রিবা'), 'সুদ');
assert.strictEqual(getCanonicalTerm('interest'), 'সুদ');
assert.strictEqual(getCanonicalTerm('ডিভোর্স'), 'তালাক');
assert.strictEqual(getCanonicalTerm('dog'), 'কুকুর');
assert.strictEqual(getCanonicalTerm('saliva'), 'লালা');
assert.strictEqual(getCanonicalTerm('purity'), 'পবিত্রতা');

assert.strictEqual(isAblutionTerm('ওযু'), true);
assert.strictEqual(isAblutionTerm('অজু'), true);
assert.strictEqual(isAblutionTerm('wudu'), true);
assert.strictEqual(isAblutionTerm('সালাত'), false);

const ojuSynonyms = expandSynonyms('ওযু');
assert.ok(ojuSynonyms.includes('অজু'));
assert.ok(ojuSynonyms.includes('wudu'));
console.log('✓ Synonym registry tests passed');

console.log('All @repo/text-utils tests passed successfully!');
