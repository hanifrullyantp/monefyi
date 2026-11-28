/** Tanggal YYYY-MM-DD di zona organisasi. `now` disuntik agar bisa diuji. */
export function orgToday(timeZone = 'Asia/Jakarta', now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) return '1970-01-01';
  return `${year}-${month}-${day}`;
}

export type TanggalResult = {
  ok: boolean;
  date: string;
  needsReview: boolean;
  reason?: string;
};

const ID_MONTHS: Record<string, number> = {
  jan: 1, januari: 1,
  feb: 2, februari: 2,
  mar: 3, maret: 3,
  apr: 4, april: 4,
  mei: 5,
  jun: 6, juni: 6,
  jul: 7, juli: 7,
  agu: 8, agt: 8, agustus: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oktober: 10,
  nov: 11, november: 11,
  des: 12, desember: 12,
};

function formatYmd(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year
    || probe.getUTCMonth() + 1 !== month
    || probe.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function shiftOrgDate(baseYmd: string, deltaDays: number): string {
  const y = Number(baseYmd.slice(0, 4));
  const m = Number(baseYmd.slice(5, 7));
  const d = Number(baseYmd.slice(8, 10));
  const shifted = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Mengurai ungkapan tanggal Indonesia secara deterministik ke YYYY-MM-DD.
 * Mendukung: "hari ini", "kemarin", "lusa", "besok", "YYYY-MM-DD", "DD/MM/YYYY",
 * "DD-MM-YYYY", dan "DD <bulan> YYYY".
 */
export function parseTanggal(
  input: string,
  timeZone = 'Asia/Jakarta',
  now = new Date(),
): TanggalResult {
  const raw = String(input ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!raw) return { ok: false, date: '', needsReview: true, reason: 'tanggal_kosong' };

  const today = orgToday(timeZone, now);
  if (raw === 'hari ini' || raw === 'hr ini' || raw === 'sekarang' || raw === 'today') {
    return { ok: true, date: today, needsReview: false };
  }
  if (raw === 'kemarin' || raw === 'kmrn' || raw === 'yesterday') {
    return { ok: true, date: shiftOrgDate(today, -1), needsReview: false };
  }
  if (raw === 'kemarin lusa' || raw === '2 hari lalu' || raw === 'dua hari lalu') {
    return { ok: true, date: shiftOrgDate(today, -2), needsReview: false };
  }
  if (raw === 'besok' || raw === 'tomorrow') {
    return { ok: true, date: shiftOrgDate(today, 1), needsReview: false };
  }
  if (raw === 'lusa') {
    return { ok: true, date: shiftOrgDate(today, 2), needsReview: false };
  }

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const formatted = formatYmd(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    return formatted
      ? { ok: true, date: formatted, needsReview: false }
      : { ok: false, date: '', needsReview: true, reason: 'tanggal_tidak_valid' };
  }

  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const formatted = formatYmd(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));
    return formatted
      ? { ok: true, date: formatted, needsReview: false }
      : { ok: false, date: '', needsReview: true, reason: 'tanggal_tidak_valid' };
  }

  const namedMonth = raw.match(/^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?$/);
  if (namedMonth) {
    const monthNum = ID_MONTHS[namedMonth[2]];
    if (!monthNum) {
      return { ok: false, date: '', needsReview: true, reason: 'bulan_tidak_dikenal' };
    }
    const yearNum = namedMonth[3] ? Number(namedMonth[3]) : Number(today.slice(0, 4));
    const formatted = formatYmd(yearNum, monthNum, Number(namedMonth[1]));
    return formatted
      ? { ok: true, date: formatted, needsReview: false }
      : { ok: false, date: '', needsReview: true, reason: 'tanggal_tidak_valid' };
  }

  return { ok: false, date: '', needsReview: true, reason: 'format_tanggal_tidak_dikenal' };
}
