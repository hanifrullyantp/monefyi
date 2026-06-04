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

  const parsed: ParsedRapRow[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const name = String(row[2] || '').trim();
    if (!name) continue;

    const qty = Number(row[5]) || 0;
    const unitPrice = Number(row[6]) || 0;
    const warnings: string[] = [];
    const errors: string[] = [];

    if (qty <= 0) warnings.push('Volume RAP 0');
    if (unitPrice <= 0) warnings.push('Harga satuan 0');

    parsed.push({
      rowIndex: i + 1,
      type: normalizeType(String(row[1] || '')),
      name,
      description: String(row[3] || '').trim() || undefined,
      unit: String(row[4] || 'unit').trim() || 'unit',
      quantity: qty,
      unit_price: unitPrice,
      actual_qty: Number(row[8]) || undefined,
      actual_amount: Number(row[9]) || undefined,
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
