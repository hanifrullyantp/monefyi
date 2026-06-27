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
 * @type {Array<{ regex: RegExp, multiplier?: number, replacer?: (match: string, ...groups: string[]) => string }>}
 */
export const AMOUNT_PATTERNS = [
  { regex: /(\d+(?:[.,]\d+)?)\s*(?:juta|jt|m)(?!\w)/gi, multiplier: 1_000_000 },
  { regex: /(\d+(?:[.,]\d+)?)\s*(?:ribu|rb|k)(?!\w)/gi, multiplier: 1_000 },
  {
    regex: /(\d{1,3}(?:\.\d{3})+)(?!\d)/g,
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
