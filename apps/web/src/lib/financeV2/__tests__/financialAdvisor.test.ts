import { describe, expect, it } from 'vitest';
import {
  analyzeProjectMargin,
  FINANCIAL_ADVISOR_DISCLAIMER,
  forecastCashFlow13Weeks,
  prioritizePayables,
  PROJECT_MARGIN_CATEGORIES,
  recommendProjectPricing,
  runAdvisorWhatIf,
  type ForecastCashFlowInput,
} from '@domain/financialAdvisor';

describe('G3-1: Mesin Analisis Deterministik Financial Advisor', () => {
  describe('forecastCashFlow13Weeks', () => {
    it('menghasilkan 13 minggu penuh untuk 3 skenario dengan invarian worst <= base <= best & integer rupiah', () => {
      const input: ForecastCashFlowInput = {
        asOfDate: '2026-12-01',
        openingCash: 40_000_000,
        monthlyOpexPlan: 13_000_000, // 13jt * 3 / 13 = 3jt/minggu (base), 3.3jt (worst), 2.85jt (best)
        receivables: [
          {
            id: 'rec-1',
            partyId: 'party-ana',
            partyName: 'Bu Ana',
            dueDate: '2026-12-04', // Week 1 (base) -> Week 3 (worst +14d)
            outstandingAmount: 25_000_000,
          },
          {
            id: 'rec-late-edge',
            partyId: 'party-budi',
            partyName: 'Pak Budi',
            dueDate: '2027-02-20', // Week 12 (base) -> luar jendela 13 minggu pada worst (+14d = 2027-03-06)
            outstandingAmount: 20_000_000,
          },
        ],
        scheduledProjectTermins: [
          {
            id: 'term-1',
            projectId: 'proj-ruko',
            projectName: 'Ruko Melati',
            partyId: 'party-citra',
            dueDate: '2026-12-23', // Week 4 (base) -> Week 3 (best -7d) -> Week 6 (worst +14d)
            amount: 50_000_000,
          },
        ],
        payables: [
          {
            id: 'pay-1',
            partyId: 'sup-semen',
            partyName: 'TB Makmur',
            dueDate: '2026-12-10', // Week 2
            outstandingAmount: 45_000_000,
          },
          {
            id: 'pay-2',
            partyId: 'sup-besi',
            partyName: 'PT Baja Jaya',
            dueDate: '2026-12-16', // Week 3
            outstandingAmount: 35_000_000,
          },
        ],
      };

      const result = forecastCashFlow13Weeks(input);

      expect(result.disclaimer).toBe(FINANCIAL_ADVISOR_DISCLAIMER);
      expect(result.provenance.disclaimer).toBe(FINANCIAL_ADVISOR_DISCLAIMER);
      expect(result.provenance.asOfDate).toBe('2026-12-01');
      expect(result.provenance.period).toBe('2026-12-01..2027-03-01');
      expect(result.assumptions.length).toBeGreaterThan(0);

      for (const key of ['base', 'worst', 'best'] as const) {
        const sc = result.scenarios[key];
        expect(sc.weeks).toHaveLength(13);
        expect(sc.weeks[0].weekIndex).toBe(1);
        expect(sc.weeks[12].weekIndex).toBe(13);
        expect(Number.isInteger(sc.minEndingCash)).toBe(true);
        expect(Number.isInteger(sc.endingCashWeek13)).toBe(true);
        for (const w of sc.weeks) {
          expect(Number.isInteger(w.inflows)).toBe(true);
          expect(Number.isInteger(w.outflows)).toBe(true);
          expect(Number.isInteger(w.netCashFlow)).toBe(true);
          expect(Number.isInteger(w.endingCash)).toBe(true);
        }
      }

      const { base, worst, best } = result.scenarios;
      expect(worst.minEndingCash).toBeLessThanOrEqual(base.minEndingCash);
      expect(base.minEndingCash).toBeLessThanOrEqual(best.minEndingCash);
      expect(worst.endingCashWeek13).toBeLessThanOrEqual(base.endingCashWeek13);
      expect(base.endingCashWeek13).toBeLessThanOrEqual(best.endingCashWeek13);

      // Base: Week 1: 40+25-3 = 62jt; Week 2: 62-45-3 = 14jt; Week 3: 14-35-3 = -24jt (negatif!)
      expect(base.weeks[0].endingCash).toBe(62_000_000);
      expect(base.weeks[1].endingCash).toBe(14_000_000);
      expect(base.weeks[2].endingCash).toBe(-24_000_000);
      expect(base.firstNegativeCashDate).toBe(base.weeks[2].weekEnd);

      // Best: termin 50jt maju 7 hari ke 2026-12-16 (Week 3) + opex 2.85jt -> seluruh 13 minggu tetap positif!
      expect(best.weeks[2].terminInflows).toBe(50_000_000);
      expect(best.firstNegativeCashDate).toBeNull();
      expect(best.minEndingCash).toBeGreaterThan(0);

      // Worst: Week 2 belum dapat rec-1 (telat +14d ke Week 3) & bayar 45jt -> Week 2 sudah minus!
      expect(worst.weeks[1].endingCash).toBeLessThan(0);
      expect(worst.firstNegativeCashDate).toBe(worst.weeks[1].weekEnd);
      // rec-late-edge (2027-02-20 + 14d = 2027-03-06 > 2027-03-01) tidak masuk totalInflows worst
      expect(worst.totalInflows).toBe(Math.round((25_000_000 + 50_000_000) * 0.85));
    });
  });

  describe('analyzeProjectMargin', () => {
    it('menghitung 6 kategori RAP vs realisasi, EAC berbasis progres >= 10%, dan topVarianceDrivers terurut', () => {
      const result = analyzeProjectMargin({
        projectId: 'proj-villa-1',
        projectName: 'Villa Ubud',
        contractValue: 500_000_000,
        progressPct: 50,
        rapByCategory: {
          material: 150_000_000,
          labor: 100_000_000,
          equipment: 40_000_000,
          overhead: 30_000_000,
          other: 20_000_000,
          uncategorized: 10_000_000,
        },
        actualByCategory: {
          material: 175_000_000, // +25jt over budget (rank 1)
          labor: 112_000_000,    // +12jt over budget (rank 2)
          equipment: 35_000_000, // -5jt under budget
          overhead: 33_000_000,  // +3jt over budget (rank 3)
          other: 18_000_000,     // -2jt under budget
          uncategorized: 10_000_000, // 0
        },
        asOfDate: '2026-12-01',
      });

      expect(result.disclaimer).toBe(FINANCIAL_ADVISOR_DISCLAIMER);
      expect(result.provenance.disclaimer).toBe(FINANCIAL_ADVISOR_DISCLAIMER);
      expect(result.byCategory).toHaveLength(PROJECT_MARGIN_CATEGORIES.length);
      expect(result.totalRap).toBe(350_000_000);
      expect(result.actualTotal).toBe(383_000_000);
      expect(result.totalVariance).toBe(33_000_000);

      // progressPct = 50 >= 10 -> EAC = 383_000_000 / 0.5 = 766_000_000
      expect(result.eacMethod).toBe('cpi_performance');
      expect(result.eac).toBe(766_000_000);
      expect(result.projectedFinalMargin).toBe(-266_000_000);
      expect(result.projectedMarginPct).toBe(-53.2);

      expect(result.topVarianceDrivers.map((d) => d.category)).toEqual([
        'material',
        'labor',
        'overhead',
      ]);
      expect(result.topVarianceDrivers.map((d) => d.variance)).toEqual([
        25_000_000,
        12_000_000,
        3_000_000,
      ]);
    });

    it('memakai baseline sisa RAP saat progressPct < 10%', () => {
      const result = analyzeProjectMargin({
        projectId: 'proj-early',
        projectName: 'Gudang Baru',
        contractValue: 200_000_000,
        progressPct: 5,
        rapByCategory: {
          material: 90_000_000,
          labor: 50_000_000,
        },
        actualByCategory: {
          material: 10_000_000,
          labor: 5_000_000,
        },
      });

      expect(result.eacMethod).toBe('baseline_remaining_rap');
      expect(result.eac).toBe(140_000_000);
      expect(result.projectedFinalMargin).toBe(60_000_000);
      expect(result.projectedMarginPct).toBe(30);
      expect(result.topVarianceDrivers).toEqual([]);
    });
  });

  describe('recommendProjectPricing', () => {
    it('menghitung rentang harga dari margin historis min/median/max saat N >= 3', () => {
      const result = recommendProjectPricing({
        estimatedDirectCost: 80_000_000,
        similarProjects: [
          { projectId: 'p1', projectName: 'Proyek A', contractValue: 100_000_000, actualCost: 85_000_000 }, // 15%
          { projectId: 'p2', projectName: 'Proyek B', contractValue: 100_000_000, actualCost: 80_000_000 }, // 20%
          { projectId: 'p3', projectName: 'Proyek C', contractValue: 100_000_000, actualCost: 70_000_000 }, // 30%
        ],
        asOfDate: '2026-12-01',
      });

      expect(result.usedFallback).toBe(false);
      expect(result.sampleCount).toBe(3);
      expect(result.minMarginPct).toBe(15);
      expect(result.medianMarginPct).toBe(20);
      expect(result.maxMarginPct).toBe(30);
      expect(result.lowPrice).toBe(Math.round(80_000_000 / 0.85));
      expect(result.recommendedPrice).toBe(100_000_000);
      expect(result.highPrice).toBe(Math.round(80_000_000 / 0.7));
      expect(result.disclaimer).toBe(FINANCIAL_ADVISOR_DISCLAIMER);
      expect(result.provenance.source).toContain('riwayat_3_proyek_serupa');
    });

    it('menggunakan fallback margin katalog -5%/0%/+5% saat sampel N < 3', () => {
      const result = recommendProjectPricing({
        estimatedDirectCost: 80_000_000,
        similarProjects: [
          { projectId: 'p1', projectName: 'Proyek A', contractValue: 100_000_000, actualCost: 75_000_000 },
        ],
        catalogDefaultMarginPct: 20,
        minSampleSize: 3,
      });

      expect(result.usedFallback).toBe(true);
      expect(result.sampleCount).toBe(1);
      expect(result.minMarginPct).toBe(15);
      expect(result.medianMarginPct).toBe(20);
      expect(result.maxMarginPct).toBe(25);
      expect(result.recommendedPrice).toBe(100_000_000);
      expect(result.lowPrice).toBe(Math.round(80_000_000 / 0.85));
      expect(result.highPrice).toBe(Math.round(80_000_000 / 0.75));
      expect(result.note).toContain('Sampel proyek serupa < 3; menggunakan margin katalog');
      expect(result.disclaimer).toBe(FINANCIAL_ADVISOR_DISCLAIMER);
    });
  });

  describe('runAdvisorWhatIf', () => {
    const baseInput: ForecastCashFlowInput = {
      asOfDate: '2026-12-01',
      openingCash: 40_000_000,
      monthlyOpexPlan: 13_000_000, // 3jt/minggu
      receivables: [
        {
          id: 'rec-x',
          partyId: 'client-x',
          partyName: 'PT Klien X',
          dueDate: '2026-12-08', // Week 2
          outstandingAmount: 50_000_000,
        },
      ],
      scheduledProjectTermins: [],
      payables: [
        {
          id: 'pay-z',
          partyId: 'vendor-z',
          partyName: 'Vendor Z',
          dueDate: '2026-12-29', // Week 5
          outstandingAmount: 45_000_000,
        },
      ],
    };

    it('simulasi client_delay: klien X telat 30 hari menyebabkan defisit kas sementara namun profitImpact = 0', () => {
      const whatIf = runAdvisorWhatIf(baseInput, {
        kind: 'client_delay',
        partyId: 'client-x',
        partyName: 'PT Klien X',
        delayDays: 30,
      });

      expect(whatIf.scenarioKind).toBe('client_delay');
      expect(whatIf.beforeFirstNegativeDate).toBeNull();
      // 2026-12-08 + 30 hari = 2027-01-07 (Week 6); pada Week 5 hutang 45jt dibayar -> kas minus!
      expect(whatIf.afterFirstNegativeDate).toBe(whatIf.afterForecast.weeks[4].weekEnd);
      expect(whatIf.minCashDelta).toBeLessThan(0);
      expect(whatIf.cashImpactWeek13).toBe(0); // masih tertagih di Week 6 dalam horizon 13 minggu
      expect(whatIf.profitImpact).toBe(0);
      expect(whatIf.assumptions.length).toBeGreaterThan(0);
      expect(whatIf.disclaimer).toBe(FINANCIAL_ADVISOR_DISCLAIMER);
    });

    it('simulasi take_new_project: menghitung dampak kas DP/termin/biaya mingguan serta profitImpact', () => {
      const whatIf = runAdvisorWhatIf(baseInput, {
        kind: 'take_new_project',
        projectName: 'Renovasi Kantor Y',
        contractValue: 120_000_000,
        dpAmount: 36_000_000,
        dpDate: '2026-12-03', // Week 1
        estimatedCost: 80_000_000,
        costStartDate: '2026-12-08', // Week 2..5 (4 minggu @ 20jt)
        durationWeeks: 4,
        terminAmount: 60_000_000,
        terminDate: '2027-01-15', // Week 7
      });

      expect(whatIf.scenarioKind).toBe('take_new_project');
      expect(whatIf.profitImpact).toBe(40_000_000); // 120jt - 80jt
      expect(whatIf.cashImpactWeek13).toBe(16_000_000); // +36jt +60jt -80jt
      expect(whatIf.assumptions.some((a) => a.includes('Renovasi Kantor Y'))).toBe(true);
      expect(whatIf.provenance.source).toBe('simulasi_what_if:take_new_project');
      expect(whatIf.disclaimer).toBe(FINANCIAL_ADVISOR_DISCLAIMER);
    });

    it('simulasi pay_payable_early: mempercepat bayar hutang Z memicu kas negatif lebih dini', () => {
      const whatIf = runAdvisorWhatIf(baseInput, {
        kind: 'pay_payable_early',
        payableId: 'pay-z',
        partyName: 'Vendor Z',
        amount: 45_000_000,
        newPayDate: '2026-12-02', // pindah dari Week 5 ke Week 1 -> 40jt - 3jt - 45jt = -8jt!
      });

      expect(whatIf.scenarioKind).toBe('pay_payable_early');
      expect(whatIf.beforeFirstNegativeDate).toBeNull();
      expect(whatIf.afterFirstNegativeDate).toBe(whatIf.afterForecast.weeks[0].weekEnd);
      expect(whatIf.minCashDelta).toBeLessThan(0);
      expect(whatIf.cashImpactWeek13).toBe(0);
      expect(whatIf.profitImpact).toBe(0);
      expect(whatIf.assumptions.some((a) => a.includes('Vendor Z'))).toBe(true);
      expect(whatIf.disclaimer).toBe(FINANCIAL_ADVISOR_DISCLAIMER);
    });
  });

  describe('prioritizePayables', () => {
    it('mengurutkan hierarki (jatuh tempo > segera jatuh tempo > proyek kritis > denda/pajak) dan tidak melebihi kas tersedia', () => {
      const asOfDate = '2026-12-01';
      const availableCash = 25_000_000;

      const result = prioritizePayables(
        [
          {
            id: 'pay-tax',
            partyName: 'Pajak PPh',
            dueDate: '2027-01-15', // masih lama (45 hari), tapi pajak/denda
            outstandingAmount: 5_000_000,
            isTaxOrPenalty: true,
          },
          {
            id: 'pay-critical',
            partyName: 'Subkon Struktur',
            dueDate: '2027-01-15', // masih lama (45 hari), tapi proyek aktif/kritis
            outstandingAmount: 10_000_000,
            isActiveCriticalProject: true,
          },
          {
            id: 'pay-soon',
            partyName: 'TB Besi',
            dueDate: '2026-12-05', // segera jatuh tempo (4 hari)
            outstandingAmount: 12_000_000,
          },
          {
            id: 'pay-overdue',
            partyName: 'Supplier Semen',
            dueDate: '2026-11-20', // sudah jatuh tempo 11 hari
            outstandingAmount: 10_000_000,
          },
          {
            id: 'pay-normal',
            partyName: 'Vendor Lain',
            dueDate: '2027-01-20',
            outstandingAmount: 8_000_000,
          },
        ],
        availableCash,
        asOfDate,
      );

      expect(result.orderedPayables.map((p) => p.id)).toEqual([
        'pay-overdue',   // 1. sudah jatuh tempo
        'pay-soon',      // 2. segera jatuh tempo
        'pay-critical',  // 3. proyek aktif/kritis
        'pay-tax',       // 4. denda/pajak
        'pay-normal',    // 5. biasa
      ]);

      // Kas 25jt: bayar pay-overdue (10jt) + pay-soon (12jt) = 22jt; sisa 3jt tidak cukup utk pay-critical (10jt)
      // ataupun pay-tax (5jt) maupun pay-normal (8jt)
      expect(result.recommendedPayNow.map((p) => p.id)).toEqual(['pay-overdue', 'pay-soon']);
      expect(result.totalRecommendedPayNow).toBe(22_000_000);
      expect(result.totalRecommendedPayNow).toBeLessThanOrEqual(availableCash);
      expect(result.remainingCashAfterPriority).toBe(3_000_000);
      expect(result.deferOrNegotiate.map((p) => p.id)).toEqual([
        'pay-critical',
        'pay-tax',
        'pay-normal',
      ]);
      expect(result.totalDeferred).toBe(23_000_000);
      expect(result.totalRecommendedPayNow + result.totalDeferred).toBe(result.totalPayables);
      expect(result.disclaimer).toBe(FINANCIAL_ADVISOR_DISCLAIMER);
      expect(result.provenance.disclaimer).toBe(FINANCIAL_ADVISOR_DISCLAIMER);
    });

    it('mampu melompati faktur berbiaya besar agar sisa kas tetap optimal tanpa melebihi availableCash', () => {
      const result = prioritizePayables(
        [
          {
            id: 'pay-huge-overdue',
            partyName: 'Vendor Besar',
            dueDate: '2026-11-25',
            outstandingAmount: 20_000_000,
          },
          {
            id: 'pay-small-soon',
            partyName: 'Vendor Kecil',
            dueDate: '2026-12-03',
            outstandingAmount: 7_000_000,
          },
        ],
        10_000_000,
        '2026-12-01',
      );

      expect(result.recommendedPayNow.map((p) => p.id)).toEqual(['pay-small-soon']);
      expect(result.deferOrNegotiate.map((p) => p.id)).toEqual(['pay-huge-overdue']);
      expect(result.totalRecommendedPayNow).toBe(7_000_000);
      expect(result.remainingCashAfterPriority).toBe(3_000_000);
    });
  });

  describe('validasi & kasus batas deterministik', () => {
    it('mendeteksi openingCash negatif pada asOfDate dan menolak format tanggal tidak valid', () => {
      const negResult = forecastCashFlow13Weeks({
        asOfDate: '2026-12-01',
        openingCash: -2_000_000,
        monthlyOpexPlan: 0,
        receivables: [],
        payables: [],
        scheduledProjectTermins: [],
      });
      expect(negResult.scenarios.base.firstNegativeCashDate).toBe('2026-12-01');

      expect(() =>
        forecastCashFlow13Weeks({
          asOfDate: '01-12-2026',
          openingCash: 0,
          monthlyOpexPlan: 0,
          receivables: [],
          payables: [],
          scheduledProjectTermins: [],
        }),
      ).toThrow(/YYYY-MM-DD/);
    });

    it('menghitung median genap pada recommendProjectPricing saat N = 4', () => {
      const result = recommendProjectPricing({
        estimatedDirectCost: 75_000_000,
        similarProjects: [
          { projectId: 'a', projectName: 'A', contractValue: 100_000_000, actualCost: 85_000_000 }, // 15
          { projectId: 'b', projectName: 'B', contractValue: 100_000_000, actualCost: 80_000_000 }, // 20
          { projectId: 'c', projectName: 'C', contractValue: 100_000_000, actualCost: 70_000_000 }, // 30
          { projectId: 'd', projectName: 'D', contractValue: 100_000_000, actualCost: 65_000_000 }, // 35
        ],
      });
      expect(result.usedFallback).toBe(false);
      expect(result.medianMarginPct).toBe(25); // (20 + 30) / 2
      expect(result.recommendedPrice).toBe(100_000_000);
    });
  });
});
