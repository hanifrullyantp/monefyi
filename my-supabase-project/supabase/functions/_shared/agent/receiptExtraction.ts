import { orgToday, parseTanggal } from './dates.ts';
import { COST_UNITS, parseRupiah, readNumberToken } from './money.ts';

export type ReceiptItem = {
  name: string;
  qty?: number;
  unit?: string;
  unitPrice?: number;
  amount: number;
};

export type ReceiptFieldConfidence = {
  date: number;
  supplier: number;
  totalAmount: number;
  items: number;
  tax: number;
};

export type ReceiptWarningCode =
  | 'missing_date'
  | 'missing_supplier'
  | 'missing_total'
  | 'missing_explicit_total'
  | 'low_confidence_total'
  | 'sum_items_mismatch_total'
  | 'subtotal_tax_mismatch_total'
  | 'no_items_extracted'
  | 'tax_unparsed'
  | 'ocr_low_quality'
  | 'low_overall_confidence'
  | 'prompt_injection_detected';

export type ReceiptExtractionResult = {
  status: 'draft';
  requiresReview: true;
  entryDate: string | null;
  supplierName: string | null;
  invoiceNumber: string | null;
  items: ReceiptItem[];
  subtotalAmount: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  contentHash: string;
  fieldConfidence: ReceiptFieldConfidence;
  overallConfidence: number;
  warnings: ReceiptWarningCode[];
  sanitizedText: string;
  detectedInjectionSegments: string[];
};

export type ExtractReceiptOptions = {
  timeZone?: string;
  now?: Date;
  contentBytes?: Uint8Array | string;
};

export type ReceiptAttachmentMeta = {
  attachmentId: string;
  attachmentHash: string;
  storagePath?: string;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
};

export type PrepareEntryFromReceiptResult = {
  status: 'draft';
  requiresReview: true;
  text: string;
  entryDate?: string;
  amount?: number;
  supplierName: string | null;
  invoiceNumber: string | null;
  items: ReceiptItem[];
  attachmentId: string;
  attachmentHash: string;
  provenance: {
    source: 'receipt_ocr';
    overallConfidence: number;
    fieldConfidence: ReceiptFieldConfidence;
    warnings: ReceiptWarningCode[];
    contentHash: string;
  };
};

// Pure TypeScript FIPS 180-4 SHA-256 so domain package remains 100% runtime-agnostic (Node & Browser)
const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

export function computeDeterministicSha256(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  const highBits = Math.floor(bitLen / 0x100000000);
  const lowBits = bitLen >>> 0;
  view.setUint32(paddedLen - 8, highBits, false);
  view.setUint32(paddedLen - 4, lowBits, false);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (hh + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }

  return Array.from(h, (word) => word.toString(16).padStart(8, '0')).join('');
}

export const CHAT_SAFE_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+|any\s+)?(?:previous|prior|above)\s+instructions?/i,
  /disregard\s+(?:all\s+|previous\s+)?instructions?/i,
  /override\s+(?:system|safety|accounting|all)\s+rules?/i,
  /\bsystem\s*prompt\b/i,
  /\byou\s+are\s+now\b/i,
  /\bauto[-_\s]?commit\b/i,
  /\bskip\s+(?:review|approval|verification)\b/i,
  /\bbypass\s+(?:approval|review|owner|guard)\b/i,
  /\b(?:ubah\s+rekening|ganti\s+rekening)\s+(?:to|ke)\b/i,
  /\bcall\s+(?:commit_entry|prepare_entry|planner_post_journal)\b/i,
  /\bdebit\b[^.\n]{0,40}\bcredit\b/i,
  /\b(?:abaikan|lupakan)\s+(?:semua\s+)?instruksi(?:\s+sebelumnya)?\b/i,
  /\bsetujui\s+otomatis\b/i,
  /\btanpa\s+(?:review|approval|persetujuan|konfirmasi)\b/i,
];

const INJECTION_PATTERNS: RegExp[] = [
  ...CHAT_SAFE_INJECTION_PATTERNS,
  /\b(?:transfer|send\s+money|kirim\s+dana)\s+(?:to|ke)\b/i,
];

export function detectPromptInjection(rawText: string): string[] {
  const lines = String(rawText ?? '').replace(/\r\n?/g, '\n').split('\n');
  const hits: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (CHAT_SAFE_INJECTION_PATTERNS.some((re) => re.test(trimmed))) {
      hits.push(trimmed);
    }
  }
  return hits;
}

const EXTRA_RECEIPT_UNITS = ['l', 'ltr', 'liter', 'ml', 'box', 'pak', 'pack', 'bks', 'bungkus', 'botol', 'btl', 'zak', 'm', 'cm', 'mm', 'jam', 'bln'];
const ALL_UNITS_PATTERN = [...COST_UNITS, ...EXTRA_RECEIPT_UNITS]
  .map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');

const ID_MONTH_REGEX = 'jan(?:uari)?|feb(?:ruari)?|mar(?:et)?|apr(?:il)?|mei|jun(?:i)?|jul(?:i)?|agu(?:stus)?|agt|sep(?:t(?:ember)?)?|okt(?:ober)?|nov(?:ember)?|des(?:ember)?';

const SUMMARY_LINE_RE = /^\s*(?:grand\s*total|sub\s*total|subtotal|dpp|ppn|pajak|tax|vat|diskon|discount|potongan|total(?:\s+(?:bayar|tagihan|akhir|harga|belanja|keseluruhan))?|jumlah(?:\s+(?:bayar|tagihan|harga))?|net\s*total|tunai|cash|debit|kredit|qris|transfer|bayar|dibayar|kembali(?:an)?|change|terbilang|pembulatan|rounding)\b/i;

const NON_SUPPLIER_HEADER_RE = /^(?:nota|struk|invoice|faktur|kwitansi|kuitansi|receipt|bill|tagihan|bukti\s+pembayaran|salinan|copy|reprint)\b/i;
const ADDRESS_OR_CONTACT_RE = /^(?:jl\.?|jalan|komp\.?|komplek|rt\s*\d|rw\s*\d|kel\.?|kec\.?|kota|kab\.?|telp|tlp|phone|hp|wa|fax|email|npwp|www\.|http|ig:|ig\s|kepada\s*:|yth\.?|customer|pelanggan|kasir|operator|shift)\b/i;

function round3(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function sanitizeAndDetectInjections(rawText: string): {
  lines: string[];
  sanitizedText: string;
  detectedInjectionSegments: string[];
} {
  const rawLines = String(rawText ?? '').replace(/\r\n?/g, '\n').split('\n');
  const cleanLines: string[] = [];
  const detected: string[] = [];

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const matchedInjection = INJECTION_PATTERNS.some((re) => re.test(trimmed));
    if (matchedInjection) {
      detected.push(trimmed);
      continue;
    }
    cleanLines.push(trimmed);
  }

  return {
    lines: cleanLines,
    sanitizedText: cleanLines.join('\n'),
    detectedInjectionSegments: detected,
  };
}

function extractNominalFromSegment(segment: string): { ok: boolean; amount: number; needsReview: boolean } {
  const cleaned = segment
    .replace(/\b\d{1,2}\s*%/g, ' ')
    .replace(/\b(?:rp\.?|idr)\s*/gi, 'Rp ');
  const tokenRe = /(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+|\d+)(?:\s*(juta|jt|ribu|rb|k))?/gi;
  const candidates: Array<{ raw: string; amount: number; needsReview: boolean }> = [];

  for (const match of cleaned.matchAll(tokenRe)) {
    const rawMatch = match[0].trim();
    const numPart = match[1];
    const suffix = match[2] || '';
    const tokenText = suffix ? `${numPart} ${suffix}` : numPart;
    const parsed = parseRupiah(tokenText);
    if (parsed.ok && Number.isFinite(parsed.amount) && parsed.amount >= 0) {
      candidates.push({ raw: rawMatch, amount: parsed.amount, needsReview: parsed.needsReview });
    }
  }

  if (candidates.length === 0) {
    return { ok: false, amount: 0, needsReview: true };
  }
  const chosen = candidates[candidates.length - 1];
  return { ok: true, amount: Math.round(chosen.amount), needsReview: chosen.needsReview };
}

function extractDateFromLines(
  lines: string[],
  timeZone: string,
  now: Date,
): { entryDate: string | null; confidence: number } {
  const labeledDateLines = lines.filter((l) => /\b(?:tanggal|tgl|date|tgl\.?\s*nota|waktu)\b/i.test(l));
  const candidateLines = [...labeledDateLines, ...lines];

  const isoRe = /\b(\d{4}-\d{1,2}-\d{1,2})\b/;
  const dmy4Re = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b/;
  const dmy2Re = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2})\b/;
  const named4Re = new RegExp(`\\b(\\d{1,2}\\s+(?:${ID_MONTH_REGEX})\\s+\\d{4})\\b`, 'i');
  const named2Re = new RegExp(`\\b(\\d{1,2})\\s+(${ID_MONTH_REGEX})\\s+(\\d{2})\\b`, 'i');

  for (const line of candidateLines) {
    const mIso = line.match(isoRe);
    if (mIso) {
      const res = parseTanggal(mIso[1], timeZone, now);
      if (res.ok) return { entryDate: res.date, confidence: 0.96 };
    }

    const mDmy4 = line.match(dmy4Re);
    if (mDmy4) {
      const res = parseTanggal(mDmy4[1], timeZone, now);
      if (res.ok) return { entryDate: res.date, confidence: 0.94 };
    }

    const mNamed4 = line.match(named4Re);
    if (mNamed4) {
      const res = parseTanggal(mNamed4[1], timeZone, now);
      if (res.ok) return { entryDate: res.date, confidence: 0.95 };
    }

    const mDmy2 = line.match(dmy2Re);
    if (mDmy2) {
      const yearNum = 2000 + Number(mDmy2[3]);
      const res = parseTanggal(`${mDmy2[1]}/${mDmy2[2]}/${yearNum}`, timeZone, now);
      if (res.ok) return { entryDate: res.date, confidence: 0.88 };
    }

    const mNamed2 = line.match(named2Re);
    if (mNamed2) {
      const yearNum = 2000 + Number(mNamed2[3]);
      const res = parseTanggal(`${mNamed2[1]} ${mNamed2[2]} ${yearNum}`, timeZone, now);
      if (res.ok) return { entryDate: res.date, confidence: 0.88 };
    }
  }

  const todayFallbackCheck = lines.some((l) => /\b(?:hari ini|kemarin)\b/i.test(l));
  if (todayFallbackCheck) {
    const hit = lines.find((l) => /\b(?:hari ini|kemarin)\b/i.test(l))?.match(/\b(?:hari ini|kemarin)\b/i)?.[0];
    if (hit) {
      const res = parseTanggal(hit, timeZone, now);
      if (res.ok) return { entryDate: res.date, confidence: 0.78 };
    }
  }

  void orgToday;
  return { entryDate: null, confidence: 0 };
}

function extractInvoiceNumber(lines: string[]): string | null {
  const patterns: RegExp[] = [
    /\b(?:no\.?\s*invoice|invoice\s*(?:no\.?|number|#)|inv\.?\s*(?:no\.?|#)|no\.?\s*faktur|faktur\s*(?:no\.?|#)|no\.?\s*nota|nota\s*(?:no\.?|#)|no\.?\s*struk|struk\s*(?:no\.?|#)|kwitansi\s*(?:no\.?|#)|no\.?\s*kwitansi|ref\.?\s*(?:no\.?|#))\s*[:#-]?\s*([A-Z0-9][A-Z0-9/_-]{2,32})/i,
    /\b(?:no\.?)\s*[:#]\s*([A-Z0-9][A-Z0-9/_-]{2,32})/i,
  ];

  for (const line of lines) {
    if (/\b(?:telp|tlp|hp|wa|npwp|rt|rw)\b/i.test(line)) continue;
    for (const re of patterns) {
      const m = line.match(re);
      if (m && m[1]) {
        const candidate = m[1].trim().replace(/[.,;]+$/, '');
        // Abaikan jika hanya format tanggal DD/MM/YYYY atau angka murni pendek tanpa huruf/pemisah
        if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(candidate)) continue;
        if (candidate.length >= 3) return candidate;
      }
    }
  }
  return null;
}

function extractSupplierName(lines: string[]): { supplierName: string | null; confidence: number } {
  const labeledRe = /^(?:supplier|vendor|toko|penjual|merchant|nama\s*toko|dari)\s*[:\-]\s*(.+)$/i;
  for (const line of lines) {
    const m = line.match(labeledRe);
    if (m && m[1]) {
      const cleaned = m[1].replace(/\s{2,}.*$/, '').trim();
      if (cleaned.length >= 2) return { supplierName: cleaned, confidence: 0.94 };
    }
  }

  const entityPrefixRe = /\b(?:PT|CV|TB|UD|PD|TOKO|WARUNG|BENGKEL|SPBU|PERTAMINA|DEPOT|GALLERY|KOPERASI)\b/i;
  for (const line of lines.slice(0, 8)) {
    if (NON_SUPPLIER_HEADER_RE.test(line)) continue;
    if (ADDRESS_OR_CONTACT_RE.test(line)) continue;
    if (/^[-=*_.]+$/.test(line)) continue;
    if (/\b(?:tanggal|tgl|date|no\.?\s*(?:nota|invoice|faktur|struk)|subtotal|total|ppn)\b/i.test(line)) continue;

    if (entityPrefixRe.test(line)) {
      const cleaned = line.replace(/\s{2,}.*$/, '').trim();
      if (cleaned.length >= 3) return { supplierName: cleaned, confidence: 0.92 };
    }
  }

  for (const line of lines.slice(0, 5)) {
    if (NON_SUPPLIER_HEADER_RE.test(line)) continue;
    if (ADDRESS_OR_CONTACT_RE.test(line)) continue;
    if (/^[-=*_.]+$/.test(line)) continue;
    if (/\b(?:tanggal|tgl|date|no\.?\s*(?:nota|invoice|faktur|struk)|subtotal|total|ppn)\b/i.test(line)) continue;
    if (/^\d[\d\s.,:/-]+$/.test(line)) continue;

    const alphaCount = (line.match(/[a-z]/gi) || []).length;
    const noiseCount = (line.match(/[^a-z0-9\s.,'&/-]/gi) || []).length;
    if (alphaCount >= 4 && noiseCount <= 1) {
      return { supplierName: line.trim(), confidence: 0.72 };
    }
  }

  return { supplierName: null, confidence: 0 };
}

function isNoiseOrMetaLine(line: string): boolean {
  if (/^[-=*_.\s]+$/.test(line)) return true;
  if (SUMMARY_LINE_RE.test(line)) return true;
  if (NON_SUPPLIER_HEADER_RE.test(line)) return true;
  if (ADDRESS_OR_CONTACT_RE.test(line)) return true;
  if (/\b(?:tanggal|tgl|date|no\.?\s*(?:nota|invoice|faktur|struk)|invoice\s*no|terima\s*kasih|thank\s*you|barang\s+yang\s+sudah\s+dibeli)\b/i.test(line)) {
    return true;
  }
  return false;
}

function cleanItemName(name: string): string {
  return name
    .replace(/^\d+[.)]\s+/, '')
    .replace(/\s+/g, ' ')
    .replace(/[:\-–—=]+$/, '')
    .trim();
}

function parseItemLine(line: string): ReceiptItem | null {
  if (isNoiseOrMetaLine(line)) return null;

  // Pola 1: "<nama> <qty> [satuan] (x|×|@) <hargaSatuan> [=] <jumlah>"
  const qtyUnitPriceAmountRe = new RegExp(
    `^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${ALL_UNITS_PATTERN})?\\s*(?:x|×|@)\\s*(?:rp\\.?\\s*)?(\\d{1,3}(?:[.,]\\d{3})+|\\d+(?:[.,]\\d+)?)\\s*(?:=\\s*)?(?:rp\\.?\\s*)?(\\d{1,3}(?:[.,]\\d{3})+|\\d+)$`,
    'i',
  );
  const m1 = line.match(qtyUnitPriceAmountRe);
  if (m1) {
    const name = cleanItemName(m1[1]);
    const qtyToken = readNumberToken(m1[2], true);
    const unit = m1[3] ? m1[3].toLowerCase() : undefined;
    const unitPriceRes = parseRupiah(m1[4]);
    const amountRes = parseRupiah(m1[5]);
    if (name.length >= 2 && qtyToken.ok && unitPriceRes.ok && amountRes.ok && amountRes.amount > 0) {
      return {
        name,
        qty: qtyToken.value,
        ...(unit ? { unit } : {}),
        unitPrice: unitPriceRes.amount,
        amount: amountRes.amount,
      };
    }
  }

  // Pola 2: "<qty> [satuan] <nama> (x|×|@) <hargaSatuan> = <jumlah>"
  const leadingQtyRe = new RegExp(
    `^(?:\\d+[.)]\\s+)?(\\d+(?:[.,]\\d+)?)\\s*(${ALL_UNITS_PATTERN})\\s+(.+?)\\s*(?:x|×|@)\\s*(?:rp\\.?\\s*)?(\\d{1,3}(?:[.,]\\d{3})+|\\d+)\\s*(?:=\\s*(?:rp\\.?\\s*)?(\\d{1,3}(?:[.,]\\d{3})+|\\d+))?$`,
    'i',
  );
  const m2 = line.match(leadingQtyRe);
  if (m2) {
    const qtyToken = readNumberToken(m2[1], true);
    const unit = m2[2].toLowerCase();
    const name = cleanItemName(m2[3]);
    const unitPriceRes = parseRupiah(m2[4]);
    const amountRes = m2[5] ? parseRupiah(m2[5]) : null;
    if (name.length >= 2 && qtyToken.ok && unitPriceRes.ok) {
      const amount = amountRes?.ok ? amountRes.amount : Math.round(qtyToken.value * unitPriceRes.amount);
      if (amount > 0) {
        return {
          name,
          qty: qtyToken.value,
          unit,
          unitPrice: unitPriceRes.amount,
          amount,
        };
      }
    }
  }

  // Pola 3: "<nama> <nominal akhir>" (minimal 2 spasi atau pemisah jelas sebelum nominal rupiah ribuan/Rp)
  const tailAmountRe = /^(.+?)\s+(?:rp\.?\s*)(\d{1,3}(?:[.,]\d{3})+|\d+)$|^(.+?)\s{2,}(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+|\d{4,})$/i;
  const m3 = line.match(tailAmountRe);
  if (m3) {
    const rawName = (m3[1] ?? m3[3] ?? '').trim();
    const rawAmount = (m3[2] ?? m3[4] ?? '').trim();
    const name = cleanItemName(rawName);
    const amountRes = parseRupiah(rawAmount);
    if (
      name.length >= 2
      && /[a-z]/i.test(name)
      && amountRes.ok
      && amountRes.amount >= 500
    ) {
      // Cek apakah di akhir name ada pola "<qty> [satuan]"
      const trailingQty = name.match(new RegExp(`^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${ALL_UNITS_PATTERN})?$`, 'i'));
      if (trailingQty && trailingQty[3]) {
        const qtyToken = readNumberToken(trailingQty[2], true);
        if (qtyToken.ok && qtyToken.value > 0) {
          return {
            name: cleanItemName(trailingQty[1]),
            qty: qtyToken.value,
            unit: trailingQty[3].toLowerCase(),
            amount: amountRes.amount,
          };
        }
      }
      return {
        name,
        amount: amountRes.amount,
      };
    }
  }

  return null;
}

function extractAmountsAndItems(lines: string[], supplierName: string | null): {
  items: ReceiptItem[];
  subtotalAmount: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  hasExplicitTotal: boolean;
  totalNeedsReview: boolean;
  taxMentionedButUnparsed: boolean;
} {
  let subtotalAmount: number | null = null;
  let taxAmount: number | null = null;
  let totalAmount: number | null = null;
  let totalPriority = 0; // 1 = generic TOTAL/JUMLAH, 2 = GRAND TOTAL / TOTAL BAYAR / TOTAL TAGIHAN
  let hasExplicitTotal = false;
  let totalNeedsReview = false;
  let taxMentionedButUnparsed = false;
  const items: ReceiptItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (supplierName && line === supplierName && i < 3) continue;

    if (/^\s*(?:sub\s*total|subtotal|dpp(?:\s*\/\s*subtotal)?|total\s+harga\s+barang)\b/i.test(line)) {
      const nom = extractNominalFromSegment(line);
      if (nom.ok && nom.amount > 0) {
        subtotalAmount = nom.amount;
      }
      continue;
    }

    if (/^\s*(?:ppn|pajak|tax|vat)\b/i.test(line) && !/\b(?:npwp|pkp)\b/i.test(line)) {
      const nom = extractNominalFromSegment(line);
      if (nom.ok && nom.amount >= 0) {
        taxAmount = nom.amount;
      } else {
        taxMentionedButUnparsed = true;
      }
      continue;
    }

    if (/^\s*(?:grand\s*total|total\s+(?:bayar|tagihan|akhir|pembayaran)|jumlah\s+(?:bayar|tagihan)|net\s*total)\b/i.test(line)) {
      const nom = extractNominalFromSegment(line);
      if (nom.ok && nom.amount > 0) {
        totalAmount = nom.amount;
        totalPriority = 2;
        hasExplicitTotal = true;
        totalNeedsReview = nom.needsReview;
      } else {
        totalNeedsReview = true;
      }
      continue;
    }

    if (/^\s*(?:total|jumlah|jml)\b/i.test(line) && !/^\s*(?:total\s+(?:item|qty|barang|diskon))\b/i.test(line)) {
      const nom = extractNominalFromSegment(line);
      if (nom.ok && nom.amount > 0 && totalPriority < 2) {
        totalAmount = nom.amount;
        totalPriority = 1;
        hasExplicitTotal = true;
        totalNeedsReview = nom.needsReview;
      } else if (!nom.ok) {
        totalNeedsReview = true;
      }
      continue;
    }

    const parsedItem = parseItemLine(line);
    if (parsedItem) {
      items.push(parsedItem);
    }
  }

  return {
    items,
    subtotalAmount,
    taxAmount,
    totalAmount,
    hasExplicitTotal,
    totalNeedsReview,
    taxMentionedButUnparsed,
  };
}

function estimateOcrQuality(sanitizedText: string, lines: string[]): boolean {
  if (!sanitizedText || lines.length === 0) return false;
  const weirdChars = (sanitizedText.match(/[?~^`\\|@#]/g) || []).length;
  const totalChars = sanitizedText.length;
  if (totalChars < 12) return false;
  if (weirdChars / totalChars > 0.12) return false;
  return true;
}

/**
 * Mengekstrak teks OCR nota/struk/invoice Indonesia secara deterministik menjadi draf.
 * ATURAN KERAS: Selalu mengembalikan `status: 'draft'` & `requiresReview: true`,
 * tidak pernah auto-commit dan tidak pernah memilih debit/kredit.
 */
export function extractReceiptFields(
  rawText: string,
  opts: ExtractReceiptOptions = {},
): ReceiptExtractionResult {
  const timeZone = opts.timeZone || 'Asia/Jakarta';
  const now = opts.now ?? new Date();
  const contentHash = computeDeterministicSha256(opts.contentBytes ?? String(rawText ?? ''));

  const { lines, sanitizedText, detectedInjectionSegments } = sanitizeAndDetectInjections(rawText);
  const warnings: ReceiptWarningCode[] = [];

  if (detectedInjectionSegments.length > 0) {
    warnings.push('prompt_injection_detected');
  }

  const dateInfo = extractDateFromLines(lines, timeZone, now);
  if (!dateInfo.entryDate) {
    warnings.push('missing_date');
  }

  const supplierInfo = extractSupplierName(lines);
  if (!supplierInfo.supplierName) {
    warnings.push('missing_supplier');
  }

  const invoiceNumber = extractInvoiceNumber(lines);
  const {
    items,
    subtotalAmount,
    taxAmount,
    totalAmount: explicitTotal,
    hasExplicitTotal,
    totalNeedsReview,
    taxMentionedButUnparsed,
  } = extractAmountsAndItems(lines, supplierInfo.supplierName);

  const itemsSum = items.reduce((sum, item) => sum + item.amount, 0);
  let totalAmount = explicitTotal;

  if (totalAmount == null) {
    if (subtotalAmount != null) {
      totalAmount = subtotalAmount + (taxAmount ?? 0);
      warnings.push('missing_explicit_total');
    } else if (itemsSum > 0) {
      totalAmount = itemsSum + (taxAmount ?? 0);
      warnings.push('missing_explicit_total');
    } else {
      warnings.push('missing_total');
    }
  }

  if (items.length === 0) {
    warnings.push('no_items_extracted');
  }
  if (taxMentionedButUnparsed) {
    warnings.push('tax_unparsed');
  }

  const ocrGood = estimateOcrQuality(sanitizedText, lines);
  if (!ocrGood) {
    warnings.push('ocr_low_quality');
  }

  // Rekonsiliasi item vs subtotal/total
  let itemsMismatch = false;
  if (items.length > 0 && totalAmount != null && totalAmount > 0) {
    const matchesDirectTotal = Math.abs(itemsSum - totalAmount) <= 100;
    const matchesWithTax = Math.abs(itemsSum + (taxAmount ?? 0) - totalAmount) <= 100;
    const matchesSubtotal = subtotalAmount != null && Math.abs(itemsSum - subtotalAmount) <= 100;
    if (!matchesDirectTotal && !matchesWithTax && !matchesSubtotal) {
      itemsMismatch = true;
      warnings.push('sum_items_mismatch_total');
    }
  }

  if (subtotalAmount != null && totalAmount != null && totalAmount > 0) {
    if (Math.abs(subtotalAmount + (taxAmount ?? 0) - totalAmount) > 100) {
      warnings.push('subtotal_tax_mismatch_total');
    }
  }

  let totalConfidence = 0;
  if (totalAmount != null && totalAmount > 0) {
    if (hasExplicitTotal && !totalNeedsReview && !itemsMismatch) {
      totalConfidence = 0.96;
    } else if (hasExplicitTotal && (itemsMismatch || totalNeedsReview)) {
      totalConfidence = 0.62;
    } else {
      totalConfidence = 0.45;
    }
  }

  if (totalConfidence < 0.7) {
    warnings.push('low_confidence_total');
  }

  const itemsConfidence = items.length === 0
    ? 0.25
    : itemsMismatch
      ? 0.62
      : 0.92;

  const taxConfidence = taxMentionedButUnparsed
    ? 0.25
    : taxAmount != null
      ? 0.95
      : 0.85;

  const fieldConfidence: ReceiptFieldConfidence = {
    date: round3(dateInfo.confidence),
    supplier: round3(supplierInfo.confidence),
    totalAmount: round3(totalConfidence),
    items: round3(itemsConfidence),
    tax: round3(taxConfidence),
  };

  let overallRaw =
    fieldConfidence.totalAmount * 0.35
    + fieldConfidence.date * 0.25
    + fieldConfidence.supplier * 0.20
    + fieldConfidence.items * 0.15
    + fieldConfidence.tax * 0.05;

  if (!ocrGood) {
    overallRaw = Math.min(overallRaw, 0.45);
  }
  if (detectedInjectionSegments.length > 0) {
    overallRaw = Math.min(overallRaw, 0.42);
  }

  const overallConfidence = round3(clamp01(overallRaw));
  if (overallConfidence < 0.7) {
    warnings.push('low_overall_confidence');
  }

  return {
    status: 'draft',
    requiresReview: true,
    entryDate: dateInfo.entryDate,
    supplierName: supplierInfo.supplierName,
    invoiceNumber,
    items,
    subtotalAmount,
    taxAmount,
    totalAmount,
    contentHash,
    fieldConfidence,
    overallConfidence,
    warnings: Array.from(new Set(warnings)),
    sanitizedText,
    detectedInjectionSegments,
  };
}

/**
 * Menerjemahkan hasil ekstraksi nota menjadi slot input mentah untuk `prepare_entry`.
 * Teks dibangun hanya dari field terstruktur yang sudah disanitasi (bebas teks injeksi),
 * tidak pernah memilih debit/kredit, dan selalu berstatus draf (`requiresReview: true`).
 */
export function buildPrepareEntryFromReceipt(
  extraction: ReceiptExtractionResult,
  attachmentMeta: ReceiptAttachmentMeta,
): PrepareEntryFromReceiptResult {
  const itemSummary = extraction.items.length > 0
    ? extraction.items
      .slice(0, 3)
      .map((item) => {
        if (item.qty != null && item.unit) return `${item.name} (${item.qty} ${item.unit})`;
        if (item.qty != null) return `${item.name} (${item.qty})`;
        return item.name;
      })
      .join(', ')
    : 'belanja nota';

  const parts = [`Beli ${itemSummary}`];
  if (extraction.supplierName) {
    parts.push(`dari ${extraction.supplierName}`);
  }
  if (extraction.invoiceNumber) {
    parts.push(`(Ref ${extraction.invoiceNumber})`);
  }
  if (extraction.totalAmount != null && extraction.totalAmount > 0) {
    parts.push(`Rp ${extraction.totalAmount.toLocaleString('id-ID')}`);
  }
  if (extraction.entryDate) {
    parts.push(extraction.entryDate);
  }

  return {
    status: 'draft',
    requiresReview: true,
    text: parts.join(' '),
    ...(extraction.entryDate ? { entryDate: extraction.entryDate } : {}),
    ...(extraction.totalAmount != null && extraction.totalAmount > 0
      ? { amount: extraction.totalAmount }
      : {}),
    supplierName: extraction.supplierName,
    invoiceNumber: extraction.invoiceNumber,
    items: extraction.items,
    attachmentId: attachmentMeta.attachmentId,
    attachmentHash: attachmentMeta.attachmentHash || extraction.contentHash,
    provenance: {
      source: 'receipt_ocr',
      overallConfidence: extraction.overallConfidence,
      fieldConfidence: extraction.fieldConfidence,
      warnings: extraction.warnings,
      contentHash: extraction.contentHash,
    },
  };
}
