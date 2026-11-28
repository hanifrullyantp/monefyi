import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  buildJournalTemplate,
  FINANCE_EVENT_CODES,
  linesAreBalanced,
  officePayrollAccrual,
  payrollLiabilitySettlement,
  projectLaborAccrual,
  validateJournalDimensions,
} from '@domain/journal';
import {
  buildDailyProjectLaborAccruals,
  buildOfficeMonthlyPayrollAccrual,
  calculatePayrollStatutoryDrafts,
  computeKasbonSettlement,
  PAYROLL_STATUTORY_DISCLAIMER,
  resolveAttendanceProjectFromSchedule,
  resolveEffectiveCompensationRate,
  validateDailyAttendanceSplits,
  type AttendanceProjectSplitInput,
  type CompensationRateRecord,
  type DailyAssignmentSchedule,
  type LaborPolicy,
  type PayrollStatutoryConfig,
} from '@domain/hrdPayroll';
import { ACCOUNT_TYPE_LABEL, type AccountType } from '../../../types/financeV2';

const baseLaborPolicy: LaborPolicy = {
  standardWorkDaysPerMonth: 25,
  standardHoursPerDay: 8,
  overtimeMultiplier: 1.5,
  maxKasbonDeductionPct: 30,
};

const baseStatutoryConfig: PayrollStatutoryConfig = {
  effectiveFrom: '2026-01-01',
  regulationRef: 'PP-58-2023-TER & Perpres-64-2020',
  verifiedAt: '2026-11-01',
  bpjsKesehatanEmployeePct: 1,
  bpjsKesehatanEmployerPct: 4,
  bpjsKesehatanSalaryCapRupiah: 12_000_000,
  bpjsKetenagakerjaanEmployeePct: 3,
  bpjsKetenagakerjaanEmployerPct: 6.24,
  bpjsKetenagakerjaanSalaryCapRupiah: 10_042_300,
  pph21Method: 'ter_flat_pct',
  pph21RatePct: 2.5,
};

describe('G8-2: Kehadiran day_fraction, Tarif effectiveFrom, Akrual Upah Proyek, Gaji Kantor, BPJS/PPh21, & Kasbon Bersaldo', () => {
  describe('0. Template Jurnal & COA hutang_gaji', () => {
    it('mendaftarkan hutang_gaji pada AccountType, ACCOUNT_TYPE_LABEL, PARTY_DIMENSION_ROLES, dan 3 event code baru seimbang', () => {
      const accountType: AccountType = 'hutang_gaji';
      expect(ACCOUNT_TYPE_LABEL[accountType]).toBe('Hutang Gaji & Upah');

      expect(FINANCE_EVENT_CODES).toContain('project_labor_accrual');
      expect(FINANCE_EVENT_CODES).toContain('office_payroll_accrual');
      expect(FINANCE_EVENT_CODES).toContain('payroll_liability_settlement');

      const laborLines = projectLaborAccrual(250_000.4);
      expect(laborLines).toEqual([
        { role: 'hpp_labor', debit: 250_000, credit: 0 },
        { role: 'hutang_gaji', debit: 0, credit: 250_000 },
      ]);
      expect(linesAreBalanced(laborLines)).toBe(true);

      const officeLines = officePayrollAccrual(5_500_000);
      expect(officeLines).toEqual([
        { role: 'beban_opex', debit: 5_500_000, credit: 0 },
        { role: 'hutang_gaji', debit: 0, credit: 5_500_000 },
      ]);
      expect(linesAreBalanced(officeLines)).toBe(true);

      const settleLines = payrollLiabilitySettlement(1_000_000, 300_000);
      expect(settleLines).toEqual([
        { role: 'hutang_gaji', debit: 1_000_000, credit: 0 },
        { role: 'kas', debit: 0, credit: 700_000 },
        { role: 'piutang', debit: 0, credit: 300_000 },
      ]);
      expect(linesAreBalanced(settleLines)).toBe(true);

      const viaBuilder = buildJournalTemplate('payroll_liability_settlement', 1_000_000, {
        kasbonOffset: 250_000,
      });
      expect(linesAreBalanced(viaBuilder)).toBe(true);

      // hutang_gaji wajib membawa party_id
      expect(validateJournalDimensions([{ role: 'hutang_gaji', partyId: null }]).ok).toBe(false);
      expect(validateJournalDimensions([{ role: 'hutang_gaji', partyId: 'party-tukang-1' }]).ok).toBe(true);
    });
  });

  describe('1. Validasi day_fraction (pembagian 1 hari ke 2+ proyek & penolakan > 1.0)', () => {
    it('mengizinkan pembagian 1 hari kerja ke 2 proyek (0.5 + 0.5 = 1.0)', () => {
      const result = validateDailyAttendanceSplits([
        {
          workerId: 'w-slamet',
          partyId: 'p-slamet',
          projectId: 'proj-A',
          workDate: '2026-11-10',
          dayFraction: 0.5,
        },
        {
          workerId: 'w-slamet',
          partyId: 'p-slamet',
          projectId: 'proj-B',
          workDate: '2026-11-10',
          dayFraction: 0.5,
        },
      ]);

      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.totalsByWorkerDate['w-slamet::2026-11-10']).toBe(1);
    });

    it('menolak total day_fraction per pekerja per hari > 1.0 serta dayFraction <= 0 atau > 1', () => {
      const overDay = validateDailyAttendanceSplits([
        {
          workerId: 'w-slamet',
          partyId: 'p-slamet',
          projectId: 'proj-A',
          workDate: '2026-11-10',
          dayFraction: 0.6,
        },
        {
          workerId: 'w-slamet',
          partyId: 'p-slamet',
          projectId: 'proj-B',
          workDate: '2026-11-10',
          dayFraction: 0.5,
        },
      ]);
      expect(overDay.ok).toBe(false);
      expect(overDay.errors.some((e) => e.includes('melebihi batas 1.0'))).toBe(true);

      const zeroFrac = validateDailyAttendanceSplits([
        {
          workerId: 'w-tarjo',
          partyId: 'p-tarjo',
          projectId: 'proj-A',
          workDate: '2026-11-10',
          dayFraction: 0,
        },
      ]);
      expect(zeroFrac.ok).toBe(false);
    });
  });

  describe('2. Invarian utama: total upah per proyek === total debit hpp_labor proyek di buku besar', () => {
    it('menghitung upah multi-proyek & multi-tukang (termasuk split 0.5 + 0.5, lembur, dan borongan) dengan paritas 100% terhadap debit hpp_labor', () => {
      const rates: CompensationRateRecord[] = [
        {
          id: 'rate-slamet',
          workerId: 'w-slamet',
          roleName: 'Tukang Batu',
          rateType: 'daily',
          rateRupiah: 200_000,
          effectiveFrom: '2026-11-01',
        },
        {
          id: 'rate-role-helper',
          workerId: null,
          roleName: 'Helper',
          rateType: 'daily',
          rateRupiah: 140_000,
          effectiveFrom: '2026-11-01',
        },
        {
          id: 'rate-budi-borongan',
          workerId: 'w-budi',
          roleName: 'Tukang Cat',
          rateType: 'borongan',
          rateRupiah: 50_000, // per m2
          effectiveFrom: '2026-11-01',
        },
      ];

      const splits: AttendanceProjectSplitInput[] = [
        // Slamet: 0.5 hari di Proyek A + 2 jam lembur
        // Regular = 0.5 * 200.000 = 100.000
        // Lembur = 2 * (200.000 / 8) * 1.5 = 2 * 25.000 * 1.5 = 75.000
        // Total = 175.000
        {
          id: 'split-1',
          workerId: 'w-slamet',
          workerName: 'Slamet',
          partyId: 'party-slamet',
          role: 'Tukang Batu',
          projectId: 'proj-A',
          projectName: 'Proyek A',
          workDate: '2026-11-10',
          dayFraction: 0.5,
          regularHours: 4,
          overtimeHours: 2,
        },
        // Slamet: 0.5 hari di Proyek B (tanpa lembur) -> 100.000
        {
          id: 'split-2',
          workerId: 'w-slamet',
          workerName: 'Slamet',
          partyId: 'party-slamet',
          role: 'Tukang Batu',
          projectId: 'proj-B',
          projectName: 'Proyek B',
          workDate: '2026-11-10',
          dayFraction: 0.5,
          regularHours: 4,
          overtimeHours: 0,
        },
        // Tarjo (Helper via tarif peran): 1.0 hari di Proyek A -> 140.000
        {
          id: 'split-3',
          workerId: 'w-tarjo',
          workerName: 'Tarjo',
          partyId: 'party-tarjo',
          role: 'Helper',
          projectId: 'proj-A',
          projectName: 'Proyek A',
          workDate: '2026-11-10',
          dayFraction: 1.0,
          regularHours: 8,
          overtimeHours: 0,
        },
        // Budi (borongan 6 unit di Proyek B): 6 * 50.000 = 300.000
        {
          id: 'split-4',
          workerId: 'w-budi',
          workerName: 'Budi',
          partyId: 'party-budi',
          role: 'Tukang Cat',
          projectId: 'proj-B',
          projectName: 'Proyek B',
          workDate: '2026-11-10',
          dayFraction: 1.0,
          boronganUnits: 6,
          overtimeHours: 0,
        },
      ];

      const accrual = buildDailyProjectLaborAccruals(splits, rates, baseLaborPolicy);
      expect(accrual.ok).toBe(true);
      expect(accrual.status).toBe('ready');
      expect(accrual.entries).toHaveLength(4);

      expect(accrual.totalsByProject['proj-A']).toBe(175_000 + 140_000); // 315.000
      expect(accrual.totalsByProject['proj-B']).toBe(100_000 + 300_000); // 400.000
      expect(accrual.grandTotalAccrued).toBe(715_000);

      // Hitung total debit hpp_labor langsung dari baris buku besar per proyek
      const hppDebitByProject: Record<string, number> = {};
      let totalHutangGajiCredit = 0;
      for (const line of accrual.ledgerLines) {
        if (line.accountType === 'hpp_labor') {
          hppDebitByProject[line.projectId!] = (hppDebitByProject[line.projectId!] ?? 0) + line.debit;
        }
        if (line.accountType === 'hutang_gaji') {
          totalHutangGajiCredit += line.credit;
          expect(line.partyId).toBeTruthy();
        }
      }

      // Invarian utama: total upah per proyek === total debit hpp_labor di buku besar
      expect(hppDebitByProject['proj-A']).toBe(accrual.totalsByProject['proj-A']);
      expect(hppDebitByProject['proj-B']).toBe(accrual.totalsByProject['proj-B']);
      expect(totalHutangGajiCredit).toBe(accrual.grandTotalAccrued);

      // Pastikan setiap entri jurnal seimbang dan valid dimensinya
      for (const entry of accrual.entries) {
        expect(linesAreBalanced(entry.journalLines)).toBe(true);
        expect(validateJournalDimensions(entry.journalLines).ok).toBe(true);
      }
    });
  });

  describe('3. Tebakan proyek dari jadwal PM harian', () => {
    const schedule: DailyAssignmentSchedule[] = [
      {
        workerId: 'w-slamet',
        projectId: 'proj-A',
        projectName: 'Proyek A',
        workDate: '2026-11-10',
        sourceWorkItemId: 'wi-101',
      },
    ];

    it('needsConfirmation=false ketika cocok jadwal PM atau tidak ada proyek berbeda dilaporkan', () => {
      const autoGuessed = resolveAttendanceProjectFromSchedule('w-slamet', '2026-11-10', schedule);
      expect(autoGuessed.resolvedProjectId).toBe('proj-A');
      expect(autoGuessed.source).toBe('pm_schedule');
      expect(autoGuessed.needsConfirmation).toBe(false);

      const confirmedMatch = resolveAttendanceProjectFromSchedule(
        'w-slamet',
        '2026-11-10',
        schedule,
        'proj-A',
      );
      expect(confirmedMatch.resolvedProjectId).toBe('proj-A');
      expect(confirmedMatch.needsConfirmation).toBe(false);
    });

    it('needsConfirmation=true ketika proyek dilaporkan berbeda dari jadwal PM atau tidak ada jadwal', () => {
      const mismatch = resolveAttendanceProjectFromSchedule(
        'w-slamet',
        '2026-11-10',
        schedule,
        'proj-B',
      );
      expect(mismatch.resolvedProjectId).toBe('proj-B');
      expect(mismatch.plannedProjectId).toBe('proj-A');
      expect(mismatch.source).toBe('reported_mismatch_schedule');
      expect(mismatch.needsConfirmation).toBe(true);

      const noSchedule = resolveAttendanceProjectFromSchedule(
        'w-tarjo',
        '2026-11-10',
        schedule,
        'proj-B',
      );
      expect(noSchedule.source).toBe('reported_without_schedule');
      expect(noSchedule.needsConfirmation).toBe(true);

      const unassigned = resolveAttendanceProjectFromSchedule('w-tarjo', '2026-11-10', schedule);
      expect(unassigned.resolvedProjectId).toBeNull();
      expect(unassigned.needsConfirmation).toBe(true);
    });
  });

  describe('4. Tarif beriwayat effectiveFrom & penolakan fallback tersembunyi (missing_rate)', () => {
    const rateHistory: CompensationRateRecord[] = [
      {
        id: 'r1',
        workerId: 'w-slamet',
        roleName: 'Tukang Batu',
        rateType: 'daily',
        rateRupiah: 180_000,
        effectiveFrom: '2026-10-01',
      },
      {
        id: 'r2',
        workerId: 'w-slamet',
        roleName: 'Tukang Batu',
        rateType: 'daily',
        rateRupiah: 210_000,
        effectiveFrom: '2026-11-15',
      },
      {
        id: 'r3',
        workerId: 'w-slamet',
        roleName: 'Tukang Batu',
        rateType: 'daily',
        rateRupiah: 250_000,
        effectiveFrom: '2026-12-01', // masa depan untuk Nov
      },
      {
        id: 'r4',
        workerId: null,
        roleName: 'Tukang Batu',
        rateType: 'daily',
        rateRupiah: 165_000,
        effectiveFrom: '2026-10-01',
      },
    ];

    it('memilih tarif effectiveFrom <= workDate terbaru dan memprioritaskan tarif per orang atas tarif per peran', () => {
      const beforeRaise = resolveEffectiveCompensationRate(
        'w-slamet',
        'Tukang Batu',
        '2026-11-14',
        rateHistory,
      );
      expect(beforeRaise.ok).toBe(true);
      expect(beforeRaise.rateRupiah).toBe(180_000);
      expect(beforeRaise.effectiveFrom).toBe('2026-10-01');
      expect(beforeRaise.scope).toBe('worker');

      const onRaiseDate = resolveEffectiveCompensationRate(
        'w-slamet',
        'Tukang Batu',
        '2026-11-15',
        rateHistory,
      );
      expect(onRaiseDate.ok).toBe(true);
      expect(onRaiseDate.rateRupiah).toBe(210_000);
      expect(onRaiseDate.effectiveFrom).toBe('2026-11-15');

      const viaRoleFallback = resolveEffectiveCompensationRate(
        'w-baru',
        'Tukang Batu',
        '2026-11-15',
        rateHistory,
      );
      expect(viaRoleFallback.ok).toBe(true);
      expect(viaRoleFallback.scope).toBe('role');
      expect(viaRoleFallback.rateRupiah).toBe(165_000);
    });

    it('mengembalikan missing_rate tanpa menebak Rp 150.000 & 0 jurnal tebakan saat akrual', () => {
      const missing = resolveEffectiveCompensationRate(
        'w-tanpa-tarif',
        'Pekerja Baru',
        '2026-11-10',
        rateHistory,
      );
      expect(missing.ok).toBe(false);
      expect(missing.status).toBe('missing_rate');
      expect(missing.rateRupiah).toBe(0);
      expect(missing.rateRupiah).not.toBe(150_000);
      expect(missing.question).toContain('w-tanpa-tarif');

      const accrual = buildDailyProjectLaborAccruals(
        [
          {
            workerId: 'w-slamet',
            workerName: 'Slamet',
            partyId: 'party-slamet',
            role: 'Tukang Batu',
            projectId: 'proj-A',
            workDate: '2026-11-10',
            dayFraction: 1,
          },
          {
            workerId: 'w-tanpa-tarif',
            workerName: 'Udin',
            partyId: 'party-udin',
            role: 'Pekerja Baru',
            projectId: 'proj-A',
            workDate: '2026-11-10',
            dayFraction: 1,
          },
        ],
        rateHistory,
        baseLaborPolicy,
      );

      expect(accrual.ok).toBe(true);
      expect(accrual.status).toBe('partial_missing_rate');
      // Hanya Slamet yang diposting; Udin punya 0 jurnal tebakan
      expect(accrual.entries).toHaveLength(1);
      expect(accrual.entries[0].workerId).toBe('w-slamet');
      expect(accrual.totalsByProject['proj-A']).toBe(180_000);
      expect(accrual.missingRateQuestions).toHaveLength(1);
      expect(accrual.missingRateSplits[0].workerId).toBe('w-tanpa-tarif');
    });
  });

  describe('5. Gaji kantor (beban_opex) & draf BPJS/PPh 21 konfigurabel berlabel konsultan pajak', () => {
    it('membukukan gaji kantor ke beban_opex (bukan hpp_labor) & menyertakan draf BPJS/PPh 21 berlabel konsultan pajak', () => {
      const officeRates: CompensationRateRecord[] = [
        {
          id: 'off-1',
          workerId: 'emp-admin',
          roleName: 'Admin Keuangan',
          rateType: 'monthly',
          rateRupiah: 6_000_000,
          effectiveFrom: '2026-01-01',
        },
        {
          id: 'off-2',
          workerId: 'emp-estimator',
          roleName: 'Estimator',
          rateType: 'monthly',
          rateRupiah: 8_000_000,
          effectiveFrom: '2026-11-01',
        },
      ];

      const officeAccrual = buildOfficeMonthlyPayrollAccrual(
        [
          {
            employeeId: 'emp-admin',
            employeeName: 'Sari',
            partyId: 'party-sari',
            role: 'Admin Keuangan',
          },
          {
            employeeId: 'emp-estimator',
            employeeName: 'Doni',
            partyId: 'party-doni',
            role: 'Estimator',
            allowancesRupiah: 500_000,
          },
        ],
        '2026-11',
        officeRates,
        baseStatutoryConfig,
      );

      expect(officeAccrual.ok).toBe(true);
      expect(officeAccrual.totalOfficeOpexAccrued).toBe(14_500_000);
      expect(officeAccrual.ledgerLines.some((l) => l.accountType === 'hpp_labor')).toBe(false);
      expect(officeAccrual.ledgerLines.every((l) => l.projectId === null)).toBe(true);

      const totalOpexDebit = officeAccrual.ledgerLines
        .filter((l) => l.accountType === 'beban_opex')
        .reduce((s, l) => s + l.debit, 0);
      expect(totalOpexDebit).toBe(14_500_000);

      expect(officeAccrual.statutoryDrafts.status).toBe('draft_ready');
      expect(officeAccrual.statutoryDrafts.disclaimer).toBe(
        'Draf untuk ditinjau konsultan pajak — bukan nasihat hukum/pajak berlisensi',
      );
      // BPJS Kes employee = 1% * (6jt + 8.5jt) = 60.000 + 85.000 = 145.000
      expect(officeAccrual.statutoryDrafts.bpjsKesehatanEmployee).toBe(145_000);
      // PPh 21 = 2.5% * 6jt + 2.5% * 8.5jt = 150.000 + 212.500 = 362.500
      expect(officeAccrual.statutoryDrafts.pph21Total).toBe(362_500);
    });

    it('mengembalikan status config_required tanpa angka hardcode bila statutoryConfig kosong', () => {
      const noConfigDraft = calculatePayrollStatutoryDrafts({
        employees: [{ employeeId: 'emp-admin', grossWageRupiah: 6_000_000 }],
        periodMonth: '2026-11',
        statutoryConfig: null,
      });

      expect(noConfigDraft.ok).toBe(false);
      expect(noConfigDraft.status).toBe('config_required');
      expect(noConfigDraft.missingConfigFields.length).toBeGreaterThan(0);
      expect(noConfigDraft.bpjsKesehatanEmployee).toBe(0);
      expect(noConfigDraft.pph21Total).toBe(0);
      expect(noConfigDraft.disclaimer).toBe(PAYROLL_STATUTORY_DISCLAIMER);
    });
  });

  describe('6. Kasbon bersaldo (dibatasi maxDeductionPct & pelunasan seimbang)', () => {
    it('membatasi potongan sesuai maxDeductionPct, membawa sisa saldo kasbon, dan menghasilkan jurnal seimbang', () => {
      // Kasbon awal Rp 1.000.000, upah bruto Rp 1.200.000, max potongan 30% = Rp 360.000
      const settlement = computeKasbonSettlement(1_000_000, 1_200_000, baseLaborPolicy.maxKasbonDeductionPct);

      expect(settlement.maxAllowedDeduction).toBe(360_000);
      expect(settlement.deductedAmount).toBe(360_000);
      expect(settlement.netCashPayout).toBe(840_000);
      expect(settlement.remainingKasbonBalance).toBe(640_000);
      expect(settlement.deductedAmount + settlement.remainingKasbonBalance).toBe(1_000_000);
      expect(settlement.isBalanced).toBe(true);
      expect(settlement.journalLines).toEqual([
        { role: 'hutang_gaji', debit: 1_200_000, credit: 0 },
        { role: 'kas', debit: 0, credit: 840_000 },
        { role: 'piutang', debit: 0, credit: 360_000 },
      ]);
      expect(linesAreBalanced(settlement.journalLines)).toBe(true);

      // Jika kasbon lebih kecil dari batas 30%: kasbon Rp 200.000 -> terpotong penuh 200.000, sisa 0
      const fullPayoff = computeKasbonSettlement(200_000, 1_200_000, 30);
      expect(fullPayoff.deductedAmount).toBe(200_000);
      expect(fullPayoff.remainingKasbonBalance).toBe(0);
      expect(fullPayoff.netCashPayout).toBe(1_000_000);
      expect(linesAreBalanced(fullPayoff.journalLines)).toBe(true);
    });
  });

  describe('7. Uji struktural migrasi SQL G8-2 (BLOCKED remote)', () => {
    it('memuat COA hutang_gaji, 4 tabel HRD/payroll baru, CHECK day_fraction, ON DELETE RESTRICT, RLS is_org_member, dan bebas mutasi tabel jurnal', () => {
      const sqlPath = resolve(
        dirname(fileURLToPath(import.meta.url)),
        '../../../../../../my-supabase-project/supabase/migrations/20261124190000_g8_hrd_project_labor_accrual.sql',
      );
      const sql = readFileSync(sqlPath, 'utf8');

      expect(sql).toContain('BLOCKED remote');
      expect(sql).toContain('planner_finance_accounts_type_check');
      expect(sql).toContain("'hutang_gaji'");
      expect(sql).toContain('seed_default_chart_of_accounts');
      expect(sql).toContain("('hutang_gaji', 'pasiva', 'Hutang Gaji & Upah')");

      expect(sql).toContain('CREATE TABLE IF NOT EXISTS planner_attendance_project_splits');
      expect(sql).toContain('day_fraction numeric(4,2) NOT NULL CHECK (day_fraction > 0 AND day_fraction <= 1)');
      expect(sql).toContain('journal_entry_id uuid REFERENCES planner_journal_entries(id) ON DELETE RESTRICT');

      expect(sql).toContain('CREATE TABLE IF NOT EXISTS planner_compensation_rate_history');
      expect(sql).toContain("rate_type text NOT NULL CHECK (rate_type IN ('daily', 'borongan', 'monthly'))");

      expect(sql).toContain('CREATE TABLE IF NOT EXISTS planner_daily_assignments');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS planner_org_labor_policies');
      expect(sql).toContain('statutory_config_json');

      expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
      expect(sql).toContain('public.is_org_member(org_id');

      // Tidak memutasi tabel jurnal
      expect(sql).not.toMatch(/\b(UPDATE|DELETE)\s+(public\.)?planner_journal_(entries|lines|allocations)\b/i);
    });
  });
});
