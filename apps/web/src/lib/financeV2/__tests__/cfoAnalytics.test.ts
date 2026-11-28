import { describe, expect, it } from 'vitest';
import {
  buildBoardMonthlyReport,
  CFO_ANALYTICS_DISCLAIMER,
  computeBudgetVsActual,
  computeCfoKpis,
  renderBoardReportPdfHtml,
  simulateDividendPolicyComparison,
  type BoardMonthlyReportInput,
} from '@domain/cfoAnalytics';

describe('G4-1: CFO Anggaran vs Aktual, KPI, Kebijakan Dividen 2 Mode, & Laporan Bulanan Direksi', () => {
  describe('computeBudgetVsActual', () => {
    it('menghitung anggaran vs aktual bulanan untuk opex & proyek dengan penjelasan varians >= 10%', () => {
      const result = computeBudgetVsActual({
        periodLabel: 'Oktober 2026',
        granularity: 'monthly',
        asOfDate: '2026-10-31',
        opexItems: [
          { id: 'opex-gaji', name: 'Gaji Tetap', budget: 30_000_000, actual: 30_900_000 }, // +3% -> on_track
          { id: 'opex-listrik', name: 'Listrik & Internet', budget: 5_000_000, actual: 6_250_000 }, // +25% -> over_budget
          { id: 'opex-marketing', name: 'Pemasaran', budget: 10_000_000, actual: 7_500_000 }, // -25% -> under_budget
        ],
        projectItems: [
          { id: 'prj-ruko', name: 'Proyek Ruko Melati', budget: 80_000_000, actual: 92_000_000 }, // +15% -> over_budget
          { id: 'prj-kantor', name: 'Proyek Renovasi Kantor', budget: 50_000_000, actual: 49_000_000 }, // -2% -> on_track
        ],
      });

      expect(result.disclaimer).toBe(CFO_ANALYTICS_DISCLAIMER);
      expect(result.provenance.disclaimer).toBe(CFO_ANALYTICS_DISCLAIMER);
      expect(result.granularity).toBe('monthly');

      const gaji = result.opexItems.find((i) => i.id === 'opex-gaji');
      expect(gaji).toMatchObject({
        budget: 30_000_000,
        actual: 30_900_000,
        variance: 900_000,
        variancePct: 3,
        status: 'on_track',
        isSignificantVariance: false,
        explanation: null,
      });

      const listrik = result.opexItems.find((i) => i.id === 'opex-listrik');
      expect(listrik).toMatchObject({
        variance: 1_250_000,
        variancePct: 25,
        status: 'over_budget',
        isSignificantVariance: true,
      });
      expect(listrik?.explanation).toContain('Listrik & Internet');
      expect(listrik?.explanation).toContain('+25%');

      const marketing = result.opexItems.find((i) => i.id === 'opex-marketing');
      expect(marketing).toMatchObject({
        variance: -2_500_000,
        variancePct: -25,
        status: 'under_budget',
        isSignificantVariance: true,
      });
      expect(marketing?.explanation).toContain('-25%');

      const ruko = result.projectItems.find((i) => i.id === 'prj-ruko');
      expect(ruko).toMatchObject({
        variance: 12_000_000,
        variancePct: 15,
        status: 'over_budget',
        isSignificantVariance: true,
      });

      expect(result.opexSummary).toMatchObject({
        budget: 45_000_000,
        actual: 44_650_000,
        variance: -350_000,
        status: 'on_track',
      });
      expect(result.projectSummary).toMatchObject({
        budget: 130_000_000,
        actual: 141_000_000,
        variance: 11_000_000,
      });
      expect(result.overallSummary).toMatchObject({
        budget: 175_000_000,
        actual: 185_650_000,
        variance: 10_650_000,
      });
      expect(result.significantVariances.map((v) => v.id)).toEqual([
        'prj-ruko',
        'opex-marketing',
        'opex-listrik',
      ]);
    });

    it('mendukung granularitas tahunan dan kasus anggaran Rp 0 tanpa NaN/Infinity', () => {
      const result = computeBudgetVsActual({
        periodLabel: 'FY 2026',
        granularity: 'annual',
        opexItems: [
          { id: 'opex-tak-terduga', name: 'Biaya Tak Terduga', budget: 0, actual: 3_500_000.4 },
        ],
        projectItems: [
          { id: 'prj-kosong', name: 'Proyek Cadangan', budget: 0, actual: 0 },
        ],
      });

      expect(result.granularity).toBe('annual');
      const unexpected = result.opexItems[0];
      expect(unexpected.actual).toBe(3_500_000);
      expect(unexpected.variance).toBe(3_500_000);
      expect(unexpected.variancePct).toBe(100);
      expect(unexpected.status).toBe('over_budget');
      expect(unexpected.explanation).toContain('tahunan');

      const emptyPrj = result.projectItems[0];
      expect(emptyPrj.variancePct).toBe(0);
      expect(emptyPrj.status).toBe('on_track');
      expect(Number.isFinite(result.overallSummary.variancePct)).toBe(true);
    });
  });

  describe('computeCfoKpis', () => {
    it('menghitung seluruh KPI wajib secara deterministik dengan integer rupiah & provenance', () => {
      const kpis = computeCfoKpis({
        periodLabel: 'Oktober 2026',
        periodDays: 30,
        asOfDate: '2026-10-31',
        cashAndBank: 180_000_000,
        receivables: 75_000_000,
        payables: 45_000_000,
        shortTermDebt: 15_000_000,
        revenue: 250_000_000,
        hpp: 150_000_000,
        opex: 40_000_000,
        otherExpense: 5_000_000,
        revenueByClient: [
          { clientId: 'c-1', clientName: 'PT Alpha', revenue: 125_000_000 },
          { clientId: 'c-2', clientName: 'CV Beta', revenue: 60_000_000 },
          { clientId: 'c-3', clientName: 'Bu Citra', revenue: 40_000_000 },
          { clientId: 'c-4', clientName: 'Pak Doni', revenue: 25_000_000 },
        ],
        billedHours: 680,
        availableHours: 800,
      });

      expect(kpis.disclaimer).toBe(CFO_ANALYTICS_DISCLAIMER);
      expect(kpis.netCash).toBe(120_000_000); // 180jt - (45jt + 15jt)
      expect(kpis.runwayMonths).toBe(4.5); // 180jt / 40jt
      expect(kpis.runwayLabel).toBe('4.5 bulan');
      expect(kpis.grossProfit).toBe(100_000_000);
      expect(kpis.grossMarginPct).toBe(40); // (250 - 150) / 250 * 100
      expect(kpis.netProfit).toBe(55_000_000); // 250 - 150 - 40 - 5
      expect(kpis.netMarginPct).toBe(22); // 55 / 250 * 100
      expect(kpis.dsoDays).toBe(9); // (75 / 250) * 30
      expect(kpis.dpoDays).toBe(9); // (45 / 150) * 30
      expect(kpis.receivableToRevenueRatioPct).toBe(30); // 75 / 250 * 100
      expect(kpis.clientConcentrationTop1Pct).toBe(50); // 125 / 250 * 100
      expect(kpis.clientConcentrationTop3Pct).toBe(90); // (125+60+40) / 250 * 100
      expect(kpis.teamUtilizationPct).toBe(85); // 680 / 800 * 100
      expect(kpis.assumptions.length).toBeGreaterThanOrEqual(4);
      expect(kpis.provenance.asOfDate).toBe('2026-10-31');
    });

    it('menangani kasus batas revenue === 0, hpp === 0, dan burn === 0 tanpa NaN atau Infinity', () => {
      const kpis = computeCfoKpis({
        periodLabel: 'November 2026',
        periodDays: 30,
        cashAndBank: 50_000_000,
        receivables: 10_000_000,
        payables: 5_000_000,
        revenue: 0,
        hpp: 0,
        opex: 0,
        monthlyBurnRate: 0,
        activeProjectsCount: 3,
        teamProjectCapacity: 5,
      });

      expect(kpis.runwayMonths).toBeNull();
      expect(kpis.runwayLabel).not.toContain('Infinity');
      expect(kpis.runwayLabel).not.toContain('NaN');
      expect(kpis.grossMarginPct).toBe(0);
      expect(kpis.netMarginPct).toBe(0);
      expect(kpis.dsoDays).toBe(0);
      expect(kpis.dpoDays).toBe(0);
      expect(kpis.receivableToRevenueRatioPct).toBe(0);
      expect(kpis.clientConcentrationTop1Pct).toBe(0);
      expect(kpis.clientConcentrationTop3Pct).toBe(0);
      expect(kpis.teamUtilizationPct).toBe(60); // 3/5 * 100

      for (const val of [
        kpis.netCash,
        kpis.grossMarginPct,
        kpis.netMarginPct,
        kpis.dsoDays,
        kpis.dpoDays,
        kpis.receivableToRevenueRatioPct,
        kpis.clientConcentrationTop1Pct,
        kpis.clientConcentrationTop3Pct,
        kpis.teamUtilizationPct,
      ]) {
        expect(Number.isFinite(val)).toBe(true);
        expect(Number.isNaN(val)).toBe(false);
      }
    });
  });

  describe('simulateDividendPolicyComparison', () => {
    it('membandingkan mode per proyek vs per bisnis tanpa pernah melanggar kas tersedia & cadangan opex', () => {
      const sim = simulateDividendPolicyComparison({
        periodLabel: 'Oktober 2026',
        availableCash: 100_000_000,
        monthlyOpexPlan: 30_000_000,
        opexReserveMultiplier: 1.5, // cadangan opex = 45jt -> kas bebas = 55jt
        labaDitahan: 70_000_000,
        projects: [
          {
            projectId: 'p-1',
            projectName: 'Proyek A',
            received: 120_000_000,
            spent: 70_000_000, // pool = 50jt
            isClosed: true,
          },
          {
            projectId: 'p-2',
            projectName: 'Proyek B',
            received: 90_000_000,
            spent: 60_000_000, // pool = 30jt -> total teoritis 80jt > 55jt kas bebas!
            isClosed: false,
          },
        ],
      });

      expect(sim.disclaimer).toBe(CFO_ANALYTICS_DISCLAIMER);
      expect(sim.opexReserve).toBe(45_000_000);
      expect(sim.cashAfterReserve).toBe(55_000_000);

      // Mode per proyek: pool teoritis 80jt harus dipangkas ke 55jt agar cadangan opex 45jt utuh!
      expect(sim.perProjectMode.theoreticalTotalPool).toBe(80_000_000);
      expect(sim.perProjectMode.maxDistributable).toBe(55_000_000);
      expect(sim.perProjectMode.recommendedPayout).toBe(55_000_000);
      expect(sim.perProjectMode.cashRemainingAfterPayout).toBe(45_000_000);
      expect(sim.perProjectMode.cashRemainingAfterPayout).toBeGreaterThanOrEqual(sim.opexReserve);
      const sumProjectPayouts = sim.perProjectMode.projects.reduce(
        (s, p) => s + p.recommendedPayout,
        0,
      );
      expect(sumProjectPayouts).toBe(sim.perProjectMode.recommendedPayout);

      // Mode per bisnis: min(cashAfterReserve=55jt, labaDitahan=70jt) = 55jt
      expect(sim.perBusinessMode.maxDistributable).toBe(55_000_000);
      expect(sim.perBusinessMode.recommendedPayout).toBe(55_000_000);
      expect(sim.perBusinessMode.cashRemainingAfterPayout).toBe(45_000_000);
      expect(sim.perBusinessMode.cashRemainingAfterPayout).toBeGreaterThanOrEqual(sim.opexReserve);
    });

    it('menahan dividen (payout = 0) bila kas tersedia berada di bawah cadangan opex wajib', () => {
      const sim = simulateDividendPolicyComparison({
        periodLabel: 'Oktober 2026',
        availableCash: 25_000_000,
        monthlyOpexPlan: 30_000_000,
        opexReserveMultiplier: 1, // cadangan = 30jt > kas 25jt
        labaDitahan: 50_000_000,
        requestedDividendAmount: 20_000_000,
        projects: [
          {
            projectId: 'p-1',
            projectName: 'Proyek A',
            received: 60_000_000,
            spent: 30_000_000,
            isClosed: true,
          },
        ],
      });

      expect(sim.cashAfterReserve).toBe(0);
      expect(sim.perProjectMode.recommendedPayout).toBe(0);
      expect(sim.perProjectMode.cashRemainingAfterPayout).toBe(25_000_000);
      expect(sim.perBusinessMode.recommendedPayout).toBe(0);
      expect(sim.perBusinessMode.cashRemainingAfterPayout).toBe(25_000_000);
      expect(sim.recommendation.recommendedMode).toBe('hold');
      expect(sim.recommendation.recommendedAmount).toBe(0);
    });

    it('merekomendasikan mode per_proyek saat laba ditahan belum positif namun pool proyek & kas bebas tersedia', () => {
      const sim = simulateDividendPolicyComparison({
        periodLabel: 'Oktober 2026',
        availableCash: 120_000_000,
        monthlyOpexPlan: 25_000_000,
        opexReserveMultiplier: 1, // cadangan = 25jt -> kas bebas = 95jt
        labaDitahan: -10_000_000, // laba ditahan negatif
        projects: [
          {
            projectId: 'p-closed',
            projectName: 'Proyek Selesai',
            received: 100_000_000,
            spent: 60_000_000, // pool = 40jt
            isClosed: true,
          },
        ],
      });

      expect(sim.perBusinessMode.maxDistributable).toBe(0);
      expect(sim.perProjectMode.maxDistributable).toBe(40_000_000);
      expect(sim.recommendation.recommendedMode).toBe('per_proyek');
      expect(sim.recommendation.recommendedAmount).toBe(40_000_000);
      expect(sim.perProjectMode.cashRemainingAfterPayout).toBe(80_000_000);
    });
  });

  describe('buildBoardMonthlyReport & renderBoardReportPdfHtml', () => {
    const baseReportInput: BoardMonthlyReportInput = {
      orgName: 'PT Konstruksi Sejahtera',
      periodMonth: '2026-10',
      periodLabel: 'Oktober 2026',
      lockedPeriodMonth: '2026-10',
      asOfDate: '2026-10-31',
      openingCash: 100_000_000,
      shortTermDebt: 10_000_000,
      monthlyOpexPlan: 35_000_000,
      opexReserveMultiplier: 1,
      labaDitahan: 90_000_000,
      ledgerEntries: [
        {
          id: 'tx-rev-1',
          entryDate: '2026-10-05',
          kind: 'revenue',
          amount: 160_000_000,
          clientId: 'cli-alpha',
          clientName: 'PT Alpha',
          projectId: 'prj-1',
        },
        {
          id: 'tx-rev-2',
          entryDate: '2026-10-18',
          kind: 'revenue',
          amount: 90_000_000,
          clientId: 'cli-beta',
          clientName: 'CV Beta',
          projectId: 'prj-2',
        },
        {
          id: 'tx-hpp-1',
          entryDate: '2026-10-12',
          kind: 'hpp',
          amount: 130_000_000,
          projectId: 'prj-1',
          budgetItemId: 'bgt-prj-1',
        },
        {
          id: 'tx-opex-1',
          entryDate: '2026-10-25',
          kind: 'opex',
          amount: 42_000_000,
          budgetItemId: 'bgt-opex-1',
        },
      ],
      opexBudgetItems: [
        { id: 'bgt-opex-1', name: 'Operasional Kantor', budget: 35_000_000, actual: 0 }, // +20% dari ledger
      ],
      projectBudgetItems: [
        { id: 'bgt-prj-1', name: 'Biaya Proyek Ruko', budget: 120_000_000, actual: 0 }, // +8.33%
      ],
      receivables: [
        {
          id: 'ar-1',
          partyId: 'cli-alpha',
          partyName: 'PT Alpha',
          dueDate: '2026-10-10',
          issuedDate: '2026-10-01',
          outstandingAmount: 40_000_000,
        },
      ],
      payables: [
        {
          id: 'ap-1',
          partyId: 'sup-semen',
          partyName: 'TB Makmur',
          dueDate: '2026-11-15',
          issuedDate: '2026-10-20',
          outstandingAmount: 25_000_000,
        },
      ],
      projectMargins: [
        {
          projectId: 'prj-1',
          projectName: 'Proyek Ruko',
          contractValue: 200_000_000,
          progressPct: 60,
          rapByCategory: { material: 80_000_000, labor: 40_000_000 },
          actualByCategory: { material: 90_000_000, labor: 40_000_000 },
        },
      ],
      dividendProjects: [
        {
          projectId: 'prj-1',
          projectName: 'Proyek Ruko',
          received: 160_000_000,
          spent: 130_000_000,
          isClosed: false,
        },
      ],
      billedHours: 720,
      availableHours: 800,
    };

    it('menghasilkan hash deterministik & HTML PDF cetak 100% identik pada pemanggilan berulang', () => {
      const report1 = buildBoardMonthlyReport(baseReportInput);
      // Susun ulang urutan properti & array untuk memastikan kanonikalitas hash
      const reorderedInput: BoardMonthlyReportInput = {
        ...baseReportInput,
        ledgerEntries: [...(baseReportInput.ledgerEntries ?? [])].reverse(),
      };
      const report2 = buildBoardMonthlyReport(reorderedInput);

      expect(report1.deterministicHash).toMatch(/^[a-f0-9]{64}$/);
      expect(report1.deterministicHash).toBe(report2.deterministicHash);
      expect(report1).toEqual(report2);

      const html1 = renderBoardReportPdfHtml(report1);
      const html2 = renderBoardReportPdfHtml(report2);
      expect(html1).toBe(html2);

      // Pastikan struktur 1 halaman eksekutif + lampiran lengkap
      expect(html1).toContain('data-section="executive-page-one"');
      expect(html1).toContain('data-section="board-appendix"');
      expect(html1).toContain(report1.deterministicHash);
      expect(html1).toContain(CFO_ANALYTICS_DISCLAIMER);
      expect(html1).toContain('Lampiran A. Anggaran vs Aktual');
      expect(html1).toContain('Lampiran B. Margin &amp; EAC Proyek');
      expect(html1).toContain('Lampiran C. Ringkasan Umur Piutang &amp; Hutang');
      expect(html1).toContain('Periode Terkunci (2026-10-01)');
    });

    it('menjaga integritas periode terkunci: transaksi bulan berikutnya tidak memengaruhi laporan periode terkunci', () => {
      const lockedReportOnlyOct = buildBoardMonthlyReport(baseReportInput);

      // Tambahkan transaksi November, piutang/hutang November, dan asOfDate November
      const inputWithNovemberNoise: BoardMonthlyReportInput = {
        ...baseReportInput,
        asOfDate: '2026-11-20', // setelah periode terkunci 2026-10
        ledgerEntries: [
          ...(baseReportInput.ledgerEntries ?? []),
          {
            id: 'tx-nov-rev',
            entryDate: '2026-11-03',
            kind: 'revenue',
            amount: 500_000_000,
            clientId: 'cli-gamma',
            clientName: 'PT Gamma',
          },
          {
            id: 'tx-nov-opex',
            entryDate: '2026-11-10',
            kind: 'opex',
            amount: 120_000_000,
            budgetItemId: 'bgt-opex-1',
          },
        ],
        opexBudgetItems: [
          ...baseReportInput.opexBudgetItems,
          {
            id: 'bgt-opex-nov',
            name: 'Opex November',
            budget: 50_000_000,
            actual: 50_000_000,
            periodMonth: '2026-11',
          },
        ],
        receivables: [
          ...baseReportInput.receivables,
          {
            id: 'ar-nov-1',
            partyId: 'cli-gamma',
            partyName: 'PT Gamma',
            dueDate: '2026-12-01',
            issuedDate: '2026-11-05',
            outstandingAmount: 300_000_000,
          },
        ],
        payables: [
          ...baseReportInput.payables,
          {
            id: 'ap-nov-1',
            partyId: 'sup-nov',
            partyName: 'PT Besi Nov',
            dueDate: '2026-11-30',
            issuedDate: '2026-11-08',
            outstandingAmount: 200_000_000,
          },
        ],
      };

      const lockedReportWithNovNoise = buildBoardMonthlyReport(inputWithNovemberNoise);

      // Angka eksekutif, KPI, lampiran, dan dividen wajib 100% terisolasi & tidak berubah!
      expect(lockedReportWithNovNoise.asOfDate).toBe('2026-10-31');
      expect(lockedReportWithNovNoise.pageOne).toEqual(lockedReportOnlyOct.pageOne);
      expect(lockedReportWithNovNoise.appendix).toEqual(lockedReportOnlyOct.appendix);
      expect(lockedReportWithNovNoise.periodIntegrity.includedEntryCount).toBe(
        lockedReportOnlyOct.periodIntegrity.includedEntryCount,
      );
      expect(lockedReportWithNovNoise.periodIntegrity.excludedOutOfPeriodCount).toBe(4);
    });

    it('melakukan escape HTML untuk karakter berbahaya & menandai batas tepat varians 10%', () => {
      const budgetBoundary = computeBudgetVsActual({
        periodLabel: 'Oktober 2026',
        granularity: 'monthly',
        opexItems: [
          { id: 'b-10', name: 'Sewa Kantor', budget: 10_000_000, actual: 11_000_000 }, // tepat +10%
        ],
        projectItems: [],
      });
      expect(budgetBoundary.opexItems[0].isSignificantVariance).toBe(true);
      expect(budgetBoundary.opexItems[0].status).toBe('over_budget');
      expect(budgetBoundary.opexItems[0].explanation).toContain('+10%');

      const xssReport = buildBoardMonthlyReport({
        ...baseReportInput,
        orgName: 'PT <script>alert(1)</script> Maju',
      });
      const html = renderBoardReportPdfHtml(xssReport);
      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    });
  });
});
