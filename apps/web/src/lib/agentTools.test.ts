import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findMatches } from '@agent-core/find';
import { buildFinanceSnapshot, estimateJsonTokens } from '@agent-core/financeSnapshot';
import { agentManual, fixtures, functionSchema, mcpTools } from '@agent-core/generate';
import { commitRecordCost, prepareRecordCost } from '@agent-core/prepare';
import { TOOLS, assertRegistry, toolsFor } from '@agent-core/registry';
import { routeCatatBiaya } from '@agent-core/sop';

const root = new URL('../../../../', import.meta.url);

describe('registry tool', () => {
  it('semua tool sempit, tanpa org_id, dan paling banyak 8 per agen', () => {
    expect(assertRegistry()).toEqual([]);
    expect(toolsFor('finance', 'manager').length).toBeLessThanOrEqual(8);
    expect(toolsFor('hr', 'worker').map((tool) => tool.name)).toEqual(['find_project']);
    for (const tool of TOOLS) {
      expect(tool.args.length).toBeLessThanOrEqual(6);
    }
  });

  it('find tidak mengarang id dan meminta pilihan saat ambigu', () => {
    const rows = [
      { id: 'p-rumah', label: 'Rumah Bu Ana' },
      { id: 'p-ruko', label: 'Ruko Bu Ana' },
    ];
    const ambiguous = findMatches('Bu Ana', rows);
    expect(ambiguous.status).toBe('needs_choice');
    if (ambiguous.status === 'needs_choice') {
      expect(ambiguous.candidates.length).toBeLessThanOrEqual(5);
      expect(ambiguous.candidates.every((hit) => rows.some((row) => row.id === hit.id))).toBe(true);
    }
    const exact = findMatches('Rumah Bu Ana', rows);
    expect(exact).toMatchObject({ status: 'chosen', id: 'p-rumah' });
    expect(findMatches('gudang', rows).status).toBe('none');
  });

  it('commit tidak menerima nominal baru dan menolak token kedaluwarsa', () => {
    const now = Date.parse('2026-11-04T01:00:00.000Z');
    const prepared = prepareRecordCost({
      projectId: 'p-rumah',
      item: 'semen',
      total: 650_000,
      qty: 10,
      unit: 'sak',
      unitPrice: 65_000,
      entryDate: '2026-11-04',
      now,
    });
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    const committed = commitRecordCost({
      prepareToken: prepared.token,
      idempotencyKey: 'key-1',
      now,
    });
    expect(committed.ok && committed.cost.total).toBe(650_000);
    expect(commitRecordCost({ prepareToken: prepared.token, idempotencyKey: '', now }).ok).toBe(false);
    expect(commitRecordCost({
      prepareToken: prepared.token,
      idempotencyKey: 'key-1',
      now: now + 11 * 60 * 1000,
    }).ok).toBe(false);
    expect(commitRecordCost({
      prepareToken: prepared.token + 'x',
      idempotencyKey: 'key-1',
      now,
    }).ok).toBe(false);
  });

  it('teks biaya masuk SOP catat_biaya', () => {
    expect(routeCatatBiaya('beli semen 10 sak 65000')).toEqual({
      sop: 'catat_biaya',
      item: 'semen',
      total: 650_000,
    });
    expect(routeCatatBiaya('berapa sisa budget')).toBeNull();
  });

  it('skema, MCP, dan manual dihasilkan dari registry yang sama', () => {
    const commit = functionSchema(TOOLS.find((tool) => tool.name === 'commit_record_cost')!);
    expect(commit.parameters.required).toEqual(['prepare_token', 'idempotency_key']);
    expect(JSON.stringify(mcpTools())).toContain('prepare_record_cost');
    expect(agentManual()).toContain('## commit_record_cost');
    expect(agentManual()).not.toContain('org_id');
    const manual = readFileSync(new URL('docs/agent/AGENT_MANUAL.md', root), 'utf8');
    expect(manual).toBe(agentManual());
    expect(JSON.parse(readFileSync(new URL('agent-core/fixtures.json', root), 'utf8'))).toEqual(fixtures());
  });

  it('prepare_record_cost menolak periode terkunci dan menyimpan metadata source agent', () => {
    const now = Date.parse('2026-11-24T01:00:00.000Z');
    const locked = prepareRecordCost({
      projectId: 'p-rumah',
      item: 'semen',
      total: 650_000,
      entryDate: '2026-10-15',
      now,
      lockedPeriods: ['2026-10-01'],
      source: 'agent',
      model: 'gemini-flash',
    });
    expect(locked.ok).toBe(false);
    if (!locked.ok) {
      expect(locked.error.code).toBe('periode_terkunci');
    }

    const ok = prepareRecordCost({
      projectId: 'p-rumah',
      item: 'semen',
      total: 650_000,
      entryDate: '2026-11-24',
      now,
      lockedPeriods: ['2026-10-01'],
      source: 'agent',
      model: 'gemini-flash',
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.cost.source).toBe('agent');
      expect(ok.cost.model).toBe('gemini-flash');
    }
  });

  it('anggaran token F0: deskripsi setiap tool <= 25 kata dan evals/finance/f0_guardrails.yaml tersedia', () => {
    for (const tool of TOOLS) {
      const words = tool.description.trim().split(/\s+/).filter(Boolean);
      expect(words.length, tool.name).toBeLessThanOrEqual(25);
    }
    const guardYaml = readFileSync(new URL('evals/finance/f0_guardrails.yaml', root), 'utf8');
    expect(guardYaml).toContain('f0_tolak_periode_terkunci');
  });

  it('F2 get_finance_snapshot mengembalikan JSON <= 400 token dan daftar maks 5 item + total', () => {
    const sampleInput = {
      asOf: '2026-11-24',
      monthLabel: '2026-11',
      wallets: Array.from({ length: 8 }, (_, i) => ({
        id: `wallet-000${i + 1}`,
        name: `Bank Rekening Operasional ${i + 1}`,
        balance: (i + 1) * 5_000_000,
      })),
      receivableTotal: 35_000_000,
      receivableDue: 12_000_000,
      retentionTotal: 5_000_000,
      payableTotal: 18_000_000,
      payableDue: 4_000_000,
      monthRevenue: 120_000_000,
      monthHpp: 72_000_000,
      monthGrossProfit: 48_000_000,
      monthOpexActual: 11_000_000,
      monthOpexPlanned: 14_000_000,
      monthNetProfit: 37_000_000,
      projects: Array.from({ length: 8 }, (_, i) => ({
        id: `proj-000${i + 1}`,
        name: `Proyek Pembangunan Rumah ${i + 1}`,
        revenue: 40_000_000,
        hpp: 25_000_000,
        profit: 15_000_000 + i * 1_000_000,
        rapUsagePct: 62.5,
      })),
      balanceSheet: {
        totalAktiva: 220_000_000,
        totalPasiva: 220_000_000,
        isBalanced: true,
        labaDitahan: 60_000_000,
        asetTetap: 45_000_000,
      },
      cashFlow: {
        opening: 100_000_000,
        inflows: 120_000_000,
        outflows: 40_000_000,
        closing: 180_000_000,
      },
    };

    const ringkasan = buildFinanceSnapshot({ ...sampleInput, kind: 'ringkasan' });
    expect(ringkasan.cash?.top.length).toBeLessThanOrEqual(5);
    expect(ringkasan.cash?.count).toBe(8);
    expect(ringkasan.projects?.items.length).toBeLessThanOrEqual(5);
    expect(ringkasan.projects?.total).toBe(8);
    expect(estimateJsonTokens(ringkasan)).toBeLessThanOrEqual(400);

    for (const kind of ['laba_rugi', 'neraca', 'arus_kas'] as const) {
      const rep = buildFinanceSnapshot({ ...sampleInput, kind });
      expect(estimateJsonTokens(rep)).toBeLessThanOrEqual(350);
    }

    const f2Yaml = readFileSync(new URL('evals/finance/f2_snapshot.yaml', root), 'utf8');
    expect(f2Yaml).toContain('f2_snapshot_ringkasan_budget');
  });
});
