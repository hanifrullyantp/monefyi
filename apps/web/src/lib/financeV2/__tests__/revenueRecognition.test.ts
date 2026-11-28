import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpcMock, fromMock, postJournalEntryMock, ensureChartOfAccountsMock, findSystemAccountMock, loadAccountsByTypeMock } =
  vi.hoisted(() => ({
    rpcMock: vi.fn(),
    fromMock: vi.fn(),
    postJournalEntryMock: vi.fn(),
    ensureChartOfAccountsMock: vi.fn(),
    findSystemAccountMock: vi.fn(),
    loadAccountsByTypeMock: vi.fn(),
  }));

vi.mock('../../supabase', () => ({
  supabase: {
    rpc: rpcMock,
    from: fromMock,
  },
}));

vi.mock('../../../services/financeV2/journalService', () => ({
  postJournalEntry: postJournalEntryMock,
  createJournalEntry: postJournalEntryMock,
}));

vi.mock('../../../services/financeV2/accountService', () => ({
  ensureChartOfAccounts: ensureChartOfAccountsMock,
  findSystemAccount: findSystemAccountMock,
  loadAccountsByType: loadAccountsByTypeMock,
}));

import {
  buildJournalTemplate,
  FINANCE_EVENT_CODES,
  linesAreBalanced,
  recognizeDownPaymentRevenue,
} from '@domain/journal';
import {
  buildScheduledRecognitionPlan,
  computeRecognizableRevenue,
} from '@domain/revenueRecognition';
import {
  planMonthlyRevenueRecognition,
  postRevenueRecognition,
} from '../../../services/financeV2/revenueRecognitionService';

const REPO_ROOT = resolve(fileURLToPath(new URL('../../../../../..', import.meta.url)));
const MIGRATION_PATH = resolve(
  REPO_ROOT,
  'my-supabase-project/supabase/migrations/20261124144000_g0_5_revenue_recognition.sql',
);

function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ');
}

describe('G0-5: Pengakuan Pendapatan DP Berbasis Progres / Termin Terjadwal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('template jurnal dp_revenue_recognition menghasilkan Dr uang_muka_klien / Cr pendapatan_proyek seimbang', () => {
    expect(FINANCE_EVENT_CODES).toContain('dp_revenue_recognition');

    const lines = buildJournalTemplate('dp_revenue_recognition', 9_000_000.4);
    expect(lines).toEqual([
      { role: 'uang_muka_klien', debit: 9_000_000, credit: 0 },
      { role: 'pendapatan_proyek', debit: 0, credit: 9_000_000 },
    ]);
    expect(linesAreBalanced(lines)).toBe(true);
    expect(recognizeDownPaymentRevenue(0)).toEqual([]);
    expect(recognizeDownPaymentRevenue(-100_000)).toEqual([]);
  });

  it('mode progress_pct bertahap 0% -> 30% -> 75% -> 100% -> 120% mengakui tepat 1x DP tanpa over-recognition', () => {
    const dpReceivedTotal = 30_000_000;
    const contractValue = 100_000_000;
    const steps = [0, 30, 75, 100, 120];

    let dpAlreadyRecognized = 0;
    const recognizedPerStep: number[] = [];

    for (const progressPct of steps) {
      const res = computeRecognizableRevenue({
        method: 'progress_pct',
        contractValue,
        dpReceivedTotal,
        dpAlreadyRecognized,
        progressPct,
      });

      expect(Number.isInteger(res.recognizableAmount)).toBe(true);
      expect(Number.isInteger(res.remainingDpLiability)).toBe(true);
      expect(Number.isInteger(res.targetCumulative)).toBe(true);

      if (res.recognizableAmount > 0) {
        expect(linesAreBalanced(res.journalLines)).toBe(true);
        expect(res.journalLines).toEqual([
          { role: 'uang_muka_klien', debit: res.recognizableAmount, credit: 0 },
          { role: 'pendapatan_proyek', debit: 0, credit: res.recognizableAmount },
        ]);
      } else {
        expect(res.journalLines).toEqual([]);
      }

      recognizedPerStep.push(res.recognizableAmount);
      dpAlreadyRecognized += res.recognizableAmount;
      expect(dpAlreadyRecognized).toBeLessThanOrEqual(dpReceivedTotal);
      expect(res.remainingDpLiability).toBe(dpReceivedTotal - dpAlreadyRecognized);
    }

    expect(recognizedPerStep).toEqual([0, 9_000_000, 13_500_000, 7_500_000, 0]);
    expect(dpAlreadyRecognized).toBe(dpReceivedTotal);

    const finalCheck = computeRecognizableRevenue({
      method: 'progress_pct',
      contractValue,
      dpReceivedTotal,
      dpAlreadyRecognized,
      progressPct: 120,
    });
    expect(finalCheck.recognizableAmount).toBe(0);
    expect(finalCheck.remainingDpLiability).toBe(0);
    expect(finalCheck.targetCumulative).toBe(dpReceivedTotal);
  });

  it('mode termin mendukung persentase termin dan nominal eksplisit serta membatasi ke sisa kewajiban DP', () => {
    const dpReceivedTotal = 40_000_000;
    const contractValue = 120_000_000;

    // Default konservatif ketika method tidak diisi -> 'termin'
    const step1 = computeRecognizableRevenue({
      contractValue,
      dpReceivedTotal,
      dpAlreadyRecognized: 0,
      completedTerminPct: 25,
    });
    expect(step1.provenance.method).toBe('termin');
    expect(step1.provenance.basis).toBe('completed_termin_pct');
    expect(step1.recognizableAmount).toBe(10_000_000);
    expect(step1.remainingDpLiability).toBe(30_000_000);
    expect(linesAreBalanced(step1.journalLines)).toBe(true);

    // Termin berikutnya memakai nominal eksplisit Rp 18.000.000
    const step2 = computeRecognizableRevenue({
      method: 'termin',
      contractValue,
      dpReceivedTotal,
      dpAlreadyRecognized: 10_000_000,
      explicitTerminAmount: 18_000_000,
    });
    expect(step2.provenance.basis).toBe('explicit_termin');
    expect(step2.recognizableAmount).toBe(18_000_000);
    expect(step2.targetCumulative).toBe(28_000_000);
    expect(step2.remainingDpLiability).toBe(12_000_000);

    // Termin berikutnya nominal eksplisit melebihi sisa DP (Rp 20jt > sisa Rp 12jt) -> dibatasi Rp 12jt
    const step3 = computeRecognizableRevenue({
      method: 'termin',
      contractValue,
      dpReceivedTotal,
      dpAlreadyRecognized: 28_000_000,
      explicitTerminAmount: 20_000_000,
    });
    expect(step3.recognizableAmount).toBe(12_000_000);
    expect(step3.targetCumulative).toBe(dpReceivedTotal);
    expect(step3.remainingDpLiability).toBe(0);
    expect(linesAreBalanced(step3.journalLines)).toBe(true);

    // Setelah DP habis, tidak ada pengakuan tambahan
    const step4 = computeRecognizableRevenue({
      method: 'termin',
      contractValue,
      dpReceivedTotal,
      dpAlreadyRecognized: 40_000_000,
      explicitTerminAmount: 5_000_000,
    });
    expect(step4.recognizableAmount).toBe(0);
    expect(step4.remainingDpLiability).toBe(0);
    expect(step4.journalLines).toEqual([]);
  });

  it('buildScheduledRecognitionPlan melewati proyek dengan recognizableAmount === 0 dan menormalisasi periodMonth', () => {
    const plan = buildScheduledRecognitionPlan(
      [
        {
          projectId: 'proj-zero-progress',
          projectName: 'Proyek Baru',
          method: 'progress_pct',
          contractValue: 100_000_000,
          dpReceivedTotal: 25_000_000,
          dpAlreadyRecognized: 0,
          progressPct: 0,
        },
        {
          projectId: 'proj-fully-recognized',
          projectName: 'Proyek Selesai',
          method: 'progress_pct',
          contractValue: 80_000_000,
          dpReceivedTotal: 20_000_000,
          dpAlreadyRecognized: 20_000_000,
          progressPct: 100,
        },
        {
          projectId: 'proj-active-progress',
          projectName: 'Renovasi Ruko',
          method: 'progress_pct',
          contractValue: 150_000_000,
          dpReceivedTotal: 45_000_000,
          dpAlreadyRecognized: 15_000_000,
          progressPct: 60,
        },
        {
          projectId: 'proj-active-termin',
          projectName: 'Kantor Cabang',
          method: 'termin',
          contractValue: 200_000_000,
          dpReceivedTotal: 50_000_000,
          dpAlreadyRecognized: 10_000_000,
          explicitTerminAmount: 15_000_000,
        },
      ],
      '2026-11',
    );

    expect(plan).toHaveLength(2);
    expect(plan[0]).toMatchObject({
      projectId: 'proj-active-progress',
      periodMonth: '2026-11-01',
      method: 'progress_pct',
      progressPct: 60,
      amountRupiah: 12_000_000,
      remainingDpLiability: 18_000_000,
    });
    expect(linesAreBalanced(plan[0].journalLines)).toBe(true);

    expect(plan[1]).toMatchObject({
      projectId: 'proj-active-termin',
      periodMonth: '2026-11-01',
      method: 'termin',
      amountRupiah: 15_000_000,
      remainingDpLiability: 25_000_000,
    });
    expect(linesAreBalanced(plan[1].journalLines)).toBe(true);
  });

  it('uji struktural SQL 20261124144000_g0_5_revenue_recognition.sql (BLOCKED remote, RLS, kolom, RPC idempoten, tanpa mutasi jurnal)', () => {
    const rawSql = readFileSync(MIGRATION_PATH, 'utf8');
    const cleanedSql = stripSqlComments(rawSql);

    expect(rawSql).toMatch(/BLOCKED remote/i);

    // Kolom revenue_recognition_method pada planner_projects dengan default konservatif 'termin'
    expect(cleanedSql).toMatch(/ALTER\s+TABLE\s+planner_projects[\s\S]*revenue_recognition_method\s+text\s+NOT\s+NULL\s+DEFAULT\s+'termin'/i);
    expect(cleanedSql).toMatch(/CHECK\s*\(\s*revenue_recognition_method\s+IN\s*\(\s*'termin'\s*,\s*'progress_pct'\s*\)\s*\)/i);

    // Reference type 'revenue_recognition' pada planner_journal_entries_reference_type_check
    expect(cleanedSql).toMatch(/planner_journal_entries_reference_type_check[\s\S]*'revenue_recognition'/i);
    expect(cleanedSql).toMatch(/planner_journal_entries_reference_type_check[\s\S]*'f1_migration'/i);

    // Tabel jadwal + UNIQUE(project_id, period_month) + RLS is_org_member
    expect(cleanedSql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+planner_revenue_recognition_schedules/i);
    expect(cleanedSql).toMatch(/UNIQUE\s*\(\s*project_id\s*,\s*period_month\s*\)/i);
    expect(cleanedSql).toMatch(/ALTER\s+TABLE\s+planner_revenue_recognition_schedules\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(cleanedSql).toMatch(/CREATE\s+POLICY[\s\S]*ON\s+planner_revenue_recognition_schedules[\s\S]*is_org_member/i);

    // Fungsi RPC idempoten & validasi p_amount > 0 & Dr uang_muka_klien / Cr pendapatan_proyek
    expect(cleanedSql).toMatch(
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.planner_recognize_project_dp_revenue\s*\(/i,
    );
    expect(cleanedSql).toMatch(/p_amount\s+IS\s+NULL\s+OR\s+p_amount\s*<=\s*0/i);
    expect(cleanedSql).toContain("'uang_muka_klien'");
    expect(cleanedSql).toContain("'pendapatan_proyek'");
    expect(cleanedSql).toContain("'revenue_recognition'");

    // Tanpa UPDATE/DELETE pada tabel jurnal imutabel
    expect(cleanedSql).not.toMatch(/\bUPDATE\s+(?:public\.)?planner_journal_entries\b/i);
    expect(cleanedSql).not.toMatch(/\bDELETE\s+FROM\s+(?:public\.)?planner_journal_entries\b/i);
    expect(cleanedSql).not.toMatch(/\bUPDATE\s+(?:public\.)?planner_journal_lines\b/i);
    expect(cleanedSql).not.toMatch(/\bDELETE\s+FROM\s+(?:public\.)?planner_journal_lines\b/i);
    expect(cleanedSql).not.toMatch(/\bUPDATE\s+(?:public\.)?planner_journal_allocations\b/i);
    expect(cleanedSql).not.toMatch(/\bDELETE\s+FROM\s+(?:public\.)?planner_journal_allocations\b/i);
  });

  it('layanan planMonthlyRevenueRecognition dan postRevenueRecognition (RPC & fallback postJournalEntry)', async () => {
    // 1. planMonthlyRevenueRecognition melewati proyek 0 dan menyusun rencana dari input proyek
    const planned = await planMonthlyRevenueRecognition({
      orgId: 'org-1',
      periodMonth: '2026-11-15',
      projects: [
        {
          projectId: 'p1',
          projectName: 'Proyek A',
          method: 'progress_pct',
          contractValue: 100_000_000,
          dpReceivedTotal: 30_000_000,
          dpAlreadyRecognized: 0,
          progressPct: 30,
        },
        {
          projectId: 'p2',
          projectName: 'Proyek B',
          method: 'termin',
          contractValue: 50_000_000,
          dpReceivedTotal: 10_000_000,
          dpAlreadyRecognized: 10_000_000,
          completedTerminPct: 100,
        },
      ],
    });
    expect(planned.periodMonth).toBe('2026-11-01');
    expect(planned.plan).toHaveLength(1);
    expect(planned.plan[0].projectId).toBe('p1');
    expect(planned.plan[0].amountRupiah).toBe(9_000_000);
    expect(planned.skippedProjectIds).toEqual(['p2']);

    // 2. Jalur RPC sukses
    rpcMock.mockResolvedValueOnce({ data: 'je-rpc-1', error: null });
    const rpcRes = await postRevenueRecognition({
      orgId: 'org-1',
      projectId: 'p1',
      periodMonth: '2026-11',
      amount: 9_000_000,
      progressPct: 30,
      method: 'progress_pct',
      actorId: 'user-1',
    });
    expect(rpcRes).toEqual({ journalId: 'je-rpc-1', scheduleId: null, usedFallback: false });
    expect(rpcMock).toHaveBeenCalledWith('planner_recognize_project_dp_revenue', {
      p_org_id: 'org-1',
      p_project_id: 'p1',
      p_period_month: '2026-11-01',
      p_amount: 9_000_000,
      p_progress_pct: 30,
      p_actor: 'user-1',
    });

    // 3. Jalur fallback ketika RPC belum ada di remote (BLOCKED remote)
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST202', message: 'Could not find function planner_recognize_project_dp_revenue' },
    });
    fromMock.mockImplementation((table: string) => {
      if (table === 'planner_revenue_recognition_schedules') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: { code: '42P01', message: 'does not exist' } }),
              }),
            }),
          }),
        };
      }
      if (table === 'planner_journal_entries') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                gte: () => ({
                  lte: async () => ({ data: [], error: null }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    ensureChartOfAccountsMock.mockResolvedValueOnce(undefined);
    findSystemAccountMock.mockImplementation(async (_orgId: string, type: string) => ({
      id: `acc-${type}`,
      type,
    }));
    postJournalEntryMock.mockResolvedValueOnce({ id: 'je-fallback-1' });

    const fallbackRes = await postRevenueRecognition({
      orgId: 'org-1',
      projectId: 'p1',
      periodMonth: '2026-11',
      amount: 9_000_000,
      progressPct: 30,
      method: 'progress_pct',
      actorId: 'user-1',
    });
    expect(fallbackRes).toEqual({ journalId: 'je-fallback-1', scheduleId: null, usedFallback: true });
    expect(postJournalEntryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-1',
        entryDate: '2026-11-30',
        referenceType: 'revenue_recognition',
        lines: [
          { accountId: 'acc-uang_muka_klien', debit: 9_000_000, credit: 0, projectId: 'p1' },
          { accountId: 'acc-pendapatan_proyek', debit: 0, credit: 9_000_000, projectId: 'p1' },
        ],
      }),
    );

    // 4. Nominal <= 0 ditolak deterministik
    await expect(
      postRevenueRecognition({
        orgId: 'org-1',
        projectId: 'p1',
        periodMonth: '2026-11',
        amount: 0,
      }),
    ).rejects.toThrow('nominal_tidak_valid');
  });
});
