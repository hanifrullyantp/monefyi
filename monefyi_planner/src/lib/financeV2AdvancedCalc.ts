/** Daily amortization amount for a prepaid item. */
export function calcDailyAmortization(
  remainingValue: number,
  startDate: string,
  endDate: string,
  lastAmortizedDate?: string | null,
): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  const start = new Date(startDate);
  if (today < start || today > end || remainingValue <= 0) return 0;

  const from = lastAmortizedDate ? new Date(lastAmortizedDate) : new Date(start);
  from.setDate(from.getDate() + 1);
  const daysLeft = Math.max(1, Math.ceil((end.getTime() - from.getTime()) / 86400000) + 1);
  return Math.round((remainingValue / daysLeft) * 100) / 100;
}

/** Straight-line monthly depreciation. */
export function calcMonthlyDepreciation(
  purchaseValue: number,
  usefulLifeMonths: number,
  currentValue: number,
): number {
  if (usefulLifeMonths <= 0 || currentValue <= 0) return 0;
  const monthly = purchaseValue / usefulLifeMonths;
  return Math.round(Math.min(monthly, currentValue) * 100) / 100;
}

export function calcDividend(profit: number, sharePct: number): number {
  if (profit <= 0 || sharePct <= 0) return 0;
  return Math.round((profit * sharePct / 100) * 100) / 100;
}

export function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
