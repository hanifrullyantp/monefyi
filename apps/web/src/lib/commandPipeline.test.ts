import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runNeverFailPipeline } from './commandPipeline';
import { lookupFuzzyMemory, lookupMemory } from '../services/commandMemoryService';

const invokeMock = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

vi.mock('../services/commandMemoryService', () => ({
  lookupMemory: vi.fn().mockResolvedValue(null),
  lookupFuzzyMemory: vi.fn().mockResolvedValue(null),
  loadMemoryExamples: vi.fn().mockResolvedValue([]),
}));

vi.mock('./commandParser', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./commandParser')>();
  return {
    ...actual,
    aiParseCommand: vi.fn().mockResolvedValue({
      intent: 'unknown',
      params: {},
      confidence: 0,
      raw: 'xyz gibberish',
      source: 'fallback',
      reasoning: 'Perintah tidak dipahami atau AI sedang tidak tersedia.',
    }),
  };
});

const WHATSAPP_SAMPLE = `Jum'at, 5/6/2026
Duit keluar :
- 63.500 belanja ferum (indra)
- 33.000 ultraflex 3 pcs (indra)`;

const mockCtx = {
  orgId: 'org-1',
  projects: [],
  work_items: [],
  current_project: null,
};

describe('runNeverFailPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(lookupMemory).mockResolvedValue(null);
    vi.mocked(lookupFuzzyMemory).mockResolvedValue(null);
  });

  it('mengembalikan intent unknown (bukan record_cost) untuk input tidak dikenal / gibberish', async () => {
    const result = await runNeverFailPipeline('asdf qwerty zzz', mockCtx, []);
    expect(result.intent).toBe('unknown');
    expect(result.confidence).toBe(0);
    expect(result.source).toBe('fallback');
    expect(result.layer).toBe(4);
  });

  it('mengembalikan intent unknown untuk input di luar domain seperti "resep nasi goreng spesial"', async () => {
    const result = await runNeverFailPipeline('resep nasi goreng spesial', mockCtx, []);
    expect(result.intent).toBe('unknown');
    expect(result.confidence).toBe(0);
    expect(result.source).toBe('fallback');
    expect(result.sop).toBeUndefined();
  });

  it('tidak mempromosikan fallback ber-intent record_cost menjadi hasil AI valid', async () => {
    const { aiParseCommand } = await import('./commandParser');
    vi.mocked(aiParseCommand).mockResolvedValueOnce({
      intent: 'record_cost',
      params: {},
      confidence: 0.35,
      raw: 'resep nasi goreng spesial',
      source: 'fallback',
      reasoning: 'AI tidak tersedia',
    });
    const result = await runNeverFailPipeline('resep nasi goreng spesial', mockCtx, []);
    expect(result.intent).toBe('unknown');
    expect(result.confidence).toBe(0);
    expect(result.source).toBe('fallback');
  });

  it('parses WhatsApp batch via rule layer without AI', async () => {
    const result = await runNeverFailPipeline(WHATSAPP_SAMPLE, mockCtx, []);
    expect(result.intent).toBe('record_cost_batch');
    expect(result.source).toBe('rule');
    expect(result.layer).toBe(2);
    expect(Array.isArray(result.params.items)).toBe(true);
    expect((result.params.items as unknown[]).length).toBeGreaterThan(0);
  });

  it('parses simple cost command via rules', async () => {
    const result = await runNeverFailPipeline('catat semen 10 sak 65000', mockCtx, []);
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
    const result = await runNeverFailPipeline('beli semen 10 sak 65000', mockCtx, []);
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
    const result = await runNeverFailPipeline('beli semen 10 sak 65000', mockCtx, []);
    expect(result.source).toBe('memory');
    expect(result.params.total).toBe(650_000);
    expect(result.memoryId).toBe('mem-benar');
  });
});

describe('commandParser fallback & aiParseCommand (F-16)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createAIFallbackParse selalu mengembalikan intent unknown dengan confidence 0', async () => {
    const { createAIFallbackParse } = await vi.importActual<typeof import('./commandParser')>('./commandParser');
    const fb = createAIFallbackParse('resep nasi goreng spesial', 'AI offline');
    expect(fb).toMatchObject({
      intent: 'unknown',
      confidence: 0,
      source: 'fallback',
      raw: 'resep nasi goreng spesial',
      reasoning: 'AI offline',
    });
  });

  it('aiParseCommand mengembalikan unknown saat Edge Function mengembalikan { error }', async () => {
    const { aiParseCommand } = await vi.importActual<typeof import('./commandParser')>('./commandParser');
    invokeMock.mockResolvedValueOnce({ data: null, error: new Error('Edge error') });
    const res = await aiParseCommand('resep nasi goreng spesial', mockCtx);
    expect(res.intent).toBe('unknown');
    expect(res.confidence).toBe(0);
    expect(res.source).toBe('fallback');
  });

  it('aiParseCommand mengembalikan unknown saat data._meta.all_providers_failed atau data.all_providers_failed true', async () => {
    const { aiParseCommand } = await vi.importActual<typeof import('./commandParser')>('./commandParser');
    invokeMock.mockResolvedValueOnce({
      data: {
        intent: 'record_cost',
        params: {},
        confidence: 0.35,
        explanation: 'Parsing AI gagal sementara',
        _meta: { all_providers_failed: true },
      },
      error: null,
    });
    const res1 = await aiParseCommand('resep nasi goreng spesial', mockCtx);
    expect(res1.intent).toBe('unknown');
    expect(res1.confidence).toBe(0);
    expect(res1.source).toBe('fallback');

    invokeMock.mockResolvedValueOnce({
      data: {
        intent: 'record_cost',
        all_providers_failed: true,
        message: 'Semua provider gagal',
      },
      error: null,
    });
    const res2 = await aiParseCommand('resep nasi goreng spesial', mockCtx);
    expect(res2.intent).toBe('unknown');
    expect(res2.confidence).toBe(0);
    expect(res2.source).toBe('fallback');
  });

  it('aiParseCommand mengembalikan unknown saat Edge Function membalas intent unknown atau fallback tanpa provider', async () => {
    const { aiParseCommand } = await vi.importActual<typeof import('./commandParser')>('./commandParser');
    invokeMock.mockResolvedValueOnce({
      data: {
        intent: 'unknown',
        params: {},
        explanation: 'Bukan perintah proyek',
      },
      error: null,
    });
    const res1 = await aiParseCommand('resep nasi goreng spesial', mockCtx);
    expect(res1.intent).toBe('unknown');
    expect(res1.confidence).toBe(0);
    expect(res1.source).toBe('fallback');

    invokeMock.mockResolvedValueOnce({
      data: {
        intent: 'record_cost',
        params: {},
        confidence: 0.35,
        message: 'AI belum dikonfigurasi.',
        explanation: 'AI belum dikonfigurasi. Isi form manual di bawah atau set Gemini API key.',
      },
      error: null,
    });
    const res2 = await aiParseCommand('resep nasi goreng spesial', mockCtx);
    expect(res2.intent).toBe('unknown');
    expect(res2.confidence).toBe(0);
    expect(res2.source).toBe('fallback');
  });

  it('aiParseCommand tetap mengembalikan hasil AI valid saat provider berhasil', async () => {
    const { aiParseCommand } = await vi.importActual<typeof import('./commandParser')>('./commandParser');
    invokeMock.mockResolvedValueOnce({
      data: {
        intent: 'record_cost',
        params: { item: 'besi beton', total: 1_200_000 },
        confidence: 0.91,
        explanation: 'Catat pembelian besi beton',
        _meta: { provider: 'gemini' },
      },
      error: null,
    });
    const res = await aiParseCommand('beli besi beton 1.2jt', mockCtx);
    expect(res.intent).toBe('record_cost');
    expect(res.confidence).toBe(0.91);
    expect(res.source).toBe('ai');
    expect(res.provider).toBe('gemini');
  });
});
