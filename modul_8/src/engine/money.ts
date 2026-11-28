/** Semua uang = integer rupiah. Harga satuan dibulatkan, jumlah baris dibulatkan, total = jumlah baris. */
export const rupiah = (value: number): string =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Math.round(value));

export const shortRupiah = (value: number): string => {
  const n = Math.round(value);
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2).replace(".", ",")} M`;
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(n >= 100_000_000 ? 0 : 1).replace(".", ",")} jt`;
  if (Math.abs(n) >= 1_000) return `Rp ${Math.round(n / 1000)} rb`;
  return rupiah(n);
};

export const numberId = (value: number, digits = 0): string =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);

export const percent = (value: number): string => `${numberId(value, value < 10 && value % 1 !== 0 ? 1 : 0)}%`;

export function roundVolume(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function lineAmount(volume: number, unitPrice: number): number {
  return Math.round(roundVolume(volume) * Math.round(unitPrice));
}

const satuan = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];

function terbilangInner(n: number): string {
  if (n < 0) return `minus ${terbilangInner(-n)}`;
  if (n < 12) return satuan[n];
  if (n < 20) return `${terbilangInner(n - 10)} belas`;
  if (n < 100) return `${terbilangInner(Math.floor(n / 10))} puluh ${terbilangInner(n % 10)}`.trim();
  if (n < 200) return `seratus ${terbilangInner(n - 100)}`.trim();
  if (n < 1000) return `${terbilangInner(Math.floor(n / 100))} ratus ${terbilangInner(n % 100)}`.trim();
  if (n < 2000) return `seribu ${terbilangInner(n - 1000)}`.trim();
  if (n < 1_000_000) return `${terbilangInner(Math.floor(n / 1000))} ribu ${terbilangInner(n % 1000)}`.trim();
  if (n < 1_000_000_000) return `${terbilangInner(Math.floor(n / 1_000_000))} juta ${terbilangInner(n % 1_000_000)}`.trim();
  if (n < 1_000_000_000_000) return `${terbilangInner(Math.floor(n / 1_000_000_000))} miliar ${terbilangInner(n % 1_000_000_000)}`.trim();
  return `${terbilangInner(Math.floor(n / 1_000_000_000_000))} triliun`;
}

export function terbilangRupiah(n: number): string {
  const text = terbilangInner(Math.round(n)).replace(/\s+/g, " ").trim();
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} rupiah`;
}

export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso;
  }
}
