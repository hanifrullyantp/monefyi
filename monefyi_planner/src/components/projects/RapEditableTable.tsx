import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GridApi } from 'ag-grid-community';
import { ClipboardCopy, Columns3, Download, Moon, Plus, RefreshCw, Rows3, Sun, Trash2 } from 'lucide-react';
import EditableTable from '../table/EditableTable';
import { buildRapColumnDefs, RAP_COLUMN_FIELDS } from './rapColumnDefs';
import { buildRapTableRows, recomputeRapRow, type RapTableRow } from '../../utils/rapTableRows';
import type { RapItem } from '../../services/rapService';
import { createRapItem, removeRapItemWithCleanup } from '../../services/rapService';
import { warnRapDuplicate } from '../../services/rapTableService';
import { saveRapCellChange, type RapCellField } from '../../services/rapTableService';
import type { RapActualAgg } from '../../services/costService';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useRapRealtime } from '../../hooks/useRapRealtime';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useUiStore } from '../../store/uiStore';
import { validateRapCell, cellErrorKey } from '../../utils/rapCellValidation';
import FloatingSaveToolbar from '../sandbox-ui/FloatingSaveToolbar';
import { exportGridAsXlsx } from '../../utils/exportGridXlsx';

interface RapEditableTableProps {
  projectId: string;
  items: RapItem[];
  rapActuals: Record<string, RapActualAgg>;
  mode: 'planning' | 'realisasi';
  canManage: boolean;
  recordedBy: string;
  loading?: boolean;
  onRefresh: () => Promise<void>;
  onExport?: () => void;
  materialSuggestions?: string[];
  showFloatingToolbar?: boolean;
  /** When true, edits are queued until explicit Simpan (no debounced auto-save). */
  manualSave?: boolean;
  onPendingChangeCount?: (count: number) => void;
  onManualControls?: (controls: {
    changeCount: number;
    hasChanges: boolean;
    saving: boolean;
    undo: () => void;
    redo: () => void;
    save: () => Promise<void>;
    discard: () => void;
  } | null) => void;
}

interface PendingSave {
  row: RapTableRow;
  field: RapCellField;
  value: string | number | boolean;
  currentActualQty: number;
  lastCostId?: string;
  snapshot: RapTableRow[];
}

const EDITABLE_FIELDS = new Set<string>([
  'name', 'type', 'description', 'unit', 'qty_rencana', 'harga_satuan',
  'supplier', 'notes', 'is_critical', 'qty_realisasi', 'tanggal_realisasi',
]);

export default function RapEditableTable({
  projectId,
  items,
  rapActuals,
  mode,
  canManage,
  recordedBy,
  loading = false,
  onRefresh,
  onExport,
  materialSuggestions,
  showFloatingToolbar = false,
  manualSave = false,
  onPendingChangeCount,
  onManualControls,
}: RapEditableTableProps) {
  const showToast = useUiStore(s => s.showToast);
  const { dark, toggle: toggleTheme } = useColorScheme();
  const gridApiRef = useRef<GridApi<RapTableRow> | null>(null);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [groupByType, setGroupByType] = useState(false);
  const [addRowWarning, setAddRowWarning] = useState<string | null>(null);
  const [cellErrors, setCellErrors] = useState<Record<string, string>>({});
  const [hiddenCols, setHiddenCols] = useState<Record<string, boolean>>({});

  const serverRows = useMemo(() => buildRapTableRows(items, rapActuals), [items, rapActuals]);
  const [optimisticRows, setOptimisticRows] = useState<RapTableRow[]>(serverRows);
  const snapshotRef = useRef<RapTableRow[]>(serverRows);
  const pendingQueueRef = useRef<PendingSave[]>([]);
  const [manualChangeCount, setManualChangeCount] = useState(0);
  const [manualSaving, setManualSaving] = useState(false);

  useEffect(() => {
    setOptimisticRows(serverRows);
    snapshotRef.current = serverRows;
    if (manualSave) {
      pendingQueueRef.current = [];
      setManualChangeCount(0);
      onPendingChangeCount?.(0);
    }
  }, [serverRows, manualSave, onPendingChangeCount]);

  const stableRefresh = useCallback(() => { void onRefresh(); }, [onRefresh]);
  useRapRealtime(projectId, stableRefresh);

  const columnDefs = useMemo(() => {
    const cols = buildRapColumnDefs(mode, canManage, cellErrors, materialSuggestions);
    if (!groupByType) return cols;
    return cols.map(c =>
      c.field === 'type' ? { ...c, rowGroup: true, hide: true } : c,
    );
  }, [mode, canManage, cellErrors, groupByType, materialSuggestions]);

  useEffect(() => {
    const api = gridApiRef.current;
    if (!api) return;
    if (groupByType) api.setRowGroupColumns(['type']);
    else api.setRowGroupColumns([]);
  }, [groupByType]);

  const { status, changeCount, schedule, flush, discard } = useAutoSave<PendingSave>({
    debounceMs: 800,
    onSave: async (pending) => {
      await saveRapCellChange(pending.row, pending.field, pending.value, {
        mode,
        projectId,
        recordedBy,
        currentActualQty: pending.currentActualQty,
        lastCostId: pending.lastCostId,
      });
      await onRefresh();
      setCellErrors(prev => {
        const next = { ...prev };
        delete next[cellErrorKey(pending.row.id, pending.field)];
        return next;
      });
    },
    onError: e => {
      setOptimisticRows(snapshotRef.current);
      showToast(e.message, 'error');
    },
  });

  const applyOptimisticPatch = useCallback((rowId: string, field: string, value: unknown) => {
    setOptimisticRows(prev =>
      prev.map(r => {
        if (r.id !== rowId) return r;
        const patched = { ...r, [field]: value } as RapTableRow;
        return recomputeRapRow(patched);
      }),
    );
  }, []);

  const handleCellChanged = useCallback(
    (row: RapTableRow, field: string, value: unknown, oldValue: unknown) => {
      if (!canManage || value === oldValue) return;
      if (!EDITABLE_FIELDS.has(field)) return;
      if (mode === 'planning' && (field === 'qty_realisasi' || field === 'tanggal_realisasi')) return;

      const validation = validateRapCell(field as RapCellField, value, mode);
      if (!validation.valid) {
        setCellErrors(prev => ({
          ...prev,
          [cellErrorKey(row.id, field)]: validation.message || 'Invalid',
        }));
        showToast(validation.message || 'Nilai tidak valid', 'error');
        setOptimisticRows(snapshotRef.current);
        return;
      }

      snapshotRef.current = optimisticRows;
      applyOptimisticPatch(row.id, field, value);

      const actual = rapActuals[row.id];
      const pending: PendingSave = {
        row,
        field: field as RapCellField,
        value: value as string | number | boolean,
        currentActualQty: row.qty_realisasi,
        lastCostId: actual?.lastCostId,
        snapshot: snapshotRef.current,
      };

      if (manualSave) {
        pendingQueueRef.current.push(pending);
        const count = pendingQueueRef.current.length;
        setManualChangeCount(count);
        onPendingChangeCount?.(count);
        return;
      }

      schedule(pending);
    },
    [canManage, mode, schedule, showToast, applyOptimisticPatch, optimisticRows, rapActuals, manualSave, onPendingChangeCount],
  );

  const handleAddRow = async () => {
    const dup = warnRapDuplicate(items, { name: 'Item baru', type: 'material', unit: 'unit' });
    if (dup) {
      setAddRowWarning(`Baris baru mirip item existing: "${dup.name}"`);
      if (!window.confirm(`Item mirip "${dup.name}" sudah ada. Tetap tambah baris baru?`)) {
        return;
      }
    } else {
      setAddRowWarning(null);
    }
    try {
      await createRapItem({
        project_id: projectId,
        type: 'material',
        name: 'Item baru',
        unit: 'unit',
        quantity: 1,
        unit_price: 0,
        sort_order: items.length,
        updated_by: recordedBy,
      });
      await onRefresh();
      showToast('Baris RAP ditambahkan', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menambah baris', 'error');
    }
  };

  const handleBulkDelete = async () => {
    const selected = gridApiRef.current?.getSelectedRows() || [];
    if (!selected.length) {
      showToast('Pilih baris dulu (checkbox)', 'error');
      return;
    }
    if (!window.confirm(`Hapus ${selected.length} item RAP?`)) return;
    try {
      for (const row of selected) {
        await removeRapItemWithCleanup(projectId, row.id);
      }
      await onRefresh();
      showToast(`${selected.length} item dihapus`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menghapus', 'error');
    }
  };

  const toggleColumn = (field: string, visible: boolean) => {
    setHiddenCols(prev => ({ ...prev, [field]: !visible }));
    gridApiRef.current?.setColumnsVisible([field], visible);
  };

  const exportCsv = () => {
    gridApiRef.current?.exportDataAsCsv({ fileName: `RAP_${projectId.slice(0, 8)}.csv` });
  };

  const exportXlsx = () => {
    if (!gridApiRef.current) return;
    exportGridAsXlsx(gridApiRef.current, `RAP_${projectId.slice(0, 8)}.xlsx`);
  };

  const handleDiscardChanges = useCallback(() => {
    discard();
    pendingQueueRef.current = [];
    setManualChangeCount(0);
    onPendingChangeCount?.(0);
    setOptimisticRows(serverRows);
    snapshotRef.current = serverRows;
    setCellErrors({});
    gridApiRef.current?.setGridOption('rowData', serverRows);
    showToast('Perubahan dibatalkan', 'warning');
  }, [discard, serverRows, showToast, onPendingChangeCount]);

  const handleManualSave = useCallback(async () => {
    const queue = [...pendingQueueRef.current];
    if (!queue.length) return;
    setManualSaving(true);
    try {
      for (const pending of queue) {
        await saveRapCellChange(pending.row, pending.field, pending.value, {
          mode,
          projectId,
          recordedBy,
          currentActualQty: pending.currentActualQty,
          lastCostId: pending.lastCostId,
        });
      }
      pendingQueueRef.current = [];
      setManualChangeCount(0);
      onPendingChangeCount?.(0);
      await onRefresh();
      showToast('Perubahan disimpan', 'success');
    } catch (e) {
      setOptimisticRows(snapshotRef.current);
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setManualSaving(false);
    }
  }, [mode, projectId, recordedBy, onRefresh, showToast, onPendingChangeCount]);

  const handleGridUndo = useCallback(() => {
    gridApiRef.current?.undoCellEditing();
  }, []);

  const handleGridRedo = useCallback(() => {
    gridApiRef.current?.redoCellEditing();
  }, []);

  const effectiveChangeCount = manualSave ? manualChangeCount : changeCount;

  useEffect(() => {
    if (!manualSave || !onManualControls) {
      onManualControls?.(null);
      return;
    }
    onManualControls({
      changeCount: manualChangeCount,
      hasChanges: manualChangeCount > 0,
      saving: manualSaving,
      undo: handleGridUndo,
      redo: handleGridRedo,
      save: handleManualSave,
      discard: handleDiscardChanges,
    });
    return () => onManualControls(null);
  }, [
    manualSave, onManualControls, manualChangeCount, manualSaving,
    handleGridUndo, handleGridRedo, handleManualSave, handleDiscardChanges,
  ]);

  const toolbarVisible = showFloatingToolbar && (
    effectiveChangeCount > 0 || status === 'pending' || status === 'saving' || manualSaving
  );

  const copyToClipboard = async () => {
    const api = gridApiRef.current;
    if (!api) return;
    const csv = api.getDataAsCsv({ skipColumnHeaders: false });
    try {
      await navigator.clipboard.writeText(csv);
      showToast('Disalin ke clipboard', 'success');
    } catch {
      showToast('Gagal menyalin', 'error');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 shadow-sm sticky top-0 z-10">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColumnMenu(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 border dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <Columns3 className="w-3.5 h-3.5" /> Kolom
          </button>
          {showColumnMenu && (
            <div className="absolute left-0 top-full mt-1 z-20 w-56 max-h-64 overflow-y-auto p-2 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-xl shadow-xl text-xs space-y-0.5">
              {RAP_COLUMN_FIELDS.map(({ field, label }) => (
                <label key={field} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-700 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hiddenCols[field] !== true}
                    onChange={e => toggleColumn(field, e.target.checked)}
                  />
                  {label}
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setGroupByType(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border rounded-lg ${
            groupByType
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'text-slate-700 dark:text-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <Rows3 className="w-3.5 h-3.5" /> Group
        </button>

        <button type="button" onClick={() => void onRefresh()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 border dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        <button type="button" onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
          <Download className="w-3.5 h-3.5" /> CSV
        </button>

        <button type="button" onClick={exportXlsx} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
          <Download className="w-3.5 h-3.5" /> XLSX
        </button>

        {onExport && (
          <button type="button" onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200 rounded-lg">
            <Download className="w-3.5 h-3.5" /> Template
          </button>
        )}

        <button type="button" onClick={() => void copyToClipboard()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 border dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
          <ClipboardCopy className="w-3.5 h-3.5" /> Copy
        </button>

        <button type="button" onClick={toggleTheme} title="Toggle dark mode" className="p-1.5 border dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {canManage && (
          <>
            <button type="button" onClick={() => void handleBulkDelete()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-50">
              <Trash2 className="w-3.5 h-3.5" /> Hapus
            </button>
            <button type="button" onClick={() => void handleAddRow()} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
              <Plus className="w-3.5 h-3.5" /> Tambah Row
            </button>
          </>
        )}
      </div>

      {addRowWarning && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-3 py-2">
          ⚠️ {addRowWarning}
        </div>
      )}

      <EditableTable<RapTableRow>
        rowData={optimisticRows}
        columnDefs={columnDefs}
        loading={loading}
        saveStatus={status}
        canEdit={canManage}
        groupField={groupByType ? 'type' : undefined}
        onCellChanged={handleCellChanged}
        onGridReady={api => {
          gridApiRef.current = api;
          if (groupByType) api.setRowGroupColumns(['type']);
        }}
        height="min(70vh, 560px)"
      />

      {Object.keys(cellErrors).length > 0 && (
        <div className="text-xs text-rose-600 dark:text-rose-400 px-1 space-y-0.5">
          {Object.entries(cellErrors).map(([k, msg]) => (
            <div key={k}>{k.split(':')[1]}: {msg}</div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-slate-600 dark:text-slate-500 px-1">
        Klik 2× edit · Enter simpan · Ctrl+C/V · Ctrl+Z undo · Checkbox untuk bulk hapus · Realtime sync aktif
      </p>

      <FloatingSaveToolbar
        visible={toolbarVisible}
        changeCount={effectiveChangeCount}
        saving={manualSave ? manualSaving : status === 'saving'}
        canUndo
        canRedo
        onUndo={handleGridUndo}
        onRedo={handleGridRedo}
        onSave={() => void (manualSave ? handleManualSave() : flush())}
        onDiscard={handleDiscardChanges}
      />
    </div>
  );
}
