import { structuredError, type StructuredError } from '../../packages/domain/src/errors.ts';
import {
  POLICY_BOUNDS,
  emptyProfile,
  policyProblems,
  type BusinessKind,
  type CompanyProfile,
  type ProfilePatch,
  type ProfileProposal,
  type ReportAudience,
  type Timezone,
  type WorkDay,
} from './profile.ts';

const TIMEZONES = new Set<Timezone>(['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']);
const DAYS = new Set<WorkDay>(['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu']);
const KINDS = new Set<BusinessKind>(['interior', 'konstruksi', 'campuran']);
const AUDIENCES = new Set<ReportAudience>(['owner', 'manager', 'project_workers']);
const HOUR = /^([01]\d|2[0-3]):[0-5]\d$/;

export const WIZARD_QUESTIONS = [
  { id: 'zona_waktu', prompt: 'Zona waktu usaha? Jakarta, Makassar, atau Jayapura.' },
  { id: 'hari_kerja', prompt: 'Hari kerja? Contoh: senin, selasa, rabu, kamis, jumat.' },
  { id: 'jam_mulai', prompt: 'Jam mulai kerja? Format 08:00.' },
  { id: 'jam_selesai', prompt: 'Jam selesai kerja? Format 17:00.' },
  { id: 'jenis_usaha', prompt: 'Jenis usaha: interior, konstruksi, atau campuran.' },
  { id: 'nama_unit', prompt: 'Nama unit usaha utama.' },
  { id: 'ambang_biaya', prompt: 'Di atas berapa rupiah biaya perlu konfirmasi?' },
  { id: 'dp_minimum', prompt: 'DP minimum dalam persen.' },
  { id: 'batas_diskon', prompt: 'Batas diskon dalam persen.' },
  { id: 'margin_target', prompt: 'Margin target dalam persen.' },
  { id: 'batas_pinjaman', prompt: 'Batas pinjaman internal dalam rupiah.' },
  { id: 'istilah_lokal', prompt: 'Istilah lokal. Contoh: sak = zak. Kalimat lain disimpan sebagai catatan.' },
  { id: 'penerima_laporan', prompt: 'Siapa menerima laporan harian: owner, manager, atau project_workers.' },
  { id: 'catatan', prompt: 'Catatan lain untuk agen. Ini belum berlaku sebelum disetujui.' },
] as const;

function note(profile: CompanyProfile, text: string): CompanyProfile {
  return {
    ...profile,
    notes: [...profile.notes, { domain: 'umum', text, status: 'usulan', reviewedAt: null }],
  };
}

function putPolicy(profile: CompanyProfile, key: string, value: number): CompanyProfile | StructuredError {
  const bounds = POLICY_BOUNDS[key];
  if (!bounds) return structuredError('parameter_tidak_dikenal', `Kebijakan ${key} tidak dikenal.`, Object.keys(POLICY_BOUNDS));
  if (!Number.isInteger(value) || value < bounds.min || value > bounds.max) {
    return structuredError('parameter_di_luar_batas', `${key} harus di antara ${bounds.min} dan ${bounds.max}.`, []);
  }
  const next = profile.policies.filter((item) => item.key !== key);
  next.push({ key, domain: bounds.domain, value, min: bounds.min, max: bounds.max });
  const problems = policyProblems(next);
  if (problems.length) return problems[0];
  return { ...profile, policies: next };
}

export function applyWizardAnswer(
  profile: CompanyProfile,
  questionId: string,
  raw: string,
): { ok: true; profile: CompanyProfile } | { ok: false; error: StructuredError } {
  const text = raw.trim();
  if (!text) return { ok: false, error: structuredError('jawaban_kosong', 'Isi jawaban terlebih dahulu.', []) };
  if (questionId === 'zona_waktu' && TIMEZONES.has(text as Timezone)) {
    return { ok: true, profile: { ...profile, timezone: text as Timezone } };
  }
  if (questionId === 'hari_kerja') {
    const days = text.split(',').map((item) => item.trim()).filter(Boolean);
    if (days.length && days.every((day) => DAYS.has(day as WorkDay))) {
      return { ok: true, profile: { ...profile, workDays: days as WorkDay[] } };
    }
  }
  if ((questionId === 'jam_mulai' || questionId === 'jam_selesai') && HOUR.test(text)) {
    const next = questionId === 'jam_mulai' ? { ...profile, workStart: text } : { ...profile, workEnd: text };
    if (next.workEnd <= next.workStart) {
      return { ok: false, error: structuredError('kebijakan_bentrok', 'Jam selesai harus sesudah jam mulai.', []) };
    }
    return { ok: true, profile: next };
  }
  if (questionId === 'jenis_usaha' && KINDS.has(text as BusinessKind)) {
    return { ok: true, profile: { ...profile, businessKind: text as BusinessKind } };
  }
  if (questionId === 'nama_unit') return { ok: true, profile: { ...profile, units: [text] } };
  if (questionId === 'penerima_laporan' && AUDIENCES.has(text as ReportAudience)) {
    return { ok: true, profile: { ...profile, reportAudience: text as ReportAudience } };
  }
  const numeric: Record<string, string> = {
    ambang_biaya: 'ambang_konfirmasi_rupiah',
    dp_minimum: 'dp_minimum_persen',
    batas_diskon: 'batas_diskon_persen',
    margin_target: 'margin_target_persen',
    batas_pinjaman: 'batas_pinjaman_rupiah',
  };
  if (numeric[questionId]) {
    if (!/^\d+$/.test(text)) return { ok: true, profile: note(profile, `${questionId}: ${text}`) };
    const applied = putPolicy(profile, numeric[questionId], Number(text));
    if ('code' in applied) return { ok: false, error: applied };
    return { ok: true, profile: applied };
  }
  if (questionId === 'istilah_lokal') {
    const parts = text.split('=').map((item) => item.trim());
    if (parts.length === 2 && parts[0] && parts[1] && !profile.glossary.some((item) => item.term === parts[0] && item.value !== parts[1])) {
      return {
        ok: true,
        profile: {
          ...profile,
          glossary: [...profile.glossary.filter((item) => item.term !== parts[0]), { term: parts[0], mapsTo: 'satuan', value: parts[1] }],
        },
      };
    }
    if (profile.glossary.some((item) => item.term === parts[0] && item.value !== parts[1])) {
      return { ok: false, error: structuredError('kebijakan_bentrok', `Istilah ${parts[0]} sudah punya arti lain.`, []) };
    }
  }
  return { ok: true, profile: note(profile, text) };
}

function diffOf(before: CompanyProfile, after: CompanyProfile): ProfileProposal['diff'] {
  const paths = ['timezone', 'policies', 'glossary', 'notes', 'roles'] as const;
  return paths
    .filter((path) => JSON.stringify(before[path]) !== JSON.stringify(after[path]))
    .map((path) => ({ path, before: before[path], after: after[path] }));
}

export function applyPatch(profile: CompanyProfile, patch: ProfilePatch): CompanyProfile | StructuredError {
  let next: CompanyProfile = { ...profile, policies: [...profile.policies], glossary: [...profile.glossary], notes: [...profile.notes], roles: [...profile.roles] };
  if (patch.timezone) next = { ...next, timezone: patch.timezone };
  if (patch.policies) {
    for (const policy of patch.policies) {
      const applied = putPolicy(next, policy.key, policy.value);
      if ('code' in applied) return applied;
      next = applied;
    }
  }
  if (patch.glossary) next = { ...next, glossary: patch.glossary };
  if (patch.notes) next = { ...next, notes: patch.notes };
  if (patch.roles) {
    if (patch.roles.some((role) => !Number.isInteger(role.approvalLimitRupiah) || role.approvalLimitRupiah < 0)) {
      return structuredError('parameter_di_luar_batas', 'Batas wewenang harus rupiah bulat.', []);
    }
    next = { ...next, roles: patch.roles };
  }
  const problems = policyProblems(next.policies);
  if (problems.length) return problems[0];
  return next;
}

export function proposeProfileUpdate(
  profile: CompanyProfile,
  patch: ProfilePatch,
  evidence: string,
  role: string,
): { ok: true; proposal: ProfileProposal } | { ok: false; error: StructuredError } {
  if (role !== 'owner' && role !== 'manager' && role !== 'platform_admin') {
    return { ok: false, error: structuredError('di_luar_wewenang', 'Hanya manajer atau pemilik yang boleh mengusulkan profil.', []) };
  }
  if (!evidence.trim()) return { ok: false, error: structuredError('bukti_kosong', 'Sertakan bukti untuk usulan ini.', []) };
  const applied = applyPatch(profile, patch);
  if ('code' in applied) return { ok: false, error: applied };
  return {
    ok: true,
    proposal: {
      fromVersion: profile.version,
      toVersion: profile.version + 1,
      patch,
      evidence: evidence.trim(),
      diff: diffOf(profile, applied),
    },
  };
}

export function approveProfileUpdate(
  profile: CompanyProfile,
  proposal: ProfileProposal,
  role: string,
): { ok: true; profile: CompanyProfile } | { ok: false; error: StructuredError } {
  if (role !== 'owner' && role !== 'platform_admin') {
    return { ok: false, error: structuredError('di_luar_wewenang', 'Hanya pemilik yang menyetujui profil.', []) };
  }
  if (proposal.fromVersion !== profile.version) {
    return { ok: false, error: structuredError('versi_profil_usang', 'Profil sudah berubah. Muat ulang sebelum menyetujui.', []) };
  }
  const applied = applyPatch(profile, proposal.patch);
  if ('code' in applied) return { ok: false, error: applied };
  return { ok: true, profile: { ...applied, version: proposal.toVersion } };
}

export function rollbackProfile(
  current: CompanyProfile,
  history: CompanyProfile[],
  toVersion: number,
  role: string,
): { ok: true; profile: CompanyProfile } | { ok: false; error: StructuredError } {
  if (role !== 'owner' && role !== 'platform_admin') {
    return { ok: false, error: structuredError('di_luar_wewenang', 'Hanya pemilik yang mengembalikan profil.', []) };
  }
  const prior = history.find((item) => item.version === toVersion);
  if (!prior) return { ok: false, error: structuredError('versi_tidak_ada', 'Versi itu tidak ada di riwayat.', []) };
  return { ok: true, profile: { ...prior, version: current.version + 1 } };
}

export function previewWizard(answers: Record<string, string>): CompanyProfile | StructuredError {
  let profile = emptyProfile();
  for (const question of WIZARD_QUESTIONS) {
    const raw = answers[question.id];
    if (raw == null) continue;
    const applied = applyWizardAnswer(profile, question.id, raw);
    if (!applied.ok) return applied.error;
    profile = applied.profile;
  }
  return profile;
}
