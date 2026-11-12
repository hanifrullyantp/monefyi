/**
 * Penilai hasil setelah aksi scale. Murni (tanpa I/O) supaya mudah diuji.
 * Konservatif: rollback hanya jika bukti memburuk jelas dan sampelnya cukup.
 */
export interface OutcomeSnapshot {
  spend: number;
  purchases: number;
  cpa: number; // 0 jika tidak ada pembelian
}

export type OutcomeVerdict = "membaik" | "stabil" | "memburuk" | "data_belum_cukup";

export function judgeOutcome(input: {
  before: OutcomeSnapshot | null;
  after: { spend: number; purchases: number };
  targetCpa: number;
}): { verdict: OutcomeVerdict; afterCpa: number; reason: string } {
  const { before, after, targetCpa } = input;
  const afterCpa = after.purchases > 0 ? after.spend / after.purchases : 0;
  const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

  if (after.spend < targetCpa * 1.5) {
    return {
      verdict: "data_belum_cukup",
      afterCpa,
      reason: `Belanja setelah aksi baru ${rp(after.spend)}, belum cukup untuk menilai.`,
    };
  }

  if (after.purchases === 0) {
    if (after.spend >= targetCpa * 1.8) {
      return {
        verdict: "memburuk",
        afterCpa,
        reason: `Belanja ${rp(after.spend)} setelah scale tanpa satu pun pembelian.`,
      };
    }
    return { verdict: "data_belum_cukup", afterCpa, reason: "Belum ada pembelian, belanja belum melewati batas penilaian." };
  }

  const enoughSample = after.purchases >= 2 || after.spend >= targetCpa * 3;
  if (!enoughSample) {
    return { verdict: "data_belum_cukup", afterCpa, reason: "Hanya satu pembelian, terlalu sedikit untuk disimpulkan." };
  }

  const beforeCpa = before && before.cpa > 0 ? before.cpa : 0;
  if (afterCpa > targetCpa * 1.4 && (beforeCpa === 0 || afterCpa > beforeCpa * 1.3)) {
    return {
      verdict: "memburuk",
      afterCpa,
      reason: `CPA naik menjadi ${rp(afterCpa)}${beforeCpa ? ` dari ${rp(beforeCpa)}` : ""}, di atas batas ${rp(targetCpa * 1.4)}.`,
    };
  }
  if (afterCpa <= targetCpa * 1.15) {
    return { verdict: "membaik", afterCpa, reason: `CPA ${rp(afterCpa)} masih di dalam target ${rp(targetCpa)}.` };
  }
  return { verdict: "stabil", afterCpa, reason: `CPA ${rp(afterCpa)}, di atas target tetapi belum melewati batas rollback.` };
}
