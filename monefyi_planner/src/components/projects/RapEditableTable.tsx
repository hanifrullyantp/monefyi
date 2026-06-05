import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GridApi } from 'ag-grid-community';
import { Columns3, Download, Plus, RefreshCw, Rows3 } from 'lucide-react';
import EditableTable from '../table/EditableTable';
import { buildRapColumnDefs } from './rapColumnDefs';
import { buildRapTableRows, type RapTableRow } from '../../utils/rapTableRows';
import type { RapItem } from '../../services/rapService';
import { createRapItem } from '../../services/rapService';
import { saveRapCellChange, type RapCellField } from '../../services/rapTableService';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useUiStore } from '../../store/uiStore';

interface RapEditableTableProps {
  projectId: string;
  items: RapItem[];
  rapActuals: Record<string, { qty: number; amount: number }>;
  mode: 'planning' | 'realisasi';
  canManage: boolean;
  recordedBy: string;
  onRefresh: () => Promise<void>;
  onExport?: () => void;
}

interface PendingSave {
  row: RapTableRow;
  field: RapCellField;
  value: string | number | boolean;
  currentActualQty: number;
}

const EDITABLE_FIELDS = new Set<string>([
  'name', 'type', 'description', 'unit', 'qty_rencana', 'harga_satuan',
  'supplier', 'notes', 'is_critical', 'qty_realisasi',
]);

export default function RapEditableTable({
  projectId,
  items,
  rapActuals,
  mode,
  canManage,
  recordedBy,
  onRefresh,
  onExport,
}: RapEditableTableProps) {
  const showToast = useUiStore(s => s.showToast);
  const gridApiRef = useRef<GridApi<RapTableRow> | null>(null);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [groupByType, setGroupByType] = useState(false);

  const rowData = useMemo(() => buildRapTableRows(items, rapActuals), [items, rapActuals]);
  const columnDefs = useMemo(() => {
    const cols = buildRapColumnDefs(mode, canManage);
    if (!groupByType) return cols;
    return cols.map(c =>
      c.field === 'type' ? { ...c, rowGroup: true, hide: true } : c,
    );
  }, [mode, canManage, groupByType]);

  useEffect(() => {
    const api = gridApiRef.current;
    if (!api) return;
    if (groupByType) api.setRowGroupColumns(['type']);
    else api.setRowGroupColumns([]);
  }, [groupByType]);

  const { status, schedule } = useAutoSave<PendingSave>({
    debounceMs: 800,
    onSave: async ({ row, field, value, currentActualQty }) => {
      await saveRapCellChange(row, field, value, {
        mode,
        projectId,
        recordedBy,
        currentActualQty,
      });
      await onRefresh();
    },
    onError: e => showToast(e.message, 'error'),
  });

  const handleCellChanged = useCallback(
    (row: RapTableRow, field: string, value: unknown, oldValue: unknown) => {
      if (!canManage || value === oldValue) return;
      if (!EDITABLE_FIELDS.has(field)) return;
      if (mode === 'planning' && field === 'qty_realisasi') return;

      schedule({
        row,
        field: field as RapCellField,
        value: value as string | number | boolean,
        currentActualQty: row.qty_realisasi,
      });
    },
    [canManage, mode, schedule],
  );

  const handleAddRow = async () => {
    try {
      await createRapItem({
        project_id: projectId,
        type: 'material',
        name: 'Item baru',
        unit: 'unit',
        quantity: 1,
        unit_price: 0,
        sort_order: items.length,
      });
      await onRefresh();
      showToast('Baris RAP ditambahkan', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menambah baris', 'error');
    }
  };

  const toggleColumn = (field: string, visible: boolean) => {
    gridApiRef.current?.setColumnsVisible([field], visible);
  };

  const exportCsv = () => {
    gridApiRef.current?.exportDataAsCsv({ fileName: `RAP_${projectId.slice(0, 8)}.csv` });
  };

  const hiddenToggleFields = ['description', 'supplier', 'notes', 'is_critical', 'harga_realisasi', 'tanggal_update'];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm sticky top-0 z-10">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColumnMenu(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 border rounded-lg hover:bg-slate-50"
          >
            <Columns3 className="w-3.5 h-3.5" /> Kolom
          </button>
          {showColumnMenu && (
            <div className="absolute left-0 top-full mt-1 z-20 w-52 p-2 bg-white border rounded-xl shadow-xl text-xs space-y-1">
              {hiddenToggleFields.map(f => (
                <label key={f} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    onChange={e => toggleColumn(f, e.target.checked)}
                  />
                  {f.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setGroupByType(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border rounded-lg ${
            groupByType ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Rows3 className="w-3.5 h-3.5" /> Group Kategori
        </button>

        <button
          type="button"
          onClick={() => void onRefresh()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 border rounded-lg hover:bg-slate-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={exportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50"
        >
          <Download className="w-3.5 h-3.5" /> CSV
        </button>

        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50"
          >
            <Download className="w-3.5 h-3.5" /> Excel
          </button>
        )}

        {canManage && (
          <button
            type="button"
            onClick={() => void handleAddRow()}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Row
          </button>
        )}
      </div>

      <EditableTable<RapTableRow>
        rowData={rowData}
        columnDefs={columnDefs}
        saveStatus={status}
        canEdit={canManage}
        groupField={groupByType ? 'type' : undefined}
        onCellChanged={handleCellChanged}
        onGridReady={api => {
          gridApiRef.current = api;
          if (groupByType) {
            api.setRowGroupColumns(['type']);
          }
        }}
        height="min(70vh, 560px)"
      />

      <p className="text-[10px] text-slate-400 px-1">
        Klik 2× sel untuk edit · Enter simpan · Ctrl+C/V copy-paste · Ctrl+Z undo · Geser kolom untuk ubah lebar
      </p>
    </div>
  );
}
