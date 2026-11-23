/** Meta menagih pada ambang nominal ATAU tanggal bulanan, mana yang lebih dulu. */

export type MetaBillKind = "ok" | "date_soon" | "threshold_soon" | "payment_failed";

export function nextMonthlyBillDate(dayOfMonth: number, now = new Date()): Date | null {
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 28) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  if (due < today) due.setMonth(due.getMonth() + 1);
  return due;
}

export function daysUntilDate(target: Date, now = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export function classifyMetaBilling(input: {
  balance: number;
  threshold: number;
  daysUntilBill: number | null;
  leadDays: number;
  paymentFailed: boolean;
}): MetaBillKind {
  if (input.paymentFailed) return "payment_failed";
  const lead = Math.max(0, input.leadDays);
  if (input.daysUntilBill != null && input.daysUntilBill <= lead) return "date_soon";
  if (input.threshold > 0 && input.balance > 0 && input.balance / input.threshold >= 0.85) {
    return "threshold_soon";
  }
  return "ok";
}
