export type CostCategory =
  | 'Material'
  | 'Tenaga Kerja'
  | 'Alat'
  | 'Operasional'
  | 'Marketing'
  | 'Lainnya';

/** Tokens that may be location/ops — ask user, never auto-assign as project. */
export const AMBIGUOUS_OPERATIONAL_TOKENS = new Set([
  'workshop',
  'workhsop',
  'wrkshp',
  'gudang',
  'kantor',
  'umum',
  'operasional',
]);

export interface ProjectKeywordHit {
  keyword: string;
  source: 'tag' | 'pattern' | 'name_match';
  isAmbiguous: boolean;
  confidence: number;
}

const PROJECT_PATTERNS: RegExp[] = [
  /kerjaan\s+(.+?)(?:\s*\(|$)/i,
  /krjaan\s+(.+?)(?:\s*\(|$)/i,
  /utk\s+(.+?)(?:\s*\(|$)/i,
  /untuk\s+(.+?)(?:\s*\(|$)/i,
  /(?:project|proyek|prj)\s+(.+?)(?:\s*\(|$)/i,
];

const CATEGORY_RULES: Array<{ re: RegExp; category: CostCategory }> = [
  { re: /\bgaji\b|gustam|deris|\btio\b|upah|honor/i, category: 'Tenaga Kerja' },
  { re: /\biklan\b|\bfb\b|facebook|saldo\s+iklan|marketing/i, category: 'Marketing' },
  { re: /\blistrik\b|biaya\s+kekurangan|operasional/i, category: 'Operasional' },
  { re: /\bsemen\b|\bsiku\b|bearing|logam|amplas|edging|kaca\s+film|ferum|ultraflex|gerinda|bor\b|skrup|kunci/i, category: 'Material' },
  { re: /\btabung\b|\bbtg\b|\bpce\b|\bpcs\b|\bsak\b|\blbr\b/i, category: 'Material' },
];

const QTY_UNIT_RE = /(\d+(?:[.,]\d+)?)\s*(pcs|pce|sak|btg|lbr|lembar|m2|m³|m3|kg|ton|unit|ls|tabung|roll|meter|mtr|m)\b/i;

export function parseCategory(text: string): CostCategory {
  for (const rule of CATEGORY_RULES) {
    if (rule.re.test(text)) return rule.category;
  }
  return 'Lainnya';
}

export function parseQuantityUnit(text: string): {
  quantity?: number;
  unit?: string;
  unitPrice?: number;
} {
  const m = text.match(QTY_UNIT_RE);
  if (!m) return {};
  const quantity = parseFloat(m[1].replace(',', '.'));
  return {
    quantity: Number.isFinite(quantity) ? quantity : undefined,
    unit: m[2].toLowerCase(),
  };
}

function normalizeKeyword(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}

function isAmbiguousToken(keyword: string): boolean {
  const k = normalizeKeyword(keyword);
  if (AMBIGUOUS_OPERATIONAL_TOKENS.has(k)) return true;
  for (const token of AMBIGUOUS_OPERATIONAL_TOKENS) {
    if (k.includes(token)) return true;
  }
  return false;
}

/** Extract ranked project keyword candidates from line text. */
export function extractProjectKeywords(text: string): ProjectKeywordHit[] {
  const lower = text.toLowerCase();
  const hits: ProjectKeywordHit[] = [];

  const tagMatch = text.match(/#([a-z0-9_-]+)/i);
  if (tagMatch) {
    const keyword = normalizeKeyword(tagMatch[1]);
    hits.push({
      keyword,
      source: 'tag',
      isAmbiguous: isAmbiguousToken(keyword),
      confidence: 0.9,
    });
  }

  for (const pattern of PROJECT_PATTERNS) {
    const m = text.match(pattern);
    if (m?.[1]) {
      const keyword = normalizeKeyword(m[1]);
      if (keyword.length >= 2) {
        hits.push({
          keyword,
          source: 'pattern',
          isAmbiguous: isAmbiguousToken(keyword),
          confidence: 0.75,
        });
      }
    }
  }

  // Standalone mentions like "aloevera" or "cc susanti" at end of phrase
  const tailMatch = lower.match(/(?:aloevera|cc\s+susanti|susanti|paris\s*\d*\s*cece?)/i);
  if (tailMatch) {
    const keyword = normalizeKeyword(tailMatch[0]);
    if (!hits.some(h => h.keyword === keyword)) {
      hits.push({
        keyword,
        source: 'name_match',
        isAmbiguous: isAmbiguousToken(keyword),
        confidence: 0.65,
      });
    }
  }

  return hits.sort((a, b) => b.confidence - a.confidence);
}

/** Pick best keyword for grouping (ambiguous ops tokens prioritized for user prompt). */
export function pickPrimaryProjectKeyword(text: string): ProjectKeywordHit | null {
  const hits = extractProjectKeywords(text);
  if (!hits.length) {
    const lower = text.toLowerCase();
    for (const token of AMBIGUOUS_OPERATIONAL_TOKENS) {
      if (lower.includes(token)) {
        return {
          keyword: token,
          source: 'name_match',
          isAmbiguous: true,
          confidence: 0.55,
        };
      }
    }
    return null;
  }
  const ambiguous = hits.find(h => h.isAmbiguous);
  if (ambiguous) return ambiguous;
  return hits[0];
}

export function stripKeywordFromText(text: string, keyword: string): string {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text
    .replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '')
    .replace(/\s+/g, ' ')
    .trim();
}
