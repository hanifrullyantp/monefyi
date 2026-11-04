import { structuredError, type StructuredError } from '../domain/errors.ts';
import type { SopDefinition, SopStep } from './sopSchema.ts';

export type FlowStatus = 'active' | 'done' | 'expired';
export type ToolOutcome = 'success' | 'needs_choice' | 'invalid' | 'conflict';

export type FlowRun = {
  id: string;
  sopId: string;
  sopVersion: number;
  status: FlowStatus;
  currentStep: string;
  invalidCount: number;
  escalated: boolean;
  parameters: Record<string, number>;
  postconditions: readonly string[] | null;
  startedAt: number;
  expiresAt: number;
};

export type FlowView = {
  current_step: string;
  allowed_tools: string[];
  next_allowed_actions: string[];
  status: FlowStatus;
  escalated: boolean;
  postconditions: readonly string[] | null;
};

export type FlowOk = { ok: true; run: FlowRun; view: FlowView };
export type FlowFail = { ok: false; run: FlowRun | null; error: StructuredError };
export type FlowResult = FlowOk | FlowFail;

const RANK: Record<string, number> = { worker: 1, manager: 2, owner: 3 };
const FORBIDDEN_BODY_KEYS = ['org_id', 'user_id', 'role', 'outcome', 'current_step'];

export function screenFlowBody(body: unknown): { ok: true } | { ok: false; error: StructuredError } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: structuredError('badan_tidak_valid', 'Kirim objek JSON.', []) };
  }
  const record = body as Record<string, unknown>;
  for (const key of FORBIDDEN_BODY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return { ok: false, error: structuredError('bukan_argumen_agen', `Jangan kirim ${key}. Server mengisi nilai itu.`, []) };
    }
  }
  return { ok: true };
}

export function roleRank(role: string): number {
  return RANK[role] ?? 0;
}

function fail(run: FlowRun | null, code: string, hint: string, options: string[] = []): FlowFail {
  return { ok: false, run, error: structuredError(code, hint, options) };
}

function stepOf(sop: SopDefinition, id: string): SopStep | null {
  return sop.steps.find((step) => step.id === id) ?? null;
}

function copyRun(run: FlowRun): FlowRun {
  return {
    ...run,
    parameters: { ...run.parameters },
    postconditions: run.postconditions ? Object.freeze([...run.postconditions]) : null,
  };
}

export function resolveParameters(
  sop: SopDefinition,
  input: Record<string, unknown> | undefined,
): { ok: true; parameters: Record<string, number> } | { ok: false; error: StructuredError } {
  const source = input ?? {};
  const known = sop.parameters.map((item) => item.key);
  for (const key of Object.keys(source)) {
    if (!known.includes(key)) {
      return { ok: false, error: structuredError('parameter_tidak_dikenal', `Parameter ${key} tidak ada di SOP ini.`, known) };
    }
  }
  const parameters: Record<string, number> = {};
  for (const param of sop.parameters) {
    const raw = source[param.key];
    if (raw == null) {
      if (param.defaultValue != null) {
        parameters[param.key] = param.defaultValue;
        continue;
      }
      if (param.required) {
        return { ok: false, error: structuredError('parameter_kosong', `Isi ${param.key} sebelum menjalankan SOP.`, [param.key]) };
      }
      continue;
    }
    if (typeof raw !== 'number' || !Number.isInteger(raw)) {
      return { ok: false, error: structuredError('parameter_tipe_salah', `${param.key} harus bilangan bulat rupiah atau angka.`, []) };
    }
    if (raw < param.min || raw > param.max) {
      return {
        ok: false,
        error: structuredError('parameter_di_luar_batas', `${param.key} harus di antara ${param.min} dan ${param.max}.`, []),
      };
    }
    parameters[param.key] = raw;
  }
  return { ok: true, parameters };
}

export function present(sop: SopDefinition, run: FlowRun): FlowView {
  const step = stepOf(sop, run.currentStep);
  const tools = run.status === 'active' && step ? [...step.tools] : [];
  const actions = [...tools];
  if (run.status === 'active' && step?.approval) actions.push('minta_persetujuan');
  if (run.status === 'active' && run.escalated) actions.push(`eskalasi_${sop.escalationTo}`);
  return {
    current_step: run.currentStep,
    allowed_tools: tools,
    next_allowed_actions: actions,
    status: run.status,
    escalated: run.escalated,
    postconditions: run.postconditions,
  };
}

function expire(run: FlowRun, now: number): FlowRun {
  if (run.status === 'active' && now >= run.expiresAt) return { ...run, status: 'expired' };
  return run;
}

export function findSop(catalog: SopDefinition[], id: string, version?: number): SopDefinition | null {
  const matches = catalog.filter((sop) => sop.id === id && (version == null || sop.version === version));
  return matches.sort((a, b) => b.version - a.version)[0] ?? null;
}

export function startRun(
  sop: SopDefinition,
  input: { id: string; now: number; role: string; parameters?: Record<string, unknown> },
): FlowResult {
  const resolved = resolveParameters(sop, input.parameters);
  if (!resolved.ok) return fail(null, resolved.error.code, resolved.error.fix_hint, resolved.error.valid_options);
  const first = sop.steps[0];
  if (!first || roleRank(input.role) < roleRank(first.minRole)) {
    return fail(null, 'di_luar_wewenang', 'Peran ini tidak boleh memulai SOP tersebut.', []);
  }
  const run: FlowRun = {
    id: input.id,
    sopId: sop.id,
    sopVersion: sop.version,
    status: 'active',
    currentStep: first.id,
    invalidCount: 0,
    escalated: false,
    parameters: resolved.parameters,
    postconditions: null,
    startedAt: input.now,
    expiresAt: input.now + sop.timeoutMinutes * 60 * 1000,
  };
  return { ok: true, run, view: present(sop, run) };
}

export function transition(
  sop: SopDefinition,
  current: FlowRun,
  input: { tool: string; outcome: ToolOutcome; role: string; now: number },
): FlowResult {
  const run = expire(copyRun(current), input.now);
  if (run.sopId !== sop.id || run.sopVersion !== sop.version) {
    return fail(run, 'sop_versi_usang', 'Lanjutkan dengan versi SOP yang sama dengan run ini.', [sop.id]);
  }
  if (run.status === 'done') {
    return fail(run, 'sop_selesai', 'SOP ini sudah selesai. Pascakondisi tidak diubah.', []);
  }
  if (run.status === 'expired') {
    return fail(run, 'run_kedaluwarsa', 'Batas waktu run habis. Mulai run baru.', []);
  }
  const step = stepOf(sop, run.currentStep);
  if (!step) return fail(run, 'langkah_rusak', 'Langkah saat ini tidak ada di SOP.', []);
  if (roleRank(input.role) < roleRank(step.minRole)) {
    return fail(run, 'di_luar_wewenang', 'Peran ini tidak boleh memakai langkah saat ini.', step.tools);
  }
  if (!step.tools.includes(input.tool)) {
    return fail(run, 'tool_di_luar_langkah', 'Pakai tool yang diizinkan pada langkah ini.', step.tools);
  }
  const destination = input.outcome === 'success'
    ? step.onSuccess
    : input.outcome === 'needs_choice'
      ? step.onNeedsChoice
      : input.outcome === 'invalid'
        ? step.onInvalid
        : step.onConflict;
  const next = destination ? stepOf(sop, destination) : null;
  if (!next) return fail(run, 'langkah_rusak', 'SOP tidak punya langkah pengganti. Tetap di langkah ini.', step.tools);
  const invalidCount = input.outcome === 'invalid' ? run.invalidCount + 1 : run.invalidCount;
  const moved: FlowRun = {
    ...run,
    currentStep: next.id,
    invalidCount,
    escalated: invalidCount >= sop.escalationAfter,
    status: next.terminal ? 'done' : 'active',
    postconditions: next.terminal ? Object.freeze([...sop.postconditions]) : null,
  };
  return { ok: true, run: moved, view: present(sop, moved) };
}

export function assertToolAllowed(
  sop: SopDefinition,
  current: FlowRun,
  input: { tool: string; role: string; now: number },
): FlowResult {
  const run = expire(copyRun(current), input.now);
  if (run.status === 'done') return fail(run, 'sop_selesai', 'SOP ini sudah selesai. Pascakondisi tidak diubah.', []);
  if (run.status === 'expired') return fail(run, 'run_kedaluwarsa', 'Batas waktu run habis. Mulai run baru.', []);
  const step = stepOf(sop, run.currentStep);
  if (!step) return fail(run, 'langkah_rusak', 'Langkah saat ini tidak ada di SOP.', []);
  if (roleRank(input.role) < roleRank(step.minRole)) {
    return fail(run, 'di_luar_wewenang', 'Peran ini tidak boleh memakai langkah saat ini.', step.tools);
  }
  if (!step.tools.includes(input.tool)) {
    return fail(run, 'tool_di_luar_langkah', 'Pakai tool yang diizinkan pada langkah ini.', step.tools);
  }
  return { ok: true, run, view: present(sop, run) };
}

export type FlowAction =
  | { type: 'start'; sopId: string; id: string; now: number; role: string; parameters?: Record<string, unknown> }
  | { type: 'view'; run: FlowRun; now: number }
  | { type: 'attempt'; run: FlowRun; tool: string; role: string; now: number };

/** Rencana server. Attempt hanya memeriksa izin dan tidak memajukan langkah. */
export function planFlowAction(catalog: SopDefinition[], action: FlowAction): FlowResult {
  if (action.type === 'start') {
    const sop = findSop(catalog, action.sopId);
    if (!sop) return fail(null, 'sop_tidak_dikenal', 'Pilih SOP yang ada di katalog.', catalog.map((item) => item.id));
    return startRun(sop, action);
  }
  const sop = findSop(catalog, action.run.sopId, action.run.sopVersion);
  if (!sop) return fail(action.run, 'sop_versi_usang', 'Versi SOP run ini tidak ada lagi.', [action.run.sopId]);
  if (action.type === 'view') {
    const run = expire(copyRun(action.run), action.now);
    return { ok: true, run, view: present(sop, run) };
  }
  const gated = assertToolAllowed(sop, action.run, action);
  if (!gated.ok) return gated;
  return {
    ok: true,
    run: gated.run,
    view: present(sop, gated.run),
  };
}
