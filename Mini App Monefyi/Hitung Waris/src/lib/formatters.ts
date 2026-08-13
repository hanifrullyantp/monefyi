/**
 * Format angka ke format Rupiah Indonesia
 */
export function formatRupiah(amount: number): string {
  if (isNaN(amount) || !isFinite(amount)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format angka ke string dengan separator ribuan
 */
export function formatNumber(amount: number): string {
  if (isNaN(amount) || !isFinite(amount)) return "0";
  return new Intl.NumberFormat("id-ID").format(amount);
}

/**
 * Parse string rupiah ke number
 */
export function parseRupiah(value: string): number {
  const cleaned = value.replace(/[^0-9]/g, "");
  return cleaned ? parseInt(cleaned, 10) : 0;
}

/**
 * Format persentase
 */
export function formatPersentase(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format pecahan
 */
export function formatPecahan(pembilang: number, penyebut: number): string {
  if (penyebut === 0) return "0";
  if (pembilang === 0) return "0";
  return `${pembilang}/${penyebut}`;
}

/**
 * Format tanggal ke string Indonesia
 */
export function formatTanggal(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Format angka input currency (tambahkan pemisah ribuan)
 */
export function formatInputCurrency(value: string): string {
  const num = value.replace(/[^0-9]/g, "");
  if (!num) return "";
  return new Intl.NumberFormat("id-ID").format(parseInt(num, 10));
}
