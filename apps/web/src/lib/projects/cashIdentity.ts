/** Piutang di luar sisa kontrak (kontrak − dana masuk). Bagian ini memotong kas. */
export function extraPiutangBeyondContract(
  piutang: number,
  contractValue: number,
  received: number,
): number {
  const expected = Math.max(0, (contractValue || 0) - (received || 0));
  return Math.max(0, (piutang || 0) - expected);
}

/** Kas operasional: dana masuk − realisasi − piutang di luar sisa kontrak ± transfer. */
export function projectOperatingCash(input: {
  received: number;
  spent: number;
  piutang?: number;
  contractValue?: number;
  transfersNet?: number;
}): number {
  const extra = extraPiutangBeyondContract(
    input.piutang || 0,
    input.contractValue || 0,
    input.received || 0,
  );
  return (input.received || 0) - (input.spent || 0) + (input.transfersNet || 0) - extra;
}

/**
 * Jika saldo tersimpan masih kas kotor (belum dipotong piutang), potong sekarang.
 * Jika sudah net, jangan dipotong dua kali.
 */
export function cashAfterExtraPiutang(
  storedSaldo: number,
  extraPiutang: number,
  received: number,
  spent: number,
): number {
  const target = (received || 0) - (spent || 0) - extraPiutang;
  if (Math.abs((storedSaldo || 0) - target) <= 1) return storedSaldo || 0;
  return (storedSaldo || 0) - extraPiutang;
}
