import { useEffect, useState } from 'react';
import { FileDown } from 'lucide-react';
import type { Project } from '../../../store/appStore';
import type { RapItem } from '../../../services/rapService';
import { loadCostRealizations, aggregateCostByRapItem } from '../../../services/costService';
import { exportRapWorkbook } from '../../../services/rapExcelService';
import { showToast } from '../../../store/uiStore';

type Props = {
  project: Project;
  rapItems: RapItem[];
};

export default function TabV2Laporan({ project, rapItems }: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const costs = await loadCostRealizations(project.id);
      const actuals = await aggregateCostByRapItem(project.id);
      exportRapWorkbook(project, rapItems, costs, actuals);
      showToast('RAP Excel diunduh', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal export', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border p-6 text-center space-y-4">
      <p className="text-sm text-slate-500">Export RAP dan laporan proyek.</p>
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-60"
      >
        <FileDown className="w-4 h-4" /> Export RAP Excel
      </button>
    </div>
  );
}
