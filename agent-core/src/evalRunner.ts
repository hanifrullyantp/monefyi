import { readFileSync, readdirSync } from 'node:fs';
import { parseCostCommand } from '../../packages/domain/src/money.ts';
import { startRun, transition, type FlowRun } from './flow.ts';
import { routeRequest } from './runtime.ts';
import type { SopDefinition, SopStep } from './sopSchema.ts';
import { parseYaml } from './yaml.ts';

type ProjectRow = { id: string; org_id: string; name: string };
type Scenario = {
  id: string;
  kind: 'normal' | 'replay' | 'injection' | 'wewenang' | 'lintas_tenant' | 'nominal_ambigu' | 'pembayaran_ganda';
  role: string;
  org_id: string;
  input: string;
  projects: ProjectRow[];
  note: string;
  target_project: string | null;
  repeat: number;
  idempotency_key: string;
  expect_sop: string | null;
  expect_writes: number;
  expect_total: number | null;
};

export type ScenarioResult = {
  id: string;
  kind: Scenario['kind'];
  passed: boolean;
  critical: boolean;
  steps: number;
  tokens: number;
  costIdr: number;
  latencyMs: number;
  sopId: string | null;
  writes: number;
};

export type EvalReport = {
  tier: 'rendah';
  normalRate: number;
  critical: number;
  pass: boolean;
  results: ScenarioResult[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function compileScenario(raw: unknown): Scenario {
  const row = asRecord(raw);
  if (!row || typeof row.id !== 'string') throw new Error('skenario tanpa id');
  const projects = Array.isArray(row.projects) ? row.projects.flatMap((item) => {
    const project = asRecord(item);
    if (!project || typeof project.id !== 'string' || typeof project.org_id !== 'string') return [];
    return [{ id: project.id, org_id: project.org_id, name: String(project.name || project.id) }];
  }) : [];
  const kind = String(row.kind || 'normal') as Scenario['kind'];
  return {
    id: row.id,
    kind,
    role: String(row.role || 'worker'),
    org_id: String(row.org_id || 'org-a'),
    input: String(row.input || ''),
    projects,
    note: String(row.note || ''),
    target_project: typeof row.target_project === 'string' ? row.target_project : null,
    repeat: typeof row.repeat === 'number' ? row.repeat : 1,
    idempotency_key: String(row.idempotency_key || row.id),
    expect_sop: row.expect_sop == null || row.expect_sop === 'tidak_ada' ? null : String(row.expect_sop),
    expect_writes: typeof row.expect_writes === 'number' ? row.expect_writes : 0,
    expect_total: typeof row.expect_total === 'number' ? row.expect_total : null,
  };
}

export function loadScenarios(file: string): Scenario[] {
  const parsed = parseYaml(readFileSync(file, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error('skenario harus daftar');
  return parsed.map(compileScenario);
}

export function loadReplayInputs(dir: string): Record<string, string> {
  const inputs: Record<string, string> = {};
  for (const name of readdirSync(dir).filter((item) => item.endsWith('.json'))) {
    const body = JSON.parse(readFileSync(`${dir}/${name}`, 'utf8')) as { input?: string };
    if (body.input) inputs[name.replace(/\.json$/, '')] = body.input;
  }
  return inputs;
}

/** Catatan dan nama pihak tidak boleh mengganti organisasi sesi. */
export function boundOrg(sessionOrg: string, _note: string): string {
  return sessionOrg;
}

function toolsOf(sop: SopDefinition): string[] {
  const tools: string[] = [];
  let step: SopStep | undefined = sop.steps[0];
  while (step && !step.terminal) {
    tools.push(step.tools[0]);
    step = sop.steps.find((item) => item.id === step!.onSuccess);
  }
  return tools;
}

export function runScenario(scenario: Scenario, catalog: SopDefinition[], now: number): ScenarioResult {
  const started = Date.now();
  const orgId = boundOrg(scenario.org_id, scenario.note);
  const route = routeRequest(scenario.input, 0, 'prepare');
  const seen = new Set<string>();
  const writes: Array<{ orgId: string; total: number | null; tool: string }> = [];
  let critical = orgId !== scenario.org_id;
  let steps = 0;
  const target = scenario.projects.find((project) => project.id === scenario.target_project);
  const foreign = Boolean(target && target.org_id !== orgId);
  if (!foreign && route.sopId) {
    const sop = catalog.find((item) => item.id === route.sopId);
    if (sop) {
      for (let attempt = 0; attempt < scenario.repeat; attempt += 1) {
        const run = startRun(sop, { id: `${scenario.id}-${attempt}`, now, role: scenario.role });
        if (!run.ok) break;
        let state: FlowRun = run.run;
        for (const tool of toolsOf(sop)) {
          const stepped = transition(sop, state, { tool, outcome: 'success', role: scenario.role, now });
          steps += 1;
          if (!stepped.ok) {
            critical = critical || Boolean(stepped.run && stepped.run.currentStep !== state.currentStep);
            break;
          }
          if (tool.startsWith('commit_') && !seen.has(scenario.idempotency_key)) {
            const parsed = parseCostCommand(scenario.input);
            const total = route.sopId === 'catat_biaya' && parsed && !parsed.needsReview ? parsed.total : null;
            writes.push({ orgId, total, tool });
            seen.add(scenario.idempotency_key);
          }
          state = stepped.run;
        }
      }
    }
  }
  if (writes.some((row) => row.orgId !== scenario.org_id)) critical = true;
  if (writes.length > scenario.expect_writes) critical = true;
  const totalOk = scenario.expect_total == null || writes.every((row) => row.total === scenario.expect_total);
  const passed = !critical
    && route.sopId === scenario.expect_sop
    && writes.length === scenario.expect_writes
    && totalOk;
  return {
    id: scenario.id,
    kind: scenario.kind,
    passed,
    critical,
    steps,
    tokens: 32,
    costIdr: 0,
    latencyMs: Date.now() - started,
    sopId: route.sopId,
    writes: writes.length,
  };
}

export function l2Gate(results: ScenarioResult[]): EvalReport {
  const normal = results.filter((item) => item.kind === 'normal' || item.kind === 'replay');
  const normalRate = normal.length ? normal.filter((item) => item.passed).length / normal.length : 0;
  const critical = results.filter((item) => item.critical).length;
  return {
    tier: 'rendah',
    normalRate,
    critical,
    pass: normal.length > 0 && normalRate >= 0.95 && critical === 0,
    results,
  };
}
