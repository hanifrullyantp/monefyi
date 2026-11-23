import { useCallback, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type GridApi,
  type GridReadyEvent,
  type CellValueChangedEvent,
} from 'ag-grid-community';
import { useColorScheme } from '../../hooks/useColorScheme';
import { gridThemeDark, gridThemeLight } from './gridThemes';

ModuleRegistry.registerModules([AllCommunityModule]);

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export interface EditableTableProps<T extends { id: string }> {
  rowData: T[];
  columnDefs: ColDef<T>[];
  loading?: boolean;
  saveStatus?: SaveStatus;
  canEdit?: boolean;
  groupField?: string;
  onCellChanged?: (row: T, field: string, value: unknown, oldValue: unknown) => void;
  onGridReady?: (api: GridApi<T>) => void;
  height?: number | string;
  className?: string;
}

export default function EditableTable<T extends { id: string }>({
  rowData,
  columnDefs,
  loading = false,
  saveStatus = 'idle',
  canEdit = true,
  groupField,
  onCellChanged,
  onGridReady,
  height = 480,
  className = '',
}: EditableTableProps<T>) {
  const { dark } = useColorScheme();
  const gridRef = useRef<AgGridReact<T>>(null);
  const [quickFilter, setQuickFilter] = useState('');

  const theme = dark ? gridThemeDark : gridThemeLight;

  const defaultColDef = useMemo<ColDef<T>>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      editable: canEdit,
      minWidth: 90,
      flex: 1,
      enableRowGroup: Boolean(groupField),
    }),
    [canEdit, groupField],
  );

  const handleGridReady = useCallback(
    (e: GridReadyEvent<T>) => {
      onGridReady?.(e.api);
    },
    [onGridReady],
  );

  const handleCellValueChanged = useCallback(
    (e: CellValueChangedEvent<T>) => {
      if (!e.data || e.colDef.field === undefined) return;
      onCellChanged?.(e.data, e.colDef.field, e.newValue, e.oldValue);
    },
    [onCellChanged],
  );

  const statusLabel = useMemo(() => {
    switch (saveStatus) {
      case 'pending': return 'Menunggu…';
      case 'saving': return 'Menyimpan…';
      case 'saved': return 'Tersimpan ✓';
      case 'error': return 'Gagal simpan';
      default: return '';
    }
  }, [saveStatus]);

  const loadingOverlay = useMemo(
    () => '<div class="flex flex-col items-center gap-2 p-6 text-sm text-slate-500"><div class="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>Memuat data…</div>',
    [],
  );

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <input
          type="search"
          value={quickFilter}
          onChange={e => {
            setQuickFilter(e.target.value);
            gridRef.current?.api?.setGridOption('quickFilterText', e.target.value);
          }}
          placeholder="Cari di tabel…"
          className="flex-1 min-w-[140px] px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 text-sm"
          aria-label="Cari tabel"
        />
        {statusLabel && (
          <span
            className={`px-2 py-1 rounded-lg font-semibold ${
              saveStatus === 'error'
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                : saveStatus === 'saved'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200'
            }`}
          >
            {statusLabel}
          </span>
        )}
      </div>

      <div
        className="w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 shadow-sm"
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
        <AgGridReact<T>
          ref={gridRef}
          theme={theme}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          loading={loading}
          overlayLoadingTemplate={loadingOverlay}
          animateRows
          rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true }}
          cellSelection
          enableCellTextSelection
          undoRedoCellEditing
          undoRedoCellEditingLimit={20}
          singleClickEdit={false}
          stopEditingWhenCellsLoseFocus
          suppressDragLeaveHidesColumns
          onGridReady={handleGridReady}
          onCellValueChanged={handleCellValueChanged}
          rowGroupPanelShow={groupField ? 'always' : 'never'}
          groupDisplayType="groupRows"
          pagination={rowData.length > 100}
          paginationPageSize={50}
          paginationPageSizeSelector={[25, 50, 100]}
          getRowId={p => p.data.id}
          localeText={{
            noRowsToShow: 'Belum ada data',
            loadingOoo: 'Memuat…',
          }}
        />
      </div>
    </div>
  );
}
