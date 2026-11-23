export interface MayarTransactionStatus {
  isPaid: boolean;
  leadStatus: "won" | "pending_payment" | "abandoned_checkout";
  /** Nilai kolom orders.status. "expired" tidak dipaksa menjadi pending_payment saat dibaca ulang. */
  orderStatus: "paid" | "pending" | "expired";
}

/**
 * Status transaksi Mayar untuk daftar admin.
 * Lunas menjadi deal. Yang lain tetap tampil saat filter Semua.
 */
export function mapMayarTransactionStatus(rawStatus: unknown): MayarTransactionStatus {
  const status = String(rawStatus || "").trim().toLowerCase();
  if (status === "paid" || status === "settled" || status === "success") {
    return { isPaid: true, leadStatus: "won", orderStatus: "paid" };
  }
  if (
    status === "expired" ||
    status === "failed" ||
    status === "cancelled" ||
    status === "canceled" ||
    status === "void"
  ) {
    return { isPaid: false, leadStatus: "abandoned_checkout", orderStatus: "expired" };
  }
  return { isPaid: false, leadStatus: "pending_payment", orderStatus: "pending" };
}
