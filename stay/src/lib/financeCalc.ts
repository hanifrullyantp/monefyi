import type { AccountType, ChartAccount, JournalLineInput } from '../types/finance';

const TOLERANCE = 0.01;

export function sumDebits(lines: JournalLineInput[]): number {
  return lines.reduce((s, l) => s + (l.debit || 0), 0);
}

export function sumCredits(lines: JournalLineInput[]): number {
  return lines.reduce((s, l) => s + (l.credit || 0), 0);
}

export function validateBalancedEntry(lines: JournalLineInput[]): { ok: boolean; message?: string } {
  if (!lines.length) {
    return { ok: false, message: 'Minimal satu baris jurnal diperlukan.' };
  }

  for (const line of lines) {
    if (line.debit < 0 || line.credit < 0) {
      return { ok: false, message: 'Debit dan kredit tidak boleh negatif.' };
    }
    if (line.debit > 0 && line.credit > 0) {
      return { ok: false, message: 'Satu baris tidak boleh memiliki debit dan kredit sekaligus.' };
    }
    if (line.debit === 0 && line.credit === 0) {
      return { ok: false, message: 'Setiap baris harus memiliki debit atau kredit.' };
    }
  }

  const debits = sumDebits(lines);
  const credits = sumCredits(lines);
  if (Math.abs(debits - credits) > TOLERANCE) {
    return {
      ok: false,
      message: `Jurnal tidak seimbang: debit ${debits.toLocaleString('id-ID')} ≠ kredit ${credits.toLocaleString('id-ID')}.`,
    };
  }

  return { ok: true };
}

/** Net effect on stored current_balance after a journal line. */
export function balanceDelta(accountType: AccountType, debit: number, credit: number): number {
  if (accountType === 'aktiva' || accountType === 'beban') return debit - credit;
  return credit - debit;
}

export function applyBalanceDelta(current: number, delta: number): number {
  return Math.round((current + delta) * 100) / 100;
}

export function isBalanceSheetBalanced(totalAktiva: number, totalPasiva: number): boolean {
  return Math.abs(totalAktiva - totalPasiva) <= TOLERANCE;
}

export function accountBalanceCategory(accountType: AccountType): 'aktiva' | 'pasiva' {
  return accountType === 'aktiva' ? 'aktiva' : 'pasiva';
}

export function isBalanceSheetAccount(account: ChartAccount): boolean {
  return account.accountType === 'aktiva' || account.accountType === 'pasiva';
}

export function generateEntryNumber(existingCount: number): string {
  const year = new Date().getFullYear();
  const seq = (existingCount + 1).toString().padStart(5, '0');
  return `JRN-${year}-${seq}`;
}

export function calcPercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export function getCurrentPeriod(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function isDateInPeriod(dateStr: string, month: number, year: number): boolean {
  const d = new Date(dateStr);
  return d.getMonth() + 1 === month && d.getFullYear() === year;
}

export const XENDIT_FEE_RATE = 0.007;

export function calcXenditFee(amount: number): number {
  return Math.round(amount * XENDIT_FEE_RATE);
}
