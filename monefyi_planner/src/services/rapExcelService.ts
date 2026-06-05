import * as XLSX from 'xlsx';
import type { Project } from '../store/appStore';
import type { RapItem } from './rapService';
import type { CostRealization } from './costService';
import { formatRupiah } from '../utils/projectUi';

const RAP_TYPES: Record<string, string> = {
  material: 'Material',
  labor: 'Tenaga',
  equipment: 'Alat',
  overhead: 'Overhead',
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ParsedRapRow {
  rowIndex: number;
  type: string;
  name: string;
  description?: string;
  unit: string;
  quantity: number;
  unit_price: number;
  actual_qty?: number;
  actual_amount?: number;
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export interface ImportCostDraft {
  quantity: number;
  unit_price: number;
  total_amount: number;
}

function normalizeHeaderCell(raw: unknown): string {
  return String(raw || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseMoneyCell(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const text = String(raw ?? '').trim();
  if (!text) return 0;
  const lower = text.toLowerCase();
  if (lower.includes('jt') || lower.includes('juta')) {
    const n = Number(lower.replace(/[^\d.,-]/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n * 1_000_000 : 0;
  }
  if (lower.includes('rb') || lower.includes('ribu')) {
    const n = Number(lower.replace(/[^\d.,-]/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n * 1_000 : 0;
  }
  const normalized = text.replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function resolveRapColumns(header: (string | number)[]) {
  const cols: Record<string, number> = {};
  header.forEach((cell, idx) => {
    const h = normalizeHeaderCell(cell);
    if (h === 'no' || h.startsWith('no ')) cols.no = idx;
    else if (h.includes('kategori')) cols.type = idx;
    else if (h === 'item' || h.startsWith('item ')) cols.name = idx;
    else if (h.includes('spesifikasi')) cols.description = idx;
    else if (h.includes('satuan')) cols.unit = idx;
    else if (h.includes('vol rap') || h === 'vol') cols.quantity = idx;
    else if (h.includes('harga satuan') || h === 'harga') cols.unit_price = idx;
    else if (h.includes('total rap')) cols.total_rap = idx;
    else if (h.includes('realisasi vol')) cols.actual_qty = idx;
    else if (h.includes('realisasi biaya')) cols.actual_amount = idx;
  });
  return {
    type: cols.type ?? 1,
    name: cols.name ?? 2,
    description: cols.description ?? 3,
    unit: cols.unit ?? 4,
    quantity: cols.quantity ?? 5,
    unit_price: cols.unit_price ?? 6,
    total_rap: cols.total_rap ?? 7,
    actual_qty: cols.actual_qty ?? 8,
    actual_amount: cols.actual_amount ?? 9,
  };
}

/** Realisasi = Realisasi Vol × Harga Satuan; kolom Realisasi Biaya hanya dipakai jika selaras. */
export function resolveImportCost(row: ParsedRapRow): ImportCostDraft | null {
  const plannedLine = row.quantity * row.unit_price;
  const actualQty = row.actual_qty != null && row.actual_qty > 0 ? row.actual_qty : 0;
  const rawAmount = row.actual_amount != null && row.actual_amount > 0 ? row.actual_amount : 0;

  if (actualQty <= 0 && rawAmount <= 0) return null;

  if (actualQty > 0) {
    const computed = actualQty * row.unit_price;
    if (rawAmount <= 0 || rawAmount > computed * 1.05) {
      return { quantity: actualQty, unit_price: row.unit_price, total_amount: computed };
    }
    return { quantity: actualQty, unit_price: row.unit_price, total_amount: rawAmount };
  }

  if (plannedLine > 0 && rawAmount > plannedLine * 1.05) {
    return { quantity: row.quantity, unit_price: row.unit_price, total_amount: plannedLine };
  }

  return {
    quantity: row.quantity,
    unit_price: row.unit_price,
    total_amount: rawAmount,
  };
}

export function previewImportTotals(rows: ParsedRapRow[]) {
  let planned = 0;
  let realisasi = 0;
  let costRows = 0;
  for (const row of rows) {
    if (!row.valid) continue;
    planned += row.quantity * row.unit_price;
    const cost = resolveImportCost(row);
    if (cost) {
      realisasi += cost.total_amount;
      costRows += 1;
    }
  }
  return { planned, realisasi, costRows };
}

export function exportRapWorkbook(
  project: Project,
  rapItems: RapItem[],
  costs: CostRealization[],
  actualByRapId: Record<string, { qty: number; amount: number }>,
) {
  const wb = XLSX.utils.book_new();

  const rapHeader = [
    'No', 'Kategori', 'Item', 'Spesifikasi', 'Satuan', 'Vol RAP', 'Harga Satuan', 'Total RAP',
    'Realisasi Vol', 'Realisasi Biaya', 'Selisih Biaya',
  ];
  const rapRows = rapItems.map((item, i) => {
    const total = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    const actual = actualByRapId[item.id];
    const actualAmt = actual?.amount || 0;
    return [
      i + 1,
      RAP_TYPES[item.type] || item.type,
      item.name,
      item.description || '',
      item.unit,
      item.quantity,
      item.unit_price,
      total,
      actual?.qty || 0,
      actualAmt,
      total - actualAmt,
    ];
  });
  const ws1 = XLSX.utils.aoa_to_sheet([
    ['RAP & Realisasi — ' + project.name],
    ['Kode:', project.code, 'Klien:', project.client_name || ''],
    [],
    rapHeader,
    ...rapRows,
  ]);
  XLSX.utils.book_append_sheet(wb, ws1, 'RAP Realisasi');

  const costHeader = ['Tanggal', 'Deskripsi', 'Qty', 'Harga', 'Total', 'Supplier'];
  const costRows = costs.map(c => [
    c.date,
    c.description,
    c.quantity ?? '',
    c.unit_price ?? '',
    c.total_amount,
    c.supplier || '',
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([costHeader, ...costRows]);
  XLSX.utils.book_append_sheet(wb, ws2, 'Transaksi');

  const planned = rapItems.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
  const actual = costs.reduce((s, c) => s + (Number(c.total_amount) || 0), 0);
  const ws3 = XLSX.utils.aoa_to_sheet([
    ['Ringkasan Proyek'],
    ['Nama', project.name],
    ['Progress', `${project.progress_percentage.toFixed(1)}%`],
    ['Budget RAP', planned],
    ['Realisasi', actual],
    ['Selisih', planned - actual],
    ['Budget terpakai (store)', project.spent_amount],
  ]);
  XLSX.utils.book_append_sheet(wb, ws3, 'Ringkasan');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `RAP_${project.code}.xlsx`);
}

export function downloadRapTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Template RAP Monefyi — jangan hapus baris instruksi'],
    ['Isi data mulai baris 5. Kategori: Material, Tenaga, Alat, Overhead'],
    ['Vol dan harga harus angka positif'],
    ['No', 'Kategori', 'Item', 'Spesifikasi', 'Satuan', 'Vol RAP', 'Harga Satuan', 'Total RAP', 'Realisasi Vol', 'Realisasi Biaya'],
    [1, 'Material', 'Semen 40kg', 'Portland', 'zak', 100, 65000, 6500000, 0, 0],
    [2, 'Tenaga', 'Pekerja harian', 'Buruh', 'OH', 30, 150000, 4500000, 0, 0],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'RAP');
  const guide = XLSX.utils.aoa_to_sheet([
    ['Satuan umum', 'Keterangan'],
    ['m3', 'Meter kubik'],
    ['m2', 'Meter persegi'],
    ['kg', 'Kilogram'],
    ['zak', 'Zak/bag'],
    ['OH', 'Orang-hari'],
    ['unit', 'Unit/pcs'],
  ]);
  XLSX.utils.book_append_sheet(wb, guide, 'Panduan Satuan');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'Template_RAP_Monefyi.xlsx');
}

const TYPE_MAP: Record<string, string> = {
  material: 'material',
  tenaga: 'labor',
  labor: 'labor',
  alat: 'equipment',
  equipment: 'equipment',
  overhead: 'overhead',
};

function normalizeType(raw: string): string {
  const key = String(raw || '').trim().toLowerCase();
  return TYPE_MAP[key] || 'material';
}

export function parseRapWorkbook(file: ArrayBuffer): ParsedRapRow[] {
  const wb = XLSX.read(file, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, defval: '' }) as (string | number)[][];

  let headerIdx = rows.findIndex(r =>
    String(r[0]).toLowerCase().includes('no') && String(r[1]).toLowerCase().includes('kategori'),
  );
  if (headerIdx < 0) headerIdx = 3;

  const col = resolveRapColumns(rows[headerIdx] || []);
  const parsed: ParsedRapRow[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const name = String(row[col.name] || '').trim();
    if (!name) continue;

    const qty = parseMoneyCell(row[col.quantity]);
    const unitPrice = parseMoneyCell(row[col.unit_price]);
    const totalRap = parseMoneyCell(row[col.total_rap]);
    const actualQtyRaw = parseMoneyCell(row[col.actual_qty]);
    const actualAmountRaw = parseMoneyCell(row[col.actual_amount]);
    const warnings: string[] = [];
    const errors: string[] = [];

    if (qty <= 0) warnings.push('Volume RAP 0');
    if (unitPrice <= 0) warnings.push('Harga satuan 0');

    let actual_qty = actualQtyRaw > 0 ? actualQtyRaw : undefined;
    let actual_amount = actualAmountRaw > 0 ? actualAmountRaw : undefined;

    const plannedLine = qty * unitPrice;
    if (actual_amount && plannedLine > 0 && actual_amount > plannedLine * 1.05 && actual_qty) {
      const computed = actual_qty * unitPrice;
      if (computed <= plannedLine * 1.05) {
        warnings.push('Realisasi Biaya diabaikan — pakai Vol × Harga Satuan');
        actual_amount = computed;
      }
    }
    if (!actual_amount && totalRap > 0 && plannedLine > 0 && Math.abs(totalRap - plannedLine) / plannedLine < 0.05) {
      actual_amount = undefined;
    }

    parsed.push({
      rowIndex: i + 1,
      type: normalizeType(String(row[col.type] || '')),
      name,
      description: String(row[col.description] || '').trim() || undefined,
      unit: String(row[col.unit] || 'unit').trim() || 'unit',
      quantity: qty,
      unit_price: unitPrice,
      actual_qty,
      actual_amount,
      valid: errors.length === 0 && !!name,
      warnings,
      errors,
    });
  }
  return parsed;
}

export function formatSelisih(planned: number, actual: number) {
  const diff = planned - actual;
  const pct = planned ? ((diff / planned) * 100).toFixed(1) : '0';
  return { diff, pct, label: formatRupiah(Math.abs(diff)) };
}
