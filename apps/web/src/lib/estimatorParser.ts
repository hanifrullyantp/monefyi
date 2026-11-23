import type { PricelistItem } from '../types/estimator';

export interface ParsedEstimationItem {
  name: string;
  qty: number;
  unit: string;
  hpp_per_unit: number;
  margin_pct: number;
  selling_price_per_unit?: number;
  confidence: number;
  pricelist_item_id?: string | null;
  matched_pricelist?: string;
}

const UNIT_ALIASES: Array<{ unit: string; pattern: RegExp }> = [
  { unit: 'm2', pattern: /\b(m2|m²|meter\s*persegi|mp)\b/i },
  { unit: 'm3', pattern: /\b(m3|m³)\b/i },
  { unit: 'm', pattern: /\b(meter|(?<!\d)\s*m(?!\d|2|3))\b/i },
  { unit: 'kg', pattern: /\b(kg|kilo)\b/i },
  { unit: 'pcs', pattern: /\b(pcs|buah|unit|lembar)\b/i },
  { unit: 'btg', pattern: /\b(btg|batang)\b/i },
  { unit: 'hari', pattern: /\b(hari|hr|hari\s*kerja)\b/i },
  { unit: 'kaleng', pattern: /\b(kaleng|kal)\b/i },
  { unit: 'lm', pattern: /\blm\b/i },
  { unit: 'ls', pattern: /\bls\b/i },
  { unit: 'sak', pattern: /\bsak\b/i },
];

/** Normalize Indonesian shorthand numbers: 85rb → 85000, 3.5jt → 3500000 */
export function normalizeAmount(raw: string): number {
  let s = raw.trim().toLowerCase().replace(/\./g, '').replace(/,/g, '.');
  const jtMatch = s.match(/^([\d.]+)\s*(jt|juta)$/);
  if (jtMatch) return Math.round(parseFloat(jtMatch[1]) * 1_000_000);

  const rbMatch = s.match(/^([\d.]+)\s*(rb|ribu)$/);
  if (rbMatch) return Math.round(parseFloat(rbMatch[1]) * 1_000);

  const kMatch = s.match(/^([\d.]+)\s*k$/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1_000);

  const n = parseFloat(s.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function detectUnit(text: string): { unit: string; cleaned: string } {
  for (const { unit, pattern } of UNIT_ALIASES) {
    if (pattern.test(text)) {
      return { unit, cleaned: text.replace(pattern, ' ').replace(/\s+/g, ' ').trim() };
    }
  }
  return { unit: 'pcs', cleaned: text };
}

function normalizeUnitToken(raw: string): string {
  const u = raw.toLowerCase();
  if (/m2|m²|meter\s*persegi|mp/.test(u)) return 'm2';
  if (/m3|m³/.test(u)) return 'm3';
  if (/meter|^m$/.test(u)) return 'm';
  if (/btg|batang/.test(u)) return 'btg';
  if (/hr|hari/.test(u)) return 'hari';
  if (/kal|kaleng/.test(u)) return 'kaleng';
  return u;
}

function extractQty(text: string): { qty: number; unit?: string; cleaned: string } {
  const atMatch = text.match(/@\s*([\d.,]+\s*(?:rb|ribu|k|jt|juta)?)/i);
  if (atMatch) {
    return {
      qty: 1,
      cleaned: text.replace(atMatch[0], ` hpp ${atMatch[1]} `),
    };
  }

  const qtyUnit = text.match(
    /(\d+(?:[.,]\d+)?)\s*(m2|m²|m3|m³|meter\s*persegi|meter|mp|kg|pcs|btg|batang|hari|hr|kaleng|kal|lm|ls|sak|m)(?!\w)/i,
  );
  if (qtyUnit) {
    const qty = parseFloat(qtyUnit[1].replace(',', '.'));
    return {
      qty: Number.isFinite(qty) ? qty : 1,
      unit: normalizeUnitToken(qtyUnit[2]),
      cleaned: text.replace(qtyUnit[0], ' ').replace(/\s+/g, ' ').trim(),
    };
  }

  const attachedUnit = text.match(/(\d+(?:[.,]\d+)?)(m2|m²|m3|m³)/i);
  if (attachedUnit) {
    const qty = parseFloat(attachedUnit[1].replace(',', '.'));
    return {
      qty: Number.isFinite(qty) ? qty : 1,
      unit: normalizeUnitToken(attachedUnit[2]),
      cleaned: text.replace(attachedUnit[0], ' ').replace(/\s+/g, ' ').trim(),
    };
  }

  const leadingQty = text.match(/^(\d+(?:[.,]\d+)?)\s+/);
  if (leadingQty) {
    const qty = parseFloat(leadingQty[1].replace(',', '.'));
    return {
      qty: Number.isFinite(qty) ? qty : 1,
      cleaned: text.slice(leadingQty[0].length).trim(),
    };
  }

  return { qty: 1, cleaned: text };
}

function extractPrices(text: string): {
  hpp: number;
  selling: number;
  margin: number;
  cleaned: string;
} {
  let hpp = 0;
  let selling = 0;
  let margin = 20;
  let cleaned = text;

  const marginMatch = cleaned.match(/\bmargin\s*(\d+(?:[.,]\d+)?)\s*%?/i);
  if (marginMatch) {
    margin = parseFloat(marginMatch[1].replace(',', '.'));
    cleaned = cleaned.replace(marginMatch[0], ' ');
  }

  const pctOnly = cleaned.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (pctOnly && !marginMatch) {
    margin = parseFloat(pctOnly[1].replace(',', '.'));
    cleaned = cleaned.replace(pctOnly[0], ' ');
  }

  const jualMatch = cleaned.match(/\bjual\s*([\d.,]+\s*(?:rb|ribu|k|jt|juta)?)/i);
  if (jualMatch) {
    selling = normalizeAmount(jualMatch[1]);
    cleaned = cleaned.replace(jualMatch[0], ' ');
  }

  const hppMatch = cleaned.match(/\b(hpp|harga|biaya)\s*([\d.,]+\s*(?:rb|ribu|k|jt|juta)?)/i);
  if (hppMatch) {
    hpp = normalizeAmount(hppMatch[2]);
    cleaned = cleaned.replace(hppMatch[0], ' ');
  }

  const barePrice = cleaned.match(/\b([\d.,]+\s*(?:rb|ribu|k|jt|juta))\b/i);
  if (barePrice && !hpp && !selling) {
    hpp = normalizeAmount(barePrice[1]);
    cleaned = cleaned.replace(barePrice[0], ' ');
  }

  const largeNum = cleaned.match(/\b(\d{4,})\b/);
  if (largeNum && !hpp && !selling) {
    hpp = normalizeAmount(largeNum[1]);
    cleaned = cleaned.replace(largeNum[0], ' ');
  }

  if (selling > 0 && hpp > 0 && margin === 20) {
    margin = ((selling - hpp) / selling) * 100;
  }

  return { hpp, selling, margin, cleaned: cleaned.replace(/\s+/g, ' ').trim() };
}

function fuzzyMatchPricelist(
  name: string,
  pricelist: PricelistItem[],
): { item: PricelistItem; score: number } | null {
  const needle = name.toLowerCase().trim();
  if (!needle) return null;

  let best: { item: PricelistItem; score: number } | null = null;
  for (const item of pricelist) {
    const hay = item.name.toLowerCase();
    let score = 0;
    if (hay === needle) score = 1;
    else if (hay.includes(needle) || needle.includes(hay)) score = 0.85;
    else {
      const words = needle.split(/\s+/).filter(w => w.length > 2);
      const matched = words.filter(w => hay.includes(w)).length;
      score = words.length > 0 ? matched / words.length * 0.7 : 0;
    }
    if (!best || score > best.score) best = { item, score };
  }
  return best && best.score >= 0.5 ? best : null;
}

function computeConfidence(
  name: string,
  hpp: number,
  qty: number,
  hasPricelist: boolean,
): number {
  let c = 0.3;
  if (name.length >= 3) c += 0.2;
  if (hpp > 0) c += 0.25;
  if (qty > 0 && qty !== 1) c += 0.1;
  if (hasPricelist) c += 0.15;
  return Math.min(1, c);
}

/** Parse a single line of natural-language estimation input. */
export function parseEstimationLine(
  line: string,
  pricelist: PricelistItem[] = [],
  defaultMargin = 20,
): ParsedEstimationItem | null {
  const raw = line.trim();
  if (!raw) return null;

  let text = raw.toLowerCase();

  const { qty, unit: qtyUnit, cleaned: afterQty } = extractQty(text);
  text = afterQty;

  const detected = detectUnit(text);
  const unit = qtyUnit || detected.unit;
  text = detected.cleaned;

  const { hpp, selling, margin, cleaned } = extractPrices(text);
  let name = cleaned
    .replace(/\b(per|@|×|x)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!name) name = raw.split(/\d/)[0]?.trim() || 'Item';

  name = name.charAt(0).toUpperCase() + name.slice(1);

  const match = fuzzyMatchPricelist(name, pricelist);
  let finalHpp = hpp;
  let finalMargin = margin || defaultMargin;
  let pricelistId: string | null = null;
  let matchedName: string | undefined;

  if (match) {
    pricelistId = match.item.id;
    matchedName = match.item.name;
    if (!finalHpp) finalHpp = Number(match.item.base_cost);
    if (margin === 20 && !text.includes('margin')) {
      finalMargin = Number(match.item.default_margin_pct);
    }
    if (match.score >= 0.85 && !name) name = match.item.name;
  }

  const confidence = computeConfidence(name, finalHpp, qty, !!match);

  return {
    name,
    qty,
    unit: match?.item.unit || unit,
    hpp_per_unit: finalHpp,
    margin_pct: finalMargin,
    selling_price_per_unit: selling > 0 ? selling : undefined,
    confidence,
    pricelist_item_id: pricelistId,
    matched_pricelist: matchedName,
  };
}

/** Parse multiple lines (one item per line). */
export function parseEstimationText(
  text: string,
  pricelist: PricelistItem[] = [],
  defaultMargin = 20,
): ParsedEstimationItem[] {
  return text
    .split(/\n/)
    .map(line => parseEstimationLine(line, pricelist, defaultMargin))
    .filter((item): item is ParsedEstimationItem => item !== null);
}
