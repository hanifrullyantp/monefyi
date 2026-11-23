import { describe, it, expect } from 'vitest';
import { combinedSimilarity, jaccardSimilarity } from './textSimilarity';

describe('textSimilarity', () => {
  it('scores identical strings as 1', () => {
    expect(combinedSimilarity('catat semen 10 sak', 'catat semen 10 sak')).toBe(1);
  });

  it('scores similar commands higher than unrelated text', () => {
    const similar = jaccardSimilarity('catat semen 10 sak', 'catat semen 10 sak 65000');
    const unrelated = jaccardSimilarity('catat semen 10 sak', 'buka laporan bulan ini');
    expect(similar).toBeGreaterThan(unrelated);
  });
});
