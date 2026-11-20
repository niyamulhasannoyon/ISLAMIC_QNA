import assert from 'node:assert';
import {
  normalizeText,
  normalizeArabic,
  stripZeroWidth,
  convertBengaliDigits,
  stemBengali,
  isStopword,
  processTokens,
} from '../normalize';

console.log('Running normalize unit test suite...');

// 1. Zero-width stripping
assert.strictEqual(stripZeroWidth('সালা\u200Cত ও \u200Dরোজা'), 'সালাত ও রোজা');

// 2. Bengali digits to Latin digits
assert.strictEqual(convertBengaliDigits('২০২৪ সালের ১২টি বই'), '2024 সালের 12টি বই');

// 3. Arabic normalization
const vocalized = 'صَلَاةُ التَّرَاوِيحِ';
const stretched = 'صـــــلاة';
const alifVariants = 'أحمد إبراهيم آمنة ٱتقوا';
assert.strictEqual(normalizeArabic(vocalized), 'صلاة التراويح');
assert.strictEqual(normalizeArabic(stretched), 'صلاة');
assert.strictEqual(normalizeArabic(alifVariants), 'احمد ابراهيم امنة اتقوا');

// 4. Bengali stemming
assert.strictEqual(stemBengali('মসজিদগুলোতে'), 'মসজিদ');
assert.strictEqual(stemBengali('রোজার'), 'রোজা');
assert.strictEqual(stemBengali('সালাতের'), 'সালাত');
assert.strictEqual(stemBengali('নামাজে'), 'নামাজ');
assert.strictEqual(stemBengali('কিতাবটির'), 'কিতাব');
assert.strictEqual(stemBengali('মা'), 'মা'); // Protected short root

// 5. Stopwords
assert.strictEqual(isStopword('কি'), true);
assert.strictEqual(isStopword('কী'), true);
assert.strictEqual(isStopword('বিধান'), true);
assert.strictEqual(isStopword('হুকুম'), true);
assert.strictEqual(isStopword('ruling'), true);
assert.strictEqual(isStopword('সালাত'), false);

// 6. Full processTokens pipeline
const rawInput = 'কিভাবে রমজান মাসে রোজা রাখবো? এবং নামাজের বিধান কি?';
const tokens = processTokens(rawInput, true);
assert.ok(tokens.includes('সিয়াম'), 'রোজা should be canonicalized to সিয়াম');
assert.ok(tokens.includes('সালাত'), 'নামাজ should be canonicalized to সালাত');
assert.ok(!tokens.includes('কিভাবে'), 'কিভাবে should be filtered as stopword');
assert.ok(!tokens.includes('বিধান'), 'বিধান should be filtered as domain filler');

console.log('✓ All normalize unit tests passed successfully!');
