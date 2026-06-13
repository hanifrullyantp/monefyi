/** YYYY-MM-01 */
export function startOfMonthDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

export function parseYmd(s: string): Date {
  const [y, mo, day] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, mo - 1, day);
}

export function lastDayOfMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/**
 * Default bulan laporan: bulan proyek dibuat.
 * Jika end date di 7 hari terakhir bulan → bulan berikutnya.
 */
export function computeFinanceReportMonth(createdAt: string, endDate?: string | null): string {
  const created = parseYmd(createdAt);
  const base = startOfMonthDate(created);
  if (!endDate) return base;

  const end = parseYmd(endDate);
  const daysInMonth = lastDayOfMonth(end);
  const dayOfMonth = end.getDate();
  if (dayOfMonth > daysInMonth - 7) {
    const next = new Date(end.getFullYear(), end.getMonth() + 1, 1);
    return startOfMonthDate(next);
  }
  return base;
}

/** Month picker value YYYY-MM → DB date YYYY-MM-01 */
export function monthPickerToReportDate(ym: string): string {
  if (/^\d{4}-\d{2}$/.test(ym)) return `${ym}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(ym)) return ym.slice(0, 7) + '-01';
  return ym;
}

export function reportDateToMonthPicker(reportMonth: string): string {
  return reportMonth.slice(0, 7);
}
