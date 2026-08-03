/**
 * Double-entry journal engine for STAY POS.
 * Every transaction produces balanced debit/credit lines.
 */
import type { ChartOfAccount, CoaCode, JournalLine, JournalSourceType } from '../../types/pos';

export interface JournalDraft {
  tenantId: string;
  entryDate: string;
  description: string;
  sourceType: JournalSourceType;
  sourceId?: string;
  createdBy?: string;
  lines: JournalLine[];
}

export type PaymentJournalEvent =
  | 'cash_sale'
  | 'transfer_pending'
  | 'transfer_verified'
  | 'xendit_invoice_created'
  | 'xendit_paid'
  | 'xendit_withdraw'
  | 'deposit_received'
  | 'settlement'
  | 'refund_cash'
  | 'refund_xendit'
  | 'expense_cash'
  | 'expense_bank'
  | 'payroll'
  | 'staff_loan_disburse'
  | 'staff_loan_deduct';

const COA_NAMES: Record<CoaCode, string> = {
  '1100': 'Kas Tunai',
  '1200': 'Kas Bank',
  '1300': 'Piutang Xendit',
  '1310': 'Saldo Xendit',
  '1320': 'Piutang Transfer',
  '1400': 'Piutang Karyawan',
  '2100': 'Hutang Pajak',
  '2300': 'Pendapatan Diterima Dimuka',
  '4100': 'Pendapatan Kamar',
  '4200': 'Pengembalian Pendapatan',
  '5100': 'Biaya Payment Gateway',
  '5200': 'Beban Gaji',
  '5300': 'Beban Operasional',
};

/**
 * Validates journal lines are balanced (total debit = total credit).
 */
export function assertBalanced(lines: JournalLine[]): void {
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const diff = Math.abs(totalDebit - totalCredit);
  if (diff > 0.01) {
    throw new Error(
      `Journal tidak seimbang: debit=${totalDebit}, credit=${totalCredit}, diff=${diff}`
    );
  }
  if (lines.length < 2) {
    throw new Error('Journal minimal 2 baris (debit + kredit)');
  }
}

/**
 * Resolve account ID from COA code.
 */
export function resolveAccountId(
  accounts: ChartOfAccount[],
  code: CoaCode | string
): string {
  const acc = accounts.find((a) => a.code === code);
  if (!acc) throw new Error(`Akun COA ${code} tidak ditemukan`);
  return acc.id;
}

function line(
  accountId: string,
  code: CoaCode | string,
  debit: number,
  credit: number,
  memo?: string
): JournalLine {
  return { accountId, accountCode: code, debit, credit, memo: memo ?? COA_NAMES[code as CoaCode] };
}

/**
 * Build journal lines for a payment event.
 */
export function buildPaymentJournal(
  event: PaymentJournalEvent,
  amount: number,
  accounts: ChartOfAccount[],
  options: { fee?: number; revenueAccount?: CoaCode } = {}
): JournalLine[] {
  const fee = options.fee ?? 0;
  const revenueCode = options.revenueAccount ?? '4100';
  const net = amount - fee;

  const id = (code: CoaCode) => resolveAccountId(accounts, code);

  let lines: JournalLine[] = [];

  switch (event) {
    case 'cash_sale':
      lines = [
        line(id('1100'), '1100', amount, 0),
        line(id(revenueCode), revenueCode, 0, amount),
      ];
      break;
    case 'transfer_pending':
      lines = [
        line(id('1320'), '1320', amount, 0),
        line(id(revenueCode), revenueCode, 0, amount),
      ];
      break;
    case 'transfer_verified':
      lines = [
        line(id('1200'), '1200', amount, 0),
        line(id('1320'), '1320', 0, amount),
      ];
      break;
    case 'xendit_invoice_created':
      lines = [
        line(id('1300'), '1300', amount, 0),
        line(id(revenueCode), revenueCode, 0, amount),
      ];
      break;
    case 'xendit_paid':
      lines = [
        line(id('1310'), '1310', net, 0),
        ...(fee > 0 ? [line(id('5100'), '5100', fee, 0)] : []),
        line(id('1300'), '1300', 0, amount),
      ];
      break;
    case 'xendit_withdraw':
      lines = [
        line(id('1200'), '1200', amount, 0),
        line(id('1310'), '1310', 0, amount),
      ];
      break;
    case 'deposit_received':
      lines = [
        line(id('1100'), '1100', amount, 0),
        line(id('2300'), '2300', 0, amount),
      ];
      break;
    case 'settlement':
      lines = [
        line(id('1100'), '1100', amount, 0),
        line(id('2300'), '2300', amount, 0),
        line(id('4100'), '4100', 0, amount + amount),
      ];
      break;
    case 'refund_cash':
      lines = [
        line(id('4200'), '4200', amount, 0),
        line(id('1100'), '1100', 0, amount),
      ];
      break;
    case 'refund_xendit':
      lines = [
        line(id('4200'), '4200', amount, 0),
        line(id('1310'), '1310', 0, amount),
      ];
      break;
    case 'expense_cash':
      lines = [
        line(id('5300'), '5300', amount, 0),
        line(id('1100'), '1100', 0, amount),
      ];
      break;
    case 'expense_bank':
      lines = [
        line(id('5300'), '5300', amount, 0),
        line(id('1200'), '1200', 0, amount),
      ];
      break;
    case 'payroll':
      lines = [
        line(id('5200'), '5200', amount, 0),
        line(id('1200'), '1200', 0, amount),
      ];
      break;
    case 'staff_loan_disburse':
      lines = [
        line(id('1400'), '1400', amount, 0),
        line(id('1100'), '1100', 0, amount),
      ];
      break;
    case 'staff_loan_deduct':
      lines = [
        line(id('1100'), '1100', amount, 0),
        line(id('1400'), '1400', 0, amount),
      ];
      break;
    default:
      throw new Error(`Unknown journal event: ${event}`);
  }

  assertBalanced(lines);
  return lines;
}

/**
 * Create a journal draft ready for persistence.
 */
export function createJournalDraft(
  params: Omit<JournalDraft, 'lines'> & {
    event: PaymentJournalEvent;
    amount: number;
    accounts: ChartOfAccount[];
    fee?: number;
    revenueAccount?: CoaCode;
  }
): JournalDraft {
  const lines = buildPaymentJournal(params.event, params.amount, params.accounts, {
    fee: params.fee,
    revenueAccount: params.revenueAccount,
  });
  return {
    tenantId: params.tenantId,
    entryDate: params.entryDate,
    description: params.description,
    sourceType: params.sourceType,
    sourceId: params.sourceId,
    createdBy: params.createdBy,
    lines,
  };
}

/**
 * Build journal for split payment (multiple debits, single credit).
 */
export function buildSplitPaymentJournal(
  debits: { code: CoaCode; amount: number }[],
  revenueAmount: number,
  accounts: ChartOfAccount[]
): JournalLine[] {
  const lines: JournalLine[] = debits.map((d) =>
    line(resolveAccountId(accounts, d.code), d.code, d.amount, 0)
  );
  lines.push(
    line(resolveAccountId(accounts, '4100'), '4100', 0, revenueAmount)
  );
  assertBalanced(lines);
  return lines;
}

export { COA_NAMES };
