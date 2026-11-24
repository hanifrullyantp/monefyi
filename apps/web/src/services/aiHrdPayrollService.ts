import { supabase } from '../lib/supabase';
import { assertNoDbError } from '../lib/supabaseErrors';
import type { OrgMember } from '../types/onboarding';
import type { AttendanceRecord } from '../services/attendanceService';
import type { MemberCompensation, BonRequest } from '../services/payrollService';
import type { postPayrollDisbursementJournal as PostPayrollJournalFn } from './financeV2/payrollJournalBridge';

export interface FieldPayrollBudget {
  budgetAmount: number;
  sourceAccount: 'kas_lapangan' | 'mayar_wallet' | 'bank_transfer' | 'lainnya';
  periodLabel: string;
  notes: string;
  managerName: string;
}

export interface LaborPolicyConfig {
  standardWorkDaysPerMonth?: number;
  overtimeThresholdDays?: number;
  overtimeMultiplier?: number;
  maxKasbonDeductionPct?: number;
}

export type PaymentConfirmation =
  | {
      kind: 'provider_webhook';
      providerName: string;
      externalReference: string;
      verifiedAt: string;
    }
  | {
      kind: 'manual_owner_confirmation';
      confirmedBy: string;
      confirmedAt: string;
      paymentMethod: 'cash' | 'bank_transfer';
      proofNote?: string;
    };

export interface EmployeePayrollCalculation {
  memberId: string;
  userId: string;
  name: string;
  position: string;
  role: string;
  phone: string;
  salaryType: 'daily' | 'monthly';
  baseRate: number;
  rateStatus: 'configured' | 'missing_rate';
  requiresRateQuestion: boolean;
  daysPresent: number;
  grossSalary: number;
  overtimeBonus: number;
  totalKasbon: number;
  appliedKasbonDeduction: number;
  kasbonDeduction: number;
  remainingKasbonBalance: number;
  kasbonShortfall: number;
  netSalary: number;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  isBankValid: boolean;
  status: 'draft' | 'verified' | 'awaiting_payment_confirmation' | 'paid' | 'journal_post_failed';
  paymentConfirmed?: boolean;
  paymentConfirmation?: PaymentConfirmation;
  payrollEntryId?: string;
  journalId?: string;
  journalError?: string;
  disbursementRef?: string;
  paidAt?: string;
}

export interface PayrollAnalysisSummary {
  totalEmployees: number;
  totalGross: number;
  totalBonus: number;
  totalDeduction: number;
  totalRemainingKasbon: number;
  totalKasbonShortfall: number;
  totalNet: number;
  budgetSubmitted: number;
  budgetVariance: number;
  isSufficient: boolean;
  missingBankCount: number;
  missingRateCount: number;
  missingRateQuestions: string[];
  isReadyForDisbursement: boolean;
  aiObservations: string[];
  aiRecommendation: string;
  calculatedAt: string;
}

export interface PayrollJournalErrorItem {
  userId: string;
  employeeName: string;
  payrollEntryId?: string;
  message: string;
}

export interface DisbursementBatchRecord {
  id: string;
  orgId: string;
  periodLabel: string;
  periodMonth?: string;
  managerName: string;
  sourceAccount: string;
  budgetAmount: number;
  totalDisbursed: number;
  employeeCount: number;
  batchRef: string;
  mayarBatchRef: string;
  providerName?: string;
  status: 'awaiting_payment_confirmation' | 'paid' | 'journal_post_failed' | 'draft';
  paymentConfirmed: boolean;
  paymentConfirmation?: PaymentConfirmation;
  preparedBy: string;
  confirmedBy?: string;
  executedAt: string;
  executedBy: string;
  confirmedAt?: string;
  journalErrors?: PayrollJournalErrorItem[];
  items: EmployeePayrollCalculation[];
}

export interface PayrollPayoutBatchInput {
  orgId: string;
  periodLabel: string;
  periodMonth: string;
  sourceAccount: FieldPayrollBudget['sourceAccount'];
  items: EmployeePayrollCalculation[];
  preparedBy: string;
}

export interface PayrollPayoutBatchResult {
  providerName: string;
  externalBatchRef: string;
  status: 'awaiting_payment_confirmation';
  createdAt: string;
}

export interface PayrollPaymentProvider {
  name: string;
  createPayoutBatch(input: PayrollPayoutBatchInput): Promise<PayrollPayoutBatchResult>;
  verifyPaymentConfirmation(params: {
    batchRef: string;
    confirmation: PaymentConfirmation;
  }): Promise<{ verified: boolean; reason?: string; externalReference?: string }>;
}

export class PayrollJournalPostError extends Error {
  batch: DisbursementBatchRecord;

  constructor(message: string, batch: DisbursementBatchRecord) {
    super(message);
    this.name = 'PayrollJournalPostError';
    this.batch = batch;
  }
}

const STORAGE_KEY_DISBURSEMENTS = 'monefyi_hrd_mayar_disbursements';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

/**
 * Provider pembayaran default: tidak pernah mengeksekusi transfer uang atau
 * mengklaim status lunas tanpa konfirmasi webhook penyedia atau konfirmasi manual pemilik.
 */
export const defaultPayrollPaymentProvider: PayrollPaymentProvider = {
  name: 'manual_or_external_payout',
  async createPayoutBatch() {
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return {
      providerName: 'manual_or_external_payout',
      externalBatchRef: `PAY-PREP-${Date.now().toString().slice(-6)}-${suffix}`,
      status: 'awaiting_payment_confirmation',
      createdAt: new Date().toISOString(),
    };
  },
  async verifyPaymentConfirmation({ confirmation }) {
    if (confirmation.kind === 'manual_owner_confirmation') {
      if (!confirmation.confirmedBy?.trim() || !confirmation.confirmedAt?.trim()) {
        return { verified: false, reason: 'confirmedBy dan confirmedAt wajib diisi.' };
      }
      if (confirmation.paymentMethod !== 'cash' && confirmation.paymentMethod !== 'bank_transfer') {
        return { verified: false, reason: 'paymentMethod harus cash atau bank_transfer.' };
      }
      return { verified: true, externalReference: confirmation.proofNote || undefined };
    }
    if (!confirmation.providerName?.trim() || !confirmation.externalReference?.trim() || !confirmation.verifiedAt?.trim()) {
      return { verified: false, reason: 'Webhook penyedia pembayaran wajib memuat providerName, externalReference, dan verifiedAt.' };
    }
    return { verified: true, externalReference: confirmation.externalReference };
  },
};

function resolveLaborPolicy(laborPolicy?: LaborPolicyConfig): Required<LaborPolicyConfig> {
  return {
    standardWorkDaysPerMonth:
      laborPolicy?.standardWorkDaysPerMonth && laborPolicy.standardWorkDaysPerMonth > 0
        ? laborPolicy.standardWorkDaysPerMonth
        : 22,
    overtimeThresholdDays:
      laborPolicy?.overtimeThresholdDays !== undefined && laborPolicy.overtimeThresholdDays >= 0
        ? laborPolicy.overtimeThresholdDays
        : 24,
    overtimeMultiplier:
      laborPolicy?.overtimeMultiplier !== undefined && laborPolicy.overtimeMultiplier >= 0
        ? laborPolicy.overtimeMultiplier
        : 1.5,
    maxKasbonDeductionPct:
      laborPolicy?.maxKasbonDeductionPct !== undefined
        ? Math.min(100, Math.max(0, laborPolicy.maxKasbonDeductionPct))
        : 100,
  };
}

/**
 * AI HRD: Hitung dan pilah kalkulasi gaji per karyawan berdasarkan data presensi,
 * kompensasi resmi (tanpa tarif cadangan tebakan), kebijakan kerja konfigurabel, dan potongan kasbon jujur.
 */
export function analyzeFieldPayroll(params: {
  budget: FieldPayrollBudget;
  members: OrgMember[];
  attendanceRecords: AttendanceRecord[];
  compensationList: MemberCompensation[];
  bonRequests: BonRequest[];
  hoursPerDay?: number;
  laborPolicy?: LaborPolicyConfig;
}): {
  calculations: EmployeePayrollCalculation[];
  summary: PayrollAnalysisSummary;
} {
  const { budget, members, attendanceRecords, compensationList, bonRequests } = params;
  const policy = resolveLaborPolicy(params.laborPolicy);

  const compMap = new Map<string, MemberCompensation>();
  for (const c of compensationList) {
    compMap.set(c.user_id, c);
  }

  const attendanceDaysMap = new Map<string, Set<string>>();
  for (const att of attendanceRecords) {
    if (!attendanceDaysMap.has(att.user_id)) {
      attendanceDaysMap.set(att.user_id, new Set());
    }
    const recordAny = att as unknown as { recorded_at?: string; timestamp?: string };
    const dateStr =
      (recordAny.recorded_at || recordAny.timestamp || '').slice(0, 10) ||
      new Date().toISOString().slice(0, 10);
    attendanceDaysMap.get(att.user_id)!.add(dateStr);
  }

  const bonMap = new Map<string, number>();
  for (const b of bonRequests) {
    if (b.status === 'approved') {
      const current = bonMap.get(b.user_id) || 0;
      bonMap.set(b.user_id, current + (Number(b.amount) || 0));
    }
  }

  const fieldMembers = members.filter(
    (m) =>
      m.role === 'worker' ||
      /tukang|mandor|site|lapangan|pelaksana|helper|kenek|proyek/i.test(m.position || ''),
  );

  const calculations: EmployeePayrollCalculation[] = [];
  const missingRateQuestions: string[] = [];
  let totalGross = 0;
  let totalBonus = 0;
  let totalDeduction = 0;
  let totalRemainingKasbon = 0;
  let totalKasbonShortfall = 0;
  let totalNet = 0;
  let missingBankCount = 0;
  let missingRateCount = 0;

  for (const m of fieldMembers) {
    const comp = compMap.get(m.user_id);
    const presentSet = attendanceDaysMap.get(m.user_id);
    const daysPresent = presentSet ? presentSet.size : 0;
    const workerName = m.profile?.name || m.user_id.slice(0, 8);

    const salaryType = comp?.salary_type || 'daily';
    const rawMonthly = Number(comp?.monthly_salary) || 0;
    const rawDaily = Number(comp?.daily_rate) || 0;

    const isMissingRate =
      salaryType === 'daily' ? !comp || rawDaily <= 0 : !comp || rawMonthly <= 0;

    let baseRate = 0;
    let dailyRateForOvertime = 0;
    let gross = 0;
    let overtimeBonus = 0;
    let rateStatus: 'configured' | 'missing_rate' = 'configured';
    let requiresRateQuestion = false;

    if (isMissingRate) {
      rateStatus = 'missing_rate';
      requiresRateQuestion = true;
      missingRateCount += 1;
      missingRateQuestions.push(
        `Tarif ${salaryType === 'daily' ? 'harian' : 'bulanan'} untuk ${workerName} belum diisi atau <= 0. Berapa tarif resmi yang berlaku sebelum penggajian diproses?`,
      );
    } else if (salaryType === 'daily') {
      baseRate = rawDaily;
      dailyRateForOvertime = rawDaily;
      gross = Math.round(rawDaily * daysPresent);
    } else {
      baseRate = rawMonthly;
      gross = rawMonthly;
      dailyRateForOvertime =
        rawDaily > 0 ? rawDaily : Math.round(rawMonthly / policy.standardWorkDaysPerMonth);
    }

    if (!isMissingRate && daysPresent > policy.overtimeThresholdDays) {
      overtimeBonus = Math.round(
        (daysPresent - policy.overtimeThresholdDays) *
          dailyRateForOvertime *
          policy.overtimeMultiplier,
      );
    }

    const totalKasbon = bonMap.get(m.user_id) || 0;
    const totalEarnings = gross + overtimeBonus;
    const maxDeductible = Math.round(totalEarnings * (policy.maxKasbonDeductionPct / 100));
    const appliedKasbonDeduction = Math.min(totalKasbon, totalEarnings, maxDeductible);
    const remainingKasbonBalance = totalKasbon - appliedKasbonDeduction;
    const kasbonShortfall = totalKasbon > totalEarnings ? totalKasbon - totalEarnings : 0;
    const net = totalEarnings - appliedKasbonDeduction;

    const bankName = (m.bank_name || '').trim();
    const bankAccount = (m.bank_account || '').trim();
    const bankHolder = (m.bank_holder || m.profile?.name || '').trim();
    const isBankValid = Boolean(bankName && bankAccount && bankAccount.length >= 6);

    if (!isBankValid) {
      missingBankCount += 1;
    }

    totalGross += gross;
    totalBonus += overtimeBonus;
    totalDeduction += appliedKasbonDeduction;
    totalRemainingKasbon += remainingKasbonBalance;
    totalKasbonShortfall += kasbonShortfall;
    totalNet += net;

    calculations.push({
      memberId: m.id,
      userId: m.user_id,
      name: workerName,
      position: m.position || (m.role === 'worker' ? 'Tukang Lapangan' : 'Staf Proyek'),
      role: m.role,
      phone: m.phone || '',
      salaryType,
      baseRate,
      rateStatus,
      requiresRateQuestion,
      daysPresent,
      grossSalary: gross,
      overtimeBonus,
      totalKasbon,
      appliedKasbonDeduction,
      kasbonDeduction: appliedKasbonDeduction,
      remainingKasbonBalance,
      kasbonShortfall,
      netSalary: net,
      bankName: bankName || 'Belum Diisi',
      bankAccount: bankAccount || '-',
      bankHolder: bankHolder || '-',
      isBankValid,
      status: isMissingRate ? 'draft' : 'verified',
      paymentConfirmed: false,
    });
  }

  const variance = budget.budgetAmount - totalNet;
  const isSufficient = budget.budgetAmount >= totalNet;

  const aiObservations: string[] = [];
  if (missingRateCount > 0) {
    aiObservations.push(
      `❓ Terdapat ${missingRateCount} pekerja tanpa tarif gaji resmi (Rp 0 — tidak ditebak otomatis). Lengkapi tarif sebelum konfirmasi pembayaran:`,
    );
    for (const q of missingRateQuestions) {
      aiObservations.push(q);
    }
  }

  if (isSufficient) {
    aiObservations.push(
      `✅ Anggaran dari Manager Lapangan (Rp ${budget.budgetAmount.toLocaleString('id-ID')}) mencukupi total gaji bersih ${calculations.length} pekerja (Rp ${totalNet.toLocaleString('id-ID')}). Sisa alokasi: Rp ${variance.toLocaleString('id-ID')}.`,
    );
  } else {
    aiObservations.push(
      `⚠️ Anggaran dari Manager Lapangan kurang Rp ${Math.abs(variance).toLocaleString('id-ID')} dari total gaji bersih (Rp ${totalNet.toLocaleString('id-ID')}).`,
    );
  }

  if (totalDeduction > 0) {
    aiObservations.push(
      `✂️ Total potongan kasbon diterapkan: Rp ${totalDeduction.toLocaleString('id-ID')}.`,
    );
  }
  if (totalRemainingKasbon > 0) {
    aiObservations.push(
      `📌 Sisa saldo kasbon yang belum terpotong: Rp ${totalRemainingKasbon.toLocaleString('id-ID')} (kekurangan terhadap gaji periode ini: Rp ${totalKasbonShortfall.toLocaleString('id-ID')}) tetap tercatat sebagai saldo piutang kasbon.`,
    );
  }

  if (missingBankCount > 0) {
    aiObservations.push(
      `⚠️ Ada ${missingBankCount} pekerja yang rekening banknya belum lengkap. Siapkan pembayaran tunai atau lengkapi nomor rekening.`,
    );
  } else {
    aiObservations.push('🏦 Data rekening bank seluruh pekerja lapangan valid.');
  }

  let aiRecommendation = '';
  if (missingRateCount > 0) {
    aiRecommendation =
      'AI HRD merekomendasikan: Lengkapi tarif gaji pekerja yang masih kosong sebelum menyiapkan batch pembayaran.';
  } else if (!isSufficient) {
    aiRecommendation =
      'AI HRD merekomendasikan: Tambahkan alokasi saldo atau sesuaikan persetujuan gaji sebelum pembayaran dilakukan.';
  } else if (missingBankCount > 0) {
    aiRecommendation =
      'AI HRD merekomendasikan: Konfirmasi metode pembayaran tunai/rekening pekerja yang belum lengkap, lalu siapkan draf batch pembayaran (status tetap menunggu konfirmasi pembayaran nyata).';
  } else {
    aiRecommendation =
      'AI HRD merekomendasikan: Siapkan batch pembayaran untuk ditinjau & dibayar secara nyata; status baru menjadi LUNAS setelah konfirmasi pembayaran dan posting jurnal berhasil.';
  }

  return {
    calculations,
    summary: {
      totalEmployees: calculations.length,
      totalGross,
      totalBonus,
      totalDeduction,
      totalRemainingKasbon,
      totalKasbonShortfall,
      totalNet,
      budgetSubmitted: budget.budgetAmount,
      budgetVariance: variance,
      isSufficient,
      missingBankCount,
      missingRateCount,
      missingRateQuestions,
      isReadyForDisbursement: isSufficient && missingRateCount === 0,
      aiObservations,
      aiRecommendation,
      calculatedAt: new Date().toISOString(),
    },
  };
}

export interface PreparePayrollBatchParams {
  orgId: string;
  budget: FieldPayrollBudget;
  items: EmployeePayrollCalculation[];
  actorId: string;
  preparedBy?: string;
  periodMonth?: string;
  paymentProvider?: PayrollPaymentProvider;
  skipDbSync?: boolean;
}

export interface ConfirmPayrollBatchParams {
  orgId: string;
  budget: FieldPayrollBudget;
  items: EmployeePayrollCalculation[];
  actorId: string;
  preparedBy?: string;
  batchRef?: string;
  periodMonth?: string;
  paymentConfirmation: PaymentConfirmation;
  paymentProvider?: PayrollPaymentProvider;
  skipDbSync?: boolean;
  deps?: {
    postPayrollDisbursementJournal?: typeof PostPayrollJournalFn;
  };
}

function validatePaymentConfirmationPolicy(
  confirmation: PaymentConfirmation,
  preparedBy: string,
): void {
  if (confirmation.kind === 'manual_owner_confirmation') {
    if (!confirmation.confirmedBy?.trim()) {
      throw new Error('confirmedBy wajib diisi untuk konfirmasi pembayaran manual.');
    }
    if (preparedBy && confirmation.confirmedBy === preparedBy) {
      throw new Error(
        'self_approval_forbidden: Konfirmasi pembayaran manual wajib dilakukan oleh pihak berbeda dari penyusun batch (confirmedBy !== preparedBy).',
      );
    }
  } else if (confirmation.kind === 'provider_webhook') {
    if (
      !confirmation.providerName?.trim() ||
      !confirmation.externalReference?.trim() ||
      !confirmation.verifiedAt?.trim()
    ) {
      throw new Error(
        'Webhook penyedia pembayaran tidak lengkap (providerName, externalReference, verifiedAt wajib diisi).',
      );
    }
  }
}

async function upsertPayrollEntryRow(params: {
  orgId: string;
  item: EmployeePayrollCalculation;
  periodMonthIso: string;
  status: 'approved' | 'paid';
  notes: string;
  nowIso: string;
}): Promise<string> {
  const { orgId, item, periodMonthIso, status, notes, nowIso } = params;
  const { data, error } = await supabase
    .from('planner_payroll_entries')
    .upsert(
      {
        org_id: orgId,
        user_id: item.userId,
        period_month: periodMonthIso,
        days_present: item.daysPresent,
        base_amount: item.grossSalary,
        bonus_amount: item.overtimeBonus,
        deduction_amount: item.kasbonDeduction,
        net_amount: item.netSalary,
        status,
        notes,
        updated_at: nowIso,
      },
      { onConflict: 'org_id,user_id,period_month' },
    )
    .select('id')
    .single();

  assertNoDbError(error);
  const entryId = data?.id;
  if (!isValidUuid(entryId)) {
    throw new Error(
      `planner_payroll_entries.id harus berupa UUID valid, diterima: ${String(entryId)}`,
    );
  }
  return entryId;
}

/**
 * Tahap 1 (Persiapan): Menyiapkan draf batch pembayaran tanpa mengklaim transfer selesai/LUNAS.
 * Status batch selalu 'awaiting_payment_confirmation'.
 */
export async function preparePayrollDisbursementBatch(
  params: PreparePayrollBatchParams,
): Promise<DisbursementBatchRecord> {
  const {
    orgId,
    budget,
    items,
    actorId,
    preparedBy = actorId,
    periodMonth,
    paymentProvider = defaultPayrollPaymentProvider,
    skipDbSync,
  } = params;

  const nowIso = new Date().toISOString();
  const periodMonthIso = periodMonth || nowIso.slice(0, 7) + '-01';
  const preparedItems = items.map((item) => ({ ...item }));

  const providerBatch = await paymentProvider.createPayoutBatch({
    orgId,
    periodLabel: budget.periodLabel,
    periodMonth: periodMonthIso,
    sourceAccount: budget.sourceAccount,
    items: preparedItems,
    preparedBy,
  });

  const batchRef = providerBatch.externalBatchRef;

  for (const item of preparedItems) {
    item.disbursementRef = batchRef;
    item.status = 'awaiting_payment_confirmation';
    item.paymentConfirmed = false;
    item.paidAt = undefined;

    if (!skipDbSync) {
      const entryId = await upsertPayrollEntryRow({
        orgId,
        item,
        periodMonthIso,
        status: 'approved',
        notes: `Menunggu konfirmasi pembayaran (${paymentProvider.name}). Ref: ${batchRef}`,
        nowIso,
      });
      item.payrollEntryId = entryId;
    }
  }

  const batchRecord: DisbursementBatchRecord = {
    id: `batch_${Date.now()}`,
    orgId,
    periodLabel: budget.periodLabel,
    periodMonth: periodMonthIso,
    managerName: budget.managerName,
    sourceAccount: budget.sourceAccount,
    budgetAmount: budget.budgetAmount,
    totalDisbursed: preparedItems.reduce((s, x) => s + x.netSalary, 0),
    employeeCount: preparedItems.length,
    batchRef,
    mayarBatchRef: batchRef,
    providerName: providerBatch.providerName,
    status: 'awaiting_payment_confirmation',
    paymentConfirmed: false,
    preparedBy,
    executedAt: nowIso,
    executedBy: actorId,
    items: preparedItems,
  };

  saveDisbursementRecord(batchRecord, skipDbSync ? undefined : orgId);
  return batchRecord;
}

/**
 * Tahap 2 (Konfirmasi Nyata & Posting Jurnal Atomik):
 * Hanya menandai 'paid' setelah paymentConfirmation terverifikasi (webhook/owner SoD)
 * DAN posting jurnal dengan UUID valid planner_payroll_entries.id berhasil tanpa error.
 */
export async function confirmPayrollDisbursementBatch(
  params: ConfirmPayrollBatchParams,
): Promise<DisbursementBatchRecord> {
  const {
    orgId,
    budget,
    items,
    actorId,
    preparedBy = actorId,
    batchRef: incomingBatchRef,
    periodMonth,
    paymentConfirmation,
    paymentProvider = defaultPayrollPaymentProvider,
    skipDbSync,
    deps,
  } = params;

  if (!paymentConfirmation) {
    throw new Error(
      'Konfirmasi pembayaran nyata (webhook penyedia atau konfirmasi manual pemilik) wajib disertakan.',
    );
  }

  validatePaymentConfirmationPolicy(paymentConfirmation, preparedBy);

  const nowIso = new Date().toISOString();
  const periodMonthIso = periodMonth || nowIso.slice(0, 7) + '-01';
  const confirmedItems = items.map((item) => ({ ...item }));

  let batchRef = incomingBatchRef;
  let providerName = paymentProvider.name;
  if (!batchRef) {
    const created = await paymentProvider.createPayoutBatch({
      orgId,
      periodLabel: budget.periodLabel,
      periodMonth: periodMonthIso,
      sourceAccount: budget.sourceAccount,
      items: confirmedItems,
      preparedBy,
    });
    batchRef = created.externalBatchRef;
    providerName = created.providerName;
  }

  const verification = await paymentProvider.verifyPaymentConfirmation({
    batchRef,
    confirmation: paymentConfirmation,
  });
  if (!verification.verified) {
    throw new Error(
      `Konfirmasi pembayaran gagal diverifikasi: ${verification.reason || 'alasan tidak diketahui'}`,
    );
  }

  const confirmedBy =
    paymentConfirmation.kind === 'manual_owner_confirmation'
      ? paymentConfirmation.confirmedBy
      : paymentConfirmation.providerName;
  const confirmedAt =
    paymentConfirmation.kind === 'manual_owner_confirmation'
      ? paymentConfirmation.confirmedAt
      : paymentConfirmation.verifiedAt;

  const postPayrollJournal =
    deps?.postPayrollDisbursementJournal ??
    (await import('./financeV2/payrollJournalBridge')).postPayrollDisbursementJournal;

  const journalErrors: PayrollJournalErrorItem[] = [];

  for (const item of confirmedItems) {
    item.disbursementRef = batchRef;

    let payrollEntryId = item.payrollEntryId;
    if (!skipDbSync && !isValidUuid(payrollEntryId)) {
      payrollEntryId = await upsertPayrollEntryRow({
        orgId,
        item,
        periodMonthIso,
        status: 'approved',
        notes: `Terverifikasi pembayaran (${paymentConfirmation.kind}). Menunggu posting jurnal. Ref: ${batchRef}`,
        nowIso,
      });
      item.payrollEntryId = payrollEntryId;
    }

    if (payrollEntryId && !isValidUuid(payrollEntryId)) {
      throw new Error(
        `payrollEntryId tidak valid (harus UUID dari planner_payroll_entries.id): ${payrollEntryId}`,
      );
    }

    const shouldPostJournal =
      item.netSalary > 0 && (!skipDbSync || Boolean(deps?.postPayrollDisbursementJournal));

    if (shouldPostJournal) {
      if (!isValidUuid(payrollEntryId)) {
        throw new Error(
          `payrollEntryId wajib berupa UUID valid sebelum posting jurnal gaji untuk ${item.name}.`,
        );
      }

      try {
        const journalRes = await postPayrollJournal({
          orgId,
          payrollEntryId,
          userId: item.userId,
          periodMonth: periodMonthIso,
          netAmount: item.netSalary,
          employeeName: item.name,
          createdBy: confirmedBy,
        });
        if (journalRes?.journalId) {
          item.journalId = journalRes.journalId;
        }
      } catch (journalErr) {
        const errMsg = journalErr instanceof Error ? journalErr.message : String(journalErr);
        item.status = 'journal_post_failed';
        item.paymentConfirmed = false;
        item.paidAt = undefined;
        item.journalError = errMsg;
        journalErrors.push({
          userId: item.userId,
          employeeName: item.name,
          payrollEntryId,
          message: errMsg,
        });

        if (!skipDbSync) {
          await supabase
            .from('planner_payroll_entries')
            .update({
              status: 'approved',
              notes: `[JOURNAL_POST_FAILED] ${errMsg}`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', payrollEntryId);
        }
        continue;
      }
    }

    if (!skipDbSync && isValidUuid(payrollEntryId)) {
      const { error: paidErr } = await supabase
        .from('planner_payroll_entries')
        .update({
          status: 'paid',
          notes: `Lunas terkonfirmasi (${paymentConfirmation.kind}). Ref: ${batchRef}. Rek: ${item.bankName} ${item.bankAccount}`,
          updated_at: nowIso,
        })
        .eq('id', payrollEntryId);
      assertNoDbError(paidErr);

      if (item.kasbonDeduction > 0) {
        const { error: bonErr } = await supabase
          .from('planner_bon_requests')
          .update({
            status: 'paid',
            reviewed_at: nowIso,
          })
          .eq('org_id', orgId)
          .eq('user_id', item.userId)
          .eq('status', 'approved');
        assertNoDbError(bonErr);
      }
    }

    item.status = 'paid';
    item.paymentConfirmed = true;
    item.paymentConfirmation = paymentConfirmation;
    item.paidAt = confirmedAt;
  }

  if (journalErrors.length > 0) {
    const failedBatch: DisbursementBatchRecord = {
      id: `batch_${Date.now()}`,
      orgId,
      periodLabel: budget.periodLabel,
      periodMonth: periodMonthIso,
      managerName: budget.managerName,
      sourceAccount: budget.sourceAccount,
      budgetAmount: budget.budgetAmount,
      totalDisbursed: 0,
      employeeCount: confirmedItems.length,
      batchRef,
      mayarBatchRef: batchRef,
      providerName,
      status: 'journal_post_failed',
      paymentConfirmed: false,
      paymentConfirmation,
      preparedBy,
      confirmedBy,
      executedAt: nowIso,
      executedBy: actorId,
      journalErrors,
      items: confirmedItems,
    };
    saveDisbursementRecord(failedBatch, skipDbSync ? undefined : orgId);
    throw new PayrollJournalPostError(
      `Posting jurnal gaji gagal untuk ${journalErrors.length} pekerja: ${journalErrors.map((e) => `${e.employeeName}: ${e.message}`).join('; ')}`,
      failedBatch,
    );
  }

  const paidBatch: DisbursementBatchRecord = {
    id: `batch_${Date.now()}`,
    orgId,
    periodLabel: budget.periodLabel,
    periodMonth: periodMonthIso,
    managerName: budget.managerName,
    sourceAccount: budget.sourceAccount,
    budgetAmount: budget.budgetAmount,
    totalDisbursed: confirmedItems.reduce((s, x) => s + x.netSalary, 0),
    employeeCount: confirmedItems.length,
    batchRef,
    mayarBatchRef: batchRef,
    providerName,
    status: 'paid',
    paymentConfirmed: true,
    paymentConfirmation,
    preparedBy,
    confirmedBy,
    executedAt: nowIso,
    executedBy: actorId,
    confirmedAt,
    items: confirmedItems,
  };

  saveDisbursementRecord(paidBatch, skipDbSync ? undefined : orgId);
  return paidBatch;
}

/**
 * Wrapper kompatibilitas untuk pemanggil UI:
 * - Tanpa `paymentConfirmation`, hanya menyiapkan batch berstatus `'awaiting_payment_confirmation'`
 *   (TIDAK PERNAH mengklaim 'paid' atau 'LUNAS').
 * - Dengan `paymentConfirmation`, memverifikasi bukti nyata dan memposting jurnal dengan UUID valid.
 */
export async function executeMayarDisbursementBatch(params: {
  orgId: string;
  budget: FieldPayrollBudget;
  items: EmployeePayrollCalculation[];
  actorId: string;
  preparedBy?: string;
  periodMonth?: string;
  paymentConfirmation?: PaymentConfirmation;
  paymentProvider?: PayrollPaymentProvider;
  skipDbSync?: boolean;
  deps?: {
    postPayrollDisbursementJournal?: typeof PostPayrollJournalFn;
  };
}): Promise<DisbursementBatchRecord> {
  if (!params.paymentConfirmation) {
    return preparePayrollDisbursementBatch(params);
  }

  return confirmPayrollDisbursementBatch({
    orgId: params.orgId,
    budget: params.budget,
    items: params.items,
    actorId: params.actorId,
    preparedBy: params.preparedBy,
    periodMonth: params.periodMonth,
    paymentConfirmation: params.paymentConfirmation,
    paymentProvider: params.paymentProvider,
    skipDbSync: params.skipDbSync,
    deps: params.deps,
  });
}

export function saveDisbursementRecord(record: DisbursementBatchRecord, orgId?: string) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const list = loadDisbursementRecords();
    const updated = [record, ...list].slice(0, 50);
    window.localStorage.setItem(STORAGE_KEY_DISBURSEMENTS, JSON.stringify(updated));

    if (orgId) {
      void supabase
        .from('planner_organizations')
        .select('settings')
        .eq('id', orgId)
        .maybeSingle()
        .then(({ data: org }) => {
          const existing = (org?.settings as Record<string, unknown>) || {};
          return supabase
            .from('planner_organizations')
            .update({
              settings: {
                ...existing,
                payroll_disbursements: updated,
              },
            })
            .eq('id', orgId);
        });
    }
  } catch (err) {
    console.warn('Could not save disbursement record:', err);
  }
}

export function loadDisbursementRecords(): DisbursementBatchRecord[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(STORAGE_KEY_DISBURSEMENTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function fetchDisbursementRecordsFromSupabase(
  orgId: string,
): Promise<DisbursementBatchRecord[]> {
  if (!orgId) return [];
  try {
    const { data: org, error } = await supabase
      .from('planner_organizations')
      .select('settings')
      .eq('id', orgId)
      .maybeSingle();

    if (error || !org?.settings) return [];
    const settings = org.settings as Record<string, unknown>;
    if (settings.payroll_disbursements) {
      const records = settings.payroll_disbursements as DisbursementBatchRecord[];
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(STORAGE_KEY_DISBURSEMENTS, JSON.stringify(records));
        }
      } catch {
        /* ignore */
      }
      return records;
    }
  } catch (err) {
    console.warn('Failed to fetch disbursement records from Supabase:', err);
  }
  return [];
}

/**
 * Generate Format Pesan Slip Gaji Digital untuk dikirim via WhatsApp / Telegram.
 * Status LUNAS hanya ditampilkan bila item.status === 'paid' && item.paymentConfirmed === true.
 */
export function generateSlipGajiMessage(
  item: EmployeePayrollCalculation,
  periodLabel: string,
): string {
  const isConfirmedPaid = item.status === 'paid' && item.paymentConfirmed === true;
  const statusText = isConfirmedPaid
    ? 'Status: *LUNAS (TERKONFIRMASI)*'
    : item.status === 'journal_post_failed'
    ? 'Status: *GAGAL POSTING JURNAL (BELUM LUNAS)*'
    : 'Status: *MENUNGGU KONFIRMASI PEMBAYARAN*';

  const paymentMethodLabel = isConfirmedPaid
    ? 'Pembayaran Terkonfirmasi'
    : 'Rencana Pembayaran (Menunggu Konfirmasi Nyata)';

  const remainingKasbonLine =
    item.remainingKasbonBalance > 0
      ? `📌 *Sisa Saldo Kasbon:* Rp ${item.remainingKasbonBalance.toLocaleString('id-ID')}\n`
      : '';

  return `🧾 *SLIP GAJI PEKERJA LAPANGAN*
━━━━━━━━━━━━━━━━━━━━━
👤 *Nama Pekerja:* ${item.name}
💼 *Posisi:* ${item.position}
📅 *Periode:* ${periodLabel}
⏱️ *Hari Hadir:* ${item.daysPresent} Hari Kerja

💵 *Gaji Pokok:* Rp ${item.grossSalary.toLocaleString('id-ID')}
${item.overtimeBonus > 0 ? `✨ *Lembur / Bonus:* +Rp ${item.overtimeBonus.toLocaleString('id-ID')}\n` : ''}${
    item.kasbonDeduction > 0
      ? `✂️ *Potongan Kasbon:* -Rp ${item.kasbonDeduction.toLocaleString('id-ID')}\n`
      : ''
  }${remainingKasbonLine}━━━━━━━━━━━━━━━━━━━━━
💰 *TOTAL GAJI BERSIH (THP):*
👉 *Rp ${item.netSalary.toLocaleString('id-ID')}*

🏦 *Metode Pembayaran:*
${paymentMethodLabel}
Bank: ${item.bankName}
No. Rekening: ${item.bankAccount}
A/N: ${item.bankHolder}
Kode Ref: ${item.disbursementRef || 'PENDING'}
${statusText}
━━━━━━━━━━━━━━━━━━━━━
_Diterbitkan oleh Sistem HRD Froyek._`;
}

export const formatWhatsAppSlip = generateSlipGajiMessage;
