/**
 * L0 Input Normalization — preprocess raw user text before L1–L5 parsing.
 * Pure function, target latency <10ms for inputs up to 500 chars.
 *
 * @module parsers/normalize
 */

/**
 * @typedef {'text' | 'voice' | 'whatsapp'} InputChannel
 */

/**
 * @typedef {Object} NormalizeOptions
 * @property {InputChannel} [channel='text'] - Source channel of the input
 */

/**
 * @typedef {Object} NormalizedMetadata
 * @property {Date} timestamp - When normalization ran
 * @property {InputChannel} channel - Input channel
 */

/**
 * @typedef {Object} NormalizedInput
 * @property {string} text - Normalized lowercase text ready for parsing
 * @property {string[]} tokens - Whitespace-split tokens from normalized text
 * @property {string} original - Original raw input (unchanged)
 * @property {NormalizedMetadata} metadata - Extracted metadata
 */

/**
 * Common typo and alias corrections for payment methods, banks, and accounts.
 * Keys are lowercase; applied after lowercasing input.
 *
 * @type {Record<string, string>}
 */
export const TYPO_MAP = {
  'gope': 'gopay',
  'gpay': 'gopay',
  'go-pay': 'gopay',
  'go pay': 'gopay',
  'ovoo': 'ovo',
  'ov0': 'ovo',
  'danaaa': 'dana',
  'bcaa': 'bca',
  'b c a': 'bca',
  'briii': 'bri',
  'brii': 'bri',
  'bnii': 'bni',
  'mandri': 'mandiri',
  'mandrii': 'mandiri',
  'mandriri': 'mandiri',
  'shope pay': 'shopeepay',
  'shopee pay': 'shopeepay',
  'spay': 'shopeepay',
  'link aja': 'linkaja',
  'linkaja': 'linkaja',
  'sea bank': 'seabank',
  'seabank': 'seabank',
  'tunai': 'cash',
  'kas': 'cash',
  'qris': 'qris',
  'debit': 'debit',
  'kredit': 'kredit',
  'cc': 'kredit',
  'transfer': 'transfer',
  'jago': 'jago',
};

/**
 * Amount shorthand patterns — expanded to plain integer strings in normalized text.
 *
 * Rules:
 * - juta/jt match with or without space, case-insensitive
 * - m is kept but requires a word boundary on BOTH sides to avoid "malam"/"makan"
 * - ribu/rb/k match with or without space, case-insensitive, word boundary after
 * - Thousand-separator dots stripped last (85.000 → 85000)
 *
 * @type {Array<{ regex: RegExp, multiplier?: number, replacer?: (match: string, ...groups: string[]) => string }>}
 */
export const AMOUNT_PATTERNS = [
  // juta / jt  — most specific first
  { regex: /\b(\d+(?:[.,]\d+)?)\s*(?:juta|jt)\b/gi, multiplier: 1_000_000 },
  // m suffix for juta — kept for backward compat ("10m") but requires \b on both sides
  // to avoid matching "m" in words like "makan", "malam", etc.
  { regex: /\b(\d+(?:[.,]\d+)?)\s*m\b/gi, multiplier: 1_000_000 },
  // ribu / rb / k — handles "10rb", "10 rb", "10RB", "10k", etc.
  { regex: /\b(\d+(?:[.,]\d+)?)\s*(?:ribu|rb|k)\b/gi, multiplier: 1_000 },
  // Indonesian thousand separator: 85.000 → 85000
  {
    regex: /\b(\d{1,3}(?:\.\d{3})+)\b/g,
    replacer: (_match, grouped) => grouped.replace(/\./g, ''),
  },
];

/**
 * Relative date keywords and day offsets from reference date.
 * Used by downstream layers; English aliases are normalized to Indonesian.
 *
 * @type {Record<string, number>}
 */
export const DATE_KEYWORDS = {
  'hari ini': 0,
  'today': 0,
  'kemarin': -1,
  'yesterday': -1,
  'besok': 1,
  'tomorrow': 1,
  'lusa': 2,
};

/** WhatsApp forwarded-message header patterns stripped before parsing. */
const WHATSAPP_METADATA_PATTERNS = [
  /^\[[^\]]+\]\s*\d{1,2}:\d{2}(?:\s*(?:am|pm))?\s*[-–:]?\s*/i,
  /^\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}\s*[-–]\s*[^:]+:\s*/i,
];

/** English → Indonesian date keyword aliases. */
const DATE_KEYWORD_ALIASES = {
  today: 'hari ini',
  yesterday: 'kemarin',
  tomorrow: 'besok',
};

/** Spoken Indonesian number words → digits (for voice STT hygiene). */
const SPOKEN_DIGIT = {
  nol: 0, kosong: 0,
  satu: 1, se: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
  sepuluh: 10,
  sebelas: 11,
  seratus: 100,
  seribu: 1000,
};

const SPOKEN_UNIT = {
  belas: 10,
  puluh: 10,
  ratus: 100,
  ribu: 1000,
  juta: 1_000_000,
};

/**
 * Convert a short Indonesian spoken number phrase to integer.
 * Handles: "empat lima" → 45, "lima puluh" → 50, "seratus" → 100, "dua ratus lima puluh" → 250
 * @param {string[]} words
 * @returns {number|null}
 */
function spokenWordsToNumber(words) {
  if (!words.length) return null;
  let total = 0;
  let current = 0;
  let digitSeq = '';

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (/^\d+$/.test(w)) {
      digitSeq += w;
      continue;
    }
    if (digitSeq) {
      current += Number(digitSeq);
      digitSeq = '';
    }

    if (w === 'puluh' || w === 'belas') {
      if (w === 'belas') {
        current = (current || 1) + 10;
      } else {
        current = (current || 1) * 10;
      }
      continue;
    }
    if (w === 'ratus') {
      current = (current || 1) * 100;
      continue;
    }
    if (w === 'ribu') {
      total += (current || 1) * 1000;
      current = 0;
      continue;
    }
    if (w === 'juta') {
      total += (current || 1) * 1_000_000;
      current = 0;
      continue;
    }

    const d = SPOKEN_DIGIT[w];
    if (d !== undefined) {
      // Digit sequence style: "empat lima" → 45 (when no unit follows soon)
      if (d >= 0 && d <= 9 && current > 0 && current < 10 && !SPOKEN_UNIT[words[i + 1]]) {
        digitSeq = String(current) + String(d);
        current = 0;
        continue;
      }
      if (d >= 10) {
        current += d;
      } else {
        current += d;
      }
      continue;
    }
    return null;
  }

  if (digitSeq) current += Number(digitSeq);
  total += current;
  return total > 0 ? total : null;
}

/**
 * Expand spoken Indonesian amounts to numeric form for parsers.
 * Examples: "empat lima ribu" → "45000", "lima puluh ribu" → "50000"
 *
 * @param {string} text
 * @returns {string}
 */
export function expandSpokenAmounts(text) {
  if (!text) return text;
  let result = String(text).toLowerCase();

  // Compound: "<spoken number> ribu|juta|rb|jt"
  result = result.replace(
    /\b((?:nol|kosong|satu|se|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|seratus|seribu|puluh|belas|ratus|\d+)(?:\s+(?:nol|kosong|satu|se|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|seratus|seribu|puluh|belas|ratus|\d+)){0,6})\s*(ribu|rb|juta|jt)\b/gi,
    (match, phrase, unit) => {
      const words = String(phrase).toLowerCase().split(/\s+/).filter(Boolean);
      let n = spokenWordsToNumber(words);
      if (n == null) return match;
      const u = unit.toLowerCase();
      if (u === 'ribu' || u === 'rb') n *= 1000;
      if (u === 'juta' || u === 'jt') n *= 1_000_000;
      return String(n);
    },
  );

  // Standalone "seribu" / "seratus ribu" already handled; also "empat lima" before merchant without unit → treat as ribuan if 2-digit-ish
  // Skip aggressive bare digit-seq without unit to avoid mangling dates.

  return result;
}

/** Pre-sorted typo keys (longest first) for greedy phrase matching. */
const TYPO_KEYS_SORTED = Object.keys(TYPO_MAP).sort((a, b) => b.length - a.length);

/**
 * Remove WhatsApp contact/timestamp metadata prefixes from pasted messages.
 *
 * @param {string} text
 * @returns {string}
 */
function removeWhatsAppMetadata(text) {
  let result = text;
  for (const pattern of WHATSAPP_METADATA_PATTERNS) {
    result = result.replace(pattern, '');
  }
  return result.trim();
}

/**
 * Collapse repeated whitespace and normalize line breaks to single spaces.
 *
 * @param {string} text
 * @returns {string}
 */
function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Apply TYPO_MAP corrections — multi-word phrases first, then single tokens.
 *
 * @param {string} text
 * @returns {string}
 */
function applyTypoCorrections(text) {
  let result = text;

  for (const typo of TYPO_KEYS_SORTED) {
    if (typo.includes(' ')) {
      result = result.split(typo).join(TYPO_MAP[typo]);
    }
  }

  const tokens = result.split(' ');
  const corrected = tokens.map((token) => {
    const stripped = token.replace(/^[^\w]+|[^\w]+$/g, '');
    const replacement = TYPO_MAP[stripped];
    if (!replacement) return token;
    return token.replace(stripped, replacement);
  });

  return corrected.join(' ');
}

/**
 * Parse numeric fragment that may use comma or dot as decimal separator.
 *
 * @param {string} numStr
 * @returns {number}
 */
function parseAmountNumber(numStr) {
  const normalized = numStr.replace(',', '.');
  return Number(normalized);
}

/**
 * Expand shorthand amounts (jt, rb, k) and Indonesian thousand separators.
 *
 * @param {string} text
 * @returns {string}
 */
function expandAmounts(text) {
  let result = text;

  for (const { regex, multiplier, replacer } of AMOUNT_PATTERNS) {
    if (replacer) {
      result = result.replace(regex, replacer);
      continue;
    }

    result = result.replace(regex, (_match, numStr) => {
      const value = parseAmountNumber(numStr);
      if (Number.isNaN(value)) return _match;
      return String(Math.round(value * multiplier));
    });
  }

  return result;
}

/**
 * Normalize slash/dash numeric dates (DD/MM/YYYY) to ISO YYYY-MM-DD in text.
 *
 * @param {string} text
 * @returns {string}
 */
function normalizeNumericDates(text) {
  return text.replace(
    /\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/g,
    (_match, day, month, year) => {
      const d = Number(day);
      const m = Number(month);
      if (d < 1 || d > 31 || m < 1 || m > 12) return _match;

      let y = year ? Number(year) : new Date().getFullYear();
      if (year && year.length === 2) y += y < 70 ? 2000 : 1900;

      const isoMonth = String(m).padStart(2, '0');
      const isoDay = String(d).padStart(2, '0');
      return `${y}-${isoMonth}-${isoDay}`;
    },
  );
}

/**
 * Replace English date keyword aliases with Indonesian equivalents.
 *
 * @param {string} text
 * @returns {string}
 */
function normalizeDateKeywords(text) {
  let result = text;
  for (const [alias, canonical] of Object.entries(DATE_KEYWORD_ALIASES)) {
    result = result.replace(new RegExp(`\\b${alias}\\b`, 'g'), canonical);
  }
  return result;
}

/**
 * Normalize user input for the L0 preprocessing layer.
 *
 * Steps: WhatsApp metadata removal → lowercase → whitespace → typos →
 * amounts → dates → tokenization.
 *
 * @param {string} rawInput - Raw user text
 * @param {NormalizeOptions} [options={}] - Normalization options
 * @returns {NormalizedInput}
 *
 * @example
 * normalizeInput('gaji 5jt masuk bcaa')
 * // => { text: 'gaji 5000000 masuk bca', tokens: ['gaji', '5000000', 'masuk', 'bca'], ... }
 *
 * @example
 * normalizeInput('[John] 14:23\nmakan 50k gope', { channel: 'whatsapp' })
 * // => { text: 'makan 50000 gopay', metadata: { channel: 'whatsapp', ... }, ... }
 */
export function normalizeInput(rawInput, options = {}) {
  const original = rawInput ?? '';
  const channel = options.channel ?? 'text';

  if (original.length === 0) {
    return {
      text: '',
      tokens: [],
      original,
      metadata: { timestamp: new Date(), channel },
    };
  }

  let text = removeWhatsAppMetadata(original);
  text = text.toLowerCase();
  text = normalizeWhitespace(text);
  text = applyTypoCorrections(text);
  if (channel === 'voice') {
    text = expandSpokenAmounts(text);
  }
  text = expandAmounts(text);
  text = normalizeNumericDates(text);
  text = normalizeDateKeywords(text);
  text = normalizeWhitespace(text);

  const tokens = text.length > 0 ? text.split(' ') : [];

  return {
    text,
    tokens,
    original,
    metadata: {
      timestamp: new Date(),
      channel,
    },
  };
}
