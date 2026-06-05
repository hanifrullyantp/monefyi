import type { RapCellField } from '../services/rapTableService';
import { todayStr } from '../lib/adapters';

export interface CellValidationResult {
  valid: boolean;
  message?: string;
}

export function validateRapCell(
  field: RapCellField,
  value: unknown,
  mode: 'planning' | 'realisasi',
): CellValidationResult {
  if (field === 'name') {
    const s = String(value || '').trim();
    if (!s) return { valid: false, message: 'Nama wajib diisi' };
    return { valid: true };
  }

  if (field === 'type') {
    const allowed = ['material', 'labor', 'equipment', 'overhead', 'other'];
    if (!allowed.includes(String(value))) return { valid: false, message: 'Kategori tidak valid' };
    return { valid: true };
  }

  if (field === 'qty_rencana') {
    const n = Number(value);
    if (!Number.isFinite(n)) return { valid: false, message: 'Harus angka' };
    if (n < 0) return { valid: false, message: 'Qty tidak boleh negatif' };
    return { valid: true };
  }

  if (field === 'harga_satuan') {
    const n = Number(value);
    if (!Number.isFinite(n)) return { valid: false, message: 'Harus angka' };
    if (n < 0) return { valid: false, message: 'Harga tidak boleh negatif' };
    return { valid: true };
  }

  if (field === 'qty_realisasi') {
    if (mode !== 'realisasi') return { valid: false, message: 'Hanya di tab realisasi' };
    const n = Number(value);
    if (!Number.isFinite(n)) return { valid: false, message: 'Harus angka' };
    return { valid: true };
  }

  if (field === 'tanggal_realisasi') {
    const d = String(value || '');
    if (!d) return { valid: true };
    if (d > todayStr()) return { valid: false, message: 'Tanggal tidak boleh di masa depan' };
    return { valid: true };
  }

  return { valid: true };
}

export function cellErrorKey(rowId: string, field: string) {
  return `${rowId}:${field}`;
}
