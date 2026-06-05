import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import type { RapTableRow } from '../../utils/rapTableRows';
import { rapTypeLabel } from '../../utils/rapTableRows';
import { formatRupiah } from '../../utils/projectUi';
import { formatDateId } from '../../utils/projectUi';

const TYPE_OPTIONS = ['material', 'labor', 'equipment', 'overhead', 'other'];

const STATUS_STYLES: Record<RapTableRow['status'], string> = {
  none: 'bg-slate-100 text-slate-600',
  under: 'bg-amber-100 text-amber-800',
  over: 'bg-rose-100 text-rose-800',
  done: 'bg-emerald-100 text-emerald-800',
};

const STATUS_LABELS: Record<RapTableRow['status'], string> = {
  none: 'Belum',
  under: 'Kurang',
  over: 'Lebih',
  done: 'Selesai',
};

function StatusBadge({ value }: { value: RapTableRow['status'] }) {
  const v = value || 'none';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[v]}`}>
      {STATUS_LABELS[v]}
    </span>
  );
}

function rupiahFormatter(p: { value: number | null | undefined }) {
  const n = Number(p.value);
  if (!Number.isFinite(n) || n === 0) return '—';
  return formatRupiah(n);
}

function numberOrDash(p: { value: number | null | undefined }) {
  const n = Number(p.value);
  if (!Number.isFinite(n) || n === 0) return '—';
  return n.toLocaleString('id-ID');
}

function dateOrDash(p: { value: string | null | undefined }) {
  if (!p.value) return '—';
  try {
    return formatDateId(p.value);
  } catch {
    return p.value;
  }
}

export function buildRapColumnDefs(mode: 'planning' | 'realisasi', canEdit: boolean): ColDef<RapTableRow>[] {
  const planEditable = canEdit;
  const realisasiQtyEditable = canEdit && mode === 'realisasi';

  return [
    {
      field: 'name',
      headerName: 'Nama Item',
      pinned: 'left',
      minWidth: 180,
      editable: planEditable,
      checkboxSelection: true,
      headerCheckboxSelection: true,
    },
    {
      field: 'type',
      headerName: 'Kategori',
      editable: planEditable,
      minWidth: 110,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: TYPE_OPTIONS },
      valueFormatter: p => rapTypeLabel(String(p.value || '')),
    },
    {
      field: 'description',
      headerName: 'Spesifikasi',
      editable: planEditable,
      minWidth: 140,
    },
    {
      field: 'unit',
      headerName: 'Satuan',
      editable: planEditable,
      width: 90,
    },
    {
      field: 'qty_rencana',
      headerName: 'Vol RAP',
      editable: planEditable,
      type: 'numericColumn',
      valueFormatter: numberOrDash,
      width: 100,
    },
    {
      field: 'harga_satuan',
      headerName: 'Harga Satuan',
      editable: planEditable,
      type: 'numericColumn',
      valueFormatter: rupiahFormatter,
      minWidth: 120,
    },
    {
      field: 'total_rencana',
      headerName: 'Total RAP',
      editable: false,
      type: 'numericColumn',
      valueFormatter: rupiahFormatter,
      minWidth: 120,
    },
    {
      field: 'qty_realisasi',
      headerName: 'Realisasi Vol',
      editable: realisasiQtyEditable,
      type: 'numericColumn',
      valueFormatter: numberOrDash,
      width: 110,
    },
    {
      field: 'harga_realisasi',
      headerName: 'Harga Realisasi',
      editable: false,
      type: 'numericColumn',
      valueFormatter: rupiahFormatter,
      minWidth: 130,
    },
    {
      field: 'total_realisasi',
      headerName: 'Total Realisasi',
      editable: false,
      type: 'numericColumn',
      valueFormatter: rupiahFormatter,
      minWidth: 130,
    },
    {
      field: 'selisih',
      headerName: 'Selisih',
      editable: false,
      type: 'numericColumn',
      valueFormatter: rupiahFormatter,
      cellClassRules: {
        'text-emerald-700 font-semibold': p => Number(p.value) >= 0,
        'text-rose-700 font-semibold': p => Number(p.value) < 0,
      },
      minWidth: 120,
    },
    {
      field: 'progress_pct',
      headerName: '% Progress',
      editable: false,
      valueFormatter: p => {
        const n = Number(p.value);
        return Number.isFinite(n) ? `${n.toFixed(0)}%` : '—';
      },
      width: 100,
    },
    {
      field: 'supplier',
      headerName: 'Supplier',
      editable: planEditable,
      minWidth: 120,
    },
    {
      field: 'notes',
      headerName: 'Catatan',
      editable: planEditable,
      minWidth: 120,
    },
    {
      field: 'is_critical',
      headerName: 'Kritis',
      editable: planEditable,
      width: 80,
      cellEditor: 'agCheckboxCellEditor',
      cellRenderer: (p: ICellRendererParams<RapTableRow>) => (p.value ? '✓' : '—'),
    },
    {
      field: 'tanggal_update',
      headerName: 'Diupdate',
      editable: false,
      valueFormatter: dateOrDash,
      minWidth: 110,
    },
    {
      field: 'status',
      headerName: 'Status',
      editable: false,
      width: 100,
      cellRenderer: (p: ICellRendererParams<RapTableRow>) => (
        <StatusBadge value={(p.value as RapTableRow['status']) || 'none'} />
      ),
      rowGroup: false,
    },
  ];
}
