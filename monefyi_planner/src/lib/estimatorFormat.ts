const ID_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const ID_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
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
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${ID_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Short date: 18 Agu 2026 */
export function formatDateIdShort(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${ID_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** Date + time: 18 Agu 2026, 14:22 */
export function formatDateTimeId(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${formatDateIdShort(d)}, ${time}`;
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
  wa: 'WA',
  survei: 'Survei',
  penawaran: 'Penawaran',
  closing: 'Closing',
  proses: 'Proses',
  finishing: 'Finishing',
  selesai: 'Selesai',
  rejected: 'Ditolak',
  converted: 'Jadi Proyek',
  // Legacy aliases (pre-migration reads)
  draft: 'WA',
  sent: 'Penawaran',
  accepted: 'Closing',
};

export const ESTIMATION_STATUS_COLOR: Record<string, string> = {
  wa: 'bg-emerald-100 text-emerald-700',
  survei: 'bg-sky-100 text-sky-700',
  penawaran: 'bg-blue-100 text-blue-700',
  closing: 'bg-amber-100 text-amber-800',
  proses: 'bg-violet-100 text-violet-700',
  finishing: 'bg-fuchsia-100 text-fuchsia-700',
  selesai: 'bg-teal-100 text-teal-700',
  rejected: 'bg-red-100 text-red-700',
  converted: 'bg-slate-100 text-slate-700',
  draft: 'bg-emerald-100 text-emerald-700',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-amber-100 text-amber-800',
};

export const ESTIMATION_STATUS_DOT: Record<string, string> = {
  wa: 'bg-emerald-500',
  survei: 'bg-sky-500',
  penawaran: 'bg-blue-500',
  closing: 'bg-amber-500',
  proses: 'bg-violet-500',
  finishing: 'bg-fuchsia-500',
  selesai: 'bg-teal-500',
  rejected: 'bg-red-500',
  converted: 'bg-slate-500',
  draft: 'bg-emerald-500',
  sent: 'bg-blue-500',
  accepted: 'bg-amber-500',
};
