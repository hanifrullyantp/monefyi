/**
 * Template jurnal & enum kejadian tertutup untuk buku besar Froyek.
 * Nominal selalu bilangan bulat rupiah.
 */

export type CashMovement = 'in' | 'out';

export type JournalAccountRole =
  | 'kas'
  | 'kas_tujuan'
  | 'piutang'
  | 'piutang_retensi'
  | 'uang_muka_klien'
  | 'hutang'
  | 'hutang_dagang'
  | 'hutang_pajak'
  | 'hutang_lain'
  | 'pendapatan_proyek'
  | 'hpp_material'
  | 'hpp_labor'
  | 'hpp_equipment'
  | 'hpp_overhead'
  | 'hpp_other'
  | 'hpp_uncategorized'
  | 'beban_opex'
  | 'beban_penyusutan'
  | 'akumulasi_penyusutan'
  | 'dividen'
  | 'laba_ditahan'
  | 'laba';

export type TemplateLine = {
  role: JournalAccountRole;
  debit: number;
  credit: number;
  side?: 'from' | 'to';
};

export const FINANCE_EVENT_CODES = [
  'project_cost_material',
  'project_cost_labor',
  'project_cost_equipment',
  'project_cost_overhead',
  'project_cost_other',
  'project_cost_uncategorized',
  'client_dp',
  'client_termin',
  'client_pelunasan',
  'client_retention_hold',
  'client_retention_release',
  'opex_expense',
  'payable_accrual',
  'payable_payment',
  'receivable_accrual',
  'receivable_receipt',
  'kasbon_disbursement',
  'wallet_transfer',
  'depreciation_expense',
  'dividend_project_cash',
  'dividend_project_offset',
  'dividend_business_cash',
  'project_close_transfer',
  'period_close_transfer',
  'dp_revenue_recognition',
  'interproject_loan_disbursement',
  'interproject_loan_repayment',
] as const;

export type FinanceEventCode = (typeof FINANCE_EVENT_CODES)[number];

export type PartyAllocation = {
  partyId: string;
  projectId: string;
  amount: number;
};

export function toRupiah(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount);
}

export function hppRoleForRapType(rapType?: string | null): JournalAccountRole {
  const key = String(rapType || '').trim().toLowerCase();
  if (key === 'material') return 'hpp_material';
  if (key === 'labor' || key === 'tenaga' || key === 'tukang') return 'hpp_labor';
  if (key === 'equipment' || key === 'alat') return 'hpp_equipment';
  if (key === 'overhead') return 'hpp_overhead';
  if (key === 'other' || key === 'lain' || key === 'lainnya') return 'hpp_other';
  return 'hpp_uncategorized';
}

export function eventCodeForRapType(rapType?: string | null): FinanceEventCode {
  const key = String(rapType || '').trim().toLowerCase();
  if (key === 'material') return 'project_cost_material';
  if (key === 'labor' || key === 'tenaga' || key === 'tukang') return 'project_cost_labor';
  if (key === 'equipment' || key === 'alat') return 'project_cost_equipment';
  if (key === 'overhead') return 'project_cost_overhead';
  if (key === 'other' || key === 'lain' || key === 'lainnya') return 'project_cost_other';
  return 'project_cost_uncategorized';
}

/** Template biaya proyek berbasis kas berdasarkan sub-akun HPP (F1). */
export function projectExpense(amount: number, rapType?: string | null): TemplateLine[] {
  const value = toRupiah(amount);
  const role = hppRoleForRapType(rapType);
  return [
    { role, debit: value, credit: 0 },
    { role: 'kas', debit: 0, credit: value },
  ];
}

export function projectIncome(amount: number): TemplateLine[] {
  const value = toRupiah(amount);
  return [
    { role: 'kas', debit: value, credit: 0 },
    { role: 'pendapatan_proyek', debit: 0, credit: value },
  ];
}

/**
 * Spesifikasi paritas kanonis pemasukan proyek (TS <-> SQL `planner_create_project_income_atomic`).
 * Mengembalikan array kosong bila status tidak memicu posting jurnal (mis. DP pending/cancelled).
 */
export function resolveProjectIncomeTemplate(
  category?: string | null,
  status?: string | null,
  amount = 0,
): TemplateLine[] {
  const value = toRupiah(amount);
  if (value <= 0) return [];

  const cat = String(category || 'other').trim().toLowerCase() || 'other';
  const st = String(status || 'received').trim().toLowerCase() || 'received';
  if (st === 'cancelled') return [];

  if (cat === 'dp') {
    return st === 'received' ? clientDownPayment(value) : [];
  }
  if (cat === 'retensi') {
    if (st === 'received') return clientRetentionRelease(value);
    if (st === 'pending' || st === 'invoiced' || st === 'accrued') {
      return clientRetentionHold(value);
    }
    return [];
  }
  if (st === 'received') {
    return projectIncome(value);
  }
  if (st === 'invoiced' || st === 'accrued') {
    return receivableAccrual(value);
  }
  return [];
}

/**
 * Spesifikasi paritas kanonis biaya proyek (TS <-> SQL `planner_create_cost_realization_atomic`).
 * Mengembalikan array kosong bila nominal <= 0 atau status dividend/cancelled.
 */
export function resolveProjectCostTemplate(
  rapType?: string | null,
  paymentMethod?: string | null,
  status?: string | null,
  amount = 0,
): TemplateLine[] {
  const value = toRupiah(amount);
  const st = String(status || 'recorded').trim().toLowerCase() || 'recorded';
  if (value <= 0 || st === 'dividend' || st === 'cancelled') return [];

  const method = String(paymentMethod || '').trim().toLowerCase();
  const isAccrual =
    method === 'credit'
    || method === 'hutang'
    || method === 'tempo'
    || st === 'accrued'
    || st === 'unpaid';

  if (isAccrual) {
    return payableAccrual(value, rapType);
  }
  return projectExpense(value, rapType);
}

export function clientDownPayment(amount: number): TemplateLine[] {
  const value = toRupiah(amount);
  return [
    { role: 'kas', debit: value, credit: 0 },
    { role: 'uang_muka_klien', debit: 0, credit: value },
  ];
}

/** Pengakuan pendapatan dari kewajiban Uang Muka Klien (DP) sesuai progres/termin. */
export function recognizeDownPaymentRevenue(amount: number): TemplateLine[] {
  const value = Math.max(0, toRupiah(amount));
  if (value <= 0) return [];
  return [
    { role: 'uang_muka_klien', debit: value, credit: 0 },
    { role: 'pendapatan_proyek', debit: 0, credit: value },
  ];
}

export function clientTermin(amount: number, dpApplied = 0): TemplateLine[] {
  const value = toRupiah(amount);
  const dp = Math.min(value, Math.max(0, toRupiah(dpApplied)));
  const cash = value - dp;
  const lines: TemplateLine[] = [];
  if (cash > 0) lines.push({ role: 'kas', debit: cash, credit: 0 });
  if (dp > 0) lines.push({ role: 'uang_muka_klien', debit: dp, credit: 0 });
  lines.push({ role: 'pendapatan_proyek', debit: 0, credit: value });
  return lines;
}

export function clientRetentionHold(amount: number): TemplateLine[] {
  const value = toRupiah(amount);
  return [
    { role: 'piutang_retensi', debit: value, credit: 0 },
    { role: 'pendapatan_proyek', debit: 0, credit: value },
  ];
}

export function clientRetentionRelease(amount: number): TemplateLine[] {
  const value = toRupiah(amount);
  return [
    { role: 'kas', debit: value, credit: 0 },
    { role: 'piutang_retensi', debit: 0, credit: value },
  ];
}

export function opexExpense(amount: number): TemplateLine[] {
  const value = toRupiah(amount);
  return [
    { role: 'beban_opex', debit: value, credit: 0 },
    { role: 'kas', debit: 0, credit: value },
  ];
}

export function payableAccrual(amount: number, rapType?: string | null): TemplateLine[] {
  const value = toRupiah(amount);
  return [
    { role: hppRoleForRapType(rapType), debit: value, credit: 0 },
    { role: 'hutang_dagang', debit: 0, credit: value },
  ];
}

export function receivableAccrual(amount: number): TemplateLine[] {
  const value = toRupiah(amount);
  return [
    { role: 'piutang', debit: value, credit: 0 },
    { role: 'pendapatan_proyek', debit: 0, credit: value },
  ];
}

export function kasbonDisbursement(amount: number): TemplateLine[] {
  const value = toRupiah(amount);
  return [
    { role: 'piutang', debit: value, credit: 0 },
    { role: 'kas', debit: 0, credit: value },
  ];
}

export function depreciationExpense(amount: number): TemplateLine[] {
  const value = toRupiah(amount);
  return [
    { role: 'beban_penyusutan', debit: value, credit: 0 },
    { role: 'akumulasi_penyusutan', debit: 0, credit: value },
  ];
}

export function walletTransfer(amount: number): TemplateLine[] {
  const value = toRupiah(amount);
  return [
    { role: 'kas_tujuan', debit: value, credit: 0 },
    { role: 'kas', debit: 0, credit: value },
  ];
}

export function payPayable(amount: number): TemplateLine[] {
  const value = toRupiah(amount);
  return [
    { role: 'hutang', debit: value, credit: 0 },
    { role: 'kas', debit: 0, credit: value },
  ];
}

export function receiveReceivable(amount: number): TemplateLine[] {
  const value = toRupiah(amount);
  return [
    { role: 'kas', debit: value, credit: 0 },
    { role: 'piutang', debit: 0, credit: value },
  ];
}

export function projectDividendCash(amount: number): TemplateLine[] {
  const value = toRupiah(amount);
  return [
    { role: 'dividen', debit: value, credit: 0 },
    { role: 'kas', debit: 0, credit: value },
  ];
}

export function projectDividendReceivableOffset(amount: number): TemplateLine[] {
  const value = toRupiah(amount);
  return [
    { role: 'dividen', debit: value, credit: 0 },
    { role: 'piutang', debit: 0, credit: value },
  ];
}

export function businessDividendCash(amount: number): TemplateLine[] {
  const value = toRupiah(amount);
  return [
    { role: 'dividen', debit: value, credit: 0 },
    { role: 'kas', debit: 0, credit: value },
  ];
}

export function projectCloseTransfer(amount: number): TemplateLine[] {
  const value = toRupiah(amount);
  return [
    { role: 'kas_tujuan', debit: value, credit: 0 },
    { role: 'kas', debit: 0, credit: value },
  ];
}

export function periodCloseTransfer(amount: number, isLoss = false): TemplateLine[] {
  const value = toRupiah(Math.abs(amount));
  if (isLoss) {
    return [
      { role: 'laba_ditahan', debit: value, credit: 0 },
      { role: 'laba', debit: 0, credit: value },
    ];
  }
  return [
    { role: 'laba', debit: value, credit: 0 },
    { role: 'laba_ditahan', debit: 0, credit: value },
  ];
}

/**
 * Pencairan pinjaman antar proyek (Proyek A -> Proyek B) dalam jurnal 4-baris seimbang.
 * Dampak Laba/Rugi = 0, dampak Kas konsolidasi = 0.
 */
export function interprojectLoanDisbursement(amount: number): TemplateLine[] {
  const value = toRupiah(amount);
  if (value <= 0) return [];
  return [
    { role: 'piutang', debit: value, credit: 0, side: 'from' },
    { role: 'kas', debit: 0, credit: value, side: 'from' },
    { role: 'kas_tujuan', debit: value, credit: 0, side: 'to' },
    { role: 'hutang_lain', debit: 0, credit: value, side: 'to' },
  ];
}

/**
 * Pelunasan pinjaman antar proyek (Proyek B -> Proyek A) dalam jurnal 4-baris seimbang.
 * Dampak Laba/Rugi = 0, dampak Kas konsolidasi = 0.
 */
export function interprojectLoanRepayment(amount: number): TemplateLine[] {
  const value = toRupiah(amount);
  if (value <= 0) return [];
  return [
    { role: 'hutang_lain', debit: value, credit: 0, side: 'to' },
    { role: 'kas', debit: 0, credit: value, side: 'to' },
    { role: 'kas_tujuan', debit: value, credit: 0, side: 'from' },
    { role: 'piutang', debit: 0, credit: value, side: 'from' },
  ];
}

/** Builder tunggal berbasis kode kejadian tertutup (dipakai server dan tool agent). */
export function buildJournalTemplate(
  eventCode: FinanceEventCode,
  amount: number,
  opts?: { dpApplied?: number; isLoss?: boolean; rapType?: string | null },
): TemplateLine[] {
  switch (eventCode) {
    case 'project_cost_material': return projectExpense(amount, 'material');
    case 'project_cost_labor': return projectExpense(amount, 'labor');
    case 'project_cost_equipment': return projectExpense(amount, 'equipment');
    case 'project_cost_overhead': return projectExpense(amount, 'overhead');
    case 'project_cost_other': return projectExpense(amount, 'other');
    case 'project_cost_uncategorized': return projectExpense(amount, null);
    case 'client_dp': return clientDownPayment(amount);
    case 'client_termin': return clientTermin(amount, opts?.dpApplied ?? 0);
    case 'client_pelunasan': return receiveReceivable(amount);
    case 'client_retention_hold': return clientRetentionHold(amount);
    case 'client_retention_release': return clientRetentionRelease(amount);
    case 'opex_expense': return opexExpense(amount);
    case 'payable_accrual': return payableAccrual(amount, opts?.rapType);
    case 'payable_payment': return payPayable(amount);
    case 'receivable_accrual': return receivableAccrual(amount);
    case 'receivable_receipt': return receiveReceivable(amount);
    case 'kasbon_disbursement': return kasbonDisbursement(amount);
    case 'wallet_transfer': return walletTransfer(amount);
    case 'depreciation_expense': return depreciationExpense(amount);
    case 'dividend_project_cash': return projectDividendCash(amount);
    case 'dividend_project_offset': return projectDividendReceivableOffset(amount);
    case 'dividend_business_cash': return businessDividendCash(amount);
    case 'project_close_transfer': return projectCloseTransfer(amount);
    case 'period_close_transfer': return periodCloseTransfer(amount, opts?.isLoss);
    case 'dp_revenue_recognition': return recognizeDownPaymentRevenue(amount);
    case 'interproject_loan_disbursement': return interprojectLoanDisbursement(amount);
    case 'interproject_loan_repayment': return interprojectLoanRepayment(amount);
  }
}

const PROJECT_DIMENSION_ROLES = new Set<string>([
  'pendapatan_proyek',
  'hpp_material',
  'hpp_labor',
  'hpp_equipment',
  'hpp_overhead',
  'hpp_other',
  'hpp_uncategorized',
  'uang_muka_klien',
  'piutang_retensi',
]);

const PARTY_DIMENSION_ROLES = new Set<string>([
  'hutang',
  'hutang_dagang',
  'hutang_pajak',
  'hutang_lain',
  'piutang',
  'piutang_retensi',
]);

/** Validasi wajib bahwa akun proyek membawa project_id dan akun hutang/piutang membawa party_id. */
export function validateJournalDimensions(
  lines: Array<{ role: string; projectId?: string | null; partyId?: string | null }>,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const line of lines) {
    if (PROJECT_DIMENSION_ROLES.has(line.role) && !line.projectId) {
      errors.push(`Akun ${line.role} wajib membawa project_id.`);
    }
    if (PARTY_DIMENSION_ROLES.has(line.role) && !line.partyId) {
      errors.push(`Akun ${line.role} wajib membawa party_id.`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function linesAreBalanced(lines: Array<{ debit: number; credit: number }>): boolean {
  const debit = lines.reduce((sum, line) => sum + toRupiah(line.debit), 0);
  const credit = lines.reduce((sum, line) => sum + toRupiah(line.credit), 0);
  return lines.length > 0 && debit === credit && debit > 0;
}

/** Hutang satu pihak. Angka positif menambah hutang. */
export function partyDebt(rows: PartyAllocation[], partyId: string, projectId?: string): number {
  return rows
    .filter((row) => row.partyId === partyId && (projectId == null || row.projectId === projectId))
    .reduce((sum, row) => sum + toRupiah(row.amount), 0);
}

/** Kas dompet proyek setelah biaya proyek dan biaya operasional dari dompet yang sama. */
export function cashAfter(opening: number, movements: Array<{ direction: CashMovement; amount: number }>): number {
  return movements.reduce((balance, movement) => {
    const value = toRupiah(movement.amount);
    return movement.direction === 'in' ? balance + value : balance - value;
  }, toRupiah(opening));
}

export function signedPartyAmount(
  accountType: string,
  debit: number,
  credit: number,
): number | null {
  const value = Math.max(toRupiah(debit), toRupiah(credit));
  if (accountType.startsWith('hutang')) {
    if (credit > 0) return value;
    if (debit > 0) return -value;
  }
  if (accountType === 'piutang' || accountType === 'piutang_retensi') {
    if (debit > 0) return value;
    if (credit > 0) return -value;
  }
  return null;
}
