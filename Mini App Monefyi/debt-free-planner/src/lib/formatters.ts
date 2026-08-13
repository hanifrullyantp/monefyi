// src/lib/formatters.ts

export function formatCurrency(value: number): string {
  if (isNaN(value) || !isFinite(value)) return "Rp 0";
  return (
    "Rp " +
    Math.round(value)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  );
}

export function formatCurrencyCompact(value: number): string {
  if (isNaN(value) || !isFinite(value)) return "Rp 0";
  if (value >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(1).replace(".", ",")}M`;
  }
  if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(1).replace(".", ",")}jt`;
  }
  if (value >= 1_000) {
    return `Rp ${(value / 1_000).toFixed(0)}rb`;
  }
  return `Rp ${Math.round(value)}`;
}

export function formatPercent(value: number): string {
  if (isNaN(value) || !isFinite(value)) return "0%";
  return value.toFixed(2).replace(".", ",") + "%";
}

export function formatMonths(months: number): string {
  if (months <= 0) return "0 bulan";
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 0) return `${remainingMonths} bulan`;
  if (remainingMonths === 0) return `${years} tahun`;
  return `${years} tahun ${remainingMonths} bulan`;
}

export function formatDate(monthOffset: number): string {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agt", "Sep", "Okt", "Nov", "Des",
  ];
  return `${months[target.getMonth()]} ${target.getFullYear()}`;
}

export function formatDateLong(monthOffset: number): string {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  return `${months[target.getMonth()]} ${target.getFullYear()}`;
}

export function formatDateFromString(dateStr: string): string {
  return dateStr;
}

export function parseInput(str: string): number {
  if (!str) return 0;
  const cleaned = str
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatInputCurrency(value: number): string {
  if (!value || isNaN(value)) return "";
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function getCurrentMonthYear(): string {
  const now = new Date();
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}
