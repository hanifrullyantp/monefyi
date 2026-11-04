/**
 * Template jurnal lima kejadian. Nominal selalu bilangan bulat rupiah.
 * Saldo kas: masuk menambah, keluar mengurangi. Hutang pihak bertanda:
 * kredit hutang menambah hutang, debit hutang mengurangi.
 */

export type CashMovement = 'in' | 'out';

export type TemplateLine = {
  role: 'kas' | 'kas_tujuan' | 'laba' | 'hutang' | 'piutang';
  debit: number;
  credit: number;
};

export type PartyAllocation = {
  partyId: string;
  projectId: string;
  amount: number;
};

export function toRupiah(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount);
}

export function projectExpense(amount: number): TemplateLine[] {
  const value = toRupiah(amount);
  return [
    { role: 'laba', debit: value, credit: 0 },
    { role: 'kas', debit: 0, credit: value },
  ];
}

export function projectIncome(amount: number): TemplateLine[] {
  const value = toRupiah(amount);
  return [
    { role: 'kas', debit: value, credit: 0 },
    { role: 'laba', debit: 0, credit: value },
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
  if (accountType === 'piutang') {
    if (debit > 0) return value;
    if (credit > 0) return -value;
  }
  return null;
}
