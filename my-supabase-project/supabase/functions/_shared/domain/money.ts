/**
 * Rupiah dan tanggal organisasi. Fungsi murni: tanpa DOM, jaringan, atau jam tersembunyi.
 * Uang selalu bilangan bulat rupiah.
 */

export type RupiahResult = {
  ok: boolean;
  amount: number;
  needsReview: boolean;
  reason?: string;
};

export type CostCommand = {
  item: string;
  qty: number | null;
  unit: string | null;
  unitPrice: number | null;
  total: number;
  needsReview: boolean;
  reason?: string;
  projectName: string | null;
};

export const COST_UNITS = [
  'sak', 'kg', 'm2', 'm²', 'm3', 'm³', 'kubik', 'btg', 'batang', 'buah', 'unit',
  'ls', 'lot', 'pcs', 'lembar', 'lbr', 'roll', 'meter', 'mtr', 'kaleng', 'ember',
  'galon', 'dus', 'set', 'titik', 'hari', 'orang', 'org',
] as const;

const UNIT_PATTERN = COST_UNITS.join('|');
const VERB = /^(?:beli|bayar|byr|bl|catat(?:\s+beli)?|catat)\s+/i;

type NumberRead = { ok: boolean; value: number; needsReview: boolean; reason?: string };

function fail(reason: string): RupiahResult {
  return { ok: false, amount: 0, needsReview: true, reason };
}

/** Titik sebagai pemisah ribuan, koma sebagai desimal. `k` hanya akhiran token, bukan huruf di dalam kata. */
export function readNumberToken(token: string, allowDecimal: boolean): NumberRead {
  const t = token.trim();
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    return { ok: true, value: Number(t.replace(/\./g, '')), needsReview: false };
  }
  if (/^\d{1,3}(,\d{3})+$/.test(t)) {
    return {
      ok: true,
      value: Number(t.replace(/,/g, '')),
      needsReview: true,
      reason: 'pemisah_koma',
    };
  }
  if (/^\d+$/.test(t)) {
    return { ok: true, value: Number(t), needsReview: false };
  }
  if (/^\d+,\d{1,2}$/.test(t)) {
    return {
      ok: true,
      value: Number(t.replace(',', '.')),
      needsReview: !allowDecimal,
      reason: allowDecimal ? undefined : 'desimal_tanpa_satuan',
    };
  }
  if (/^\d+\.\d{1,2}$/.test(t)) {
    return {
      ok: true,
      value: Number(t),
      needsReview: !allowDecimal,
      reason: allowDecimal ? undefined : 'titik_ambigu',
    };
  }
  return { ok: false, value: 0, needsReview: true, reason: 'angka_tidak_jelas' };
}

function multiplier(suffix: string): number {
  if (suffix === 'juta' || suffix === 'jt') return 1_000_000;
  if (suffix === 'ribu' || suffix === 'rb' || suffix === 'k') return 1_000;
  return 1;
}

/**
 * Mengurai satu ungkapan nominal. Contoh: "65 ribu", "65rb", "65k", "1,5 juta",
 * "2 juta 500 ribu", "1.500.000", "Rp 65.000".
 */
export function parseRupiah(input: string): RupiahResult {
  const raw = String(input ?? '').trim();
  if (!raw) return fail('kosong');

  const s = raw
    .toLowerCase()
    .replace(/\brp\.?\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return fail('kosong');

  const number = '(?:\\d{1,3}(?:\\.\\d{3})+|\\d+(?:[.,]\\d+)?)';
  const compound = s.match(
    new RegExp(`^(${number})\\s*(?:juta|jt)\\s+(${number})\\s*(?:ribu|rb|k)$`, 'i'),
  );
  if (compound) {
    const big = readNumberToken(compound[1], true);
    const small = readNumberToken(compound[2], true);
    if (!big.ok || !small.ok) return fail('angka_tidak_jelas');
    return {
      ok: true,
      amount: Math.round(big.value * 1_000_000 + small.value * 1_000),
      needsReview: big.needsReview || small.needsReview,
      reason: big.reason || small.reason,
    };
  }

  const single = s.match(new RegExp(`^(${number})(?:\\s*(juta|jt|ribu|rb|k))?$`, 'i'));
  if (!single) return fail('bukan_nominal');

  const suffix = (single[2] || '').toLowerCase();
  const num = readNumberToken(single[1], suffix.length > 0);
  if (!num.ok) return fail(num.reason || 'angka_tidak_jelas');

  return {
    ok: true,
    amount: Math.round(num.value * multiplier(suffix)),
    needsReview: num.needsReview,
    reason: num.reason,
  };
}

/** Nominal di dalam kalimat. Angka yang diikuti satuan (10 sak) dilewati. Huruf k di dalam kata bukan pengali. */
export function firstRupiah(input: string): RupiahResult {
  const number = '(?:\\d{1,3}(?:\\.\\d{3})+|\\d+(?:[.,]\\d+)?)';
  const re = new RegExp(
    `(?:rp\\.?\\s*)?${number}(?:\\s*(?:juta|jt|ribu|rb|k))?(?:\\s+${number}\\s*(?:ribu|rb|k))?`,
    'gi',
  );
  const unitAfter = new RegExp(`^\\s*(?:${UNIT_PATTERN})\\b`, 'i');
  const text = String(input ?? '');
  const hits: { token: string; isQty: boolean }[] = [];
  for (const match of text.matchAll(re)) {
    const start = match.index ?? 0;
    const after = text.slice(start + match[0].length);
    hits.push({ token: match[0], isQty: unitAfter.test(after) });
  }
  const chosen = hits.filter((hit) => !hit.isQty).at(-1) ?? hits.at(-1);
  if (!chosen) return fail('bukan_nominal');
  return parseRupiah(chosen.token);
}

/**
 * Perintah biaya satu baris. Satuan yang tidak dikenal atau nominal ganda tanpa satuan
 * ditandai needsReview, bukan ditebak menjadi jutaan.
 */
export function parseCostCommand(input: string): CostCommand | null {
  const original = String(input ?? '').trim();
  if (!VERB.test(original)) return null;

  let rest = original.replace(VERB, '').trim();
  let projectName: string | null = null;
  const project = rest.match(/\s+(?:project|proyek|prj)\s+(.+)$/i);
  if (project && project.index != null) {
    projectName = project[1].trim();
    rest = rest.slice(0, project.index).trim();
  }

  const withQty = rest.match(
    new RegExp(
      `^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_PATTERN})\\s*(?:@|harga|hrg|x|×)?\\s*(.+)$`,
      'i',
    ),
  );
  if (withQty) {
    const qty = readNumberToken(withQty[2], false);
    const price = parseRupiah(withQty[4]);
    const item = withQty[1].trim();
    const unit = withQty[3].toLowerCase();
    if (!qty.ok || !price.ok) {
      return {
        item,
        qty: qty.ok ? qty.value : null,
        unit,
        unitPrice: null,
        total: 0,
        needsReview: true,
        reason: 'harga_tidak_jelas',
        projectName,
      };
    }
    return {
      item,
      qty: qty.value,
      unit,
      unitPrice: price.amount,
      total: Math.round(qty.value * price.amount),
      needsReview: qty.needsReview || price.needsReview,
      reason: price.reason || qty.reason,
      projectName,
    };
  }

  const tail = rest.match(
    /^(.+?)\s+(\d[\d.,]*(?:\s*(?:juta|jt|ribu|rb|k))?(?:\s+\d[\d.,]*\s*(?:ribu|rb|k))?)\s*$/i,
  );
  if (!tail) {
    return {
      item: rest,
      qty: null,
      unit: null,
      unitPrice: null,
      total: 0,
      needsReview: true,
      reason: 'nominal_tidak_ada',
      projectName,
    };
  }

  const price = parseRupiah(tail[2]);
  return {
    item: tail[1].trim(),
    qty: null,
    unit: null,
    unitPrice: null,
    total: price.ok ? price.amount : 0,
    needsReview: !price.ok || price.needsReview,
    reason: price.reason,
    projectName,
  };
}

export { orgToday } from "./dates.ts";
