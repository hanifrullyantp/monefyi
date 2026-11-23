import { describe, it, expect } from 'vitest';
import { preprocessInput } from './commandPreprocessor';

describe('preprocessInput', () => {
  it('detects WhatsApp batch format', () => {
    const raw = `Jum'at, 5/6/2026
Duit keluar :
- 63.500 belanja ferum (indra)`;
    const result = preprocessInput(raw, []);
    expect(result.detectedFormat).toBe('whatsapp');
    expect(result.preConfidence).toBeGreaterThan(0.5);
  });

  it('normalizes abbreviations via normalizeInput', () => {
    const result = preprocessInput('catet semen 10 sak', []);
    expect(result.normalized).toContain('catat');
  });

  it('preserves newlines in original while cleaning tags', () => {
    const result = preprocessInput('duit keluar\n- 50000 beli semen', []);
    expect(result.original.includes('\n')).toBe(true);
  });
});
