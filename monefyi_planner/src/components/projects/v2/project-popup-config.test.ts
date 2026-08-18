import { describe, expect, it } from 'vitest';
import { buildProjectPopupConfig, checkContractComposition } from './project-popup-config';
import type { NormalizedProjectView } from '../../../lib/migration/project-normalize';
import type { MappedProjectView } from '../../../lib/migration/planner-mapper';

function baseProject(overrides: Partial<MappedProjectView> = {}): MappedProjectView {
  return {
    id: 'p1',
    name: 'Test',
    client: 'Klien',
    type: 'Konstruksi',
    startDate: '2026-01-01',
    endDate: '2026-06-01',
    duration: 150,
    contractValue: 100_000_000,
    saldo: 20_000_000,
    status: 'ok',
    progress: { plan: 50, actual: 50, deviation: 0 },
    rap: {
      totalRAP: 80_000_000,
      realisasi: 60_000_000,
      estLaba: 40_000_000,
      materials: [],
      workers: [],
    },
    budget: {
      bahan: { plan: 50_000_000, actual: 30_000_000 },
      tukang: { plan: 30_000_000, actual: 20_000_000 },
      piutang: 30_000_000,
      hutang: 5_000_000,
    },
    payments: [],
    expenses: [],
    timeline: [],
    hutangPiutang: [
      { id: 1, type: 'hutang', name: 'Hutang A', partyName: 'Vendor A', amount: 3_000_000, due: '2026-06-01', status: 'open' },
      { id: 2, type: 'hutang', name: 'Hutang B', partyName: 'Vendor A', amount: 2_000_000, due: '2026-06-01', status: 'open' },
      { id: 3, type: 'piutang', name: 'Piutang X', partyName: 'Klien X', amount: 20_000_000, due: '2026-06-01', status: 'open' },
      { id: 4, type: 'piutang', name: 'Piutang Y', partyName: 'Klien Y', amount: 10_000_000, due: '2026-06-01', status: 'open' },
    ],
    ...overrides,
  };
}

function baseNormalized(project = baseProject()): NormalizedProjectView {
  return {
    project,
    totalRealisasi: project.rap.realisasi,
    totalPemasukan: 0,
    sisaKontrak: 0,
    sisaPembayaran: 0,
    realisasiPct: '0',
    totalAktiva: 0,
    totalPasiva: 0,
    estLaba: 0,
    bahanActual: project.budget.bahan.actual,
    tukangActual: project.budget.tukang.actual,
    hutangItems: project.hutangPiutang.filter(h => h.type === 'hutang'),
    piutangItems: project.hutangPiutang.filter(h => h.type === 'piutang'),
    workItems: [],
    checkedCount: 0,
    totalWorkItems: 0,
    allTransactions: [],
  };
}

describe('checkContractComposition', () => {
  it('matches when piutang + cash + bahan + tukang = kontrak', () => {
    const check = checkContractComposition(baseNormalized());
    expect(check.isMatch).toBe(true);
    expect(check.componentsTotal).toBe(100_000_000);
  });

  it('flags mismatch with gap', () => {
    const check = checkContractComposition(baseNormalized(baseProject({ contractValue: 120_000_000 })));
    expect(check.isMatch).toBe(false);
    expect(check.gap).toBe(20_000_000);
  });
});

describe('buildProjectPopupConfig hutang/piutang grouping', () => {
  it('groups hutang by party with item count', () => {
    const cfg = buildProjectPopupConfig('hutang', baseNormalized());
    expect(cfg?.list).toHaveLength(1);
    expect(cfg?.list[0].title).toBe('Vendor A');
    expect(cfg?.list[0].meta).toBe('2 item');
  });

  it('groups piutang by party', () => {
    const cfg = buildProjectPopupConfig('piutang', baseNormalized());
    expect(cfg?.list).toHaveLength(2);
    expect(cfg?.cards[0].value).toBe('2 subjek');
  });
});
