/**
 * Command normalization + signature/slot extraction for the learning memory.
 *
 * The idea: turn an input like "beli semen 50 sak 65rb" into a stable signature
 * "beli {text0} {n0} sak {n1}" plus extracted slots { numbers: [50, 65000], texts: ["semen"] }.
 * Corrections are stored against the signature so future similar commands replay
 * deterministically via applyTemplate().
 */

export interface CommandSlots {
  signature: string;
  numbers: number[];
  texts: string[];
}

export type ParamsTemplate = Record<string, string | number | boolean>;

const ABBREVIATIONS: Record<string, string> = {
  smn: 'semen',
  bsi: 'besi',
  psr: 'pasir',
  byr: 'bayar',
  bl: 'beli',
  blj: 'belanja',
  catet: 'catat',
  trm: 'terima',
  prj: 'proyek',
  project: 'proyek',
  hrg: 'harga',
  sdh: 'sudah',
  udh: 'sudah',
  udah: 'sudah',
  upd: 'update',
  org: 'orang',
  mtr: 'meter',
  lbr: 'lembar',
  btg: 'batang',
  zak: 'sak',
  karung: 'sak',
  kubik: 'm3',
};

// Structural words kept literal in the signature so command shapes stay stable.
const KEYWORDS = new Set([
  'beli', 'belanja', 'bayar', 'catat', 'update', 'progress', 'proses', 'cek', 'check',
  'terima', 'hadir',
  'lihat', 'berapa', 'buka', 'tampilkan', 'show', 'hadir', 'kerja', 'pekerja',
  'tukang', 'kuli', 'datang', 'sisa', 'budget', 'anggaran', 'biaya', 'rap',
  'laporan', 'report', 'rekomendasi', 'saran', 'analisa', 'analisis', 'sudah',
  'selesai', 'hari', 'ini', 'log', 'harga',
]);

const UNITS = new Set([
  'sak', 'kg', 'm3', 'm³', 'kubik', 'btg', 'batang', 'buah', 'unit', 'ls',
  'lot', 'pcs', 'lembar', 'lbr', 'roll', 'meter', 'mtr', 'orang', 'org', 'm2',
]);

const PREPOSITIONS = new Set(['di', 'ke', 'untuk', 'proyek', 'dari', 'dengan', 'pada']);

const MULTIPLIERS: Record<string, number> = {
  rb: 1000, ribu: 1000, k: 1000, jt: 1_000_000, juta: 1_000_000,
};

// Suffix words that follow a number but carry no value (just markers).
const MARKER_WORDS = new Set(['persen', 'prosen', '%']);

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeInput(raw: string): string {
  const base = stripDiacritics(String(raw || ''))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  return base
    .split(' ')
    .map(tok => ABBREVIATIONS[tok] ?? tok)
    .join(' ');
}

/** True if the token begins like a number (optionally prefixed by rp). */
function startsNumeric(tok: string): boolean {
  return /^(rp\.?)?\d/i.test(tok);
}

/** Parse a single numeric token, applying an attached multiplier/percent suffix. */
function parseAmountToken(tok: string): number | null {
  let t = tok.toLowerCase().replace(/^rp\.?/, '').trim();
  if (!t) return null;

  let mult = 1;
  const suffix = t.match(/(rb|ribu|k|jt|juta)$/);
  if (suffix) {
    mult = MULTIPLIERS[suffix[1]];
    t = t.slice(0, t.length - suffix[1].length);
  }
  t = t.replace(/%$/, '');
  if (!/\d/.test(t)) return null;

  let num: number;
  if (mult !== 1) {
    // Suffix present -> remaining part may be a decimal ("1,5jt" / "1.5jt").
    num = parseFloat(t.replace(',', '.'));
  } else {
    // No suffix -> treat "." and "," as thousand separators ("65.000" -> 65000).
    num = parseFloat(t.replace(/[.,]/g, ''));
  }
  return Number.isNaN(num) ? null : num * mult;
}

/**
 * Build the stable signature plus ordered numeric/text slots for an input.
 */
export function buildSlots(raw: string): CommandSlots {
  const normalized = normalizeInput(raw);
  const tokens = normalized.split(' ').filter(Boolean);

  const numbers: number[] = [];
  const texts: string[] = [];
  const sigParts: string[] = [];
  let textRun: string[] = [];

  const flushText = () => {
    if (textRun.length) {
      texts.push(textRun.join(' '));
      sigParts.push(`{text${texts.length - 1}}`);
      textRun = [];
    }
  };

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    if (startsNumeric(tok)) {
      const val = parseAmountToken(tok);
      if (val !== null) {
        flushText();
        let value = val;
        const next = tokens[i + 1];
        if (next && MULTIPLIERS[next] !== undefined) {
          value *= MULTIPLIERS[next];
          i++;
        }
        const afterNum = tokens[i + 1];
        if (afterNum && MARKER_WORDS.has(afterNum)) i++;
        numbers.push(value);
        sigParts.push(`{n${numbers.length - 1}}`);
        continue;
      }
    }

    if (KEYWORDS.has(tok) || UNITS.has(tok) || PREPOSITIONS.has(tok)) {
      flushText();
      sigParts.push(tok);
    } else if (MARKER_WORDS.has(tok)) {
      // standalone marker without a preceding number -> drop
      continue;
    } else {
      textRun.push(tok);
    }
  }
  flushText();

  return { signature: sigParts.join(' '), numbers, texts };
}

export function signatureOf(raw: string): string {
  return buildSlots(raw).signature;
}

/**
 * Given corrected params + the slots of the original input, derive a template
 * that maps each param to a slot placeholder (so values re-extract on replay).
 */
export function buildParamsTemplate(
  params: Record<string, unknown>,
  slots: CommandSlots,
): ParamsTemplate {
  const template: ParamsTemplate = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;

    if (typeof value === 'number') {
      const idx = slots.numbers.findIndex(n => n === value);
      template[key] = idx >= 0 ? `{n${idx}}` : value;
    } else if (typeof value === 'string') {
      const lower = value.toLowerCase().trim();
      const idx = slots.texts.findIndex(t => t.toLowerCase().trim() === lower);
      if (idx >= 0) {
        template[key] = `{text${idx}}`;
      } else {
        const numIdx = slots.numbers.findIndex(n => String(n) === lower);
        template[key] = numIdx >= 0 ? `{n${numIdx}}` : value;
      }
    } else if (typeof value === 'boolean') {
      template[key] = value;
    }
  }

  return template;
}

/** Replay a stored template against a new input's slots to produce params. */
export function applyTemplate(
  template: ParamsTemplate,
  slots: CommandSlots,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(template)) {
    if (typeof raw === 'string') {
      const nMatch = raw.match(/^\{n(\d+)\}$/);
      if (nMatch) {
        out[key] = slots.numbers[Number(nMatch[1])] ?? null;
        continue;
      }
      const tMatch = raw.match(/^\{text(\d+)\}$/);
      if (tMatch) {
        out[key] = slots.texts[Number(tMatch[1])] ?? null;
        continue;
      }
    }
    out[key] = raw;
  }

  return finalizeParams(out);
}

/** Recompute intent-derived fields that should not be stored as literals. */
export function finalizeParams(params: Record<string, unknown>): Record<string, unknown> {
  const out = { ...params };
  const qty = out.qty != null ? Number(out.qty) : null;
  const unitPrice = out.unitPrice != null ? Number(out.unitPrice) : null;

  if (qty != null && unitPrice != null && !Number.isNaN(qty) && !Number.isNaN(unitPrice)) {
    out.total = qty * unitPrice;
  }

  return out;
}
