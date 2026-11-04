import { describe, expect, it } from 'vitest';
import { admitRun, decideActionStatus, explainAction, routeRequest, shouldDispatchMorning } from '../../../agent-core/src/runtime';

describe('runtime agen', () => {
  it('perintah biaya masuk SOP dan tier rendah', () => {
    const route = routeRequest('beli semen 10 sak 65000', 0, 'prepare');
    expect(route).toMatchObject({ sopId: 'catat_biaya', tier: 'rendah', escalate: false });
    expect(route.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('kalimat tak dikenal dan dua kali gagal menaikkan tier', () => {
    expect(routeRequest('apa kabar', 0, 'read').escalate).toBe(true);
    expect(routeRequest('beli semen 10 sak 65000', 2, 'prepare')).toMatchObject({ tier: 'tinggi', escalate: true });
    expect(routeRequest('beli semen 10 sak 65000', 0, 'critical').tier).toBe('tinggi');
  });

  it('kill switch dan kuota menolak run', () => {
    expect(admitRun({ killSwitch: true, planType: 'pro', usedRuns: 0, usedTokens: 0, iteration: 1, tokens: 10, costIdr: 0 }).ok).toBe(false);
    const full = admitRun({ killSwitch: false, planType: 'free', usedRuns: 10, usedTokens: 0, iteration: 1, tokens: 10, costIdr: 0 });
    expect(full.ok).toBe(false);
    if (full.ok) return;
    expect(full.error.code).toBe('kuota_run_habis');
    expect(admitRun({ killSwitch: false, planType: 'free', usedRuns: 9, usedTokens: 0, iteration: 1, tokens: 10, costIdr: 0 }).ok).toBe(true);
  });

  it('otonomi L2 menunggu gerbang uji', () => {
    expect(decideActionStatus('L1', 'commit', 100_000, 1_000_000)).toBe('draft');
    expect(decideActionStatus('L2', 'commit', 100_000, 1_000_000)).toBe('draft');
    expect(decideActionStatus('L2', 'commit', 100_000, 1_000_000, true)).toBe('approved');
    expect(decideActionStatus('L2', 'commit', 2_000_000, 1_000_000, true)).toBe('draft');
    expect(decideActionStatus('L3', 'read', null, 0)).toBe('draft');
    expect(decideActionStatus('L0', 'read', null, 0)).toBe('executed');
  });

  it('laporan pagi hanya pada jam 07 waktu organisasi', () => {
    expect(shouldDispatchMorning('Asia/Jakarta', new Date('2026-11-04T00:00:00.000Z'), null)).toBe(true);
    expect(shouldDispatchMorning('Asia/Jakarta', new Date('2026-11-03T23:30:00.000Z'), null)).toBe(false);
    expect(shouldDispatchMorning('Asia/Jakarta', new Date('2026-11-04T00:00:00.000Z'), '2026-11-04')).toBe(false);
  });

  it('alasan menampilkan langkah SOP dan kebijakan', () => {
    expect(explainAction({ sopId: 'catat_biaya', sopStep: 'siapkan_biaya', policyKey: 'ambang_konfirmasi_rupiah' }))
      .toBe('SOP catat_biaya, langkah siapkan_biaya. Kebijakan ambang_konfirmasi_rupiah.');
  });
});
