import * as XLSX from 'xlsx';
import type { GridApi } from 'ag-grid-community';

export function exportGridAsXlsx(api: GridApi, fileName: string) {
  const cols = api.getAllDisplayedColumns().filter(c => {
    const def = c.getColDef();
    return def.field && !def.hide && def.field !== 'id';
  });

  const headers = cols.map(c => c.getColDef().headerName || c.getColId());
  const rows: unknown[][] = [];

  api.forEachNodeAfterFilterAndSort(node => {
    if (!node.data || node.group) return;
    rows.push(cols.map(c => {
      const field = c.getColDef().field!;
      const val = (node.data as Record<string, unknown>)[field];
      return val ?? '';
    }));
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'RAP');
  XLSX.writeFile(wb, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
}
