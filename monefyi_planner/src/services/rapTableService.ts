import type { RapItem } from './rapService';
import { updateRapItem } from './rapService';
import { createCostRealization, updateCostRealization } from './costService';
import type { RapTableRow } from '../utils/rapTableRows';
import { todayStr } from '../lib/adapters';
import { validateRapCell } from '../utils/rapCellValidation';

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
  | 'qty_realisasi'
  | 'tanggal_realisasi';

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
    lastCostId?: string;
  },
): Promise<RapItem | void> {
  const validation = validateRapCell(field, value, options.mode);
  if (!validation.valid) throw new Error(validation.message || 'Nilai tidak valid');

  if (field === 'tanggal_realisasi') {
    if (options.mode !== 'realisasi' || !options.lastCostId) return;
    await updateCostRealization(options.lastCostId, options.projectId, {
      date: String(value),
    });
    return;
  }

  if (field === 'qty_realisasi') {
    if (options.mode !== 'realisasi') return;
    const targetQty = Number(value);
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

  const patch: Partial<RapItem> = {
    [rapKey]: value,
    updated_by: options.recordedBy,
  };
  return updateRapItem(row.id, patch);
}
