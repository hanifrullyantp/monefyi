/**
 * Ambang batas status proyek & estimasi.
 * Seluruh ambang batas diambil dari config ini, BUKAN di-hardcode di komponen.
 */
export const PROJECT_THRESHOLDS = {
  /** Update 0–freshDays hari = proyek aman / segar. */
  freshDays: 14,
  /** Update > staleDays hari = perlu perhatian / update progres. */
  staleDays: 60,
  /** Jendela waktu aktivitas/estimasi baru (30 hari). */
  newWindowDays: 30,
  /** Ambang deviasi progres berisiko (misal -5%). */
  atRiskDeviationPercent: -5,
  /** Ambang budget terpakai waspada (> 90%). */
  budgetWarningPercent: 90,
  /** Ambang budget terpakai overbudget (> 100%). */
  budgetOverPercent: 100,
} as const;

