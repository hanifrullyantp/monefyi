import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runNeverFailPipeline } from './commandPipeline';
import { lookupFuzzyMemory, lookupMemory } from '../services/commandMemoryService';

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
    vi.mocked(lookupMemory).mockResolvedValue(null);
    vi.mocked(lookupFuzzyMemory).mockResolvedValue(null);
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
    expect(result.params.total).toBe(650_000);
    expect(result.sop).toBe('catat_biaya');
  });

  it('memori 650 juta tidak mengalahkan parser semen', async () => {
    vi.mocked(lookupMemory).mockResolvedValueOnce({
      intent: 'record_cost',
      params: { item: 'semen', qty: 10, unitPrice: 65_000_000, total: 650_000_000 },
      signature: 'beli {text0} {n0} sak {n1}',
      source: 'ai',
      hitCount: 4,
      accuracyScore: 1,
      memoryId: 'mem-salah',
    });
    const result = await runNeverFailPipeline('beli semen 10 sak 65000', { orgId: 'org-1' }, []);
    expect(result.source).toBe('rule');
    expect(result.params.total).toBe(650_000);
    expect(result.memoryId).toBeUndefined();
  });

  it('memori yang nominalnya sama tetap dipakai', async () => {
    vi.mocked(lookupMemory).mockResolvedValueOnce({
      intent: 'record_cost',
      params: { item: 'semen', qty: 10, unitPrice: 65_000, total: 650_000 },
      signature: 'beli {text0} {n0} sak {n1}',
      source: 'user',
      hitCount: 2,
      accuracyScore: 1,
      memoryId: 'mem-benar',
    });
    const result = await runNeverFailPipeline('beli semen 10 sak 65000', { orgId: 'org-1' }, []);
    expect(result.source).toBe('memory');
    expect(result.params.total).toBe(650_000);
    expect(result.memoryId).toBe('mem-benar');
  });
});
