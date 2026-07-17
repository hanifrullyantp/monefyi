/**
 * @file js/parsers/receipt-pipeline.js
 * @description 5-layer receipt OCR pipeline (mirrors Phase 1 architecture).
 *
 * L0 — preprocess image (resize, greyscale)
 * L1 — run Tesseract OCR, extract layout
 * L2 — try user's personal template  (confidence ≥ 0.95)
 * L3 — try community template         (confidence ≥ 0.85)
 * L4 — generic parse via Phase 1 rules
 * L5 — return for user review (low confidence)
 *
 * All processing is CLIENT-SIDE — zero API cost.
 * @module parsers/receipt-pipeline
 */

import { preprocessImage, extractTextFromImage, hashImage } from '../services/ocr-extractor.js';
import {
  generateLayoutSignature,
  findMatchingTemplate,
  applyTemplate,
  calculateMatchConfidence,
  CONFIDENCE_THRESHOLDS,
  getSupabase,
} from '../services/template-matcher.js';
import {
  createTemplateFromCorrection,
  updateTemplateFromEdit,
  voteTemplate,
  checkAndPromoteTemplate,
} from '../services/template-learner.js';

/** @typedef {'user_memory'|'community'|'generic'|'review'|'error'|'manual'} ReceiptSource */

// ---------------------------------------------------------------------------
// Supabase client resolver (same pattern as metrics.js)
// ---------------------------------------------------------------------------

/** @type {import('@supabase/supabase-js').SupabaseClient|null} */
let _injectedSupa = null;

/** @param {import('@supabase/supabase-js').SupabaseClient|null} client */
export function _setSupabaseClient(client) { _injectedSupa = client; }

/**
 * @returns {import('@supabase/supabase-js').SupabaseClient|null}
 */
function resolveSupa() {
  if (_injectedSupa && typeof _injectedSupa.from === 'function') return _injectedSupa;
  return getSupabase();
}

// ---------------------------------------------------------------------------
// Custom event helpers
// ---------------------------------------------------------------------------

/**
 * @param {'ocr:progress'|'ocr:complete'|'ocr:error'} type
 * @param {object} detail
 */
function emitOCREvent(type, detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(type, { detail, bubbles: false }));
}

/**
 * @returns {object}
 */
function getDefaultParsed() {
  return {
    type: 'expense',
    amount: 0,
    merchant: '',
    category: 'Lainnya',
    account: 'Cash',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    confidence: 0.30,
    source: 'manual',
  };
}

// ---------------------------------------------------------------------------
// Indonesian receipt field extractors (L4 generic parse)
// ---------------------------------------------------------------------------

/**
 * Parse Indonesian number format.
 * "." = thousand separator (9.200 → 9200), "," = decimal (9,50 → 9.50).
 *
 * @param {string} str
 * @returns {number}
 */
export function parseIndonesianAmount(str) {
  if (!str) return 0;

  let cleaned = String(str).trim().replace(/[^\d.,]/g, '');
  if (!cleaned) return 0;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    return Math.round(parseFloat(cleaned));
  }
  if (hasDot && !hasComma) {
    const parts = cleaned.split('.');
    const last = parts[parts.length - 1];
    if (last.length === 3 && parts.every((p, i) => i === 0 || p.length === 3)) {
      return parseInt(cleaned.replace(/\./g, ''), 10);
    }
    return Math.round(parseFloat(cleaned));
  }
  if (hasComma && !hasDot) {
    const parts = cleaned.split(',');
    const last = parts[parts.length - 1];
    if (last.length === 3) {
      return parseInt(cleaned.replace(/,/g, ''), 10);
    }
    return Math.round(parseFloat(cleaned.replace(',', '.')));
  }

  return parseInt(cleaned, 10) || 0;
}

/**
 * Parse Indonesian date formats → ISO YYYY-MM-DD.
 *
 * @param {string} text
 * @returns {string}
 */
export function parseIndonesianDate(text) {
  const today = new Date().toISOString().split('T')[0];

  const patterns = [
    /\b(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})\b/,
    /\b(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let [, d, m, y] = match;
      if (y.length === 2) {
        y = parseInt(y, 10) < 50 ? `20${y}` : `19${y}`;
      }
      const day = parseInt(d, 10);
      const month = parseInt(m, 10);
      const year = parseInt(y, 10);
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1990 && year <= 2100) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  return today;
}

/**
 * Detect merchant from OCR text using known Indonesian retail patterns.
 *
 * @param {string} text
 * @returns {string}
 */
export function detectMerchant(text) {
  const KNOWN_MERCHANTS = [
    { pattern: /\bINDO\s*MARET\b/i, name: 'Indomaret' },
    { pattern: /\bALFA\s*MART\b/i, name: 'Alfamart' },
    { pattern: /\bALFA\s*MIDI\b/i, name: 'Alfamidi' },
    { pattern: /\bCIRCLE\s*K\b/i, name: 'Circle K' },
    { pattern: /\bLAWSON\b/i, name: 'Lawson' },
    { pattern: /\bFAMILY\s*MART\b/i, name: 'FamilyMart' },
    { pattern: /\bSUPER\s*INDO\b/i, name: 'Superindo' },
    { pattern: /\bGIANT\b/i, name: 'Giant' },
    { pattern: /\bHYPERMART\b/i, name: 'Hypermart' },
    { pattern: /\bCARREFOUR\b/i, name: 'Carrefour' },
    { pattern: /\bLOTTE\s*MART\b/i, name: 'Lotte Mart' },
    { pattern: /\bSPBU\b/i, name: 'SPBU' },
    { pattern: /\bPERTAMINA\b/i, name: 'Pertamina' },
    { pattern: /\bSHELL\b/i, name: 'Shell' },
    { pattern: /\bSTARBUCKS\b/i, name: 'Starbucks' },
    { pattern: /\bMCDONALD/i, name: "McDonald's" },
    { pattern: /\bKFC\b/i, name: 'KFC' },
    { pattern: /\bBURGER\s*KING\b/i, name: 'Burger King' },
    { pattern: /\bDOMINOS?\b/i, name: "Domino's Pizza" },
    { pattern: /\bPIZZA\s*HUT\b/i, name: 'Pizza Hut' },
    { pattern: /\bGOJEK\b/i, name: 'Gojek' },
    { pattern: /\bGRAB\b/i, name: 'Grab' },
    { pattern: /\bTOKOPEDIA\b/i, name: 'Tokopedia' },
    { pattern: /\bSHOPEE\b/i, name: 'Shopee' },
    { pattern: /\bGOPAY\b/i, name: 'GoPay' },
    { pattern: /\bOVO\b/i, name: 'OVO' },
    { pattern: /\bDANA\b/i, name: 'DANA' },
    { pattern: /\bJANJI\s*JIWA\b/i, name: 'Janji Jiwa' },
    { pattern: /\bKOPI\s*KENANGAN\b/i, name: 'Kopi Kenangan' },
    { pattern: /\bWARUN[GK]?\b/i, name: 'Warung' },
  ];

  for (const { pattern, name } of KNOWN_MERCHANTS) {
    if (pattern.test(text)) return name;
  }

  const lines = text.split('\n').filter((l) => l.trim());
  for (const line of lines.slice(0, 5)) {
    const cleaned = line.trim();
    if (cleaned.length < 3 || cleaned.length > 40) continue;
    if (/^\d/.test(cleaned)) continue;
    if (/\bJL\b|\bJALAN\b|\bNPWP\b|\bNo\.\b/i.test(cleaned)) continue;
    if (/\d{4,}/.test(cleaned)) continue;
    return cleaned.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return '';
}

/**
 * Detect total amount from receipt text (avoids TUNAI/KEMBALI).
 *
 * @param {string} text
 * @returns {number}
 */
export function detectTotal(text) {
  const priorityPatterns = [
    /TOTAL\s*BAYAR\s*:?\s*(\d[\d.,]*)/i,
    /GRAND\s*TOTAL\s*:?\s*(\d[\d.,]*)/i,
    /TOTAL\s*BELANJA\s*:?\s*(\d[\d.,]*)/i,
    /JUMLAH\s*BAYAR\s*:?\s*(\d[\d.,]*)/i,
    // Plain TOTAL — only when NOT preceded by SUB, HARGA or similar keywords
    /^[ \t]*TOTAL\s*:?\s*(\d[\d.,]*)/im,
    /TOTAL\s*:?\s*(\d[\d.,]*)/i,
    /SUB\s*TOTAL\s*:?\s*(\d[\d.,]*)/i,
  ];

  for (const pattern of priorityPatterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseIndonesianAmount(match[1]);
      if (amount > 0) return amount;
    }
  }

  const lines = text.split('\n');
  let maxAmount = 0;

  for (const line of lines) {
    if (/TUNAI|KEMBALI|CHANGE|BAYAR\s*TUNAI/i.test(line)) continue;

    const amounts = line.match(/\d+(?:[.,]\d{3})+|\d{4,}/g) || [];
    for (const amtStr of amounts) {
      const amt = parseIndonesianAmount(amtStr);
      if (amt > maxAmount && amt < 100000000) maxAmount = amt;
    }
  }

  return maxAmount;
}

/**
 * Detect payment method from receipt text.
 *
 * @param {string} text
 * @returns {string}
 */
export function detectAccount(text) {
  const patterns = [
    { regex: /TUNAI|CASH/i, name: 'Cash' },
    { regex: /GOPAY/i, name: 'GoPay' },
    { regex: /\bOVO\b/i, name: 'OVO' },
    { regex: /\bDANA\b/i, name: 'DANA' },
    { regex: /QRIS/i, name: 'QRIS' },
    { regex: /SHOPEEPAY/i, name: 'ShopeePay' },
    { regex: /LINKAJA/i, name: 'LinkAja' },
    { regex: /KARTU\s*DEBIT|DEBIT\s*CARD|DEBIT\s*BCA|DEBIT\s*MANDIRI/i, name: 'Debit Card' },
    { regex: /KARTU\s*KREDIT|CREDIT\s*CARD|VISA|MASTER\s*CARD/i, name: 'Credit Card' },
    { regex: /\bBCA\b/i, name: 'BCA' },
    { regex: /MANDIRI/i, name: 'Mandiri' },
    { regex: /\bBNI\b/i, name: 'BNI' },
    { regex: /\bBRI\b/i, name: 'BRI' },
  ];

  for (const { regex, name } of patterns) {
    if (regex.test(text)) return name;
  }

  return 'Cash';
}

/**
 * Detect category from merchant and receipt keywords.
 *
 * @param {string} text
 * @param {string} merchant
 * @returns {string}
 */
export function detectCategory(text, merchant) {
  const lower = `${text} ${merchant || ''}`.toLowerCase();

  const merchantCategories = {
    Shopping: /indomaret|alfamart|alfamidi|circle[\s\-]*k|lawson|family[\s\-]*mart|superindo|giant|hypermart|carrefour|lotte[\s\-]*mart|grocery|swalayan|supermarket|mini[\s\-]*market/i,
    'Food & Drink': /starbucks|mcdonald|kfc|burger[\s\-]*king|pizza|domino|janji[\s\-]*jiwa|kopi[\s\-]*kenangan|kopi|caf[eé]|cafe|resto|restaurant|warung|makan|minuman|food|gofood|grabfood|shopeefood/i,
    Transport: /spbu|pertamina|shell|bensin|fuel|grab|gojek|uber|maxim|taxi|tol|parkir|parking|kereta|krl|mrt|transjakarta/i,
    'Bills & Utilities': /pln|listrik|air\s+bersih|pdam|telkom|indihome|wifi|internet|tagihan|pulsa|paket\s*data/i,
    Health: /apotek|apotik|dokter|klinik|rumah[\s\-]*sakit|\brs\b|hospital|kimia[\s\-]*farma|guardian|century[\s\-]*health/i,
    Entertainment: /\bxxi\b|\bcgv\b|cinepolis|cinema|bioskop|nonton|tiket\.com|konser|spotify|netflix/i,
    Education: /sekolah|universitas|kuliah|spp|kursus|buku|gramedia|toko[\s\-]*buku/i,
  };

  for (const [category, regex] of Object.entries(merchantCategories)) {
    if (regex.test(lower)) return category;
  }

  return 'Shopping';
}

/**
 * Extract line items from receipt text (best effort).
 *
 * @param {string} text
 * @returns {Array<{ name: string, price: number, subtotal: number }>}
 */
export function extractItems(text) {
  const items = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Parse from right: SUBTOTAL  PRICE  QTY  NAME (handles "250" in product names)
    const match = trimmed.match(/^(.+?)\s+(\d{1,3})\s+([\d.,]+)\s+([\d.,]+)$/);
    if (match) {
      const [, name, , price, subtotal] = match;
      const cleanName = name.trim();
      if (!/^[A-Z]/i.test(cleanName)) continue;
      if (/^(TOTAL|HARGA|TUNAI|KEMBALI|SUB)/i.test(cleanName)) continue;
      items.push({
        name: cleanName.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
        price: parseIndonesianAmount(price),
        subtotal: parseIndonesianAmount(subtotal),
      });
    }
  }

  return items;
}

/**
 * Extracts transaction fields from raw OCR text (Indonesian receipt heuristics).
 *
 * @param {string} rawText
 * @returns {Promise<object>}
 */
export async function genericParse(rawText) {
  if (!rawText || !rawText.trim()) {
    return getDefaultParsed();
  }

  try {
    const merchant = detectMerchant(rawText);
    const totalAmount = detectTotal(rawText);
    const date = parseIndonesianDate(rawText);
    const account = detectAccount(rawText);
    const category = detectCategory(rawText, merchant);
    const extractedItems = extractItems(rawText);

    const today = new Date().toISOString().split('T')[0];

    const notes = extractedItems.length > 0
      ? `${extractedItems.length} items: ${extractedItems.slice(0, 3).map((i) => i.name).join(', ')}${extractedItems.length > 3 ? ` +${extractedItems.length - 3} lainnya` : ''}`
      : '';

    const uiItems = extractedItems.map((i) => ({
      name: i.name,
      amount: i.subtotal ?? i.price,
    }));

    let confidence = 0.30;
    if (totalAmount > 0) confidence += 0.30;
    if (merchant) confidence += 0.20;
    if (date !== today) confidence += 0.10;
    if (extractedItems.length > 0) confidence += 0.10;

    return {
      type: 'expense',
      merchant,
      total: totalAmount,
      amount: totalAmount,
      date,
      account,
      category,
      notes,
      items: uiItems,
      confidence: Math.min(0.95, confidence),
      source: 'generic',
    };
  } catch (err) {
    console.error('[receipt-pipeline] genericParse failed:', err);
    return getDefaultParsed();
  }
}

// ---------------------------------------------------------------------------
// Quality assessment (OCR + parse sanity checks)
// ---------------------------------------------------------------------------

/** @type {{ good: number, medium: number, warnBelow: number, ocrPoor: number, ocrMedium: number, amountMin: number, amountMax: number }} */
export const DEFAULT_QUALITY_THRESHOLDS = {
  good: 0.75,
  medium: 0.50,
  warnBelow: 0.75,
  ocrPoor: 0.50,
  ocrMedium: 0.70,
  amountMin: 100,
  amountMax: 50000000,
};

/**
 * Normalizes Tesseract confidence (0–100) or ratio (0–1) to 0–1.
 * @param {number} raw
 * @returns {number}
 */
export function normalizeOcrConfidence(raw) {
  const n = Number(raw) || 0;
  if (n > 1) return Math.min(1, n / 100);
  return Math.max(0, Math.min(1, n));
}

/**
 * @param {'good'|'medium'|'poor'} level
 * @param {object[]} issues
 * @param {object[]} warnings
 * @returns {string}
 */
function generateQualitySummary(level, issues, warnings) {
  if (level === 'good') return '✅ Struk terbaca dengan baik';
  if (level === 'poor') {
    return `⚠️ Struk sulit dibaca: ${issues.length} masalah, ${warnings.length} peringatan`;
  }
  return `⚠️ Struk terbaca sebagian: ${warnings.length} perlu dicek ulang`;
}

/**
 * Evaluate OCR + parsing quality for user-facing warnings.
 *
 * @param {object} scanResult - Output from parseReceipt()
 * @param {{ thresholds?: Partial<typeof DEFAULT_QUALITY_THRESHOLDS> }} [options]
 * @returns {object}
 */
export function assessQuality(scanResult, options = {}) {
  const thresholds = { ...DEFAULT_QUALITY_THRESHOLDS, ...options.thresholds };
  const issues = [];
  const warnings = [];
  let score = 1.0;

  const parsed = scanResult?.parsed ?? {};
  const rawText = scanResult?.rawText ?? '';
  const ocrConfidence = normalizeOcrConfidence(
    scanResult?.ocrConfidence ?? scanResult?.confidence ?? 0,
  );
  const today = new Date().toISOString().split('T')[0];

  if (ocrConfidence < thresholds.ocrPoor) {
    issues.push({
      severity: 'high',
      code: 'low_ocr_confidence',
      message: `OCR sangat tidak yakin (${Math.round(ocrConfidence * 100)}%). Teks mungkin salah baca.`,
    });
    score -= 0.40;
  } else if (ocrConfidence < thresholds.ocrMedium) {
    warnings.push({
      severity: 'medium',
      code: 'medium_ocr_confidence',
      message: `OCR kurang yakin (${Math.round(ocrConfidence * 100)}%). Periksa hasil dengan teliti.`,
    });
    score -= 0.20;
  }

  const amount = Number(parsed.amount ?? parsed.total ?? 0) || 0;

  if (!amount || amount === 0) {
    issues.push({
      severity: 'high',
      code: 'no_amount',
      message: 'Total tidak terdeteksi. Foto mungkin terlalu buram atau total tidak terlihat.',
      field: 'amount',
    });
    score -= 0.30;
  }

  const merchant = String(parsed.merchant ?? '').trim();
  if (!merchant || merchant.length < 3) {
    warnings.push({
      severity: 'medium',
      code: 'no_merchant',
      message: 'Nama merchant tidak terdeteksi.',
      field: 'merchant',
    });
    score -= 0.15;
  }

  if (amount > 0) {
    if (amount < thresholds.amountMin) {
      warnings.push({
        severity: 'medium',
        code: 'amount_too_small',
        message: `Total Rp ${amount} terlalu kecil. Periksa lagi.`,
        field: 'amount',
      });
      score -= 0.15;
    } else if (amount > thresholds.amountMax) {
      warnings.push({
        severity: 'medium',
        code: 'amount_very_large',
        message: `Total Rp ${amount.toLocaleString('id-ID')} sangat besar. Pastikan benar.`,
        field: 'amount',
      });
      score -= 0.10;
    }
  }

  if (merchant) {
    const weirdChars = (merchant.match(/[~`!@#$%^&*()_+={}\[\]|\\:";'<>,./?]/g) || []).length;
    if (weirdChars > 2) {
      warnings.push({
        severity: 'medium',
        code: 'merchant_has_noise',
        message: `Nama merchant "${merchant}" mengandung karakter aneh.`,
        field: 'merchant',
      });
      score -= 0.15;
    }
    if (merchant.length > 40) {
      warnings.push({
        severity: 'low',
        code: 'merchant_too_long',
        message: 'Nama merchant terlalu panjang — mungkin noise OCR.',
        field: 'merchant',
      });
      score -= 0.05;
    }
  }

  if (parsed.date) {
    const parsedDate = new Date(parsed.date);
    const now = new Date();
    const year = parsedDate.getFullYear();

    if (!Number.isNaN(parsedDate.getTime()) && parsedDate > now) {
      warnings.push({
        severity: 'low',
        code: 'date_in_future',
        message: 'Tanggal di masa depan.',
        field: 'date',
      });
      score -= 0.05;
    } else if (year < 1990 || year > 2030) {
      warnings.push({
        severity: 'medium',
        code: 'date_implausible',
        message: 'Tanggal tidak masuk akal.',
        field: 'date',
      });
      score -= 0.10;
    } else if (parsed.date === today) {
      warnings.push({
        severity: 'low',
        code: 'date_defaulted',
        message: 'Tanggal tidak terdeteksi, menggunakan hari ini.',
        field: 'date',
      });
      score -= 0.05;
    }
  }

  if (rawText) {
    const textLength = rawText.length;
    const symbolRatio = textLength > 0
      ? (rawText.match(/[^\w\s]/g) || []).length / textLength
      : 0;

    if (textLength < 50) {
      warnings.push({
        severity: 'medium',
        code: 'text_too_short',
        message: 'Teks hasil OCR terlalu pendek. Foto mungkin tidak menangkap seluruh struk.',
      });
      score -= 0.15;
    }

    if (symbolRatio > 0.25) {
      warnings.push({
        severity: 'medium',
        code: 'text_too_noisy',
        message: 'Teks banyak karakter aneh. Foto mungkin terlalu buram.',
      });
      score -= 0.15;
    }
  } else if (!scanResult?.error) {
    warnings.push({
      severity: 'medium',
      code: 'text_too_short',
      message: 'Teks hasil OCR kosong.',
    });
    score -= 0.20;
  }

  score = Math.max(0, Math.min(1, score));

  let level;
  if (score >= thresholds.good) level = 'good';
  else if (score >= thresholds.medium) level = 'medium';
  else level = 'poor';

  return {
    score,
    level,
    shouldWarn: score < thresholds.warnBelow,
    ocrConfidence,
    issues,
    warnings,
    summary: generateQualitySummary(level, issues, warnings),
  };
}

/**
 * Attaches quality assessment to a parse result.
 * @param {object} result
 * @returns {object}
 */
function attachQuality(result) {
  result.quality = assessQuality(result);
  return result;
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ReceiptParseResult
 * @property {boolean} success
 * @property {object} parsed - Extracted transaction fields
 * @property {ReceiptSource} source - Which pipeline layer produced the result
 * @property {object|null} template - Matched template (if any)
 * @property {string|null} templateId - Matched template ID
 * @property {number} confidence - Overall confidence 0–1
 * @property {string} rawText - Full OCR text
 * @property {object} layout - Layout features
 * @property {string} imageHash - SHA-256 of original image
 * @property {{ ocr_ms: number, parse_ms: number, total_ms?: number }} latency
 * @property {string[]} [warnings]
 * @property {string|null} [error]
 */

/**
 * Runs the full 5-layer receipt parse pipeline on an image file.
 * Never throws — always returns a valid result object for the UI.
 *
 * @param {File|Blob} imageFile
 * @param {string|null} [userId]
 * @param {{
 *   useAI?: boolean,
 *   language?: string,
 *   logger?: (m: object) => void
 * }} [options]
 * @returns {Promise<ReceiptParseResult>}
 */
export async function parseReceipt(imageFile, userId = null, options = {}) {
  const { language = 'ind+eng', logger = null } = options;
  const startTime = Date.now();
  const debug = typeof localStorage !== 'undefined'
    && localStorage.getItem('monefyi_debug') === 'true';
  const log = (...args) => debug && console.log('[receipt-pipeline]', ...args);

  /** @type {ReceiptParseResult} */
  const result = {
    success: false,
    source: 'manual',
    template: null,
    templateId: null,
    parsed: getDefaultParsed(),
    rawText: '',
    layout: { signature: 'unknown', merchant_keywords: [] },
    confidence: 0,
    imageHash: '',
    latency: { ocr_ms: 0, parse_ms: 0, total_ms: 0 },
    warnings: [],
    error: null,
  };

  log('Pipeline start');

  try {
    emitOCREvent('ocr:progress', { stage: 'preprocessing', progress: 0.05 });

    // --- L0: preprocess (non-critical) ---
    let processed = imageFile;
    try {
      processed = await preprocessImage(imageFile);
    } catch (e) {
      log('Preprocess failed (non-critical):', e.message);
      result.warnings.push('preprocess_failed');
    }

    emitOCREvent('ocr:progress', { stage: 'ocr', progress: 0.15 });

    // --- L1: OCR (critical) ---
    let ocrResult;
    const ocrStart = Date.now();
    try {
      log('Starting OCR...');
      [ocrResult, result.imageHash] = await Promise.all([
        extractTextFromImage(processed, {
          language,
          logger: logger ?? ((m) => {
            if (m.status === 'recognizing text') {
              emitOCREvent('ocr:progress', { stage: 'ocr', progress: 0.15 + m.progress * 0.55 });
            }
          }),
        }),
        hashImage(imageFile).catch(() => ''),
      ]);
      result.latency.ocr_ms = Date.now() - ocrStart;
      log('OCR done:', result.latency.ocr_ms + 'ms');

      if (!ocrResult) {
        throw new Error('OCR returned no result');
      }

      if (!ocrResult.text || !ocrResult.text.trim()) {
        throw new Error('OCR extracted empty text. Image too blurry?');
      }

      result.rawText = ocrResult.text;
      result.ocrConfidence = normalizeOcrConfidence(ocrResult.confidence ?? 0);
      log('OCR text length:', ocrResult.text.length);
    } catch (e) {
      log('OCR failed:', e.message);
      result.error = `OCR gagal: ${e.message}`;
      result.success = true;
      result.source = 'manual';
      result.latency.ocr_ms = Date.now() - ocrStart;
      result.latency.total_ms = Date.now() - startTime;
      emitOCREvent('ocr:error', { error: e.message });
      return attachQuality(result);
    }

    const rawText = result.rawText;
    const layout = ocrResult.layout ?? {};
    result.layout = layout;

    // --- Layout signature (non-critical) ---
    let signature = 'unknown';
    try {
      signature = generateLayoutSignature(layout);
      result.layout = { ...layout, signature };
      log('Layout signature:', signature);
    } catch (e) {
      log('Layout failed:', e.message);
      result.warnings.push('layout_failed');
    }

    emitOCREvent('ocr:progress', { stage: 'matching', progress: 0.72 });
    const supa = resolveSupa();
    const parseStart = Date.now();
    let matched = false;

    // --- L2: user template (non-critical) ---
    if (userId && supa) {
      try {
        const userMatch = await findMatchingTemplate(signature, userId, supa);
        if (userMatch && userMatch.source === 'user_memory') {
          try {
            const extracted = applyTemplate(rawText, userMatch.template);
            const liveConf = calculateMatchConfidence(userMatch.template, extracted);
            const storedAcc = Number(userMatch.template.accuracy_score || 0);
            const confidence = Math.max(liveConf, storedAcc, userMatch.confidence ?? 0);

            if (confidence >= CONFIDENCE_THRESHOLDS.user_memory) {
              result.parsed = {
                ...extracted,
                type: 'expense',
                currency: 'IDR',
                amount: extracted.total ?? extracted.amount ?? 0,
              };
              result.source = 'user_memory';
              result.template = userMatch.template;
              result.templateId = userMatch.template.id;
              result.confidence = confidence;
              matched = true;
              log('Template matched: user_memory');
              emitOCREvent('ocr:complete', { source: 'user_memory', confidence });
            }
          } catch (e) {
            log('Template apply failed:', e.message);
            result.warnings.push('template_apply_failed');
          }
        }
      } catch (e) {
        log('Template query failed:', e.message);
        result.warnings.push('template_query_failed');
      }
    } else {
      log('Skipping user template (no userId or supabase)');
    }

    // --- L3: community template (non-critical) ---
    if (!matched && supa) {
      emitOCREvent('ocr:progress', { stage: 'community', progress: 0.82 });
      try {
        const communityMatch = await findMatchingTemplate(signature, null, supa);
        if (communityMatch && communityMatch.source === 'community') {
          try {
            const extracted = applyTemplate(rawText, communityMatch.template);
            const liveConf = calculateMatchConfidence(communityMatch.template, extracted);
            const storedScore = Number(communityMatch.template.community_score || 0);
            const confidence = Math.max(liveConf, storedScore, communityMatch.confidence ?? 0);

            if (confidence >= CONFIDENCE_THRESHOLDS.community) {
              result.parsed = {
                ...extracted,
                type: 'expense',
                currency: 'IDR',
                amount: extracted.total ?? extracted.amount ?? 0,
              };
              result.source = 'community';
              result.template = communityMatch.template;
              result.templateId = communityMatch.template.id;
              result.confidence = confidence;
              matched = true;
              log('Template matched: community');
              emitOCREvent('ocr:complete', { source: 'community', confidence });
            }
          } catch (e) {
            log('Community template apply failed:', e.message);
            result.warnings.push('template_apply_failed');
          }
        }
      } catch (e) {
        log('Community query failed:', e.message);
        result.warnings.push('template_query_failed');
      }
    }

    emitOCREvent('ocr:progress', { stage: 'generic', progress: 0.90 });

    // --- L4: generic parse fallback ---
    if (!matched) {
      try {
        log('Running generic parse...');
        const generic = await genericParse(rawText);
        const genericConf = generic.confidence ?? 0.60;
        result.parsed = {
          ...generic,
          type: 'expense',
          currency: 'IDR',
          amount: generic.total ?? generic.amount ?? 0,
        };
        result.source = genericConf >= CONFIDENCE_THRESHOLDS.generic ? 'generic' : 'review';
        result.confidence = genericConf;
        log('Generic parse done');
        emitOCREvent('ocr:complete', { source: result.source, confidence: genericConf });
      } catch (e) {
        log('Generic parse failed:', e.message);
        result.parsed = getDefaultParsed();
        result.source = 'review';
        result.warnings.push('generic_parse_failed');
      }
    }

    result.latency.parse_ms = Date.now() - parseStart;
    result.latency.total_ms = Date.now() - startTime;
    result.success = true;

    attachQuality(result);

    log('Pipeline complete:', {
      source: result.source,
      confidence: result.confidence,
      quality: result.quality?.level,
      latency: result.latency,
      warnings: result.warnings,
    });

    return result;
  } catch (e) {
    console.error('[receipt-pipeline] Unexpected error (recovered):', e);
    result.error = e.message || 'Unknown pipeline error';
    result.success = true;
    result.source = 'manual';
    result.parsed = getDefaultParsed();
    result.warnings.push('critical_error');
    result.latency.total_ms = Date.now() - startTime;
    emitOCREvent('ocr:error', { error: result.error });
    return attachQuality(result);
  }
}

// ---------------------------------------------------------------------------
// Confirm + learn
// ---------------------------------------------------------------------------

/**
 * Persists the scan to DB and triggers template learning.
 *
 * Call this AFTER the user has confirmed/edited the parsed data.
 *
 * @param {ReceiptParseResult} scanResult - Pipeline output
 * @param {object} finalData - User-confirmed transaction fields
 * @param {string|null} userId
 * @param {import('@supabase/supabase-js').SupabaseClient} [supabaseClient]
 * @returns {Promise<{ saved: boolean, templateAction: 'created'|'updated'|'voted'|'none' }>}
 */
export async function confirmReceiptParse(scanResult, finalData, userId, supabaseClient) {
  const supa = (supabaseClient && typeof supabaseClient.from === 'function')
    ? supabaseClient
    : resolveSupa();

  if (!supa || !userId) {
    console.warn('[receipt-pipeline] confirmReceiptParse skipped — no supabase or userId');
    return { saved: false, templateAction: 'none' };
  }

  const {
    rawText = '',
    layout = {},
    imageHash = '',
    templateId = null,
    source,
    parsed,
  } = scanResult;

  const editedFields = Object.keys(finalData).filter(
    (k) => finalData[k] != null && String(finalData[k]) !== String((parsed ?? {})[k] ?? ''),
  );

  /** @type {'created'|'updated'|'voted'|'none'} */
  let templateAction = 'none';

  try {
    if (templateId && (source === 'user_memory' || source === 'community')) {
      if (editedFields.length === 0) {
        await voteTemplate(templateId, userId, 'confirm', [], supa);
        await supa.rpc('increment_template_success', { p_template_id: templateId }).catch((e) => {
          console.warn('[receipt-pipeline] increment_template_success failed:', e.message);
        });
        templateAction = 'voted';

        const promoted = await checkAndPromoteTemplate(templateId, supa);
        if (promoted) templateAction = 'created';
      } else {
        await updateTemplateFromEdit(templateId, { rawText }, finalData, supa);
        await voteTemplate(templateId, userId, 'edit', editedFields, supa);
        templateAction = 'updated';
      }
    } else {
      const { templateId: newId, success } = await createTemplateFromCorrection(
        userId,
        { rawText, imageHash, layout },
        finalData,
        supa,
      );
      if (success && newId) {
        templateAction = 'created';
        await checkAndPromoteTemplate(newId, supa);
      }
    }

    supa.from('receipt_scans').insert({
      user_id: userId,
      image_hash: imageHash,
      raw_text: rawText,
      ocr_confidence: scanResult.confidence ?? null,
      template_id: templateId,
      template_match_type: source === 'user_memory' ? 'user_memory'
        : source === 'community' ? 'community'
        : source === 'generic' ? 'generic'
        : 'manual',
      parsed_json: parsed ?? {},
      final_json: finalData,
      edited_fields: editedFields.length ? editedFields : null,
      ocr_latency_ms: scanResult.latency?.ocr_ms ?? null,
      parse_latency_ms: scanResult.latency?.parse_ms ?? null,
    }).then(({ error }) => {
      if (error) console.error('[receipt-pipeline] scan log failed:', error.message);
    });

    return { saved: true, templateAction };
  } catch (err) {
    console.error('[receipt-pipeline] confirmReceiptParse error:', err);
    return { saved: false, templateAction: 'none' };
  }
}
