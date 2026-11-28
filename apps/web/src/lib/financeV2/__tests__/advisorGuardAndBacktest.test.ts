import { describe, expect, it } from 'vitest';
import { buildAdvisorBriefTool } from '@agent-core/advisorTools';
import { estimateJsonTokens } from '@agent-core/financeSnapshot';
import { assertRegistry, toolsFor } from '@agent-core/registry';
import {
  estimateAdvisorTokens,
  extractNumbersFromNarrative,
  formatAdvisorMobileAnswer,
  runCashFlowForecastBacktest,
  verifyNarrativeNumbersMatchSource,
  type ForecastBacktestCaseInput,
} from '@domain/advisorNarrationGuard';
import {
  analyzeProjectMargin,
  FINANCIAL_ADVISOR_DISCLAIMER,
  forecastCashFlow13Weeks,
  type ForecastCashFlowInput,
  type ProjectMarginInput,
} from '@domain/financialAdvisor';

function makeBaseForecastInput(overrides: Partial<ForecastCashFlowInput> = {}): ForecastCashFlowInput {
  return {
    asOfDate: '2026-12-01',
    openingCash: 80_000_000,
    monthlyOpexPlan: 13_000_000, // 3.000.000/minggu
    receivables: [
      {
        id: 'rec-1',
        partyId: 'client-a',
        partyName: 'Bu Ana',
        dueDate: '2026-12-10', // Minggu 2
        outstandingAmount: 30_000_000,
      },
    ],
    scheduledProjectTermins: [
      {
        id: 'term-1',
        projectId: 'proj-1',
        projectName: 'Rumah Melati',
        partyId: 'client-b',
        dueDate: '2026-12-18', // Minggu 3
        amount: 60_000_000,
      },
    ],
    payables: [
      {
        id: 'pay-1',
        partyId: 'sup-1',
        partyName: 'TB Makmur',
        dueDate: '2026-12-16', // Minggu 3
        outstandingAmount: 45_000_000,
        isActiveCriticalProject: true,
      },
      {
        id: 'pay-2',
        partyId: 'sup-2',
        partyName: 'PT Baja',
        dueDate: '2027-01-05', // Minggu 6
        outstandingAmount: 35_000_000,
      },
    ],
    ...overrides,
  };
}

describe('G3-2: Penjaga Narasi Advisor, Backtest Forecast 13 Minggu, & Tool get_advisor_brief', () => {
  describe('extractNumbersFromNarrative & verifyNarrativeNumbersMatchSource', () => {
    it('mengekstrak format rupiah, singkatan jt/rb, persen, dan mengecualikan nomor urut, tanggal ISO, serta token struktural sah', () => {
      const text = [
        '1. Pada 2026-12-01 proyeksi 13 minggu menunjukkan kas Rp 15.000.000.',
        '2. Tambahan piutang 15jt, kas kecil 500rb, margin 12,5%, dan skor 42.',
        '3. Skenario defisit -Rp 24.000.000 pada proj-1.',
      ].join('\n');

      const extracted = extractNumbersFromNarrative(text, {
        allowedLiteralTokens: ['13 minggu'],
      });

      expect(extracted).toEqual([15_000_000, 15_000_000, 500_000, 12.5, 42, -24_000_000]);
    });

    it('meloloskan jawaban ponsel terstruktur dari formatAdvisorMobileAnswer jika 100% angka berasal dari kode deterministik', () => {
      const forecast = forecastCashFlow13Weeks(makeBaseForecastInput());
      const marginInput: ProjectMarginInput = {
        projectId: 'proj-melati',
        projectName: 'Rumah Melati',
        contractValue: 200_000_000,
        progressPct: 50,
        rapByCategory: {
          material: 80_000_000,
          labor: 40_000_000,
          equipment: 10_000_000,
          overhead: 10_000_000,
        },
        actualByCategory: {
          material: 45_000_000,
          labor: 20_000_000,
          equipment: 5_000_000,
          overhead: 5_000_000,
        },
        asOfDate: '2026-12-01',
      };
      const margin = analyzeProjectMargin(marginInput);

      const base = forecast.scenarios.base;
      const formatRp = (n: number) =>
        n < 0
          ? `-Rp ${Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
          : `Rp ${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

      const mobileText = formatAdvisorMobileAnswer({
        conclusionOneSentence: `Kas akhir 13 minggu diproyeksikan ${formatRp(base.endingCashWeek13)} dengan margin proyek ${margin.projectedMarginPct}%.`,
        keyMetrics: [
          {
            label: 'Kas Akhir Base',
            valueFormatted: formatRp(base.endingCashWeek13),
            numericValue: base.endingCashWeek13,
            source: 'forecastCashFlow13Weeks',
          },
          {
            label: 'Kas Minimum Base',
            valueFormatted: formatRp(base.minEndingCash),
            numericValue: base.minEndingCash,
            source: 'forecastCashFlow13Weeks',
          },
          {
            label: 'EAC Proyek',
            valueFormatted: formatRp(margin.eac),
            numericValue: margin.eac,
            source: 'analyzeProjectMargin',
          },
          {
            label: 'Margin Proyeksi',
            valueFormatted: `${margin.projectedMarginPct}%`,
            numericValue: margin.projectedMarginPct,
            source: 'analyzeProjectMargin',
          },
        ],
        assumptions: [
          'Piutang dan termin proyek cair tepat waktu sesuai skenario base.',
          'EAC proyek dihitung deterministik berbasis rasio biaya terhadap progres.',
        ],
        risks: [
          'Keterlambatan termin klien dapat menekan kas minimum.',
        ],
        recommendedSteps: [
          '1. Pantau pencairan termin pada 2026-12-18.',
          '2. Kendalikan belanja material agar tidak melampaui EAC.',
        ],
      });

      expect(mobileText).toContain('Kesimpulan:');
      expect(mobileText).toContain('Angka Kunci:');
      expect(mobileText).toContain('Asumsi:');
      expect(mobileText).toContain('Risiko:');
      expect(mobileText).toContain('Langkah Disarankan:');
      expect(mobileText).toContain(FINANCIAL_ADVISOR_DISCLAIMER);
      expect(estimateAdvisorTokens(mobileText)).toBeLessThanOrEqual(400);

      const allowedNumbers = [
        base.endingCashWeek13,
        base.minEndingCash,
        margin.eac,
        margin.projectedMarginPct,
      ];

      const check = verifyNarrativeNumbersMatchSource(mobileText, allowedNumbers, {
        allowedLiteralTokens: ['13 minggu'],
      });
      expect(check.ok).toBe(true);
      expect(check.unsourcedNumbers).toEqual([]);
    });

    it('menolak narasi halusinasi LLM yang menyelipkan angka palsu tanpa sumber deterministik', () => {
      const allowedNumbers = [51_000_000, 18.5, -24_000_000];

      const hallucinatedMargin =
        'Kesimpulan: Proyek sehat dan margin naik ke 42% dari sebelumnya 18,5%.';
      const res1 = verifyNarrativeNumbersMatchSource(hallucinatedMargin, allowedNumbers);
      expect(res1.ok).toBe(false);
      if (!res1.ok) {
        expect(res1.reason).toBe('unsourced_numbers_detected');
        expect(res1.unsourcedNumbers).toEqual([42]);
      }

      const hallucinatedCash =
        'Kas akhir Rp 51.000.000 dengan cadangan kas aman Rp 99.000.000 dan dana darurat 15jt.';
      const res2 = verifyNarrativeNumbersMatchSource(hallucinatedCash, allowedNumbers);
      expect(res2.ok).toBe(false);
      if (!res2.ok) {
        expect(res2.reason).toBe('unsourced_numbers_detected');
        expect(res2.unsourcedNumbers).toEqual([99_000_000, 15_000_000]);
      }

      // Pembalikan tanda (-24jt menjadi +24jt) juga wajib ditolak
      const flippedSign = 'Kas minimum adalah Rp 24.000.000.';
      const res3 = verifyNarrativeNumbersMatchSource(flippedSign, allowedNumbers);
      expect(res3.ok).toBe(false);
      if (!res3.ok) {
        expect(res3.unsourcedNumbers).toEqual([24_000_000]);
      }
    });
  });

  describe('runCashFlowForecastBacktest (5 jendela sintetis: 3 normal + 2 shock/gagal)', () => {
    it('melaporkan MAPE normal vs shock secara jujur tanpa menyembunyikan kasus gagal', () => {
      const normalInput1 = makeBaseForecastInput();
      const base1 = forecastCashFlow13Weeks(normalInput1).scenarios.base.weeks;

      const normalInput2 = makeBaseForecastInput({
        asOfDate: '2026-09-01',
        openingCash: 100_000_000,
        monthlyOpexPlan: 15_000_000,
        receivables: [{ id: 'r2', dueDate: '2026-09-10', outstandingAmount: 40_000_000 }],
        scheduledProjectTermins: [{ id: 't2', dueDate: '2026-10-05', amount: 70_000_000 }],
        payables: [{ id: 'p2', dueDate: '2026-09-20', outstandingAmount: 50_000_000 }],
      });
      const base2 = forecastCashFlow13Weeks(normalInput2).scenarios.base.weeks;

      const normalInput3 = makeBaseForecastInput({
        asOfDate: '2026-06-01',
        openingCash: 60_000_000,
        monthlyOpexPlan: 10_000_000,
        receivables: [{ id: 'r3', dueDate: '2026-06-12', outstandingAmount: 25_000_000 }],
        scheduledProjectTermins: [{ id: 't3', dueDate: '2026-07-10', amount: 45_000_000 }],
        payables: [{ id: 'p3', dueDate: '2026-06-25', outstandingAmount: 30_000_000 }],
      });
      const base3 = forecastCashFlow13Weeks(normalInput3).scenarios.base.weeks;

      // Kasus shock 1: Klien telat bayar 30 hari (termin 60jt di minggu 3 tertunda ke minggu 7)
      // Di minggu 3..6 kas aktual jatuh negatif sedangkan prediksi base masih positif!
      const shockLateClientInput = makeBaseForecastInput({
        openingCash: 35_000_000,
      });
      const shockLateActualInput = makeBaseForecastInput({
        openingCash: 35_000_000,
        scheduledProjectTermins: [
          {
            id: 'term-1-delayed',
            projectId: 'proj-1',
            dueDate: '2027-01-17', // mundur +30 hari (Minggu 7)
            amount: 60_000_000,
          },
        ],
      });
      const shockLateActualWeeks = forecastCashFlow13Weeks(shockLateActualInput).scenarios.base.weeks;

      // Kasus shock 2: Lonjakan biaya material tak terduga (+50jt di minggu 4..5)
      const shockCostSpikeInput = makeBaseForecastInput({
        openingCash: 75_000_000,
      });
      const shockCostActualInput = makeBaseForecastInput({
        openingCash: 75_000_000,
        payables: [
          ...makeBaseForecastInput().payables,
          {
            id: 'pay-spike-1',
            dueDate: '2026-12-23', // Minggu 4
            outstandingAmount: 55_000_000,
          },
          {
            id: 'pay-spike-2',
            dueDate: '2026-12-30', // Minggu 5
            outstandingAmount: 35_000_000,
          },
        ],
      });
      const shockCostActualWeeks = forecastCashFlow13Weeks(shockCostActualInput).scenarios.base.weeks;

      const cases: ForecastBacktestCaseInput[] = [
        {
          caseId: 'norm-1',
          label: 'Proyek Rumah Stabil (Q4)',
          isShockCase: false,
          forecastInput: normalInput1,
          actualEndingCashByWeek: base1.map((w, i) => Math.round(w.endingCash * (i % 2 === 0 ? 1.03 : 0.97))),
        },
        {
          caseId: 'norm-2',
          label: 'Proyek Ruko 2 Termin (Q3)',
          isShockCase: false,
          forecastInput: normalInput2,
          actualEndingCashByWeek: base2.map((w, i) => Math.round(w.endingCash * (i % 3 === 0 ? 0.94 : 1.04))),
        },
        {
          caseId: 'norm-3',
          label: 'Proyek Renovasi Kecil (Q2)',
          isShockCase: false,
          forecastInput: normalInput3,
          actualEndingCashByWeek: base3.map((w, i) => Math.round(w.endingCash * (i % 2 === 0 ? 0.95 : 1.06))),
        },
        {
          caseId: 'shock-late-client',
          label: 'Klien Telat Bayar 30 Hari',
          isShockCase: true,
          failureCause: 'klien telat tak terduga (+30 hari pencairan termin Rp 60jt)',
          forecastInput: shockLateClientInput,
          actualEndingCashByWeek: shockLateActualWeeks.map((w) => w.endingCash),
        },
        {
          caseId: 'shock-material-spike',
          label: 'Lonjakan Biaya Material Tak Terduga',
          isShockCase: true,
          failureCause: 'lonjakan biaya material Rp 90jt di luar jadwal payable awal',
          forecastInput: shockCostSpikeInput,
          actualEndingCashByWeek: shockCostActualWeeks.map((w) => w.endingCash),
        },
      ];

      const report = runCashFlowForecastBacktest(cases);

      expect(report.datasetKind).toBe('synthetic');
      expect(report.disclaimer).toBe(FINANCIAL_ADVISOR_DISCLAIMER);
      expect(report.totalCases).toBe(5);
      expect(report.normalCasesCount).toBe(3);
      expect(report.shockCasesCount).toBe(2);
      expect(report.failedCasesCount).toBe(2);
      expect(report.failedCases.length).toBeGreaterThanOrEqual(1);

      expect(report.normalMapePct).toBeLessThan(10);
      expect(report.shockMapePct).toBeGreaterThan(20);
      expect(report.overallMapePct).toBeGreaterThan(report.normalMapePct);

      const lateCase = report.failedCases.find((c) => c.caseId === 'shock-late-client');
      expect(lateCase).toBeDefined();
      expect(lateCase?.failedCase).toBe(true);
      expect(lateCase?.unpredictedNegativeCash).toBe(true);
      expect(lateCase?.failureCause).toContain('klien telat tak terduga');

      const spikeCase = report.failedCases.find((c) => c.caseId === 'shock-material-spike');
      expect(spikeCase).toBeDefined();
      expect(spikeCase?.failedCase).toBe(true);
      expect(spikeCase?.mapePct).toBeGreaterThan(20);
      expect(spikeCase?.failureCause).toContain('lonjakan biaya material');
    });
  });

  describe('buildAdvisorBriefTool & integrasi registry get_advisor_brief', () => {
    it('terdaftar pada domain advisor di registry tanpa melampaui batas 8 tool finance/manager', () => {
      expect(assertRegistry()).toEqual([]);
      expect(toolsFor('finance', 'manager').length).toBeLessThanOrEqual(8);
      expect(toolsFor('manager', 'manager').length).toBeLessThanOrEqual(8);
      expect(toolsFor('advisor', 'manager').map((t) => t.name)).toEqual(['get_advisor_brief']);
      expect(toolsFor('advisor', 'worker')).toEqual([]);
    });

    it('mengembalikan JSON ringkas <= 400 token dengan provenance dan 100% angka lolos penjaga narasi', () => {
      const forecastInput = makeBaseForecastInput();
      const projectMarginInput: ProjectMarginInput = {
        projectId: 'proj-1',
        projectName: 'Rumah Melati',
        contractValue: 220_000_000,
        progressPct: 40,
        rapByCategory: {
          material: 90_000_000,
          labor: 45_000_000,
          equipment: 15_000_000,
          overhead: 10_000_000,
        },
        actualByCategory: {
          material: 48_000_000,
          labor: 18_000_000,
          equipment: 6_000_000,
          overhead: 4_000_000,
        },
        asOfDate: '2026-12-01',
      };

      const brief = buildAdvisorBriefTool({
        asOfDate: '2026-12-01',
        focus: 'ringkasan',
        forecastInput,
        projectMarginInput,
        payables: forecastInput.payables,
        availableCash: 50_000_000,
      });

      expect(estimateJsonTokens(brief)).toBeLessThanOrEqual(400);
      expect(brief.disclaimer).toBe(FINANCIAL_ADVISOR_DISCLAIMER);
      expect(brief.metrics.length).toBeGreaterThanOrEqual(3);
      for (const m of brief.metrics) {
        expect(m.source.length).toBeGreaterThan(0);
        expect(m.period.length).toBeGreaterThan(0);
      }

      const allowedNumbers = brief.metrics.map((m) => m.value);
      const narrativeJoined = [
        brief.summary,
        ...brief.assumptions,
        ...brief.risks,
        ...brief.nextSteps,
      ].join('\n');

      const verification = verifyNarrativeNumbersMatchSource(narrativeJoined, allowedNumbers);
      expect(verification.ok).toBe(true);
      expect(verification.unsourcedNumbers).toEqual([]);

      // Cek tiap mode fokus juga <= 400 token dan 100% lolos penjaga angka
      for (const focus of ['kas_13_minggu', 'margin_proyek', 'prioritas_hutang'] as const) {
        const focused = buildAdvisorBriefTool({
          asOfDate: '2026-12-01',
          focus,
          forecastInput,
          projectMarginInput,
          payables: forecastInput.payables,
          availableCash: 50_000_000,
        });
        expect(estimateJsonTokens(focused)).toBeLessThanOrEqual(400);
        const focusedText = [
          focused.summary,
          ...focused.assumptions,
          ...focused.risks,
          ...focused.nextSteps,
        ].join('\n');
        const check = verifyNarrativeNumbersMatchSource(
          focusedText,
          focused.metrics.map((m) => m.value),
        );
        expect(check.ok).toBe(true);
      }
    });
  });
});
