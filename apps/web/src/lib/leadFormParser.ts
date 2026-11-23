export type LeadTarget = 'estimation' | 'project';

export interface ParsedLeadForm {
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  need?: string;
  size_text?: string;
  budget?: string;
  notes?: string;
  interest?: string;
  products?: string[];
  qty?: number;
  unit?: string;
  target: LeadTarget;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractLabeledField(text: string, keys: string[]): string | undefined {
  for (const key of keys) {
    const re = new RegExp(`^\\s*${escapeRe(key)}\\s*:\\s*(.+)$`, 'im');
    const m = text.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return undefined;
}

export function looksLikeLeadForm(input: string): boolean {
  const hasName = /\bnama\s*:/i.test(input);
  const hasPhone = /\b(whatsapp|wa|hp|telepon|no\.?\s*hp)\s*:/i.test(input);
  return hasName && hasPhone;
}

export function resolveLeadTarget(input: string, hint?: LeadTarget): LeadTarget {
  const lower = input.toLowerCase();
  if (/\b(buat|buatkan|create)\s+(proyek|project)\b/.test(lower) || /\bproyek\s+baru\b/.test(lower)) {
    return 'project';
  }
  if (/\b(buat|buatkan|create)\s+estimasi\b/.test(lower) || /\bestimasi\s+baru\b/.test(lower)) {
    return 'estimation';
  }
  return hint || 'estimation';
}

export function parseSizeEstimate(text?: string): { qty?: number; unit?: string } {
  if (!text?.trim()) return {};
  const normalized = text.trim();
  const m = normalized.match(/(\d+(?:[.,]\d+)?)\s*(meter|mtr|m²|m2|m\b|cm|mm|buah|unit|ls)/i);
  if (m) {
    let unit = m[2].toLowerCase();
    if (unit === 'meter' || unit === 'mtr') unit = 'm';
    if (unit === 'm2') unit = 'm²';
    return { qty: parseFloat(m[1].replace(',', '.')), unit };
  }
  const num = normalized.match(/(\d+(?:[.,]\d+)?)/);
  if (num) return { qty: parseFloat(num[1].replace(',', '.')), unit: 'm' };
  return {};
}

function extractInterest(text: string): string | undefined {
  const hello = text.match(/^Halo,?\s*(.+)$/im);
  if (hello?.[1]?.trim()) return hello[1].trim();
  const konsultasi = text.match(/tertarik\s+(?:konsultasi\s+)?([^.\n]+)/i);
  if (konsultasi?.[1]?.trim()) return konsultasi[1].trim();
  return undefined;
}

function extractProducts(text: string, interest?: string): string[] {
  const source = interest || text;
  const slash = source.match(/([A-Za-z0-9][\w\s]*(?:\s*\/\s*[\w\s]+)+)/);
  if (slash) {
    return slash[1].split('/').map(p => p.trim()).filter(Boolean);
  }
  const konsultasi = text.match(/konsultasi\s+([^.\n]+)/i);
  if (konsultasi?.[1]) {
    return konsultasi[1]
      .split('/')
      .map(p => p.trim())
      .filter(Boolean);
  }
  return [];
}

export function parseLeadForm(input: string, hint?: LeadTarget): ParsedLeadForm | null {
  if (!looksLikeLeadForm(input)) return null;

  const customer_name = extractLabeledField(input, ['Nama', 'Name']) || '';
  const customer_phone = extractLabeledField(input, ['WhatsApp', 'WA', 'Hp', 'HP', 'Telepon', 'No HP', 'No. HP']) || '';
  if (!customer_name || !customer_phone) return null;

  const customer_address = extractLabeledField(input, ['Kota', 'Alamat', 'Domisili', 'Lokasi']);
  const need = extractLabeledField(input, ['Kebutuhan', 'Need', 'Produk', 'Layanan']);
  const size_text = extractLabeledField(input, ['Ukuran / estimasi', 'Ukuran', 'Estimasi', 'Ukuran/estimasi']);
  const budget = extractLabeledField(input, ['Budget', 'Anggaran']);
  const notes = extractLabeledField(input, ['Catatan', 'Notes', 'Keterangan']);
  const interest = extractInterest(input);
  const products = extractProducts(input, interest);
  const size = parseSizeEstimate(size_text);

  return {
    customer_name,
    customer_phone,
    customer_address,
    need,
    size_text,
    budget,
    notes,
    interest,
    products: products.length ? products : undefined,
    qty: size.qty,
    unit: size.unit,
    target: resolveLeadTarget(input, hint),
  };
}

export function buildLeadNotes(params: Record<string, unknown>): string {
  const parts: string[] = [];
  if (params.interest) parts.push(String(params.interest));
  if (params.budget) parts.push(`Budget: ${params.budget}`);
  if (params.size_text) parts.push(`Ukuran: ${params.size_text}`);
  if (params.notes) parts.push(String(params.notes));
  return parts.join('\n');
}
