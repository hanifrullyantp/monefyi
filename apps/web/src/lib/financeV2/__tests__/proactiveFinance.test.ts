import { describe, expect, it } from 'vitest';
import {
  AGING_BUCKET_KEYS,
  computeAgingSchedule,
  evaluateMonthCloseChecklist,
  evaluateProjectProactiveAlerts,
  scoreClientCollectionRisk,
} from '../../../../../../packages/domain/src/proactiveFinance';

describe('G2-1: Domain Proaktif — Aging, Risiko Klien, Peringatan Proyek, & Checklist Tutup Bulan', () => {
  describe('computeAgingSchedule', () => {
    it('mengelompokkan piutang ke tepat 5 bucket dengan integer rupiah & ringkasan per partyId', () => {
      const asOfDate = '2026-11-30';
      const result = computeAgingSchedule(
        [
          {
            id: 'inv-cur',
            kind: 'receivable',
            partyId: 'party-ana',
            partyName: 'Bu Ana',
            projectId: 'proj-1',
            dueDate: '2026-11-30', // 0 hari -> current
            outstandingAmount: 10_000_000.4,
          },
          {
            id: 'inv-1-30',
            kind: 'receivable',
            partyId: 'party-ana',
            partyName: 'Bu Ana',
            projectId: 'proj-1',
            dueDate: '2026-10-31', // 30 hari -> days_1_30
            outstandingAmount: 5_000_000,
          },
          {
            id: 'inv-31-60',
            kind: 'receivable',
            partyId: 'party-budi',
            partyName: 'Pak Budi',
            projectId: 'proj-2',
            dueDate: '2026-10-01', // 60 hari -> days_31_60
            outstandingAmount: 7_500_000,
          },
          {
            id: 'inv-61-90',
            kind: 'receivable',
            partyId: 'party-budi',
            partyName: 'Pak Budi',
            projectId: 'proj-2',
            dueDate: '2026-09-01', // 90 hari -> days_61_90
            outstandingAmount: 3_000_000,
          },
          {
            id: 'inv-over-90',
            kind: 'receivable',
            partyId: 'party-citra',
            partyName: 'PT Citra',
            projectId: 'proj-3',
            dueDate: '2026-08-31', // 91 hari -> over_90
            outstandingAmount: 12_000_000,
          },
          {
            id: 'inv-paid-zero',
            kind: 'receivable',
            partyId: 'party-citra',
            partyName: 'PT Citra',
            dueDate: '2026-08-01',
            outstandingAmount: 0,
          },
        ],
        asOfDate,
      );

      expect(AGING_BUCKET_KEYS).toEqual([
        'current',
        'days_1_30',
        'days_31_60',
        'days_61_90',
        'over_90',
      ]);

      expect(result.kind).toBe('receivable');
      expect(result.buckets).toEqual({
        current: 10_000_000,
        days_1_30: 5_000_000,
        days_31_60: 7_500_000,
        days_61_90: 3_000_000,
        over_90: 12_000_000,
      });
      expect(result.bucketCounts).toEqual({
        current: 1,
        days_1_30: 1,
        days_31_60: 1,
        days_61_90: 1,
        over_90: 1,
      });
      expect(result.totalOutstanding).toBe(37_500_000);
      expect(result.totalOverdue).toBe(27_500_000);
      expect(Number.isInteger(result.totalOutstanding)).toBe(true);
      expect(Number.isInteger(result.totalOverdue)).toBe(true);

      expect(result.byParty).toHaveLength(3);
      const ana = result.byParty.find((p) => p.partyId === 'party-ana');
      expect(ana).toMatchObject({
        partyId: 'party-ana',
        partyName: 'Bu Ana',
        itemCount: 2,
        totalOutstanding: 15_000_000,
        totalOverdue: 5_000_000,
        maxDaysOverdue: 30,
      });

      const citra = result.byParty.find((p) => p.partyId === 'party-citra');
      expect(citra).toMatchObject({
        partyId: 'party-citra',
        itemCount: 1,
        totalOutstanding: 12_000_000,
        totalOverdue: 12_000_000,
        maxDaysOverdue: 91,
      });

      expect(result.provenance).toEqual({
        asOfDate: '2026-11-30',
        itemCount: 5,
        kind: 'receivable',
      });
    });

    it('mendukung hutang (payable) di semua 5 bucket & menolak campuran receivable+payable', () => {
      const payableResult = computeAgingSchedule(
        [
          {
            id: 'ap-1',
            partyId: 'sup-semen',
            partyName: 'TB Jaya',
            dueDate: '2026-12-05',
            outstandingAmount: 4_000_000,
          },
          {
            id: 'ap-2',
            partyId: 'sup-semen',
            partyName: 'TB Jaya',
            dueDate: '2026-11-29', // 1 hari -> days_1_30
            outstandingAmount: 2_000_000,
          },
          {
            id: 'ap-3',
            partyId: 'sup-besi',
            partyName: 'CV Besi Kuat',
            dueDate: '2026-10-30', // 31 hari -> days_31_60
            outstandingAmount: 6_000_000,
          },
          {
            id: 'ap-4',
            partyId: 'sup-besi',
            partyName: 'CV Besi Kuat',
            dueDate: '2026-09-30', // 61 hari -> days_61_90
            outstandingAmount: 3_500_000,
          },
          {
            id: 'ap-5',
            partyId: 'sup-kayu',
            partyName: 'UD Kayu Mas',
            dueDate: '2026-08-15', // > 90 hari -> over_90
            outstandingAmount: 8_000_000,
          },
        ],
        '2026-11-30',
        { kind: 'payable' },
      );

      expect(payableResult.kind).toBe('payable');
      expect(payableResult.buckets).toEqual({
        current: 4_000_000,
        days_1_30: 2_000_000,
        days_31_60: 6_000_000,
        days_61_90: 3_500_000,
        over_90: 8_000_000,
      });
      expect(payableResult.totalOutstanding).toBe(23_500_000);
      expect(payableResult.totalOverdue).toBe(19_500_000);
      expect(payableResult.provenance).toEqual({
        asOfDate: '2026-11-30',
        itemCount: 5,
        kind: 'payable',
      });

      expect(() =>
        computeAgingSchedule(
          [
            {
              id: 'mix-1',
              kind: 'receivable',
              partyId: 'p-1',
              partyName: 'P1',
              dueDate: '2026-11-01',
              outstandingAmount: 1_000_000,
            },
            {
              id: 'mix-2',
              kind: 'payable',
              partyId: 'p-2',
              partyName: 'P2',
              dueDate: '2026-11-01',
              outstandingAmount: 1_000_000,
            },
          ],
          '2026-11-30',
        ),
      ).toThrow();
    });
  });

  describe('scoreClientCollectionRisk', () => {
    it('memberi skor rendah (low) untuk klien yang selalu membayar tepat waktu', () => {
      const result = scoreClientCollectionRisk({
        partyId: 'client-disiplin',
        partyName: 'PT Disiplin Sejahtera',
        asOfDate: '2026-11-30',
        currentOpenReceivables: 25_000_000,
        paymentHistory: [
          { invoiceId: 'INV-01', dueDate: '2026-08-15', paidDate: '2026-08-14', amount: 20_000_000 },
          { invoiceId: 'INV-02', dueDate: '2026-09-15', paidDate: '2026-09-15', amount: 30_000_000 },
          { invoiceId: 'INV-03', dueDate: '2026-10-15', paidDate: '2026-10-10', amount: 15_000_000 },
          { invoiceId: 'INV-04', dueDate: '2026-12-15', paidDate: null, amount: 25_000_000 }, // belum jatuh tempo
        ],
      });

      expect(result.latePaymentRate).toBe(0);
      expect(result.avgDaysLate).toBe(0);
      expect(result.maxDaysOverdue).toBe(0);
      expect(result.overdueRatio).toBe(0);
      expect(result.score).toBe(0);
      expect(result.riskBand).toBe('low');
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.provenance).toMatchObject({
        asOfDate: '2026-11-30',
        partyId: 'client-disiplin',
        historyCount: 4,
        observedDueCount: 3,
        openHistoryCount: 1,
        currentOpenReceivables: 25_000_000,
        overdueAmount: 0,
      });
    });

    it('memberi skor high/critical untuk klien yang sering telat dan memiliki overdue > 60 hari', () => {
      const result = scoreClientCollectionRisk({
        partyId: 'client-berisiko',
        partyName: 'CV Telat Terus',
        asOfDate: '2026-11-30',
        currentOpenReceivables: 60_000_000,
        paymentHistory: [
          { invoiceId: 'INV-11', dueDate: '2026-06-01', paidDate: '2026-07-15', amount: 30_000_000 }, // telat 44 hari
          { invoiceId: 'INV-12', dueDate: '2026-07-01', paidDate: '2026-08-20', amount: 25_000_000 }, // telat 50 hari
          { invoiceId: 'INV-13', dueDate: '2026-08-01', paidDate: '2026-08-01', amount: 10_000_000 }, // tepat waktu
          { invoiceId: 'INV-14', dueDate: '2026-09-10', paidDate: null, amount: 45_000_000 }, // overdue 81 hari
          { invoiceId: 'INV-15', dueDate: '2026-12-10', paidDate: null, amount: 15_000_000 }, // belum jatuh tempo
        ],
      });

      expect(result.latePaymentRate).toBe(0.75);
      expect(result.avgDaysLate).toBeGreaterThan(40);
      expect(result.maxDaysOverdue).toBe(81);
      expect(result.overdueRatio).toBe(0.75);
      expect(result.score).toBeGreaterThanOrEqual(75);
      expect(['high', 'critical']).toContain(result.riskBand);
      expect(result.riskBand).toBe('critical');
      expect(result.reasons.some((r) => r.includes('81 hari'))).toBe(true);
      expect(result.provenance.overdueAmount).toBe(45_000_000);
    });
  });

  describe('evaluateProjectProactiveAlerts', () => {
    it('mendeteksi project_over_budget, project_cash_low, dan dp_received_zero_progress secara tepat', () => {
      const result = evaluateProjectProactiveAlerts(
        [
          {
            projectId: 'p-over',
            projectName: 'Renovasi Kantor Selatan',
            status: 'active',
            rapBudget: 100_000_000,
            realizedCost: 112_000_000, // > 100% -> critical
            projectCashBalance: 12_000_000,
            dpReceivedBalance: 0,
            progressPct: 85,
          },
          {
            projectId: 'p-near-and-cash',
            projectName: 'Ruko Melati',
            status: 'active',
            rapBudget: 100_000_000,
            realizedCost: 92_000_000, // 92% -> warning over_budget; sisa RAP 8jt (15%=1.2jt), min 5jt
            projectCashBalance: 3_500_000, // < 5jt -> warning project_cash_low
            dpReceivedBalance: 0,
            progressPct: 80,
          },
          {
            projectId: 'p-cash-ratio',
            projectName: 'Gudang Cikarang',
            status: 'active',
            rapBudget: 200_000_000,
            realizedCost: 100_000_000, // sisa RAP 100jt -> 15% = 15jt
            projectCashBalance: 10_000_000, // >= 5jt tapi < 15jt -> warning project_cash_low
            dpReceivedBalance: 0,
            progressPct: 50,
          },
          {
            projectId: 'p-dp-zero',
            projectName: 'Rumah Pak Hendra',
            status: 'active',
            rapBudget: 150_000_000,
            realizedCost: 0,
            projectCashBalance: 45_000_000,
            dpReceivedBalance: 45_000_000, // DP masuk > 0 tetapi progressPct 0
            progressPct: 0,
          },
        ],
        '2026-11-30',
      );

      expect(result.summary.totalProjects).toBe(4);
      expect(result.summary.projectsWithAlerts).toBe(4);
      expect(result.provenance).toEqual({
        asOfDate: '2026-11-30',
        projectCount: 4,
        evaluator: 'deterministic_project_alerts_v1',
      });

      const overCritical = result.alerts.find(
        (a) => a.projectId === 'p-over' && a.code === 'project_over_budget',
      );
      expect(overCritical).toMatchObject({
        severity: 'critical',
        metrics: {
          rapBudget: 100_000_000,
          realizedCost: 112_000_000,
          overAmount: 12_000_000,
          utilizationPct: 112,
        },
      });

      const nearWarn = result.alerts.find(
        (a) => a.projectId === 'p-near-and-cash' && a.code === 'project_over_budget',
      );
      expect(nearWarn?.severity).toBe('warning');

      const cashLowMin = result.alerts.find(
        (a) => a.projectId === 'p-near-and-cash' && a.code === 'project_cash_low',
      );
      expect(cashLowMin?.severity).toBe('warning');

      const cashLowRatio = result.alerts.find(
        (a) => a.projectId === 'p-cash-ratio' && a.code === 'project_cash_low',
      );
      expect(cashLowRatio).toMatchObject({
        severity: 'warning',
        metrics: {
          projectCashBalance: 10_000_000,
          remainingRap: 100_000_000,
          ratioThresholdAmount: 15_000_000,
        },
      });

      const dpZero = result.alerts.find(
        (a) => a.projectId === 'p-dp-zero' && a.code === 'dp_received_zero_progress',
      );
      expect(dpZero).toMatchObject({
        severity: 'warning',
        metrics: {
          dpReceivedBalance: 45_000_000,
          progressPct: 0,
        },
      });
    });

    it('menghasilkan 0 alert untuk proyek sehat dan tidak memicu kas menipis pada proyek selesai', () => {
      const result = evaluateProjectProactiveAlerts(
        [
          {
            projectId: 'p-sehat',
            projectName: 'Villa Ubud',
            status: 'active',
            rapBudget: 200_000_000,
            realizedCost: 100_000_000, // 50% RAP, sisa 100jt (15% = 15jt)
            projectCashBalance: 30_000_000, // >= 15jt dan >= 5jt
            dpReceivedBalance: 50_000_000,
            progressPct: 55,
          },
          {
            projectId: 'p-selesai',
            projectName: 'Ruko Lama',
            status: 'completed',
            rapBudget: 80_000_000,
            realizedCost: 70_000_000,
            projectCashBalance: 0, // proyek selesai tidak memicu project_cash_low
            dpReceivedBalance: 0,
            progressPct: 100,
          },
        ],
        '2026-11-30',
      );

      expect(result.alerts).toEqual([]);
      expect(result.summary).toEqual({
        totalProjects: 2,
        projectsWithAlerts: 0,
        totalAlerts: 0,
        criticalCount: 0,
        warningCount: 0,
      });
    });
  });

  describe('evaluateMonthCloseChecklist', () => {
    it('menghasilkan readyToClose = true bila semua 6 butir lengkap tanpa pemblokir', () => {
      const result = evaluateMonthCloseChecklist({
        periodMonth: '2026-11',
        asOfDate: '2026-11-30',
        receipts: {
          requiredCount: 18,
          attachedCount: 18,
        },
        bankWallets: [
          {
            walletId: 'kas-bca',
            walletName: 'BCA Operasional',
            status: 'reconciled',
            unexplainedDifference: 0,
          },
          {
            walletId: 'kas-tunai',
            walletName: 'Kas Kecil',
            status: 'reconciled',
            unexplainedDifference: 0,
          },
        ],
        accruals: {
          reviewed: true,
          pendingAccrualCount: 0,
          unrecognizedEligibleDpCount: 0,
        },
        depreciation: {
          activeAssetCount: 4,
          postedAssetCount: 4,
          postedJournalCount: 4,
        },
        opexVsPlan: {
          planAmount: 15_000_000,
          realizedAmount: 14_200_000,
          reviewed: true,
        },
        needsReviewCount: 0,
      });

      expect(result.periodMonth).toBe('2026-11');
      expect(result.readyToClose).toBe(true);
      expect(result.items).toHaveLength(6);
      expect(result.items.map((i) => i.code)).toEqual([
        'receipts_complete',
        'bank_reconciled',
        'accruals_reviewed',
        'depreciation_posted',
        'opex_vs_plan_reviewed',
        'zero_needs_review',
      ]);
      expect(result.items.every((i) => i.status === 'pass' && i.blockingCount === 0)).toBe(true);
      expect(result.opexVariance).toEqual({
        planAmount: 15_000_000,
        realizedAmount: 14_200_000,
        varianceAmount: -800_000,
        variancePct: -5.33,
      });
      expect(result.summary).toEqual({
        totalChecks: 6,
        passCount: 6,
        warnCount: 0,
        blockCount: 0,
        totalBlockingCount: 0,
      });
      expect(result.provenance).toMatchObject({
        periodMonth: '2026-11',
        periodStart: '2026-11-01',
        asOfDate: '2026-11-30',
        checklistVersion: 'deterministic_month_close_v1',
      });
    });

    it('menghasilkan readyToClose = false dengan butir block jelas saat bank belum rekonsiliasi atau ada needs_review > 0', () => {
      const bankBlocked = evaluateMonthCloseChecklist({
        periodMonth: '2026-11',
        receipts: { requiredCount: 5, attachedCount: 5 },
        bankWallets: [
          {
            walletId: 'kas-mandiri',
            walletName: 'Mandiri Giro',
            status: 'needs_review',
            unexplainedDifference: 250_000,
          },
        ],
        accruals: { reviewed: true },
        depreciation: { activeAssetCount: 0, postedAssetCount: 0 },
        opexVsPlan: { planAmount: 10_000_000, realizedAmount: 10_500_000 },
        needsReviewCount: 0,
      });

      expect(bankBlocked.readyToClose).toBe(false);
      const bankItem = bankBlocked.items.find((i) => i.code === 'bank_reconciled');
      expect(bankItem).toMatchObject({
        code: 'bank_reconciled',
        status: 'block',
        blockingCount: 1,
      });

      const reviewBlocked = evaluateMonthCloseChecklist({
        periodMonth: '2026-11',
        receipts: { requiredCount: 5, attachedCount: 3, missingReceiptEntryIds: ['e-1', 'e-2'] },
        bankWallets: [
          {
            walletId: 'kas-bca',
            walletName: 'BCA',
            status: 'reconciled',
            unexplainedDifference: 0,
          },
        ],
        accruals: { reviewed: false, pendingAccrualCount: 2 },
        depreciation: { activeAssetCount: 3, postedAssetCount: 1 },
        opexVsPlan: { planAmount: 10_000_000, realizedAmount: 9_000_000 },
        needsReviewCount: 4,
      });

      expect(reviewBlocked.readyToClose).toBe(false);
      expect(reviewBlocked.summary.blockCount).toBe(4);
      expect(reviewBlocked.items.find((i) => i.code === 'receipts_complete')).toMatchObject({
        status: 'block',
        blockingCount: 2,
      });
      expect(reviewBlocked.items.find((i) => i.code === 'accruals_reviewed')).toMatchObject({
        status: 'block',
        blockingCount: 2,
      });
      expect(reviewBlocked.items.find((i) => i.code === 'depreciation_posted')).toMatchObject({
        status: 'block',
        blockingCount: 2,
      });
      expect(reviewBlocked.items.find((i) => i.code === 'zero_needs_review')).toMatchObject({
        status: 'block',
        blockingCount: 4,
      });
    });
  });
});
