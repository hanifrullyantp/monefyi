import type { ChartAccount, CreateJournalInput, JournalLineInput } from '../../types/finance';
import type { PaymentMethod } from '../../types';
import { findAccountByCode } from '../../data/defaultChartOfAccounts';
import { calcXenditFee } from '../../lib/financeCalc';

export interface AutoJournalContext {
  accounts: ChartAccount[];
  tenantId: string;
  createdBy?: string;
}

function acct(ctx: AutoJournalContext, code: string): string {
  const account = findAccountByCode(ctx.accounts, code);
  if (!account) throw new Error(`Akun ${code} tidak ditemukan`);
  return account.id;
}

function line(accountId: string, debit: number, credit: number, notes?: string): JournalLineInput {
  return { accountId, debit, credit, notes };
}

/** Booking dibuat, belum bayar */
export function journalBookingCreated(
  ctx: AutoJournalContext,
  bookingId: string,
  bookingCode: string,
  amount: number
): CreateJournalInput {
  return {
    tenantId: ctx.tenantId,
    description: `Booking ${bookingCode} — piutang tamu`,
    source: 'booking',
    referenceType: 'booking',
    referenceId: bookingId,
    lines: [
      line(acct(ctx, '1201'), amount, 0, 'Piutang Tamu'),
      line(acct(ctx, '2104'), 0, amount, 'Pendapatan Diterima Dimuka'),
    ],
    createdBy: ctx.createdBy,
  };
}

/** Tamu bayar cash */
export function journalCashPayment(
  ctx: AutoJournalContext,
  paymentId: string,
  bookingCode: string,
  amount: number
): CreateJournalInput {
  return {
    tenantId: ctx.tenantId,
    description: `Pembayaran tunai ${bookingCode}`,
    source: 'payment',
    referenceType: 'payment',
    referenceId: paymentId,
    lines: [
      line(acct(ctx, '1101'), amount, 0, 'Kas Tunai'),
      line(acct(ctx, '1201'), 0, amount, 'Piutang Tamu'),
    ],
    createdBy: ctx.createdBy,
  };
}

/** Tamu bayar via Xendit (invoice created) */
export function journalXenditPaymentPending(
  ctx: AutoJournalContext,
  paymentId: string,
  bookingCode: string,
  amount: number
): CreateJournalInput {
  return {
    tenantId: ctx.tenantId,
    description: `Pembayaran Xendit ${bookingCode} — menunggu konfirmasi`,
    source: 'xendit',
    referenceType: 'payment',
    referenceId: paymentId,
    lines: [
      line(acct(ctx, '1203'), amount, 0, 'Piutang Xendit'),
      line(acct(ctx, '1201'), 0, amount, 'Piutang Tamu'),
    ],
    createdBy: ctx.createdBy,
  };
}

/** Xendit webhook paid */
export function journalXenditSettled(
  ctx: AutoJournalContext,
  paymentId: string,
  bookingCode: string,
  amount: number
): CreateJournalInput {
  const fee = calcXenditFee(amount);
  const net = amount - fee;
  return {
    tenantId: ctx.tenantId,
    description: `Xendit settled ${bookingCode}`,
    source: 'xendit',
    referenceType: 'payment',
    referenceId: paymentId,
    lines: [
      line(acct(ctx, '1104'), net, 0, 'Saldo Xendit'),
      line(acct(ctx, '5105'), fee, 0, 'Biaya Payment Gateway'),
      line(acct(ctx, '1203'), 0, amount, 'Piutang Xendit'),
    ],
    createdBy: ctx.createdBy,
  };
}

/** Check-in — realisasi pendapatan */
export function journalCheckIn(
  ctx: AutoJournalContext,
  bookingId: string,
  bookingCode: string,
  amount: number
): CreateJournalInput {
  return {
    tenantId: ctx.tenantId,
    description: `Check-in ${bookingCode} — realisasi pendapatan`,
    source: 'booking',
    referenceType: 'booking',
    referenceId: bookingId,
    lines: [
      line(acct(ctx, '2104'), amount, 0, 'Pendapatan Diterima Dimuka'),
      line(acct(ctx, '4101'), 0, amount, 'Pendapatan Kamar'),
    ],
    createdBy: ctx.createdBy,
  };
}

/** Gaji dihitung (accrual) */
export function journalPayrollAccrual(
  ctx: AutoJournalContext,
  payrollId: string,
  employeeName: string,
  amount: number
): CreateJournalInput {
  return {
    tenantId: ctx.tenantId,
    description: `Accrual gaji ${employeeName}`,
    source: 'payroll',
    referenceType: 'payroll',
    referenceId: payrollId,
    lines: [
      line(acct(ctx, '5101'), amount, 0, 'Beban Gaji'),
      line(acct(ctx, '2102'), 0, amount, 'Hutang Gaji'),
    ],
    createdBy: ctx.createdBy,
  };
}

/** Gaji dibayar transfer */
export function journalPayrollPaid(
  ctx: AutoJournalContext,
  payrollId: string,
  employeeName: string,
  amount: number,
  method: 'transfer' | 'cash' = 'transfer'
): CreateJournalInput {
  const cashCode = method === 'cash' ? '1101' : '1102';
  return {
    tenantId: ctx.tenantId,
    description: `Pembayaran gaji ${employeeName}`,
    source: 'payroll',
    referenceType: 'payroll',
    referenceId: payrollId,
    lines: [
      line(acct(ctx, '2102'), amount, 0, 'Hutang Gaji'),
      line(acct(ctx, cashCode), 0, amount, method === 'cash' ? 'Kas Tunai' : 'Kas Bank'),
    ],
    createdBy: ctx.createdBy,
  };
}

/** Kasbon diberikan */
export function journalKasbonGiven(
  ctx: AutoJournalContext,
  loanId: string,
  employeeName: string,
  amount: number,
  method: 'cash' | 'transfer' = 'cash'
): CreateJournalInput {
  const cashCode = method === 'cash' ? '1101' : '1102';
  return {
    tenantId: ctx.tenantId,
    description: `Kasbon ${employeeName}`,
    source: 'kasbon',
    referenceType: 'staff_loan',
    referenceId: loanId,
    lines: [
      line(acct(ctx, '1202'), amount, 0, 'Piutang Karyawan'),
      line(acct(ctx, cashCode), 0, amount),
    ],
    createdBy: ctx.createdBy,
  };
}

/** Cicilan kasbon dipotong gaji */
export function journalKasbonDeduction(
  ctx: AutoJournalContext,
  loanId: string,
  employeeName: string,
  amount: number
): CreateJournalInput {
  return {
    tenantId: ctx.tenantId,
    description: `Potong gaji kasbon ${employeeName}`,
    source: 'kasbon',
    referenceType: 'staff_loan',
    referenceId: loanId,
    lines: [
      line(acct(ctx, '2102'), amount, 0, 'Hutang Gaji (potong)'),
      line(acct(ctx, '1202'), 0, amount, 'Piutang Karyawan'),
    ],
    createdBy: ctx.createdBy,
  };
}

/** Pengeluaran operasional */
export function journalExpense(
  ctx: AutoJournalContext,
  description: string,
  amount: number,
  expenseCode: string,
  method: PaymentMethod | 'cash' | 'transfer'
): CreateJournalInput {
  const cashCode = method === 'cash' ? '1101' : method === 'transfer' ? '1102' : '1101';
  return {
    tenantId: ctx.tenantId,
    description,
    source: 'expense',
    lines: [
      line(acct(ctx, expenseCode), amount, 0),
      line(acct(ctx, cashCode), 0, amount),
    ],
    createdBy: ctx.createdBy,
  };
}

/** Refund ke tamu */
export function journalRefund(
  ctx: AutoJournalContext,
  bookingId: string,
  bookingCode: string,
  amount: number,
  viaXendit = false
): CreateJournalInput {
  const creditCode = viaXendit ? '1104' : '1101';
  return {
    tenantId: ctx.tenantId,
    description: `Refund ${bookingCode}`,
    source: 'refund',
    referenceType: 'booking',
    referenceId: bookingId,
    lines: [
      line(acct(ctx, '5203'), amount, 0, 'Retur Pendapatan'),
      line(acct(ctx, creditCode), 0, amount),
    ],
    createdBy: ctx.createdBy,
  };
}

/** Void journal — creates reversing entry */
export function journalVoidReversal(
  ctx: AutoJournalContext,
  originalDescription: string,
  lines: JournalLineInput[],
  voidReason: string
): CreateJournalInput {
  const reversed = lines.map((l) => ({
    accountId: l.accountId,
    debit: l.credit,
    credit: l.debit,
    notes: `Void: ${voidReason}`,
  }));

  return {
    tenantId: ctx.tenantId,
    description: `VOID — ${originalDescription}`,
    source: 'void',
    lines: reversed,
    createdBy: ctx.createdBy,
  };
}

const EXPENSE_CATEGORY_MAP: Record<string, string> = {
  Gaji: '5101',
  Payroll: '5101',
  Utilities: '5102',
  Utilitas: '5102',
  Maintenance: '5106',
  Laundry: '5103',
  Perlengkapan: '5104',
  Marketing: '5107',
  Administrasi: '5108',
  Lainnya: '5199',
};

export function expenseCodeForCategory(category: string): string {
  return EXPENSE_CATEGORY_MAP[category] ?? '5199';
}

export function paymentMethodToJournal(method: PaymentMethod): 'cash' | 'transfer' | 'xendit' {
  if (method === 'cash') return 'cash';
  if (['transfer', 'virtual_account', 'qris', 'credit_card', 'online'].includes(method)) {
    return method === 'online' ? 'xendit' : 'transfer';
  }
  return 'cash';
}
