import { describe, expect, it } from 'vitest';
import { SOP_CATALOG } from '../../../agent-core/src/sopData';
import {
  PLATFORM_LOCKS,
  buildContextPack,
  emptyProfile,
  estimateTokens,
  parametersFromProfile,
  type CompanyProfile,
} from '../../../agent-core/src/profile';
import {
  WIZARD_QUESTIONS,
  approveProfileUpdate,
  previewWizard,
  proposeProfileUpdate,
  rollbackProfile,
} from '../../../agent-core/src/profileWizard';
import type { SopDefinition } from '../../../agent-core/src/sopSchema';

const catat = SOP_CATALOG.find((sop) => sop.id === 'catat_biaya')!;

function withPolicy(profile: CompanyProfile, key: string, domain: string, value: number, min = 0, max = 100_000_000_000): CompanyProfile {
  return { ...profile, policies: [...profile.policies, { key, domain, value, min, max }] };
}

describe('profil perusahaan', () => {
  it('wizard punya 12 sampai 15 pertanyaan dan jawaban terstruktur', () => {
    expect(WIZARD_QUESTIONS.length).toBeGreaterThanOrEqual(12);
    expect(WIZARD_QUESTIONS.length).toBeLessThanOrEqual(15);
    const profile = previewWizard({
      zona_waktu: 'Asia/Makassar',
      ambang_biaya: '2500000',
      istilah_lokal: 'sak = zak',
      catatan: 'tukang borongan dibayar mingguan',
    });
    expect('version' in profile).toBe(true);
    if (!('version' in profile)) return;
    expect(profile.timezone).toBe('Asia/Makassar');
    expect(profile.policies.find((item) => item.key === 'ambang_konfirmasi_rupiah')?.value).toBe(2_500_000);
    expect(profile.glossary).toEqual([{ term: 'sak', mapsTo: 'satuan', value: 'zak' }]);
    expect(profile.notes[0]?.status).toBe('usulan');
  });

  it('kebijakan menimpa bawaan SOP di dalam batas', () => {
    const profile = withPolicy(emptyProfile(), 'ambang_konfirmasi_rupiah', 'keuangan_proyek', 2_500_000);
    const resolved = parametersFromProfile(catat, profile);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.parameters.ambang_konfirmasi_rupiah).toBe(2_500_000);
  });

  it('kebijakan di luar batas ditolak dan tidak diisi tebakan', () => {
    const profile = withPolicy(emptyProfile(), 'ambang_konfirmasi_rupiah', 'keuangan_proyek', 100_000_000_001);
    const resolved = parametersFromProfile(catat, profile);
    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.error.code).toBe('parameter_di_luar_batas');
  });

  it('parameter wajib yang kosong ditanyakan ke pemilik', () => {
    const sop = {
      ...catat,
      parameters: [{ key: 'dp_minimum_persen', type: 'integer' as const, min: 0, max: 100, required: true, defaultValue: null }],
    } satisfies SopDefinition;
    const resolved = parametersFromProfile(sop, emptyProfile());
    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.error.code).toBe('parameter_kosong');
    expect(resolved.questions).toEqual(['Tanyakan ke pemilik: dp_minimum_persen']);
    expect(resolved.error.fix_hint).toContain('jangan mengisi sendiri');
  });

  it('diskon di atas margin dan kunci platform dilaporkan', () => {
    const clash = withPolicy(
      withPolicy(emptyProfile(), 'batas_diskon_persen', 'keuangan', 30, 0, 100),
      'margin_target_persen',
      'keuangan',
      20,
      0,
      100,
    );
    const conflict = parametersFromProfile(catat, clash);
    expect(conflict.ok).toBe(false);
    if (conflict.ok) return;
    expect(conflict.error.code).toBe('kebijakan_bentrok');

    const locked = withPolicy(emptyProfile(), 'jurnal_seimbang', 'semua', 0);
    const safety = parametersFromProfile(catat, locked);
    expect(safety.ok).toBe(false);
    if (safety.ok) return;
    expect(safety.error.code).toBe('keselamatan_platform');
    expect(PLATFORM_LOCKS.jurnal_boleh_diubah).toBe(false);
  });

  it('paket konteks mengikuti anggaran tier dan domain SOP', () => {
    const profile = emptyProfile();
    profile.notes = [{ domain: 'keuangan_proyek', text: 'x'.repeat(4000), status: 'disetujui', reviewedAt: '2026-11-04' }];
    profile.policies = [{ key: 'batas_pinjaman_rupiah', domain: 'keuangan', value: 5_000_000, min: 0, max: 100_000_000_000 }];
    const low = buildContextPack({ profile, sop: catat, role: 'worker', tier: 'rendah' });
    const high = buildContextPack({ profile, sop: catat, role: 'worker', tier: 'tinggi' });
    expect(low.tokens).toBeLessThanOrEqual(low.tokenBudget);
    expect(low.body.notes).toBeUndefined();
    expect(high.body.notes).toBeTruthy();
    expect(low.body.version).toBe(1);
    expect(low.body.sopId).toBe('catat_biaya');
    expect(JSON.stringify(low.body.policies)).not.toContain('batas_pinjaman_rupiah');
    expect(estimateTokens(low.body)).toBe(low.tokens);
  });

  it('usulan butuh bukti, persetujuan pemilik, dan rollback menambah versi', () => {
    const base = emptyProfile();
    const proposed = proposeProfileUpdate(base, {
      policies: [{ key: 'dp_minimum_persen', domain: 'keuangan_proyek', value: 40, min: 0, max: 100 }],
    }, 'Tiga proyek terakhir minta DP 40 persen', 'manager');
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;
    expect(proposed.proposal.diff.some((item) => item.path === 'policies')).toBe(true);
    const manager = approveProfileUpdate(base, proposed.proposal, 'manager');
    expect(manager.ok).toBe(false);
    const owner = approveProfileUpdate(base, proposed.proposal, 'owner');
    expect(owner.ok).toBe(true);
    if (!owner.ok) return;
    expect(owner.profile.version).toBe(2);
    expect(owner.profile.policies[0]?.value).toBe(40);
    const restored = rollbackProfile(owner.profile, [base, owner.profile], 1, 'owner');
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.profile.version).toBe(3);
    expect(restored.profile.policies).toEqual([]);
    expect(proposeProfileUpdate(base, {}, '', 'manager').ok).toBe(false);
    expect(proposeProfileUpdate(base, {}, 'bukti', 'worker').ok).toBe(false);
  });
});
