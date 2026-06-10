const ID_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/** Angka dengan pemisah ribuan (tanpa Rp) */
export function formatNumberId(n: number): string {
  if (!Number.isFinite(n)) return '';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n);
}

export function parseNumberId(raw: string): number {
  const cleaned = raw.replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.-]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Full Rupiah format: Rp 1.000.000 */
export function formatRupiahFull(n: number): string {
  if (!Number.isFinite(n)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);
}

/** Indonesian date: 16 Mei 2026 */
export function formatDateId(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${d.getDate()} ${ID_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatPhoneWa(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('62')) return digits;
  return digits;
}

export function nextEstimationCode(existingCodes: string[], year = new Date().getFullYear()): string {
  const prefix = `EST-${year}-`;
  let max = 0;
  for (const code of existingCodes) {
    if (!code.startsWith(prefix)) continue;
    const n = parseInt(code.slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

export const ESTIMATION_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  sent: 'Terkirim',
  accepted: 'Diterima',
  rejected: 'Ditolak',
  converted: 'Jadi Proyek',
};

export const ESTIMATION_STATUS_COLOR: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
  converted: 'bg-violet-100 text-violet-700',
};
