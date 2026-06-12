import { describe, it, expect } from 'vitest';
import {
  extractProjectKeywords,
  parseCategory,
  pickPrimaryProjectKeyword,
  AMBIGUOUS_OPERATIONAL_TOKENS,
} from './batchProjectKeywords';

describe('batchProjectKeywords', () => {
  it('detects ambiguous workshop token', () => {
    const hit = pickPrimaryProjectKeyword('listrik workshop (Rully)');
    expect(hit?.keyword).toContain('workshop');
    expect(hit?.isAmbiguous).toBe(true);
    expect(AMBIGUOUS_OPERATIONAL_TOKENS.has('workshop')).toBe(true);
  });

  it('extracts aloevera from kerjaan pattern', () => {
    const hits = extractProjectKeywords('belanja ferum utk mesin las workshop kerjaan aloevera');
    expect(hits.some(h => h.keyword.includes('aloevera'))).toBe(true);
  });

  it('categorizes gaji and iklan', () => {
    expect(parseCategory('gaji Gustam kerjaan cc')).toBe('Tenaga Kerja');
    expect(parseCategory('iklan fb (Rully)')).toBe('Marketing');
    expect(parseCategory('listrik workshop')).toBe('Operasional');
  });
});
