import { formatRupiahFull } from './estimatorFormat';
import type { AccountCategory, FinanceAccount, JournalLineInput } from '../types/financeV2';

export { formatRupiahFull as formatFinanceRupiah };

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
      message: `Jurnal tidak seimbang: debit ${formatRupiahFull(debits)} ≠ kredit ${formatRupiahFull(credits)}.`,
    };
  }

  return { ok: true };
}

/** Net effect on stored current_balance after a journal line. */
export function balanceDelta(category: AccountCategory, debit: number, credit: number): number {
  if (category === 'aktiva') return debit - credit;
  return credit - debit;
}

export function applyBalanceDelta(current: number, delta: number): number {
  return Math.round((current + delta) * 100) / 100;
}

export function isBalanceSheetBalanced(totalAktiva: number, totalPasiva: number): boolean {
  return Math.abs(totalAktiva - totalPasiva) <= TOLERANCE;
}

export function calcQuickRatio(
  accounts: Pick<FinanceAccount, 'type' | 'current_balance'>[],
): number | null {
  const kas = accounts.filter(a => a.type === 'kas').reduce((s, a) => s + a.current_balance, 0);
  const piutang = accounts.filter(a => a.type === 'piutang').reduce((s, a) => s + a.current_balance, 0);
  const hutang = accounts
    .filter(a => ['hutang_dagang', 'hutang_pajak', 'hutang_lain'].includes(a.type))
    .reduce((s, a) => s + a.current_balance, 0);

  if (hutang <= 0) return null;
  return Math.round(((kas + piutang) / hutang) * 100) / 100;
}

export function accountRouteForType(type: string): string | undefined {
  const map: Record<string, string> = {
    kas: '/app/finance-v2/kas',
    piutang: '/app/finance-v2/piutang',
    hutang_dagang: '/app/finance-v2/hutang',
    hutang_pajak: '/app/finance-v2/hutang',
    hutang_lain: '/app/finance-v2/hutang',
    stok: '/app/finance-v2/stok',
    aset_tetap: '/app/finance-v2/aset',
    prabayar: '/app/finance-v2/prabayar',
  };
  return map[type];
}
