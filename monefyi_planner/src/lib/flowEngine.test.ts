import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadSopDirectory } from '../../../agent-core/src/loadSops';
import { SOP_CATALOG } from '../../../agent-core/src/sopData';
import {
  planFlowAction,
  screenFlowBody,
  startRun,
  transition,
  type FlowRun,
} from '../../../agent-core/src/flow';
import { REQUIRED_SOPS, type SopDefinition } from '../../../agent-core/src/sopSchema';
import { routeCatatBiaya } from '../../../agent-core/src/sop';

const NOW = Date.parse('2026-11-04T01:00:00.000Z');
const catalog = loadSopDirectory(fileURLToPath(new URL('../../../agent-core/sop/', import.meta.url)));

function successTools(sop: SopDefinition): string[] {
  const tools: string[] = [];
  let step = sop.steps[0];
  while (step && !step.terminal) {
    tools.push(step.tools[0]);
    const next = sop.steps.find((item) => item.id === step.onSuccess);
    if (!next) break;
    step = next;
  }
  return tools;
}

function begin(sop: SopDefinition, role = 'owner') {
  const parameters: Record<string, number> = {};
  for (const param of sop.parameters) {
    if (param.required && param.defaultValue == null) parameters[param.key] = param.min;
  }
  return startRun(sop, { id: `${sop.id}-run`, now: NOW, role, parameters });
}

describe('katalog SOP', () => {
  it('SOP wajib sama dengan berkas YAML', () => {
    expect(catalog.map((sop) => sop.id).sort()).toEqual([...REQUIRED_SOPS].sort());
    expect(catalog).toEqual(SOP_CATALOG);
    expect(routeCatatBiaya('beli semen 10 sak 65000')?.sop).toBe('catat_biaya');
  });

  it('menolak org_id dari agen', () => {
    const screened = screenFlowBody({ action: 'start', sop_id: 'catat_biaya', org_id: 'x' });
    expect(screened.ok).toBe(false);
    if (!screened.ok) expect(screened.error.code).toBe('bukan_argumen_agen');
  });
});

for (const sop of catalog) {
  describe(sop.id, () => {
    const tools = successTools(sop);
    const first = sop.steps[0];
    const param = sop.parameters[0];

    it('normal sampai selesai dan bisa dilanjutkan dari salinan state', () => {
      const started = begin(sop);
      expect(started.ok).toBe(true);
      if (!started.ok) return;
      let run = started.run;
      for (const tool of tools) {
        const resumed = JSON.parse(JSON.stringify(run)) as FlowRun;
        const stepped = transition(sop, resumed, { tool, outcome: 'success', role: 'owner', now: NOW });
        expect(stepped.ok).toBe(true);
        if (!stepped.ok) return;
        run = stepped.run;
      }
      expect(run.status).toBe('done');
      expect([...run.postconditions ?? []]).toEqual(sop.postconditions);
      expect(Object.isFrozen(run.postconditions)).toBe(true);
    });

    it('ambigu tetap di langkah yang sama', () => {
      const started = begin(sop);
      if (!started.ok) throw new Error(sop.id);
      const stepped = transition(sop, started.run, {
        tool: tools[0],
        outcome: 'needs_choice',
        role: 'owner',
        now: NOW,
      });
      expect(stepped.ok).toBe(true);
      if (!stepped.ok) return;
      expect(stepped.run.currentStep).toBe(first.id);
      expect(stepped.view.allowed_tools).toEqual(first.tools);
    });

    it('input salah dua kali mengeskalasi tanpa pindah langkah', () => {
      const started = begin(sop);
      if (!started.ok) throw new Error(sop.id);
      const once = transition(sop, started.run, { tool: tools[0], outcome: 'invalid', role: 'owner', now: NOW });
      expect(once.ok).toBe(true);
      if (!once.ok) return;
      const twice = transition(sop, once.run, { tool: tools[0], outcome: 'invalid', role: 'owner', now: NOW });
      expect(twice.ok).toBe(true);
      if (!twice.ok) return;
      expect(twice.run.currentStep).toBe(first.id);
      expect(twice.run.escalated).toBe(true);
      expect(twice.view.next_allowed_actions).toContain('eskalasi_pemilik');
    });

    it('tool yang tidak dikenal ditolak dan langkah tidak diganti', () => {
      const started = begin(sop);
      if (!started.ok) throw new Error(sop.id);
      const stepped = transition(sop, started.run, { tool: 'ubah_profil', outcome: 'success', role: 'owner', now: NOW });
      expect(stepped.ok).toBe(false);
      if (stepped.ok) return;
      expect(stepped.error.code).toBe('tool_di_luar_langkah');
      expect(stepped.error.valid_options).toEqual(first.tools);
      expect(stepped.run?.currentStep).toBe(first.id);
    });

    it('peran di bawah batas tidak boleh mulai', () => {
      const role = first.minRole === 'worker' ? 'outsider' : 'worker';
      const started = begin(sop, role);
      expect(started.ok).toBe(false);
      if (started.ok) return;
      expect(started.error.code).toBe('di_luar_wewenang');
      expect(started.run).toBeNull();
    });

    it('konflik data tetap di langkah yang sama', () => {
      const started = begin(sop);
      if (!started.ok) throw new Error(sop.id);
      const stepped = transition(sop, started.run, { tool: tools[0], outcome: 'conflict', role: 'owner', now: NOW });
      expect(stepped.ok).toBe(true);
      if (!stepped.ok) return;
      expect(stepped.run.currentStep).toBe(first.id);
      expect(stepped.run.invalidCount).toBe(0);
    });

    it('tool langkah depan ditolak', () => {
      expect(tools.length).toBeGreaterThan(1);
      const started = begin(sop);
      if (!started.ok) throw new Error(sop.id);
      const later = tools[tools.length - 1];
      const stepped = transition(sop, started.run, { tool: later, outcome: 'success', role: 'owner', now: NOW });
      expect(stepped.ok).toBe(false);
      if (stepped.ok) return;
      expect(stepped.error.code).toBe('tool_di_luar_langkah');
      expect(stepped.error.valid_options).not.toContain(later);
      expect(stepped.run?.currentStep).toBe(first.id);
    });

    it('lewat batas waktu tidak memajukan langkah', () => {
      const started = begin(sop);
      if (!started.ok) throw new Error(sop.id);
      const stepped = transition(sop, started.run, {
        tool: tools[0],
        outcome: 'success',
        role: 'owner',
        now: started.run.expiresAt,
      });
      expect(stepped.ok).toBe(false);
      if (stepped.ok) return;
      expect(stepped.error.code).toBe('run_kedaluwarsa');
      expect(stepped.run?.status).toBe('expired');
      expect(stepped.run?.currentStep).toBe(first.id);
    });

    it('setelah selesai pascakondisi terkunci', () => {
      const started = begin(sop);
      if (!started.ok) throw new Error(sop.id);
      let run = started.run;
      for (const tool of tools) {
        const stepped = transition(sop, run, { tool, outcome: 'success', role: 'owner', now: NOW });
        if (!stepped.ok) throw new Error(tool);
        run = stepped.run;
      }
      const locked = [...(run.postconditions ?? [])];
      const again = transition(sop, run, { tool: tools[0], outcome: 'success', role: 'owner', now: NOW });
      expect(again.ok).toBe(false);
      if (again.ok) return;
      expect(again.error.code).toBe('sop_selesai');
      expect([...(again.run?.postconditions ?? [])]).toEqual(locked);
    });

    it('parameter di luar batas tidak membuat run', () => {
      const started = startRun(sop, {
        id: `${sop.id}-bad`,
        now: NOW,
        role: 'owner',
        parameters: { [param.key]: param.max + 1 },
      });
      expect(started.ok).toBe(false);
      if (started.ok) return;
      expect(started.error.code).toBe('parameter_di_luar_batas');
      expect(started.run).toBeNull();
    });
  });
}

describe('gerbang server', () => {
  it('attempt tool yang diizinkan tidak memajukan langkah', () => {
    const sop = catalog.find((item) => item.id === 'catat_biaya');
    if (!sop) throw new Error('catat_biaya');
    const started = begin(sop);
    if (!started.ok) throw new Error('start');
    const attempt = planFlowAction(catalog, {
      type: 'attempt',
      run: started.run,
      tool: 'find_project',
      role: 'worker',
      now: NOW,
    });
    expect(attempt.ok).toBe(true);
    if (!attempt.ok) return;
    expect(attempt.run.currentStep).toBe('cari_proyek');
    expect(attempt.view.allowed_tools).toEqual(['find_project']);
  });
});
