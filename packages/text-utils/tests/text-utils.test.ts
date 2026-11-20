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
assert.strictEqual(normalizeBengaliText('নামায'), 'নামায', 'Basic normalization should preserve text');
assert.strictEqual(normalizeBengaliText('অাচ্ছা'), 'আচ্ছা', 'Decomposed vowels should be composed');
assert.strictEqual(normalizeBengaliText('  সালাত   রোজা  '), 'সালাত রোজা', 'Excess whitespace should be collapsed');
assert.strictEqual(normalizeBengaliText('মা‘যুর'), 'মা‘যুর', 'Apostrophe variants should be standardized');
assert.strictEqual(stripZeroWidth('সালা\u200Cত ও \u200Dরোজা'), 'সালাত ও রোজা', 'Zero-width characters should be removed');
assert.strictEqual(convertBengaliDigits('২০২৪ সালের ১২টি বই'), '2024 সালের 12টি বই', 'Bengali digits to Latin digits');

// Arabic normalizations
const vocalized = 'صَلَاةُ التَّرَاوِيحِ';
assert.strictEqual(normalizeArabic(vocalized), 'صلاة التراويح', 'Arabic harakat should be stripped');
assert.strictEqual(normalizeArabic('صـــــلاة'), 'صلاة', 'Arabic tatweel should be stripped');
assert.strictEqual(normalizeArabic('أحمد إبراهيم آمنة ٱتقوا'), 'احمد ابراهيم امنة اتقوا', 'Alif variants normalized');
console.log('✓ Normalization & Arabic tests passed');

// 2. Stemmer tests
assert.strictEqual(stemBengaliToken('নামাজের'), 'নামাজ', 'Stemming "নামাজের" -> "নামাজ"');
assert.strictEqual(stemBengaliToken('সালাতে'), 'সালাত', 'Stemming "সালাতে" -> "সালাত"');
assert.strictEqual(stemBengaliToken('ওযুর'), 'ওযু', 'Stemming "ওযুর" -> "ওযু"');
assert.strictEqual(stemBengaliToken('হাদীসে'), 'হাদীস', 'Stemming "হাদীসে" -> "হাদীস"');
assert.strictEqual(stemBengaliToken('রোজার'), 'রোজা', 'Stemming "রোজার" -> "রোজা"');
assert.strictEqual(stemBengaliToken('মসজিদগুলোতে'), 'মসজিদ', 'Stemming "মসজিদগুলোতে" -> "মসজিদ"');
assert.strictEqual(stemBengaliToken('বই'), 'বই', 'Tokens <= 3 chars should not be overly stemmed');
console.log('✓ Stemmer tests passed');

// 3. Stopword tests
assert.strictEqual(isStopWord('কি'), true, 'Stopword "কি" should be recognized');
assert.strictEqual(isStopWord('কী'), true, 'Stopword "কী" should be recognized');
assert.strictEqual(isStopWord('কেন'), true, 'Stopword "কেন" should be recognized');
assert.strictEqual(isStopWord('হবে'), true, 'Stopword "হবে" should be recognized');
assert.strictEqual(isStopWord('বিধান'), true, 'Stopword "বিধান" should be recognized');
assert.strictEqual(isStopWord('from'), true, 'Stopword "from" should be recognized');
assert.strictEqual(isStopWord('নামাজ'), false, 'Content word "নামাজ" is not a stopword');
console.log('✓ Stopword tests passed');

// 4. Synonym tests
assert.ok(SYNONYM_GROUPS.length >= 60, `Expected at least 60 synonym groups, got ${SYNONYM_GROUPS.length}`);
assert.strictEqual(getCanonicalTerm('নামাজ'), 'সালাত', 'Canonical of নামাজ is সালাত');
assert.strictEqual(getCanonicalTerm('namaz'), 'সালাত', 'Canonical of namaz is সালাত');
assert.strictEqual(getCanonicalTerm('রোজা'), 'সিয়াম', 'Canonical of রোজা is সিয়াম');
assert.strictEqual(getCanonicalTerm('roza'), 'সিয়াম', 'Canonical of roza is সিয়াম');
assert.strictEqual(getCanonicalTerm('অজু'), 'ওযু', 'Canonical of অজু is ওযু');
assert.strictEqual(getCanonicalTerm('wudu'), 'ওযু', 'Canonical of wudu is ওযু');
assert.strictEqual(getCanonicalTerm('রিবা'), 'সুদ', 'Canonical of রিবা is সুদ');
assert.strictEqual(getCanonicalTerm('interest'), 'সুদ', 'Canonical of interest is সুদ');
assert.strictEqual(getCanonicalTerm('ডিভোর্স'), 'তালাক', 'Canonical of ডিভোর্স is তালাক');
assert.strictEqual(isAblutionTerm('ওযু'), true, '"ওযু" is an ablution term');
assert.strictEqual(isAblutionTerm('অজু'), true, '"অজু" is an ablution term');
assert.strictEqual(isAblutionTerm('wudu'), true, '"wudu" is an ablution term');
assert.strictEqual(isAblutionTerm('সালাত'), false, '"সালাত" is not an ablution term');

const ojuSynonyms = expandSynonyms('ওযু');
assert.ok(ojuSynonyms.includes('অজু'), 'Synonyms of "ওযু" should include "অজু"');
assert.ok(ojuSynonyms.includes('wudu'), 'Synonyms of "ওযু" should include "wudu"');
console.log('✓ Synonym tests passed');

console.log('All @repo/text-utils tests passed successfully!');
