import { normalizeAmount } from './estimatorParser';

export interface ParsedCostLine {
  date: string;
  total: number;
  item: string;
  supplier?: string;
  confidence: number;
}

const WA_META_RE = /^\[[\d:,/\s]+\]/;
const DATE_HEADER_RE = /^(?:[A-Za-zÀ-ÿ'']+,?\s+)?(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*$/i;
const SECTION_SKIP_RE = /^(duit\s+(keluar|masuk)|uang\s+(keluar|masuk))\s*:?\s*$/i;
const COST_LINE_RE = /^[-–]\s*([\d][\d.,]*)\s+(.+)$/;

function parseDottedAmount(raw: string): number {
  const cleaned = raw.trim().replace(/\./g, '').replace(/,/g, '.');
  const n = parseFloat(cleaned.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function toIsoDate(day: number, month: number, yearRaw: number): string {
  let year = yearRaw;
  if (year < 100) year += 2000;
  const d = String(day).padStart(2, '0');
  const m = String(month).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function extractSupplier(text: string): { item: string; supplier?: string } {
  const m = text.match(/\(([^)]+)\)\s*$/);
  if (!m) return { item: text.trim() };
  return {
    item: text.slice(0, m.index).trim(),
    supplier: m[1].trim(),
  };
}

function parseKSegments(text: string): Array<{ amount: number; desc: string }> {
  const segments = text.split(/,\s*/);
  const results: Array<{ amount: number; desc: string }> = [];
  for (const seg of segments) {
    const m = seg.trim().match(/^(\d+(?:[.,]\d+)?)\s*K\s*(.*)$/i);
    if (m) {
      results.push({
        amount: normalizeAmount(`${m[1]}k`),
        desc: m[2].trim(),
      });
    }
  }
  return results;
}

function parseCostLineBody(body: string, date: string): ParsedCostLine[] {
  const colonIdx = body.indexOf(':');
  if (colonIdx > 0) {
    const afterColon = body.slice(colonIdx + 1).trim();
    const { item: afterText, supplier: sharedSupplier } = extractSupplier(afterColon);
    const kParts = parseKSegments(afterText || afterColon);
    if (kParts.length >= 2) {
      const prefix = body.slice(0, colonIdx).trim();
      return kParts.map(part => ({
        date,
        total: part.amount,
        item: part.desc ? `${prefix} — ${part.desc}` : prefix,
        supplier: sharedSupplier,
        confidence: 0.92,
      }));
    }
  }

  const { item, supplier } = extractSupplier(body);
  return [{
    date,
    total: 0,
    item,
    supplier,
    confidence: 0.85,
  }];
}

/** Parse WhatsApp-style multi-line expense lists (Duit keluar). */
export function parseCostText(text: string): ParsedCostLine[] {
  const lines = text.split(/\r?\n/);
  let currentDate = new Date().toISOString().slice(0, 10);
  const results: ParsedCostLine[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (WA_META_RE.test(line)) continue;

    const dateMatch = line.match(DATE_HEADER_RE);
    if (dateMatch) {
      currentDate = toIsoDate(
        Number(dateMatch[1]),
        Number(dateMatch[2]),
        Number(dateMatch[3]),
      );
      continue;
    }

    if (SECTION_SKIP_RE.test(line)) continue;

    const costMatch = line.match(COST_LINE_RE);
    if (!costMatch) continue;

    const amount = parseDottedAmount(costMatch[1]);
    const body = costMatch[2].trim();
    if (!amount || amount <= 0) continue;

    const parsed = parseCostLineBody(body, currentDate);
    if (parsed.length === 1 && parsed[0].total === 0) {
      parsed[0].total = amount;
    } else if (parsed.length > 1) {
      for (const p of parsed) {
        results.push(p);
      }
      continue;
    }

    results.push(parsed[0]);
  }

  return results;
}
