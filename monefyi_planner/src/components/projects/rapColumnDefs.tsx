import type { ColDef, ICellRendererParams, ValueSetterParams } from 'ag-grid-community';
import type { RapTableRow } from '../../utils/rapTableRows';
import { rapTypeLabel, recomputeRapRow } from '../../utils/rapTableRows';
import { formatRupiah, formatDateId } from '../../utils/projectUi';
import { validateRapCell } from '../../utils/rapCellValidation';
import type { RapCellField } from '../../services/rapTableService';

const TYPE_OPTIONS = ['material', 'labor', 'equipment', 'overhead', 'other'];

const STATUS_STYLES: Record<RapTableRow['status'], string> = {
  none: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
  under: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  over: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  done: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
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

function makeSetter(field: keyof RapTableRow, mode: 'planning' | 'realisasi') {
  return (p: ValueSetterParams<RapTableRow>) => {
    const v = validateRapCell(field as RapCellField, p.newValue, mode);
    if (!v.valid) return false;
    (p.data as RapTableRow)[field] = p.newValue as never;
    const next = recomputeRapRow(p.data);
    Object.assign(p.data, next);
    return true;
  };
}

export const RAP_COLUMN_FIELDS: { field: keyof RapTableRow; label: string }[] = [
  { field: 'name', label: 'Nama Item' },
  { field: 'type', label: 'Kategori' },
  { field: 'description', label: 'Spesifikasi' },
  { field: 'unit', label: 'Satuan' },
  { field: 'qty_rencana', label: 'Vol RAP' },
  { field: 'harga_satuan', label: 'Harga Satuan' },
  { field: 'total_rencana', label: 'Total RAP' },
  { field: 'qty_realisasi', label: 'Realisasi Vol' },
  { field: 'harga_realisasi', label: 'Harga Realisasi' },
  { field: 'total_realisasi', label: 'Total Realisasi' },
  { field: 'selisih', label: 'Selisih' },
  { field: 'progress_pct', label: '% Progress' },
  { field: 'supplier', label: 'Supplier' },
  { field: 'notes', label: 'Catatan' },
  { field: 'is_critical', label: 'Kritis' },
  { field: 'tanggal_update', label: 'Diupdate' },
  { field: 'tanggal_realisasi', label: 'Tgl Realisasi' },
  { field: 'updated_by', label: 'Updated By' },
  { field: 'status', label: 'Status' },
];

export function buildRapColumnDefs(
  mode: 'planning' | 'realisasi',
  canEdit: boolean,
  cellErrors: Record<string, string>,
): ColDef<RapTableRow>[] {
  const planEditable = canEdit;
  const realisasiQtyEditable = canEdit && mode === 'realisasi';
  const realisasiDateEditable = canEdit && mode === 'realisasi';

  const errClass = (field: string) => ({
    'ring-2 ring-rose-500 ring-inset bg-rose-50/50': (p: { data?: RapTableRow }) =>
      Boolean(p.data && cellErrors[`${p.data.id}:${field}`]),
  });

  return [
    {
      field: 'name',
      headerName: 'Nama Item',
      pinned: 'left',
      minWidth: 180,
      editable: planEditable,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      cellClassRules: errClass('name'),
      valueSetter: makeSetter('name', mode),
    },
    {
      field: 'type',
      headerName: 'Kategori',
      editable: planEditable,
      minWidth: 110,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: TYPE_OPTIONS },
      valueFormatter: p => rapTypeLabel(String(p.value || '')),
      cellClassRules: errClass('type'),
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
      cellClassRules: errClass('qty_rencana'),
      valueSetter: makeSetter('qty_rencana', mode),
    },
    {
      field: 'harga_satuan',
      headerName: 'Harga Satuan',
      editable: planEditable,
      type: 'numericColumn',
      valueFormatter: rupiahFormatter,
      minWidth: 120,
      cellClassRules: errClass('harga_satuan'),
      valueSetter: makeSetter('harga_satuan', mode),
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
      cellClassRules: errClass('qty_realisasi'),
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
        'text-emerald-700 font-semibold dark:text-emerald-400': p => Number(p.value) >= 0,
        'text-rose-700 font-semibold dark:text-rose-400': p => Number(p.value) < 0,
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
      field: 'tanggal_realisasi',
      headerName: 'Tgl Realisasi',
      editable: realisasiDateEditable,
      cellEditor: 'agDateCellEditor',
      cellEditorParams: { max: new Date().toISOString().slice(0, 10) },
      valueFormatter: dateOrDash,
      valueParser: p => (p.newValue instanceof Date ? p.newValue.toISOString().slice(0, 10) : String(p.newValue || '')),
      minWidth: 120,
      cellClassRules: errClass('tanggal_realisasi'),
    },
    {
      field: 'updated_by',
      headerName: 'Updated By',
      editable: false,
      minWidth: 100,
      valueFormatter: p => {
        const v = String(p.value || '');
        if (!v) return '—';
        return v.length > 8 ? `${v.slice(0, 8)}…` : v;
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      editable: false,
      width: 100,
      cellRenderer: (p: ICellRendererParams<RapTableRow>) => (
        <StatusBadge value={(p.value as RapTableRow['status']) || 'none'} />
      ),
    },
  ];
}
