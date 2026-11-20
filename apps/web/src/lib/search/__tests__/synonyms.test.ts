import { describe, it, expect } from 'vitest';
import {
  SYNONYM_GROUPS,
  getCanonicalTerm,
  expandSynonyms,
  isAblutionTerm,
} from '../synonyms';

describe('Islamic Domain Synonym Registry', () => {
  it('contains at least 60 comprehensive fiqh synonym groups', () => {
    expect(SYNONYM_GROUPS.length).toBeGreaterThanOrEqual(60);
  });

  it('maps prayer variants to canonical সালাত', () => {
    expect(getCanonicalTerm('নামাজ')).toBe('সালাত');
    expect(getCanonicalTerm('নামায')).toBe('সালাত');
    expect(getCanonicalTerm('namaz')).toBe('সালাত');
    expect(getCanonicalTerm('salat')).toBe('সালাত');
    expect(getCanonicalTerm('ছালাত')).toBe('সালাত');
  });

  it('maps fasting variants to canonical সিয়াম', () => {
    expect(getCanonicalTerm('রোজা')).toBe('সিয়াম');
    expect(getCanonicalTerm('রোযা')).toBe('সিয়াম');
    expect(getCanonicalTerm('roza')).toBe('সিয়াম');
    expect(getCanonicalTerm('sawm')).toBe('সিয়াম');
    expect(getCanonicalTerm('ছিয়াম')).toBe('সিয়াম');
  });

  it('maps financial and interest variants to canonical সুদ', () => {
    expect(getCanonicalTerm('রিবা')).toBe('সুদ');
    expect(getCanonicalTerm('সূদ')).toBe('সুদ');
    expect(getCanonicalTerm('interest')).toBe('সুদ');
    expect(getCanonicalTerm('riba')).toBe('সুদ');
  });

  it('maps divorce variants to canonical তালাক', () => {
    expect(getCanonicalTerm('ডিভোর্স')).toBe('তালাক');
    expect(getCanonicalTerm('divorce')).toBe('তালাক');
    expect(getCanonicalTerm('talaq')).toBe('তালাক');
  });

  it('maps ablution variants to canonical ওযু and identifies them via isAblutionTerm', () => {
    expect(getCanonicalTerm('অজু')).toBe('ওযু');
    expect(getCanonicalTerm('উযু')).toBe('ওযু');
    expect(getCanonicalTerm('wudu')).toBe('ওযু');
    expect(getCanonicalTerm('oju')).toBe('ওযু');

    expect(isAblutionTerm('wudu')).toBe(true);
    expect(isAblutionTerm('অজু')).toBe(true);
    expect(isAblutionTerm('নামাজ')).toBe(false);
  });

  it('expands synonyms bi-directionally', () => {
    const expanded = expandSynonyms('নামাজ');
    expect(expanded).toContain('সালাত');
    expect(expanded).toContain('ছালাত');
    expect(expanded).toContain('namaz');
  });
});
