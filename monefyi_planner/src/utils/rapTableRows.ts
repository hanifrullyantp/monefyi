import type { RapItem } from '../services/rapService';
import type { RapActualAgg } from '../services/costService';

export type RapRowStatus = 'none' | 'under' | 'over' | 'done';

export interface RapTableRow {
  id: string;
  name: string;
  type: string;
  description: string;
  unit: string;
  qty_rencana: number;
  harga_satuan: number;
  total_rencana: number;
  qty_realisasi: number;
  harga_realisasi: number;
  total_realisasi: number;
  selisih: number;
  progress_pct: number;
  supplier: string;
  notes: string;
  is_critical: boolean;
  tanggal_update: string;
  tanggal_realisasi: string;
  updated_by: string;
  status: RapRowStatus;
  sort_order: number;
}

const TYPE_LABELS: Record<string, string> = {
  material: 'Material',
  labor: 'Tenaga',
  equipment: 'Alat',
  overhead: 'Overhead',
  other: 'Lainnya',
};

export function rapTypeLabel(type: string) {
  return TYPE_LABELS[type] || type;
}

export function buildRapTableRows(
  items: RapItem[],
  rapActuals: Record<string, RapActualAgg>,
): RapTableRow[] {
  return items.map(item => {
    const actual = rapActuals[item.id];
    const qtyRencana = Number(item.quantity) || 0;
    const hargaSatuan = Number(item.unit_price) || 0;
    const totalRencana = qtyRencana * hargaSatuan;
    const qtyRealisasi = actual?.qty ?? 0;
    const totalRealisasi = actual?.amount ?? 0;
    const hargaRealisasi = qtyRealisasi !== 0 ? totalRealisasi / qtyRealisasi : hargaSatuan;
    const selisih = totalRencana - totalRealisasi;
    const progressPct = qtyRencana > 0 ? (qtyRealisasi / qtyRencana) * 100 : 0;

    let status: RapRowStatus = 'none';
    if (qtyRealisasi !== 0) {
      if (qtyRencana > 0 && qtyRealisasi >= qtyRencana) status = 'done';
      else if (progressPct > 100) status = 'over';
      else status = 'under';
    }

    return {
      id: item.id,
      name: item.name,
      type: item.type,
      description: item.description || '',
      unit: item.unit,
      qty_rencana: qtyRencana,
      harga_satuan: hargaSatuan,
      total_rencana: totalRencana,
      qty_realisasi: qtyRealisasi,
      harga_realisasi: hargaRealisasi,
      total_realisasi: totalRealisasi,
      selisih,
      progress_pct: progressPct,
      supplier: item.supplier || '',
      notes: item.notes || '',
      is_critical: Boolean(item.is_critical),
      tanggal_update: item.updated_at || item.created_at || '',
      tanggal_realisasi: actual?.lastDate || '',
      updated_by: item.updated_by || actual?.lastRecordedBy || '',
      status,
      sort_order: item.sort_order ?? 0,
    };
  });
}

/** Recompute derived columns after optimistic edit */
export function recomputeRapRow(row: RapTableRow): RapTableRow {
  const totalRencana = row.qty_rencana * row.harga_satuan;
  const totalRealisasi = row.qty_realisasi * row.harga_realisasi;
  const progressPct = row.qty_rencana > 0 ? (row.qty_realisasi / row.qty_rencana) * 100 : 0;
  let status: RapRowStatus = 'none';
  if (row.qty_realisasi !== 0) {
    if (row.qty_rencana > 0 && row.qty_realisasi >= row.qty_rencana) status = 'done';
    else if (progressPct > 100) status = 'over';
    else status = 'under';
  }
  return {
    ...row,
    total_rencana: totalRencana,
    total_realisasi: totalRealisasi,
    selisih: totalRencana - totalRealisasi,
    progress_pct: progressPct,
    status,
  };
}
