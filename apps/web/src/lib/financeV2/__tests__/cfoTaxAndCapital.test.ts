import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  buildAnnualScenarioPlan,
  buildLoanAmortizationSchedule,
  buildScheduledDepreciationPlan,
  calculateTaxDraftAndCalendar,
  DEFAULT_CAPITALIZATION_THRESHOLD_RUPIAH,
  evaluateAssetCapitalization,
  evaluateWorkingCapitalFundingNeed,
  TAX_DRAFT_DISCLAIMER,
  type TaxProfileConfig,
} from '@domain/cfoTaxAndCapital';
import { forecastCashFlow13Weeks } from '@domain/financialAdvisor';
import { linesAreBalanced } from '@domain/journal';

const REPO_ROOT = resolve(fileURLToPath(new URL('../../../../../..', import.meta.url)));
const MIGRATION_PATH = resolve(
  REPO_ROOT,
  'my-supabase-project/supabase/migrations/20261124170000_g4_cfo_tax_config_and_loans.sql',
);

function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ');
}

describe('G4-2: Modul Pajak Konfigurabel, Aset Tetap & Penyusutan, Pendanaan, & Skenario Tahunan', () => {
  describe('1. calculateTaxDraftAndCalendar (Pajak Konfigurabel tanpa Hardcode)', () => {
    it('mengikuti tarif dan kalender dari TaxProfileConfig (2.65% vs 1.75% vs PPh Badan 22% + PPN)', () => {
      const baseConfig: TaxProfileConfig = {
        profileCode: 'KONSTRUKSI-BUJPK-MENENGAH',
        effectiveFrom: '2026-01-01',
        regulationRef: 'PP-9-2022',
        verifiedAt: '2026-09-01',
        isPkp: true,
        ppnRatePct: 11,
        incomeTaxRegime: 'pph_final_konstruksi',
        incomeTaxRatePct: 2.65,
        paymentDueDayOfNextMonth: 15,
        filingDueDayOfNextMonth: 20,
      };

      const draft265 = calculateTaxDraftAndCalendar({
        periodMonth: '2026-10',
        revenueTaxable: 200_000_000,
        pkpEstimated: 40_000_000,
        ppnInputCredit: 15_000_000,
        taxConfig: baseConfig,
        asOfDate: '2026-10-31',
      });

      expect(draft265.status).toBe('draft_ready');
      expect(draft265.disclaimer).toBe(TAX_DRAFT_DISCLAIMER);
      expect(draft265.disclaimer).toContain('Draf untuk ditinjau konsultan pajak');
      expect(draft265.provenance.disclaimer).toBe(TAX_DRAFT_DISCLAIMER);
      expect(draft265.ppnOutput).toBe(22_000_000); // 11% * 200jt
      expect(draft265.ppnInputCredit).toBe(15_000_000);
      expect(draft265.ppnNetPayable).toBe(7_000_000);
      expect(draft265.ppnPayable).toBe(7_000_000);
      expect(draft265.ppnOverpayment).toBe(0);
      expect(draft265.pphAmount).toBe(5_300_000); // 2.65% * 200jt
      expect(draft265.totalCashTaxLiability).toBe(12_300_000);
      expect(draft265.verificationStatus).toBe('verified');
      expect(draft265.warnings).toEqual([]);
      expect(draft265.calendar).toEqual([
        { taxType: 'pph_final_konstruksi', dueDate: '2026-11-15', action: 'setor', estimatedAmount: 5_300_000 },
        { taxType: 'ppn', dueDate: '2026-11-15', action: 'setor', estimatedAmount: 7_000_000 },
        { taxType: 'pph_final_konstruksi', dueDate: '2026-11-20', action: 'lapor', estimatedAmount: 5_300_000 },
        { taxType: 'ppn', dueDate: '2026-11-20', action: 'lapor', estimatedAmount: 7_000_000 },
      ]);

      // Ubah konfigurasi -> PPh Final Konstruksi Kualifikasi Kecil 1.75%, PPN 12%, tanggal setor 10, lapor 30
      const draft175 = calculateTaxDraftAndCalendar({
        periodMonth: '2026-12',
        revenueTaxable: 200_000_000,
        pkpEstimated: 40_000_000,
        ppnInputCredit: 26_000_000, // Lebih bayar 2jt (24jt - 26jt)
        taxConfig: {
          ...baseConfig,
          profileCode: 'KONSTRUKSI-KECIL',
          ppnRatePct: 12,
          incomeTaxRatePct: 1.75,
          paymentDueDayOfNextMonth: 10,
          filingDueDayOfNextMonth: 30,
        },
        asOfDate: '2026-12-31',
      });

      expect(draft175.pphAmount).toBe(3_500_000); // 1.75% * 200jt
      expect(draft175.ppnOutput).toBe(24_000_000); // 12% * 200jt
      expect(draft175.ppnNetPayable).toBe(-2_000_000); // Lebih bayar
      expect(draft175.ppnPayable).toBe(0);
      expect(draft175.ppnOverpayment).toBe(2_000_000);
      // Desember 2026 -> jatuh tempo Januari 2027
      expect(draft175.calendar).toEqual([
        { taxType: 'pph_final_konstruksi', dueDate: '2027-01-10', action: 'setor', estimatedAmount: 3_500_000 },
        { taxType: 'ppn', dueDate: '2027-01-10', action: 'setor', estimatedAmount: 0 },
        { taxType: 'pph_final_konstruksi', dueDate: '2027-01-30', action: 'lapor', estimatedAmount: 3_500_000 },
        { taxType: 'ppn', dueDate: '2027-01-30', action: 'lapor', estimatedAmount: 0 },
      ]);

      // Ubah rezim ke PPh Badan 22% atas pkpEstimated, Non-PKP
      const draftBadan = calculateTaxDraftAndCalendar({
        periodMonth: '2026-01',
        revenueTaxable: 200_000_000,
        pkpEstimated: 40_000_000,
        ppnInputCredit: 5_000_000,
        taxConfig: {
          ...baseConfig,
          profileCode: 'PPH-BADAN-UMUM',
          isPkp: false,
          ppnRatePct: null,
          incomeTaxRegime: 'pph_badan',
          incomeTaxRatePct: 22,
          paymentDueDayOfNextMonth: 15,
          filingDueDayOfNextMonth: 31, // Februari 2026 -> dibatasi 2026-02-28
          verifiedAt: '2026-01-10',
        },
        asOfDate: '2026-01-31',
      });

      expect(draftBadan.status).toBe('draft_ready');
      expect(draftBadan.ppnOutput).toBe(0);
      expect(draftBadan.ppnInputCredit).toBe(0);
      expect(draftBadan.pphTaxBase).toBe(40_000_000);
      expect(draftBadan.pphAmount).toBe(8_800_000); // 22% * 40jt
      expect(draftBadan.calendar).toEqual([
        { taxType: 'pph_badan', dueDate: '2026-02-15', action: 'setor', estimatedAmount: 8_800_000 },
        { taxType: 'pph_badan', dueDate: '2026-02-28', action: 'lapor', estimatedAmount: 8_800_000 },
      ]);
    });

    it('mengembalikan peringatan config_required tanpa menebak tarif saat konfigurasi kosong atau belum lengkap', () => {
      const missingAll = calculateTaxDraftAndCalendar({
        periodMonth: '2026-10',
        revenueTaxable: 150_000_000,
        taxConfig: null,
      });

      expect(missingAll.status).toBe('config_required');
      expect(missingAll.warningCodes).toContain('config_required');
      expect(missingAll.warnings.some((w) => w.includes('config_required'))).toBe(true);
      expect(missingAll.pphAmount).toBe(0);
      expect(missingAll.ppnOutput).toBe(0);
      expect(missingAll.calendar).toEqual([]);
      expect(missingAll.disclaimer).toBe(TAX_DRAFT_DISCLAIMER);

      const missingPpnRate = calculateTaxDraftAndCalendar({
        periodMonth: '2026-10',
        revenueTaxable: 150_000_000,
        taxConfig: {
          profileCode: 'BELUM-LENGKAP',
          effectiveFrom: '2026-01-01',
          regulationRef: 'DRAFT',
          verifiedAt: '2026-10-01',
          isPkp: true,
          ppnRatePct: null,
          incomeTaxRegime: 'pph_final_konstruksi',
          incomeTaxRatePct: null,
          paymentDueDayOfNextMonth: 15,
          filingDueDayOfNextMonth: 20,
        },
      });

      expect(missingPpnRate.status).toBe('config_required');
      expect(missingPpnRate.missingConfigFields).toEqual(
        expect.arrayContaining(['ppnRatePct', 'incomeTaxRatePct']),
      );
      expect(missingPpnRate.warningCodes).toContain('config_required');
      expect(missingPpnRate.ppnOutput).toBe(0);
      expect(missingPpnRate.pphAmount).toBe(0);
    });

    it('mengeluarkan peringatan wajib verifikasi regulasi saat verifiedAt kosong atau > 180 hari', () => {
      const staleResult = calculateTaxDraftAndCalendar({
        periodMonth: '2026-10',
        revenueTaxable: 100_000_000,
        asOfDate: '2026-10-31',
        taxConfig: {
          profileCode: 'UMKM-05',
          effectiveFrom: '2025-01-01',
          regulationRef: 'PP-55-2022',
          verifiedAt: '2026-01-01', // > 300 hari sebelum 2026-10-31
          isPkp: false,
          incomeTaxRegime: 'pph_final_umkm',
          incomeTaxRatePct: 0.5,
          paymentDueDayOfNextMonth: 15,
          filingDueDayOfNextMonth: 20,
        },
      });

      expect(staleResult.verificationStatus).toBe('stale');
      expect(staleResult.daysSinceVerification).toBeGreaterThan(180);
      expect(staleResult.warningCodes).toContain('verification_stale');
      expect(
        staleResult.warnings.some((w) => w.includes('Wajib verifikasi tarif ke regulasi terkini')),
      ).toBe(true);

      const emptyVerifiedResult = calculateTaxDraftAndCalendar({
        periodMonth: '2026-10',
        revenueTaxable: 100_000_000,
        taxConfig: {
          profileCode: 'UMKM-05',
          effectiveFrom: '2025-01-01',
          regulationRef: 'PP-55-2022',
          verifiedAt: null,
          isPkp: false,
          incomeTaxRegime: 'pph_final_umkm',
          incomeTaxRatePct: 0.5,
          paymentDueDayOfNextMonth: 15,
          filingDueDayOfNextMonth: 20,
        },
      });

      expect(emptyVerifiedResult.verificationStatus).toBe('missing');
      expect(emptyVerifiedResult.warningCodes).toContain('verification_missing');
      expect(
        emptyVerifiedResult.warnings.some((w) =>
          w.includes('Wajib verifikasi tarif ke regulasi terkini'),
        ),
      ).toBe(true);
    });
  });

  describe('2. evaluateAssetCapitalization & buildScheduledDepreciationPlan', () => {
    it('mengevaluasi ambang kapitalisasi default (5jt D-F1-02) dan ambang custom serta masa manfaat > 12 bulan', () => {
      expect(DEFAULT_CAPITALIZATION_THRESHOLD_RUPIAH).toBe(5_000_000);

      const assetQualifies = evaluateAssetCapitalization({
        id: 'ast-molen',
        name: 'Mesin Molen Beton',
        acquisitionCostRupiah: 8_500_000,
        usefulLifeMonths: 36,
      });
      expect(assetQualifies.decision).toBe('capitalize_fixed_asset');
      expect(assetQualifies.recommendedAccountRole).toBe('aktiva_tetap');

      const shortLifeAsset = evaluateAssetCapitalization({
        name: 'Terpal Proyek Besar',
        acquisitionCostRupiah: 6_000_000,
        usefulLifeMonths: 12, // tidak > 12 bulan
      });
      expect(shortLifeAsset.decision).toBe('expense_opex');
      expect(shortLifeAsset.recommendedAccountRole).toBe('beban_opex');

      // Ambang dapat dikonfigurasi menjadi 10jt -> 8.5jt menjadi opex
      const customThreshold = evaluateAssetCapitalization(
        {
          name: 'Mesin Molen Beton',
          acquisitionCostRupiah: 8_500_000,
          usefulLifeMonths: 36,
        },
        10_000_000,
      );
      expect(customThreshold.capitalizationThresholdRupiah).toBe(10_000_000);
      expect(customThreshold.decision).toBe('expense_opex');
    });

    it('menghitung penyusutan garis lurus seimbang tanpa melewati residualValue dan menolak periode terkunci', () => {
      const assets = [
        {
          assetId: 'ast-1',
          assetName: 'Excavator Mini',
          acquisitionCostRupiah: 130_000_000,
          residualValueRupiah: 10_000_000,
          usefulLifeMonths: 60, // (130jt - 10jt) / 60 = 2.000.000 / bulan
          accumulatedDepreciationRupiah: 20_000_000, // bookValue = 110jt
          acquisitionDate: '2025-12-01',
          status: 'active',
        },
        {
          assetId: 'ast-2',
          assetName: 'Laptop Teknik',
          acquisitionCostRupiah: 14_000_000,
          residualValueRupiah: 2_000_000,
          usefulLifeMonths: 24, // 500.000 / bulan, sisa di atas residu tinggal 300.000!
          bookValueRupiah: 2_300_000,
          acquisitionDate: '2024-11-01',
          status: 'active',
        },
        {
          assetId: 'ast-3',
          assetName: 'Printer Lama (Sudah Habis)',
          acquisitionCostRupiah: 6_000_000,
          residualValueRupiah: 500_000,
          usefulLifeMonths: 24,
          bookValueRupiah: 500_000, // sudah sama dengan residu -> dilewati
          status: 'active',
        },
      ];

      // Penolakan tegas bila periodMonth masuk lockedPeriods
      const lockedRejection = buildScheduledDepreciationPlan(assets, '2026-10', ['2026-09', '2026-10-01']);
      expect(lockedRejection.ok).toBe(false);
      expect(lockedRejection.reason).toBe('periode_terkunci');
      expect(lockedRejection.entries).toEqual([]);
      expect(lockedRejection.totalDepreciationRupiah).toBe(0);

      // Periode terbuka (2026-11) berhasil menyusun jurnal seimbang
      const openPlan = buildScheduledDepreciationPlan(assets, '2026-11', ['2026-09', '2026-10']);
      expect(openPlan.ok).toBe(true);
      expect(openPlan.reason).toBe('ok');
      expect(openPlan.entries).toHaveLength(2);
      expect(openPlan.skippedAssetIds).toEqual(['ast-3']);
      expect(openPlan.totalDepreciationRupiah).toBe(2_300_000);

      const exc = openPlan.entries.find((e) => e.assetId === 'ast-1');
      expect(exc?.depreciationAmountRupiah).toBe(2_000_000);
      expect(exc?.endingBookValueRupiah).toBe(108_000_000);
      expect(exc?.journalLines).toEqual([
        { role: 'beban_penyusutan', debit: 2_000_000, credit: 0 },
        { role: 'akumulasi_penyusutan', debit: 0, credit: 2_000_000 },
      ]);
      expect(linesAreBalanced(exc!.journalLines)).toBe(true);

      const laptop = openPlan.entries.find((e) => e.assetId === 'ast-2');
      // Dibatasi 300.000 agar endingBookValue tidak turun di bawah residualValue (2.000.000)
      expect(laptop?.depreciationAmountRupiah).toBe(300_000);
      expect(laptop?.endingBookValueRupiah).toBe(2_000_000);
      expect(linesAreBalanced(laptop!.journalLines)).toBe(true);
    });
  });

  describe('3. buildLoanAmortizationSchedule & evaluateWorkingCapitalFundingNeed', () => {
    it('menghasilkan jadwal amortisasi dengan sisa pokok akhir === 0 dan dampak arus kas akurat', () => {
      const loanPlan = buildLoanAmortizationSchedule({
        loanId: 'loan-kmk-1',
        lenderName: 'Bank Mandiri KMK',
        principalRupiah: 120_000_000,
        annualInterestRatePct: 12, // 1% per bulan
        tenorMonths: 12,
        startDate: '2026-10-01',
      });

      expect(loanPlan.schedule).toHaveLength(12);
      expect(loanPlan.endingBalanceRupiah).toBe(0);
      expect(loanPlan.schedule[11].endingBalanceRupiah).toBe(0);
      expect(loanPlan.totalPrincipalRupiah).toBe(120_000_000);
      expect(loanPlan.totalInterestRupiah).toBeGreaterThan(0);
      expect(loanPlan.totalPaymentRupiah).toBe(
        loanPlan.totalPrincipalRupiah + loanPlan.totalInterestRupiah,
      );
      expect(loanPlan.cashFlowImpact.totalOutflowRupiah).toBe(loanPlan.totalPaymentRupiah);
      expect(loanPlan.cashFlowImpact.firstPaymentDate).toBe('2026-11-01');
      expect(loanPlan.cashFlowImpact.lastPaymentDate).toBe('2027-10-01');

      // Uji bunga 0% (pinjaman lunak)
      const zeroInterestLoan = buildLoanAmortizationSchedule({
        lenderName: 'Pinjaman Mitra Tanpa Bunga',
        principalRupiah: 10_000_000,
        annualInterestRatePct: 0,
        tenorMonths: 3,
        startDate: '2026-01-31',
      });
      expect(zeroInterestLoan.totalInterestRupiah).toBe(0);
      expect(zeroInterestLoan.totalPrincipalRupiah).toBe(10_000_000);
      expect(zeroInterestLoan.schedule[2].endingBalanceRupiah).toBe(0);
      expect(zeroInterestLoan.schedule[0].dueDate).toBe('2026-02-28'); // Clamped akhir Februari
    });

    it('mendeteksi kapan & berapa modal kerja dibutuhkan saat minEndingCash < minCashBufferRupiah', () => {
      const forecastDeficit = forecastCashFlow13Weeks({
        asOfDate: '2026-11-01',
        openingCash: 45_000_000,
        monthlyOpexPlan: 26_000_000, // 6jt/minggu
        receivables: [
          { id: 'ar-late', dueDate: '2026-12-20', outstandingAmount: 80_000_000 },
        ],
        payables: [
          { id: 'ap-big', dueDate: '2026-11-18', outstandingAmount: 55_000_000 },
        ],
        scheduledProjectTermins: [],
      });

      const buffer = 25_000_000;
      const fundingNeed = evaluateWorkingCapitalFundingNeed(forecastDeficit, buffer);

      expect(fundingNeed.needsFunding).toBe(true);
      expect(fundingNeed.minCashBufferRupiah).toBe(buffer);
      expect(fundingNeed.baseMinEndingCashRupiah).toBeLessThan(buffer);
      expect(fundingNeed.neededByDate).not.toBeNull();
      expect(fundingNeed.firstShortfallWeekIndex).toBeGreaterThanOrEqual(1);
      expect(fundingNeed.recommendedFundingRupiah).toBe(
        buffer - fundingNeed.baseMinEndingCashRupiah,
      );
      expect(
        fundingNeed.baseMinEndingCashRupiah + fundingNeed.recommendedFundingRupiah,
      ).toBe(buffer);

      // Kasus kas aman di atas buffer
      const forecastSafe = forecastCashFlow13Weeks({
        asOfDate: '2026-11-01',
        openingCash: 200_000_000,
        monthlyOpexPlan: 13_000_000, // 3jt/minggu
        receivables: [],
        payables: [],
        scheduledProjectTermins: [],
      });
      const safeFunding = evaluateWorkingCapitalFundingNeed(forecastSafe, 50_000_000);
      expect(safeFunding.needsFunding).toBe(false);
      expect(safeFunding.recommendedFundingRupiah).toBe(0);
      expect(safeFunding.neededByDate).toBeNull();
    });
  });

  describe('4. buildAnnualScenarioPlan (12 Bulan x 3 Skenario)', () => {
    it('menghasilkan proyeksi 12 bulan x 3 skenario (conservative <= base <= growth) secara deterministik', () => {
      const input = {
        fiscalYear: 2027,
        openingCash: 150_000_000,
        baselineMonthlyRevenue: 200_000_000,
        baselineHppRatioPct: 60,
        baselineMonthlyOpex: 35_000_000,
        otherMonthlyExpense: 5_000_000,
        monthlyRevenueGrowthPct: 1.5,
        asOfDate: '2026-11-24',
      };

      const plan1 = buildAnnualScenarioPlan(input);
      const plan2 = buildAnnualScenarioPlan(input);
      expect(plan1).toEqual(plan2);

      expect(plan1.fiscalYear).toBe(2027);
      expect(plan1.scenarios.conservative.months).toHaveLength(12);
      expect(plan1.scenarios.base.months).toHaveLength(12);
      expect(plan1.scenarios.growth.months).toHaveLength(12);

      for (let i = 0; i < 12; i += 1) {
        const cons = plan1.scenarios.conservative.months[i];
        const base = plan1.scenarios.base.months[i];
        const growth = plan1.scenarios.growth.months[i];

        expect(cons.periodMonth).toBe(`2027-${String(i + 1).padStart(2, '0')}`);
        expect(cons.revenue).toBeLessThanOrEqual(base.revenue);
        expect(base.revenue).toBeLessThanOrEqual(growth.revenue);
        expect(cons.netProfit).toBeLessThanOrEqual(base.netProfit);
        expect(base.netProfit).toBeLessThanOrEqual(growth.netProfit);
        expect(cons.endingCash).toBeLessThanOrEqual(base.endingCash);
        expect(base.endingCash).toBeLessThanOrEqual(growth.endingCash);
      }

      expect(plan1.scenarios.conservative.annualSummary.totalNetProfit).toBeLessThanOrEqual(
        plan1.scenarios.base.annualSummary.totalNetProfit,
      );
      expect(plan1.scenarios.base.annualSummary.totalNetProfit).toBeLessThanOrEqual(
        plan1.scenarios.growth.annualSummary.totalNetProfit,
      );
      expect(plan1.provenance.period).toBe('2027-01..2027-12');
    });
  });

  describe('5. Uji Struktural SQL 20261124170000_g4_cfo_tax_config_and_loans.sql', () => {
    it('berlabel BLOCKED remote, memiliki tabel konfigurasi pajak & pinjaman, RLS is_org_member, dan bebas mutasi jurnal', () => {
      const rawSql = readFileSync(MIGRATION_PATH, 'utf8');
      expect(rawSql).toContain('BLOCKED remote');

      const sql = stripSqlComments(rawSql);
      expect(sql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+planner_org_tax_configs/i);
      expect(sql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+planner_financing_loans/i);
      expect(sql).toMatch(/UNIQUE\s*\(\s*org_id\s*\)/i);
      expect(sql).toMatch(/capitalization_threshold_rupiah/i);
      expect(sql).toMatch(/income_tax_regime/i);
      expect(sql).toMatch(/ppn_rate_pct/i);
      expect(sql).toMatch(/verified_at/i);

      // RLS ketat is_org_member pada kedua tabel
      expect(sql).toMatch(/ALTER\s+TABLE\s+planner_org_tax_configs\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
      expect(sql).toMatch(/ALTER\s+TABLE\s+planner_financing_loans\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
      expect(sql).toMatch(/is_org_member\s*\(\s*org_id\s*,\s*'worker'\s*\)/i);
      expect(sql).toMatch(/is_org_member\s*\(\s*org_id\s*,\s*'manager'\s*\)/i);

      // Bebas mutasi tabel jurnal
      expect(sql).not.toMatch(/\b(?:UPDATE|DELETE\s+FROM)\s+(?:public\.)?planner_journal_(?:entries|lines|allocations)\b/i);
    });
  });
});
