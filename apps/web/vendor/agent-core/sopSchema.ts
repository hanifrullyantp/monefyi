export type SopRole = 'worker' | 'manager' | 'owner';

export type SopParameter = {
  key: string;
  type: 'integer';
  min: number;
  max: number;
  required: boolean;
  defaultValue: number | null;
};

export type SopStep = {
  id: string;
  tools: string[];
  minRole: SopRole;
  approval: boolean;
  terminal: boolean;
  onSuccess: string | null;
  onNeedsChoice: string | null;
  onInvalid: string | null;
  onConflict: string | null;
};

export type SopDefinition = {
  id: string;
  version: number;
  domain: string;
  timeoutMinutes: number;
  intent: string;
  examples: string[];
  prerequisites: string[];
  parameters: SopParameter[];
  steps: SopStep[];
  postconditions: string[];
  escalationAfter: number;
  escalationTo: string;
};

export const REQUIRED_SOPS = [
  'catat_biaya',
  'bayar_hutang_pihak',
  'terima_uang_klien',
  'pinjam_internal',
  'update_progres_pekerjaan',
  'laporan_harian_proyek',
  'tinjau_proyek_berisiko',
  'rekonsiliasi_kas',
  'buat_proyek_dari_template',
  'minta_update_progres_lapangan',
] as const;

const ROLES = new Set(['worker', 'manager', 'owner']);

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function stringList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item)) return null;
  return value as string[];
}

export function compileSop(raw: unknown): { sop: SopDefinition | null; problems: string[] } {
  const problems: string[] = [];
  const body = record(raw);
  if (!body) return { sop: null, problems: ['sop bukan peta'] };
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) problems.push('id kosong');
  const triggers = record(body.triggers);
  const escalation = record(body.escalation);
  const examples = stringList(triggers?.examples);
  const prerequisites = stringList(body.prerequisites);
  const postconditions = stringList(body.postconditions);
  if (!examples?.length) problems.push(`${id} tanpa contoh kalimat`);
  if (!prerequisites?.length) problems.push(`${id} tanpa prasyarat`);
  if (!postconditions?.length) problems.push(`${id} tanpa pascakondisi`);
  const parameters: SopParameter[] = [];
  if (!Array.isArray(body.parameters)) problems.push(`${id} parameter bukan daftar`);
  else {
    for (const item of body.parameters) {
      const row = record(item);
      if (!row || typeof row.key !== 'string' || row.type !== 'integer') {
        problems.push(`${id} parameter tidak bertipe integer`);
        continue;
      }
      if (typeof row.min !== 'number' || typeof row.max !== 'number' || row.min > row.max) {
        problems.push(`${id} batas ${row.key} tidak valid`);
      }
      parameters.push({
        key: row.key,
        type: 'integer',
        min: Number(row.min),
        max: Number(row.max),
        required: row.required === true,
        defaultValue: typeof row.default === 'number' ? row.default : null,
      });
    }
  }
  const steps: SopStep[] = [];
  if (!Array.isArray(body.steps)) problems.push(`${id} langkah bukan daftar`);
  else {
    for (const item of body.steps) {
      const row = record(item);
      if (!row || typeof row.id !== 'string') {
        problems.push(`${id} langkah tanpa id`);
        continue;
      }
      const tools = Array.isArray(row.tools) && row.tools.every((tool) => typeof tool === 'string')
        ? row.tools as string[]
        : null;
      if (!tools) problems.push(`${id} tool langkah ${row.id} tidak valid`);
      const minRole = typeof row.min_role === 'string' && ROLES.has(row.min_role) ? row.min_role as SopRole : null;
      if (!minRole) problems.push(`${id} peran ${row.id} tidak valid`);
      steps.push({
        id: row.id,
        tools: tools ?? [],
        minRole: minRole ?? 'owner',
        approval: row.approval === true,
        terminal: row.terminal === true,
        onSuccess: typeof row.on_success === 'string' ? row.on_success : null,
        onNeedsChoice: typeof row.on_needs_choice === 'string' ? row.on_needs_choice : null,
        onInvalid: typeof row.on_invalid === 'string' ? row.on_invalid : null,
        onConflict: typeof row.on_conflict === 'string' ? row.on_conflict : null,
      });
    }
  }
  const sop: SopDefinition = {
    id,
    version: typeof body.version === 'number' ? body.version : 0,
    domain: typeof body.domain === 'string' ? body.domain : '',
    timeoutMinutes: typeof body.timeout_minutes === 'number' ? body.timeout_minutes : 0,
    intent: typeof triggers?.intent === 'string' ? triggers.intent : '',
    examples: examples ?? [],
    prerequisites: prerequisites ?? [],
    parameters,
    steps,
    postconditions: postconditions ?? [],
    escalationAfter: typeof escalation?.after_invalid === 'number' ? escalation.after_invalid : 0,
    escalationTo: typeof escalation?.to === 'string' ? escalation.to : '',
  };
  problems.push(...validateSop(sop));
  return { sop: problems.length ? null : sop, problems };
}

export function validateSop(sop: SopDefinition): string[] {
  const problems: string[] = [];
  if (!sop.domain) problems.push(`${sop.id} domain kosong`);
  if (!sop.intent) problems.push(`${sop.id} intent kosong`);
  if (sop.version < 1) problems.push(`${sop.id} versi tidak valid`);
  if (sop.timeoutMinutes < 1 || sop.timeoutMinutes > 120) problems.push(`${sop.id} timeout di luar 1-120 menit`);
  if (sop.escalationAfter < 1 || !sop.escalationTo) problems.push(`${sop.id} eskalasi tidak lengkap`);
  const ids = new Set<string>();
  for (const step of sop.steps) {
    if (ids.has(step.id)) problems.push(`${sop.id} langkah ganda ${step.id}`);
    ids.add(step.id);
    for (const tool of step.tools) {
      if (!/^[a-z][a-z0-9_]*$/.test(tool)) problems.push(`${sop.id} nama tool ${tool}`);
    }
    if (step.terminal) {
      if (step.tools.length || step.approval) problems.push(`${sop.id} langkah akhir ${step.id} masih punya tool`);
      continue;
    }
    if (step.tools.length !== 1) problems.push(`${sop.id} langkah ${step.id} harus satu tool`);
    if (step.tools[0]?.startsWith('commit_') && !step.approval) {
      problems.push(`${sop.id} commit ${step.id} tanpa titik persetujuan`);
    }
    for (const edge of [step.onNeedsChoice, step.onInvalid, step.onConflict]) {
      if (edge !== step.id) problems.push(`${sop.id} kegagalan ${step.id} berpindah langkah`);
    }
    if (!step.onSuccess || step.onSuccess === step.id) problems.push(`${sop.id} ${step.id} tidak maju`);
  }
  const known = new Set(sop.steps.map((step) => step.id));
  for (const step of sop.steps) {
    for (const edge of [step.onSuccess, step.onNeedsChoice, step.onInvalid, step.onConflict]) {
      if (edge && !known.has(edge)) problems.push(`${sop.id} edge ${edge} tidak ada`);
    }
  }
  let cursor: SopStep | undefined = sop.steps[0];
  const seen = new Set<string>();
  while (cursor && !cursor.terminal) {
    if (seen.has(cursor.id)) {
      problems.push(`${sop.id} siklus langkah`);
      break;
    }
    seen.add(cursor.id);
    cursor = sop.steps.find((step) => step.id === cursor!.onSuccess);
  }
  if (!cursor?.terminal) problems.push(`${sop.id} tidak sampai langkah akhir`);
  return problems;
}
