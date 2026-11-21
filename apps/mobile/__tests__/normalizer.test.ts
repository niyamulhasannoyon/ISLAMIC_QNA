import { normalizeBengaliText, stemBengaliToken, getSynonymsAndVariants } from '@repo/text-utils';
import { buildNormalizedCorpus } from '../src/db/fatwaRepo';

describe('Bengali Text Normalization & Search Pipeline for Mobile', () => {
  it('normalizes diacritics, nuktas, and digits consistently', () => {
    const raw = 'নামাযের  ওয়াক্ত  ১২৩';
    const normalized = normalizeBengaliText(raw);

    expect(normalized).toContain('নামাযের');
    expect(normalized).toContain('123'); // converted Bengali digits
    expect(normalized).not.toContain('  '); // collapsed whitespace
  });

  it('stems common Bengali inflections correctly for FTS indexing', () => {
    expect(stemBengaliToken('নামাযের')).toBe('নামায');
    expect(stemBengaliToken('রোযায়')).toBe('রোযা');
    expect(stemBengaliToken('মাসআলাগুলো')).toBe('মাসআলা');
  });

  it('expands common Islamic synonym clusters', () => {
    const synonyms = getSynonymsAndVariants('নামাজ');
    expect(synonyms).toContain('সালাত');
    expect(synonyms).toContain('নামায');

    const rozaSynonyms = getSynonymsAndVariants('রোজা');
    expect(rozaSynonyms).toContain('সিয়াম');
    expect(rozaSynonyms).toContain('রোযা');
  });

  it('builds a stemmed normalized corpus from fatwa fields', () => {
    const title = 'কাযা নামাযের নিয়ম';
    const question = 'নামায কাজা হলে কীভাবে পড়তে হবে?';
    const answer = 'সালাত যথাসময়ে আদায় করা ফরজ। তবে কাজা হলে দ্রুত তা আদায় করা ওয়াজিব।';

    const corpus = buildNormalizedCorpus(title, question, answer);

    expect(typeof corpus).toBe('string');
    expect(corpus).toContain('নামায');
    expect(corpus).toContain('সালাত');
    expect(corpus.length).toBeGreaterThan(0);
  });
});
