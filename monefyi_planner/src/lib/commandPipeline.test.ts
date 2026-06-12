import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runNeverFailPipeline } from './commandPipeline';

vi.mock('../services/commandMemoryService', () => ({
  lookupMemory: vi.fn().mockResolvedValue(null),
  lookupFuzzyMemory: vi.fn().mockResolvedValue(null),
}));

vi.mock('./commandParser', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./commandParser')>();
  return {
    ...actual,
    aiParseCommand: vi.fn().mockResolvedValue({
      intent: 'record_cost',
      params: {},
      confidence: 0.35,
      raw: 'xyz gibberish',
      source: 'fallback',
      reasoning: 'isi manual di form',
    }),
  };
});

const WHATSAPP_SAMPLE = `Jum'at, 5/6/2026
Duit keluar :
- 63.500 belanja ferum (indra)
- 33.000 ultraflex 3 pcs (indra)`;

describe('runNeverFailPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('always returns a usable intent for gibberish input', async () => {
    const result = await runNeverFailPipeline('asdf qwerty zzz', { orgId: 'org-1' }, []);
    expect(result.intent).not.toBe('unknown');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.layer).toBeGreaterThanOrEqual(2);
  });

  it('parses WhatsApp batch via rule layer without AI', async () => {
    const result = await runNeverFailPipeline(WHATSAPP_SAMPLE, { orgId: 'org-1' }, []);
    expect(result.intent).toBe('record_cost_batch');
    expect(result.source).toBe('rule');
    expect(result.layer).toBe(2);
    expect(Array.isArray(result.params.items)).toBe(true);
    expect((result.params.items as unknown[]).length).toBeGreaterThan(0);
  });

  it('parses simple cost command via rules', async () => {
    const result = await runNeverFailPipeline('catat semen 10 sak 65000', { orgId: 'org-1' }, []);
    expect(result.intent).toBe('record_cost');
    expect(result.source).toBe('rule');
    expect(result.confidence).toBeGreaterThanOrEqual(0.75);
  });
});
