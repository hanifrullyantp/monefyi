import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findMatches } from '../../../agent-core/src/find';
import { agentManual, fixtures, functionSchema, mcpTools } from '../../../agent-core/src/generate';
import { commitRecordCost, prepareRecordCost } from '../../../agent-core/src/prepare';
import { TOOLS, assertRegistry, toolsFor } from '../../../agent-core/src/registry';
import { routeCatatBiaya } from '../../../agent-core/src/sop';

const root = new URL('../../../', import.meta.url);

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
});
