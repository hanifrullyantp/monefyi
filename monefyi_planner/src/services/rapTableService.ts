import type { RapItem } from './rapService';
import { updateRapItem } from './rapService';
import { createCostRealization } from './costService';
import type { RapTableRow } from '../utils/rapTableRows';
import { todayStr } from '../lib/adapters';

export type RapCellField =
  | 'name'
  | 'type'
  | 'description'
  | 'unit'
  | 'qty_rencana'
  | 'harga_satuan'
  | 'supplier'
  | 'notes'
  | 'is_critical'
  | 'qty_realisasi';

const FIELD_TO_RAP: Partial<Record<RapCellField, keyof RapItem>> = {
  name: 'name',
  type: 'type',
  description: 'description',
  unit: 'unit',
  qty_rencana: 'quantity',
  harga_satuan: 'unit_price',
  supplier: 'supplier',
  notes: 'notes',
  is_critical: 'is_critical',
};

export async function saveRapCellChange(
  row: RapTableRow,
  field: RapCellField,
  value: string | number | boolean,
  options: {
    mode: 'planning' | 'realisasi';
    projectId: string;
    recordedBy: string;
    currentActualQty: number;
  },
): Promise<RapItem | void> {
  if (field === 'qty_realisasi') {
    if (options.mode !== 'realisasi') return;
    const targetQty = Number(value);
    if (!Number.isFinite(targetQty)) throw new Error('Qty realisasi tidak valid');
    const delta = targetQty - options.currentActualQty;
    if (delta === 0) return;
    await createCostRealization({
      project_id: options.projectId,
      rap_item_id: row.id,
      date: todayStr(),
      description: `Edit tabel: ${row.name}`,
      quantity: delta,
      unit_price: row.harga_satuan,
      total_amount: delta * row.harga_satuan,
      recorded_by: options.recordedBy,
    });
    return;
  }

  const rapKey = FIELD_TO_RAP[field];
  if (!rapKey) return;

  if (field === 'qty_rencana' || field === 'harga_satuan') {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new Error('Nilai harus angka');
    if (field === 'qty_rencana' && n < 0) throw new Error('Qty tidak boleh negatif');
    if (field === 'harga_satuan' && n < 0) throw new Error('Harga tidak boleh negatif');
  }

  const patch: Partial<RapItem> = { [rapKey]: value };
  return updateRapItem(row.id, patch);
}
