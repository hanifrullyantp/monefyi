import { structuredError, type StructuredError } from '../../packages/domain/src/errors.ts';
import { resolveParameters } from './flow.ts';
import type { SopDefinition } from './sopSchema.ts';

export const PLATFORM_LOCKS = {
  jurnal_seimbang: true,
  isolasi_tenant: true,
  persetujuan_aksi_kritis: true,
  jejak_audit: true,
  jurnal_boleh_diubah: false,
} as const;

export const POLICY_BOUNDS: Record<string, { domain: string; min: number; max: number }> = {
  ambang_konfirmasi_rupiah: { domain: 'keuangan_proyek', min: 0, max: 100_000_000_000 },
  batas_bayar_rupiah: { domain: 'keuangan', min: 0, max: 100_000_000_000 },
  dp_minimum_persen: { domain: 'keuangan_proyek', min: 0, max: 100 },
  batas_pinjaman_rupiah: { domain: 'keuangan', min: 0, max: 100_000_000_000 },
  progres_maks: { domain: 'proyek', min: 0, max: 100 },
  panjang_catatan_maks: { domain: 'proyek', min: 20, max: 2000 },
  spi_minimum_persen: { domain: 'proyek', min: 0, max: 100 },
  selisih_maks_rupiah: { domain: 'keuangan', min: 0, max: 1_000_000_000 },
  anggaran_maks_rupiah: { domain: 'proyek', min: 0, max: 100_000_000_000 },
  batas_diskon_persen: { domain: 'keuangan', min: 0, max: 100 },
  margin_target_persen: { domain: 'keuangan', min: 0, max: 100 },
};

const LOCK_KEYS = new Set(Object.keys(PLATFORM_LOCKS));
const TIMEZONES = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'] as const;
const DAYS = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'] as const;
const HOUR = /^([01]\d|2[0-3]):[0-5]\d$/;

export type Timezone = (typeof TIMEZONES)[number];
export type WorkDay = (typeof DAYS)[number];
export type BusinessKind = 'interior' | 'konstruksi' | 'campuran';
export type ReportAudience = 'owner' | 'manager' | 'project_workers';

export type Policy = {
  key: string;
  domain: string;
  value: number;
  min: number;
  max: number;
};

export type GlossaryEntry = {
  term: string;
  mapsTo: 'satuan' | 'jenis_kejadian' | 'entitas';
  value: string;
};

export type ProfileNote = {
  domain: string;
  text: string;
  status: 'usulan' | 'disetujui' | 'ditolak';
  reviewedAt: string | null;
};

export type CompanyRoleLimit = {
  roleKey: string;
  title: string;
  actionKey: string;
  approvalLimitRupiah: number;
};

export type CompanyProfile = {
  version: number;
  timezone: Timezone;
  workDays: WorkDay[];
  workStart: string;
  workEnd: string;
  businessKind: BusinessKind;
  units: string[];
  roles: CompanyRoleLimit[];
  policies: Policy[];
  glossary: GlossaryEntry[];
  notes: ProfileNote[];
  reportAudience: ReportAudience;
  reportMessageId: string;
};

export type ProfileProposal = {
  fromVersion: number;
  toVersion: number;
  patch: ProfilePatch;
  evidence: string;
  diff: Array<{ path: string; before: unknown; after: unknown }>;
};

export type ProfilePatch = {
  timezone?: Timezone;
  policies?: Policy[];
  glossary?: GlossaryEntry[];
  notes?: ProfileNote[];
  roles?: CompanyRoleLimit[];
};

export function emptyProfile(): CompanyProfile {
  return {
    version: 1,
    timezone: 'Asia/Jakarta',
    workDays: ['senin', 'selasa', 'rabu', 'kamis', 'jumat'],
    workStart: '08:00',
    workEnd: '17:00',
    businessKind: 'konstruksi',
    units: [],
    roles: [],
    policies: [],
    glossary: [],
    notes: [],
    reportAudience: 'owner',
    reportMessageId: 'laporan_harian',
  };
}

function fail(code: string, hint: string, options: string[] = []): { ok: false; error: StructuredError } {
  return { ok: false, error: structuredError(code, hint, options) };
}

export function policyProblems(policies: Policy[]): StructuredError[] {
  const errors: StructuredError[] = [];
  const seen = new Map<string, number>();
  for (const policy of policies) {
    if (LOCK_KEYS.has(policy.key)) {
      errors.push(structuredError('keselamatan_platform', `${policy.key} tidak boleh diubah profil.`, []));
      continue;
    }
    const bounds = POLICY_BOUNDS[policy.key];
    if (!bounds) {
      errors.push(structuredError('parameter_tidak_dikenal', `Kebijakan ${policy.key} tidak dikenal.`, Object.keys(POLICY_BOUNDS)));
      continue;
    }
    if (!Number.isInteger(policy.value) || policy.value < bounds.min || policy.value > bounds.max) {
      errors.push(structuredError('parameter_di_luar_batas', `${policy.key} harus di antara ${bounds.min} dan ${bounds.max}.`, []));
    }
    const previous = seen.get(policy.key);
    if (previous != null && previous !== policy.value) {
      errors.push(structuredError('kebijakan_bentrok', `${policy.key} punya dua nilai.`, [String(previous), String(policy.value)]));
    }
    seen.set(policy.key, policy.value);
  }
  const discount = seen.get('batas_diskon_persen');
  const margin = seen.get('margin_target_persen');
  if (discount != null && margin != null && discount > margin) {
    errors.push(structuredError('kebijakan_bentrok', 'Batas diskon lebih besar dari margin target.', []));
  }
  return errors;
}

export function parametersFromProfile(
  sop: SopDefinition,
  profile: CompanyProfile,
): { ok: true; parameters: Record<string, number>; questions: string[] } | { ok: false; error: StructuredError; questions: string[] } {
  const safety = policyProblems(profile.policies);
  if (safety.length) return { ok: false, error: safety[0], questions: [] };
  const questions: string[] = [];
  const overlay: Record<string, number> = {};
  for (const param of sop.parameters) {
    const matches = profile.policies.filter((item) => item.key === param.key && (item.domain === sop.domain || item.domain === 'semua'));
    if (!matches.length) {
      if (param.required && param.defaultValue == null) {
        questions.push(`Tanyakan ke pemilik: ${param.key}`);
      }
      continue;
    }
    overlay[param.key] = matches[matches.length - 1].value;
  }
  if (questions.length) {
    return {
      ok: false,
      questions,
      error: structuredError('parameter_kosong', 'Parameter wajib belum diisi. Tanyakan ke pemilik, jangan mengisi sendiri.', questions),
    };
  }
  const resolved = resolveParameters(sop, overlay);
  if (!resolved.ok) return { ok: false, error: resolved.error, questions: [] };
  return { ok: true, parameters: resolved.parameters, questions: [] };
}

const TOKEN_BUDGET = { rendah: 500, menengah: 1200, tinggi: 3000 } as const;
export type ModelTier = keyof typeof TOKEN_BUDGET;

export function estimateTokens(value: unknown): number {
  return Math.ceil(JSON.stringify(value).length / 4);
}

export function buildContextPack(input: {
  profile: CompanyProfile;
  sop: SopDefinition;
  role: string;
  tier: ModelTier;
}): { tier: ModelTier; tokenBudget: number; tokens: number; body: Record<string, unknown> } {
  const relevant = input.profile.policies.filter((item) => item.domain === input.sop.domain || item.domain === 'semua');
  const glossary = input.profile.glossary.filter((item) => item.mapsTo === 'satuan' || item.mapsTo === 'jenis_kejadian' || item.mapsTo === 'entitas');
  const notes = input.profile.notes.filter((item) => item.status === 'disetujui' && (item.domain === input.sop.domain || item.domain === 'umum'));
  const questions = input.sop.parameters
    .filter((param) => param.required && param.defaultValue == null && !relevant.some((item) => item.key === param.key))
    .map((param) => `Tanyakan ke pemilik: ${param.key}`);
  const budget = TOKEN_BUDGET[input.tier];
  const body: Record<string, unknown> = {
    version: input.profile.version,
    sopId: input.sop.id,
    role: input.role,
    keselamatan: PLATFORM_LOCKS,
    policies: relevant,
    questions,
  };
  const calendar = {
    timezone: input.profile.timezone,
    workDays: input.profile.workDays,
    workStart: input.profile.workStart,
    workEnd: input.profile.workEnd,
  };
  if (estimateTokens({ ...body, glossary, calendar }) <= budget) {
    body.glossary = glossary;
    body.calendar = calendar;
  }
  if (estimateTokens({ ...body, notes }) <= budget) body.notes = notes;
  return { tier: input.tier, tokenBudget: budget, tokens: estimateTokens(body), body };
}
