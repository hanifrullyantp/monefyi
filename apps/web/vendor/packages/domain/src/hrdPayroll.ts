import { TAX_DRAFT_DISCLAIMER } from './cfoTaxAndCapital';
import {
  linesAreBalanced,
  officePayrollAccrual,
  payrollLiabilitySettlement,
  projectLaborAccrual,
  toRupiah,
  validateJournalDimensions,
  type JournalAccountRole,
  type TemplateLine,
} from './journal';

export const PAYROLL_STATUTORY_DISCLAIMER = TAX_DRAFT_DISCLAIMER;

export type CompensationRateType = 'daily' | 'borongan' | 'monthly';

export interface AttendanceProjectSplitInput {
  id?: string;
  workerId: string;
  workerName?: string;
  partyId?: string | null;
  role?: string | null;
  projectId: string;
  projectName?: string;
  workDate: string; // YYYY-MM-DD
  dayFraction: number;
  regularHours?: number;
  overtimeHours?: number;
  boronganUnits?: number;
  source?: string;
  verificationStatus?: string;
}

export interface DailyAssignmentSchedule {
  workerId: string;
  projectId: string;
  projectName?: string;
  workDate: string; // YYYY-MM-DD
  sourceWorkItemId?: string | null;
}

export interface CompensationRateRecord {
  id?: string;
  workerId?: string | null;
  roleName?: string | null;
  rateType: CompensationRateType;
  rateRupiah: number;
  effectiveFrom: string; // YYYY-MM-DD
  createdAt?: string;
}

export interface LaborPolicy {
  standardWorkDaysPerMonth: number;
  standardHoursPerDay: number;
  overtimeMultiplier: number;
  maxKasbonDeductionPct: number;
}

export interface PayrollStatutoryBracket {
  upToRupiah: number | null;
  ratePct: number;
}

export interface PayrollStatutoryConfig {
  effectiveFrom?: string;
  regulationRef?: string;
  verifiedAt?: string | null;
  bpjsKesehatanEmployeePct?: number | null;
  bpjsKesehatanEmployerPct?: number | null;
  bpjsKesehatanSalaryCapRupiah?: number | null;
  bpjsKetenagakerjaanEmployeePct?: number | null;
  bpjsKetenagakerjaanEmployerPct?: number | null;
  bpjsKetenagakerjaanSalaryCapRupiah?: number | null;
  pph21Method?: 'ter_flat_pct' | 'effective_rate_pct' | 'progressive_brackets' | null;
  pph21RatePct?: number | null;
  pph21Brackets?: PayrollStatutoryBracket[] | null;
}

export interface OfficeEmployeePayrollInput {
  employeeId: string;
  employeeName?: string;
  partyId: string;
  role: string;
  prorateFactor?: number;
  allowancesRupiah?: number;
}

export interface HrdPayrollProvenance {
  source: string;
  period: string;
  assumptions: string[];
  disclaimer?: typeof TAX_DRAFT_DISCLAIMER;
}

export interface AttendanceSplitValidationResult {
  ok: boolean;
  errors: string[];
  totalsByWorkerDate: Record<string, number>;
}

export interface ScheduleResolutionResult {
  workerId: string;
  workDate: string;
  resolvedProjectId: string | null;
  plannedProjectId: string | null;
  plannedProjectIds: string[];
  source:
    | 'pm_schedule'
    | 'reported_mismatch_schedule'
    | 'reported_without_schedule'
    | 'ambiguous_schedule'
    | 'unassigned';
  needsConfirmation: boolean;
  reason: string | null;
  sourceWorkItemId: string | null;
}

export type EffectiveRateResolution =
  | {
      ok: true;
      status: 'configured';
      rateRecordId: string | null;
      scope: 'worker' | 'role';
      rateType: CompensationRateType;
      rateRupiah: number;
      effectiveFrom: string;
      question: null;
    }
  | {
      ok: false;
      status: 'missing_rate';
      rateRecordId: null;
      scope: null;
      rateType: null;
      rateRupiah: 0;
      effectiveFrom: null;
      question: string;
    };

export interface AccruedJournalLine {
  role: JournalAccountRole;
  accountType: JournalAccountRole;
  debit: number;
  credit: number;
  projectId: string | null;
  partyId: string | null;
  notes: string;
}

export interface ProjectLaborAccrualEntry {
  splitId: string | null;
  workerId: string;
  workerName: string;
  partyId: string;
  projectId: string;
  projectName: string;
  workDate: string;
  dayFraction: number;
  overtimeHours: number;
  rateType: CompensationRateType;
  rateRupiah: number;
  effectiveFrom: string;
  regularPayRupiah: number;
  overtimePayRupiah: number;
  totalWageRupiah: number;
  templateLines: TemplateLine[];
  journalLines: AccruedJournalLine[];
}

export interface DailyProjectLaborAccrualResult {
  ok: boolean;
  status: 'ready' | 'partial_missing_rate' | 'validation_failed';
  validationErrors: string[];
  entries: ProjectLaborAccrualEntry[];
  ledgerLines: AccruedJournalLine[];
  totalsByProject: Record<string, number>;
  totalsByWorker: Record<string, number>;
  grandTotalAccrued: number;
  missingRateQuestions: string[];
  missingRateSplits: Array<{
    workerId: string;
    workerName: string;
    role: string;
    projectId: string;
    workDate: string;
    question: string;
  }>;
  provenance: HrdPayrollProvenance;
}

export interface StatutoryEmployeeDraft {
  employeeId: string;
  grossWageRupiah: number;
  bpjsKesehatanEmployee: number;
  bpjsKesehatanEmployer: number;
  bpjsKetenagakerjaanEmployee: number;
  bpjsKetenagakerjaanEmployer: number;
  pph21Amount: number;
  totalEmployeeDeduction: number;
  totalEmployerContribution: number;
}

export interface PayrollStatutoryDraftResult {
  ok: boolean;
  status: 'draft_ready' | 'config_required';
  missingConfigFields: string[];
  disclaimer: typeof TAX_DRAFT_DISCLAIMER;
  bpjsKesehatanEmployee: number;
  bpjsKesehatanEmployer: number;
  bpjsKetenagakerjaanEmployee: number;
  bpjsKetenagakerjaanEmployer: number;
  pph21Total: number;
  totalEmployeeDeduction: number;
  totalEmployerContribution: number;
  byEmployee: StatutoryEmployeeDraft[];
  provenance: HrdPayrollProvenance;
}

export interface OfficePayrollAccrualEntry {
  employeeId: string;
  employeeName: string;
  partyId: string;
  role: string;
  rateType: CompensationRateType;
  rateRupiah: number;
  effectiveFrom: string;
  prorateFactor: number;
  allowancesRupiah: number;
  grossSalaryRupiah: number;
  templateLines: TemplateLine[];
  journalLines: AccruedJournalLine[];
}

export interface OfficeMonthlyPayrollAccrualResult {
  ok: boolean;
  status: 'ready' | 'partial_missing_rate' | 'validation_failed';
  periodMonth: string;
  validationErrors: string[];
  entries: OfficePayrollAccrualEntry[];
  ledgerLines: AccruedJournalLine[];
  totalOfficeOpexAccrued: number;
  missingRateQuestions: string[];
  statutoryDrafts: PayrollStatutoryDraftResult;
  provenance: HrdPayrollProvenance;
}

export interface KasbonSettlementResult {
  openingKasbonBalance: number;
  grossPayable: number;
  maxDeductionPct: number;
  maxAllowedDeduction: number;
  deductedAmount: number;
  netCashPayout: number;
  remainingKasbonBalance: number;
  journalLines: TemplateLine[];
  isBalanced: boolean;
}

const FRACTION_EPSILON = 1e-6;

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function isValidYmd(ymd: string): boolean {
  const match = String(ymd ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() + 1 === month &&
    dt.getUTCDate() === day
  );
}

function normalizePeriodMonthRange(periodMonth: string): {
  periodKey: string;
  startDate: string;
  endDate: string;
} {
  const raw = String(periodMonth ?? '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (!match) {
    throw new Error(`Format periodMonth tidak valid (harus YYYY-MM atau YYYY-MM-DD): ${periodMonth}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new Error(`Bulan periodMonth tidak valid: ${periodMonth}`);
  }
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const ym = `${match[1]}-${match[2]}`;
  return {
    periodKey: ym,
    startDate: `${ym}-01`,
    endDate: `${ym}-${String(lastDay).padStart(2, '0')}`,
  };
}

function isValidPct(val: number | null | undefined): val is number {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0 && val <= 100;
}

/**
 * Validasi pecahan hari kerja (`dayFraction`) per (workerId, workDate).
 * Setiap baris harus pada (0, 1] dan jumlah per pekerja per hari <= 1.0 (mendukung bagi proyek mis. 0.5 + 0.5).
 */
export function validateDailyAttendanceSplits(
  splits: AttendanceProjectSplitInput[],
): AttendanceSplitValidationResult {
  const errors: string[] = [];
  const totalsByWorkerDate: Record<string, number> = {};

  for (let i = 0; i < splits.length; i++) {
    const split = splits[i];
    const label = split.workerName || split.workerId || `baris#${i + 1}`;
    if (!split.workerId || !String(split.workerId).trim()) {
      errors.push(`Baris #${i + 1}: workerId wajib diisi.`);
      continue;
    }
    if (!split.projectId || !String(split.projectId).trim()) {
      errors.push(`Pekerja ${label}: projectId wajib diisi.`);
      continue;
    }
    if (!isValidYmd(split.workDate)) {
      errors.push(`Pekerja ${label}: format workDate tidak valid (${split.workDate}).`);
      continue;
    }
    if (
      typeof split.dayFraction !== 'number' ||
      !Number.isFinite(split.dayFraction) ||
      split.dayFraction <= 0 ||
      split.dayFraction > 1 + FRACTION_EPSILON
    ) {
      errors.push(
        `Pekerja ${label} (${split.workDate}): dayFraction (${split.dayFraction}) harus di antara (0, 1].`,
      );
      continue;
    }
    if (
      split.regularHours != null &&
      (!Number.isFinite(split.regularHours) || split.regularHours < 0)
    ) {
      errors.push(`Pekerja ${label} (${split.workDate}): regularHours tidak boleh negatif.`);
    }
    if (
      split.overtimeHours != null &&
      (!Number.isFinite(split.overtimeHours) || split.overtimeHours < 0)
    ) {
      errors.push(`Pekerja ${label} (${split.workDate}): overtimeHours tidak boleh negatif.`);
    }
    if (
      split.boronganUnits != null &&
      (!Number.isFinite(split.boronganUnits) || split.boronganUnits < 0)
    ) {
      errors.push(`Pekerja ${label} (${split.workDate}): boronganUnits tidak boleh negatif.`);
    }

    const key = `${split.workerId}::${split.workDate}`;
    totalsByWorkerDate[key] = round4((totalsByWorkerDate[key] ?? 0) + split.dayFraction);
  }

  for (const [key, total] of Object.entries(totalsByWorkerDate)) {
    if (total > 1 + FRACTION_EPSILON) {
      const [workerId, workDate] = key.split('::');
      errors.push(
        `Total dayFraction untuk pekerja ${workerId} pada ${workDate} (${total}) melebihi batas 1.0 hari.`,
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    totalsByWorkerDate,
  };
}

/**
 * Menebak proyek dari jadwal harian PM (`dailyAssignments`).
 * `needsConfirmation` bernilai `false` jika cocok jadwal PM tunggal (atau jadwal yang dilaporkan sesuai rencana),
 * dan `true` hanya bila `reportedProjectId` berbeda dari jadwal atau tidak ada jadwal.
 */
export function resolveAttendanceProjectFromSchedule(
  workerId: string,
  workDate: string,
  dailyAssignments: DailyAssignmentSchedule[],
  reportedProjectId?: string | null,
): ScheduleResolutionResult {
  const reported = reportedProjectId ? String(reportedProjectId).trim() : null;
  const matches = dailyAssignments.filter(
    (a) => a.workerId === workerId && a.workDate === workDate && Boolean(a.projectId),
  );

  const uniqueByProject: DailyAssignmentSchedule[] = [];
  const seenProjects = new Set<string>();
  for (const item of matches) {
    if (!seenProjects.has(item.projectId)) {
      seenProjects.add(item.projectId);
      uniqueByProject.push(item);
    }
  }

  const plannedIds = uniqueByProject.map((m) => m.projectId);

  if (uniqueByProject.length === 0) {
    if (reported) {
      return {
        workerId,
        workDate,
        resolvedProjectId: reported,
        plannedProjectId: null,
        plannedProjectIds: [],
        source: 'reported_without_schedule',
        needsConfirmation: true,
        reason: 'Tidak ada jadwal PM harian untuk pekerja pada tanggal ini; perlu konfirmasi proyek.',
        sourceWorkItemId: null,
      };
    }
    return {
      workerId,
      workDate,
      resolvedProjectId: null,
      plannedProjectId: null,
      plannedProjectIds: [],
      source: 'unassigned',
      needsConfirmation: true,
      reason: 'Tidak ada jadwal PM harian dan proyek belum dilaporkan.',
      sourceWorkItemId: null,
    };
  }

  if (uniqueByProject.length === 1) {
    const planned = uniqueByProject[0];
    if (!reported || reported === planned.projectId) {
      return {
        workerId,
        workDate,
        resolvedProjectId: planned.projectId,
        plannedProjectId: planned.projectId,
        plannedProjectIds: plannedIds,
        source: 'pm_schedule',
        needsConfirmation: false,
        reason: null,
        sourceWorkItemId: planned.sourceWorkItemId ?? null,
      };
    }
    return {
      workerId,
      workDate,
      resolvedProjectId: reported,
      plannedProjectId: planned.projectId,
      plannedProjectIds: plannedIds,
      source: 'reported_mismatch_schedule',
      needsConfirmation: true,
      reason: `Proyek dilaporkan (${reported}) berbeda dari jadwal PM harian (${planned.projectId}); perlu konfirmasi.`,
      sourceWorkItemId: planned.sourceWorkItemId ?? null,
    };
  }

  if (reported && seenProjects.has(reported)) {
    const matched = uniqueByProject.find((m) => m.projectId === reported)!;
    return {
      workerId,
      workDate,
      resolvedProjectId: reported,
      plannedProjectId: reported,
      plannedProjectIds: plannedIds,
      source: 'pm_schedule',
      needsConfirmation: false,
      reason: null,
      sourceWorkItemId: matched.sourceWorkItemId ?? null,
    };
  }

  if (reported) {
    return {
      workerId,
      workDate,
      resolvedProjectId: reported,
      plannedProjectId: plannedIds[0],
      plannedProjectIds: plannedIds,
      source: 'reported_mismatch_schedule',
      needsConfirmation: true,
      reason: `Proyek dilaporkan (${reported}) tidak cocok dengan daftar jadwal PM (${plannedIds.join(', ')}); perlu konfirmasi.`,
      sourceWorkItemId: uniqueByProject[0].sourceWorkItemId ?? null,
    };
  }

  return {
    workerId,
    workDate,
    resolvedProjectId: null,
    plannedProjectId: plannedIds[0],
    plannedProjectIds: plannedIds,
    source: 'ambiguous_schedule',
    needsConfirmation: true,
    reason: `Terdapat ${plannedIds.length} jadwal proyek berbeda pada tanggal yang sama; perlu konfirmasi pembagian proyek.`,
    sourceWorkItemId: uniqueByProject[0].sourceWorkItemId ?? null,
  };
}

function pickLatestRateRecord(
  records: Array<{ record: CompensationRateRecord; index: number }>,
): CompensationRateRecord | null {
  if (records.length === 0) return null;
  const sorted = [...records].sort((a, b) => {
    const cmpDate = b.record.effectiveFrom.localeCompare(a.record.effectiveFrom);
    if (cmpDate !== 0) return cmpDate;
    const createdA = a.record.createdAt ?? '';
    const createdB = b.record.createdAt ?? '';
    const cmpCreated = createdB.localeCompare(createdA);
    if (cmpCreated !== 0) return cmpCreated;
    return b.index - a.index;
  });
  return sorted[0].record;
}

/**
 * Memilih tarif `daily | borongan | monthly` dengan `effectiveFrom <= workDate` terbaru.
 * Prioritas tarif per orang (`workerId`) lalu tarif per peran (`roleName`).
 * Tidak pernah memakai angka tebakan (mis. Rp 150.000): bila kosong atau <= 0, mengembalikan `status: 'missing_rate'`.
 */
export function resolveEffectiveCompensationRate(
  workerId: string,
  role: string,
  workDate: string,
  rateHistory: CompensationRateRecord[],
): EffectiveRateResolution {
  if (!isValidYmd(workDate)) {
    return {
      ok: false,
      status: 'missing_rate',
      rateRecordId: null,
      scope: null,
      rateType: null,
      rateRupiah: 0,
      effectiveFrom: null,
      question: `Tanggal kerja (${workDate}) tidak valid untuk menentukan tarif pekerja ${workerId}.`,
    };
  }

  const normalizedRole = String(role ?? '').trim().toLowerCase();
  const eligible = rateHistory
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => isValidYmd(record.effectiveFrom) && record.effectiveFrom <= workDate);

  const workerCandidates = eligible.filter(
    ({ record }) => Boolean(record.workerId) && record.workerId === workerId,
  );
  const latestWorkerRate = pickLatestRateRecord(workerCandidates);

  if (latestWorkerRate) {
    const rateRupiah = toRupiah(latestWorkerRate.rateRupiah);
    if (rateRupiah > 0) {
      return {
        ok: true,
        status: 'configured',
        rateRecordId: latestWorkerRate.id ?? null,
        scope: 'worker',
        rateType: latestWorkerRate.rateType,
        rateRupiah,
        effectiveFrom: latestWorkerRate.effectiveFrom,
        question: null,
      };
    }
    return {
      ok: false,
      status: 'missing_rate',
      rateRecordId: null,
      scope: null,
      rateType: null,
      rateRupiah: 0,
      effectiveFrom: null,
      question: `Tarif resmi pekerja ${workerId} per ${workDate} bernilai <= 0. Mohon isi tarif harian/borongan/bulanan yang sah.`,
    };
  }

  if (normalizedRole) {
    const roleCandidates = eligible.filter(
      ({ record }) =>
        !record.workerId &&
        Boolean(record.roleName) &&
        String(record.roleName).trim().toLowerCase() === normalizedRole,
    );
    const latestRoleRate = pickLatestRateRecord(roleCandidates);
    if (latestRoleRate) {
      const rateRupiah = toRupiah(latestRoleRate.rateRupiah);
      if (rateRupiah > 0) {
        return {
          ok: true,
          status: 'configured',
          rateRecordId: latestRoleRate.id ?? null,
          scope: 'role',
          rateType: latestRoleRate.rateType,
          rateRupiah,
          effectiveFrom: latestRoleRate.effectiveFrom,
          question: null,
        };
      }
    }
  }

  const roleHint = normalizedRole ? ` (peran: ${role})` : '';
  return {
    ok: false,
    status: 'missing_rate',
    rateRecordId: null,
    scope: null,
    rateType: null,
    rateRupiah: 0,
    effectiveFrom: null,
    question: `Tarif resmi pekerja ${workerId}${roleHint} pada tanggal ${workDate} belum diatur. Berapa tarif resminya (harian/borongan/bulanan)?`,
  };
}

/**
 * Menghitung akrual harian upah proyek (`Dr hpp_labor (projectId) / Cr hutang_gaji (partyId)`)
 * per split kehadiran. Pekerja dengan tarif kosong dicatat ke `missingRateQuestions` dan tidak diposting.
 */
export function buildDailyProjectLaborAccruals(
  attendanceSplits: AttendanceProjectSplitInput[],
  rateHistory: CompensationRateRecord[],
  laborPolicy: LaborPolicy,
): DailyProjectLaborAccrualResult {
  const validation = validateDailyAttendanceSplits(attendanceSplits);
  const validationErrors = [...validation.errors];

  if (!Number.isFinite(laborPolicy.standardWorkDaysPerMonth) || laborPolicy.standardWorkDaysPerMonth <= 0) {
    validationErrors.push('laborPolicy.standardWorkDaysPerMonth harus > 0.');
  }
  if (!Number.isFinite(laborPolicy.standardHoursPerDay) || laborPolicy.standardHoursPerDay <= 0) {
    validationErrors.push('laborPolicy.standardHoursPerDay harus > 0.');
  }
  if (!Number.isFinite(laborPolicy.overtimeMultiplier) || laborPolicy.overtimeMultiplier < 0) {
    validationErrors.push('laborPolicy.overtimeMultiplier harus >= 0.');
  }

  for (const split of attendanceSplits) {
    if (!split.partyId || !String(split.partyId).trim()) {
      validationErrors.push(
        `Pekerja ${split.workerName || split.workerId} (${split.workDate}): partyId wajib diisi untuk akun hutang_gaji.`,
      );
    }
  }

  const dates = attendanceSplits.map((s) => s.workDate).filter(isValidYmd).sort();
  const periodLabel = dates.length > 0 ? `${dates[0]}..${dates[dates.length - 1]}` : 'kosong';

  if (validationErrors.length > 0) {
    return {
      ok: false,
      status: 'validation_failed',
      validationErrors,
      entries: [],
      ledgerLines: [],
      totalsByProject: {},
      totalsByWorker: {},
      grandTotalAccrued: 0,
      missingRateQuestions: [],
      missingRateSplits: [],
      provenance: {
        source: 'hrd_daily_project_labor_accrual',
        period: periodLabel,
        assumptions: [
          `Hari kerja/bulan=${laborPolicy.standardWorkDaysPerMonth}, jam/hari=${laborPolicy.standardHoursPerDay}, pengali lembur=${laborPolicy.overtimeMultiplier}x`,
        ],
      },
    };
  }

  const entries: ProjectLaborAccrualEntry[] = [];
  const ledgerLines: AccruedJournalLine[] = [];
  const totalsByProject: Record<string, number> = {};
  const totalsByWorker: Record<string, number> = {};
  const missingRateQuestions: string[] = [];
  const missingRateQuestionSet = new Set<string>();
  const missingRateSplits: DailyProjectLaborAccrualResult['missingRateSplits'] = [];
  let grandTotalAccrued = 0;

  for (const split of attendanceSplits) {
    const workerName = split.workerName || split.workerId;
    const projectName = split.projectName || split.projectId;
    const partyId = String(split.partyId).trim();
    const rateRes = resolveEffectiveCompensationRate(
      split.workerId,
      split.role ?? '',
      split.workDate,
      rateHistory,
    );

    if (!rateRes.ok) {
      if (!missingRateQuestionSet.has(rateRes.question)) {
        missingRateQuestionSet.add(rateRes.question);
        missingRateQuestions.push(rateRes.question);
      }
      missingRateSplits.push({
        workerId: split.workerId,
        workerName,
        role: split.role ?? '',
        projectId: split.projectId,
        workDate: split.workDate,
        question: rateRes.question,
      });
      continue;
    }

    let regularPay = 0;
    if (rateRes.rateType === 'daily') {
      regularPay = toRupiah(split.dayFraction * rateRes.rateRupiah);
    } else if (rateRes.rateType === 'borongan') {
      const units = split.boronganUnits ?? split.dayFraction;
      regularPay = toRupiah(units * rateRes.rateRupiah);
    } else {
      const dailyEquivalent = rateRes.rateRupiah / laborPolicy.standardWorkDaysPerMonth;
      regularPay = toRupiah(split.dayFraction * dailyEquivalent);
    }

    const overtimeHours = Math.max(0, split.overtimeHours ?? 0);
    let overtimePay = 0;
    if (overtimeHours > 0) {
      const dailyEquivalent =
        rateRes.rateType === 'monthly'
          ? rateRes.rateRupiah / laborPolicy.standardWorkDaysPerMonth
          : rateRes.rateRupiah;
      const hourlyBase = dailyEquivalent / laborPolicy.standardHoursPerDay;
      overtimePay = toRupiah(overtimeHours * hourlyBase * laborPolicy.overtimeMultiplier);
    }

    const totalWage = regularPay + overtimePay;
    if (totalWage <= 0) {
      continue;
    }

    const templateLines = projectLaborAccrual(totalWage);
    const journalLines: AccruedJournalLine[] = [
      {
        role: 'hpp_labor',
        accountType: 'hpp_labor',
        debit: templateLines[0].debit,
        credit: 0,
        projectId: split.projectId,
        partyId: null,
        notes: `Akrual upah proyek ${projectName} - ${workerName} (${split.workDate}, fraksi ${split.dayFraction})`,
      },
      {
        role: 'hutang_gaji',
        accountType: 'hutang_gaji',
        debit: 0,
        credit: templateLines[1].credit,
        projectId: null,
        partyId,
        notes: `Hutang upah ${workerName} (${split.workDate})`,
      },
    ];

    const dimCheck = validateJournalDimensions(journalLines);
    if (!dimCheck.ok || !linesAreBalanced(journalLines)) {
      throw new Error(`Jurnal akrual upah tidak valid: ${dimCheck.errors.join('; ')}`);
    }

    entries.push({
      splitId: split.id ?? null,
      workerId: split.workerId,
      workerName,
      partyId,
      projectId: split.projectId,
      projectName,
      workDate: split.workDate,
      dayFraction: split.dayFraction,
      overtimeHours,
      rateType: rateRes.rateType,
      rateRupiah: rateRes.rateRupiah,
      effectiveFrom: rateRes.effectiveFrom,
      regularPayRupiah: regularPay,
      overtimePayRupiah: overtimePay,
      totalWageRupiah: totalWage,
      templateLines,
      journalLines,
    });

    ledgerLines.push(...journalLines);
    totalsByProject[split.projectId] = (totalsByProject[split.projectId] ?? 0) + totalWage;
    totalsByWorker[split.workerId] = (totalsByWorker[split.workerId] ?? 0) + totalWage;
    grandTotalAccrued += totalWage;
  }

  return {
    ok: true,
    status: missingRateQuestions.length > 0 ? 'partial_missing_rate' : 'ready',
    validationErrors: [],
    entries,
    ledgerLines,
    totalsByProject,
    totalsByWorker,
    grandTotalAccrued,
    missingRateQuestions,
    missingRateSplits,
    provenance: {
      source: 'hrd_daily_project_labor_accrual',
      period: periodLabel,
      assumptions: [
        `Hari kerja/bulan=${laborPolicy.standardWorkDaysPerMonth}`,
        `Jam kerja/hari=${laborPolicy.standardHoursPerDay}`,
        `Pengali lembur=${laborPolicy.overtimeMultiplier}x`,
        `Maks potongan kasbon=${laborPolicy.maxKasbonDeductionPct}%`,
      ],
    },
  };
}

function computeProgressivePph21(
  grossWage: number,
  brackets: PayrollStatutoryBracket[],
): number {
  const sorted = [...brackets].sort((a, b) => {
    const ua = a.upToRupiah ?? Number.POSITIVE_INFINITY;
    const ub = b.upToRupiah ?? Number.POSITIVE_INFINITY;
    return ua - ub;
  });
  let remaining = grossWage;
  let prevCap = 0;
  let tax = 0;
  for (const tier of sorted) {
    if (remaining <= 0) break;
    const cap = tier.upToRupiah ?? Number.POSITIVE_INFINITY;
    const sliceWidth = Math.max(0, cap - prevCap);
    const taxableSlice = Math.min(remaining, sliceWidth);
    tax += (taxableSlice * tier.ratePct) / 100;
    remaining -= taxableSlice;
    prevCap = cap;
  }
  return toRupiah(tax);
}

/**
 * Menghitung draf potongan BPJS & PPh 21 100% dari `statutoryConfig` (tanpa tarif hardcode).
 * Selalu melabeli hasil dengan `TAX_DRAFT_DISCLAIMER`.
 */
export function calculatePayrollStatutoryDrafts(input: {
  employees: Array<{ employeeId: string; grossWageRupiah: number }>;
  periodMonth: string;
  statutoryConfig?: PayrollStatutoryConfig | null;
}): PayrollStatutoryDraftResult {
  const { periodKey } = normalizePeriodMonthRange(input.periodMonth);
  const cfg = input.statutoryConfig;
  const missingConfigFields: string[] = [];

  if (!cfg) {
    missingConfigFields.push(
      'statutoryConfig',
      'bpjsKesehatanEmployeePct',
      'bpjsKesehatanEmployerPct',
      'bpjsKetenagakerjaanEmployeePct',
      'bpjsKetenagakerjaanEmployerPct',
      'pph21Method',
    );
  } else {
    if (!isValidPct(cfg.bpjsKesehatanEmployeePct)) missingConfigFields.push('bpjsKesehatanEmployeePct');
    if (!isValidPct(cfg.bpjsKesehatanEmployerPct)) missingConfigFields.push('bpjsKesehatanEmployerPct');
    if (!isValidPct(cfg.bpjsKetenagakerjaanEmployeePct)) missingConfigFields.push('bpjsKetenagakerjaanEmployeePct');
    if (!isValidPct(cfg.bpjsKetenagakerjaanEmployerPct)) missingConfigFields.push('bpjsKetenagakerjaanEmployerPct');

    if (!cfg.pph21Method) {
      missingConfigFields.push('pph21Method');
    } else if (cfg.pph21Method === 'progressive_brackets') {
      if (
        !Array.isArray(cfg.pph21Brackets) ||
        cfg.pph21Brackets.length === 0 ||
        cfg.pph21Brackets.some((b) => !isValidPct(b.ratePct))
      ) {
        missingConfigFields.push('pph21Brackets');
      }
    } else if (!isValidPct(cfg.pph21RatePct)) {
      missingConfigFields.push('pph21RatePct');
    }
  }

  if (missingConfigFields.length > 0 || !cfg) {
    return {
      ok: false,
      status: 'config_required',
      missingConfigFields,
      disclaimer: PAYROLL_STATUTORY_DISCLAIMER,
      bpjsKesehatanEmployee: 0,
      bpjsKesehatanEmployer: 0,
      bpjsKetenagakerjaanEmployee: 0,
      bpjsKetenagakerjaanEmployer: 0,
      pph21Total: 0,
      totalEmployeeDeduction: 0,
      totalEmployerContribution: 0,
      byEmployee: [],
      provenance: {
        source: 'hrd_statutory_draft_config_required',
        period: periodKey,
        assumptions: ['Menunggu konfigurasi tarif BPJS & PPh 21 organisasi (tidak ada tarif hardcode).'],
        disclaimer: PAYROLL_STATUTORY_DISCLAIMER,
      },
    };
  }

  const kesEmpPct = cfg.bpjsKesehatanEmployeePct!;
  const kesErPct = cfg.bpjsKesehatanEmployerPct!;
  const tkEmpPct = cfg.bpjsKetenagakerjaanEmployeePct!;
  const tkErPct = cfg.bpjsKetenagakerjaanEmployerPct!;

  const byEmployee: StatutoryEmployeeDraft[] = [];
  let bpjsKesehatanEmployee = 0;
  let bpjsKesehatanEmployer = 0;
  let bpjsKetenagakerjaanEmployee = 0;
  let bpjsKetenagakerjaanEmployer = 0;
  let pph21Total = 0;

  for (const emp of input.employees) {
    const gross = Math.max(0, toRupiah(emp.grossWageRupiah));
    const kesBase =
      cfg.bpjsKesehatanSalaryCapRupiah != null && cfg.bpjsKesehatanSalaryCapRupiah > 0
        ? Math.min(gross, toRupiah(cfg.bpjsKesehatanSalaryCapRupiah))
        : gross;
    const tkBase =
      cfg.bpjsKetenagakerjaanSalaryCapRupiah != null && cfg.bpjsKetenagakerjaanSalaryCapRupiah > 0
        ? Math.min(gross, toRupiah(cfg.bpjsKetenagakerjaanSalaryCapRupiah))
        : gross;

    const kesEmp = toRupiah((kesBase * kesEmpPct) / 100);
    const kesEr = toRupiah((kesBase * kesErPct) / 100);
    const tkEmp = toRupiah((tkBase * tkEmpPct) / 100);
    const tkEr = toRupiah((tkBase * tkErPct) / 100);
    const pph21 =
      cfg.pph21Method === 'progressive_brackets'
        ? computeProgressivePph21(gross, cfg.pph21Brackets!)
        : toRupiah((gross * cfg.pph21RatePct!) / 100);

    const totalEmpDed = kesEmp + tkEmp + pph21;
    const totalErCont = kesEr + tkEr;

    byEmployee.push({
      employeeId: emp.employeeId,
      grossWageRupiah: gross,
      bpjsKesehatanEmployee: kesEmp,
      bpjsKesehatanEmployer: kesEr,
      bpjsKetenagakerjaanEmployee: tkEmp,
      bpjsKetenagakerjaanEmployer: tkEr,
      pph21Amount: pph21,
      totalEmployeeDeduction: totalEmpDed,
      totalEmployerContribution: totalErCont,
    });

    bpjsKesehatanEmployee += kesEmp;
    bpjsKesehatanEmployer += kesEr;
    bpjsKetenagakerjaanEmployee += tkEmp;
    bpjsKetenagakerjaanEmployer += tkEr;
    pph21Total += pph21;
  }

  const totalEmployeeDeduction =
    bpjsKesehatanEmployee + bpjsKetenagakerjaanEmployee + pph21Total;
  const totalEmployerContribution =
    bpjsKesehatanEmployer + bpjsKetenagakerjaanEmployer;

  return {
    ok: true,
    status: 'draft_ready',
    missingConfigFields: [],
    disclaimer: PAYROLL_STATUTORY_DISCLAIMER,
    bpjsKesehatanEmployee,
    bpjsKesehatanEmployer,
    bpjsKetenagakerjaanEmployee,
    bpjsKetenagakerjaanEmployer,
    pph21Total,
    totalEmployeeDeduction,
    totalEmployerContribution,
    byEmployee,
    provenance: {
      source: 'hrd_statutory_config_draft',
      period: periodKey,
      assumptions: [
        `BPJS Kesehatan: pekerja ${kesEmpPct}% / pemberi kerja ${kesErPct}%`,
        `BPJS Ketenagakerjaan: pekerja ${tkEmpPct}% / pemberi kerja ${tkErPct}%`,
        `PPh 21 metode=${cfg.pph21Method}`,
        ...(cfg.regulationRef ? [`Ref regulasi: ${cfg.regulationRef}`] : []),
      ],
      disclaimer: PAYROLL_STATUTORY_DISCLAIMER,
    },
  };
}

/**
 * Menghitung akrual gaji bulanan karyawan kantor (`Dr beban_opex / Cr hutang_gaji`),
 * bukan beban proyek (`hpp_labor`), lengkap dengan draf BPJS & PPh 21 konfigurabel.
 */
export function buildOfficeMonthlyPayrollAccrual(
  officeEmployees: OfficeEmployeePayrollInput[],
  periodMonth: string,
  rateHistory: CompensationRateRecord[],
  statutoryConfig?: PayrollStatutoryConfig | null,
): OfficeMonthlyPayrollAccrualResult {
  const { periodKey, endDate } = normalizePeriodMonthRange(periodMonth);
  const validationErrors: string[] = [];

  for (const emp of officeEmployees) {
    if (!emp.employeeId || !String(emp.employeeId).trim()) {
      validationErrors.push('employeeId karyawan kantor wajib diisi.');
    }
    if (!emp.partyId || !String(emp.partyId).trim()) {
      validationErrors.push(
        `Karyawan ${emp.employeeName || emp.employeeId}: partyId wajib diisi untuk hutang_gaji.`,
      );
    }
    if (
      emp.prorateFactor != null &&
      (!Number.isFinite(emp.prorateFactor) || emp.prorateFactor < 0 || emp.prorateFactor > 1)
    ) {
      validationErrors.push(
        `Karyawan ${emp.employeeName || emp.employeeId}: prorateFactor harus antara 0 dan 1.`,
      );
    }
  }

  if (validationErrors.length > 0) {
    const emptyStatutory = calculatePayrollStatutoryDrafts({
      employees: [],
      periodMonth: periodKey,
      statutoryConfig,
    });
    return {
      ok: false,
      status: 'validation_failed',
      periodMonth: periodKey,
      validationErrors,
      entries: [],
      ledgerLines: [],
      totalOfficeOpexAccrued: 0,
      missingRateQuestions: [],
      statutoryDrafts: emptyStatutory,
      provenance: {
        source: 'hrd_office_monthly_payroll_accrual',
        period: periodKey,
        assumptions: ['Gaji kantor dibukukan sebagai beban_opex, bukan hpp_labor proyek.'],
        disclaimer: PAYROLL_STATUTORY_DISCLAIMER,
      },
    };
  }

  const entries: OfficePayrollAccrualEntry[] = [];
  const ledgerLines: AccruedJournalLine[] = [];
  const missingRateQuestions: string[] = [];
  let totalOfficeOpexAccrued = 0;

  for (const emp of officeEmployees) {
    const employeeName = emp.employeeName || emp.employeeId;
    const rateRes = resolveEffectiveCompensationRate(
      emp.employeeId,
      emp.role,
      endDate,
      rateHistory,
    );

    if (!rateRes.ok) {
      missingRateQuestions.push(rateRes.question);
      continue;
    }

    const prorateFactor = emp.prorateFactor ?? 1;
    const allowances = Math.max(0, toRupiah(emp.allowancesRupiah ?? 0));
    const baseSalary = toRupiah(rateRes.rateRupiah * prorateFactor);
    const grossSalary = baseSalary + allowances;
    if (grossSalary <= 0) continue;

    const templateLines = officePayrollAccrual(grossSalary);
    const journalLines: AccruedJournalLine[] = [
      {
        role: 'beban_opex',
        accountType: 'beban_opex',
        debit: templateLines[0].debit,
        credit: 0,
        projectId: null,
        partyId: null,
        notes: `Akrual gaji kantor ${periodKey} - ${employeeName}`,
      },
      {
        role: 'hutang_gaji',
        accountType: 'hutang_gaji',
        debit: 0,
        credit: templateLines[1].credit,
        projectId: null,
        partyId: emp.partyId,
        notes: `Hutang gaji kantor ${periodKey} - ${employeeName}`,
      },
    ];

    const dimCheck = validateJournalDimensions(journalLines);
    if (!dimCheck.ok || !linesAreBalanced(journalLines)) {
      throw new Error(`Jurnal akrual gaji kantor tidak valid: ${dimCheck.errors.join('; ')}`);
    }

    entries.push({
      employeeId: emp.employeeId,
      employeeName,
      partyId: emp.partyId,
      role: emp.role,
      rateType: rateRes.rateType,
      rateRupiah: rateRes.rateRupiah,
      effectiveFrom: rateRes.effectiveFrom,
      prorateFactor,
      allowancesRupiah: allowances,
      grossSalaryRupiah: grossSalary,
      templateLines,
      journalLines,
    });

    ledgerLines.push(...journalLines);
    totalOfficeOpexAccrued += grossSalary;
  }

  const statutoryDrafts = calculatePayrollStatutoryDrafts({
    employees: entries.map((e) => ({
      employeeId: e.employeeId,
      grossWageRupiah: e.grossSalaryRupiah,
    })),
    periodMonth: periodKey,
    statutoryConfig,
  });

  return {
    ok: true,
    status: missingRateQuestions.length > 0 ? 'partial_missing_rate' : 'ready',
    periodMonth: periodKey,
    validationErrors: [],
    entries,
    ledgerLines,
    totalOfficeOpexAccrued,
    missingRateQuestions,
    statutoryDrafts,
    provenance: {
      source: 'hrd_office_monthly_payroll_accrual',
      period: periodKey,
      assumptions: ['Gaji kantor dibukukan sebagai beban_opex, bukan hpp_labor proyek.'],
      disclaimer: PAYROLL_STATUTORY_DISCLAIMER,
    },
  };
}

/**
 * Menghitung pelunasan hutang gaji dengan potongan kasbon bersaldo (dibatasi `maxDeductionPct` dari `laborPolicy`).
 * Menghasilkan template jurnal seimbang `Dr hutang_gaji / Cr kas + Cr piutang` dan sisa saldo kasbon yang terbawa.
 */
export function computeKasbonSettlement(
  openingKasbonBalance: number,
  grossPayable: number,
  maxDeductionPct: number,
): KasbonSettlementResult {
  const opening = Math.max(0, toRupiah(openingKasbonBalance));
  const gross = Math.max(0, toRupiah(grossPayable));
  const pct = Number.isFinite(maxDeductionPct) ? Math.min(100, Math.max(0, maxDeductionPct)) : 0;
  const maxAllowedDeduction = Math.round((gross * pct) / 100);
  const deductedAmount = Math.min(opening, gross, maxAllowedDeduction);
  const netCashPayout = gross - deductedAmount;
  const remainingKasbonBalance = opening - deductedAmount;
  const journalLines = payrollLiabilitySettlement(gross, deductedAmount);
  const isBalanced = gross > 0 ? linesAreBalanced(journalLines) : journalLines.length === 0;

  return {
    openingKasbonBalance: opening,
    grossPayable: gross,
    maxDeductionPct: pct,
    maxAllowedDeduction,
    deductedAmount,
    netCashPayout,
    remainingKasbonBalance,
    journalLines,
    isBalanced,
  };
}
