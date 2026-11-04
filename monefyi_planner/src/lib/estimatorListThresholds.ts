/**
 * Ambang umur estimasi untuk dashboard & warna list.
 * Satu sumber angka — nanti bisa diganti pengaturan per tenant.
 * Jangan hardcode 14/60/30 di komponen.
 */
export const ESTIMATOR_RECENCY_THRESHOLDS = {
  /** Update 0–freshDays hari = hijau. */
  freshDays: 14,
  /** Update > staleDays hari + belum arsip = mandek (merah). */
  staleDays: 60,
  /** Jendela kartu "Estimasi baru". */
  newWindowDays: 30,
} as const;

/** Jumlah baris list sebelum tombol "Tampilkan sisanya". */
export const ESTIMATOR_LIST_PAGE_SIZE = 6;
