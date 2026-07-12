import { useState } from 'react';
import {
  FileDown, Sparkles, Clock, FileBarChart, Wallet, Activity, Eye, Download, Share2,
} from 'lucide-react';
import type { Project } from '../../../store/appStore';
import type { RapItem } from '../../../services/rapService';
import type { NormalizedProjectView } from '../../../lib/migration/project-normalize';
import { loadCostRealizations, aggregateCostByRapItem } from '../../../services/costService';
import { exportRapWorkbook } from '../../../services/rapExcelService';
import { showToast } from '../../../store/uiStore';
import { formatRupiah } from '../../../utils/projectUi';

type Props = {
  project: Project;
  normalized: NormalizedProjectView;
  rapItems: RapItem[];
};

const HISTORY = [
  { icon: FileBarChart, name: 'Laporan Mingguan W2', date: '21 Jun 2024' },
  { icon: Wallet, name: 'Laporan Keuangan Juni W1', date: '20 Jun 2024' },
  { icon: Activity, name: 'Laporan Progress W1', date: '14 Jun 2024' },
];

export default function TabV2Laporan({ project, normalized, rapItems }: Props) {
  const [exporting, setExporting] = useState(false);
  const [reportType, setReportType] = useState('Laporan Mingguan');
  const p = normalized.project;

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
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 font-bold text-slate-800 px-5 py-4 border-b">
          <Sparkles className="w-5 h-5 text-emerald-600" /> Generate Laporan
        </div>
        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Jenis Laporan</label>
              <select value={reportType} onChange={e => setReportType(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border text-sm">
                <option>Laporan Mingguan</option>
                <option>Laporan Keuangan</option>
                <option>Laporan Progress</option>
                <option>Laporan Lengkap</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Periode</label>
              <input type="date" defaultValue={new Date().toISOString().slice(0, 10)}
                className="mt-1 w-full px-3 py-2 rounded-xl border text-sm" />
            </div>
          </div>
          <button type="button" onClick={handleExport} disabled={exporting}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
            <Sparkles className="w-4 h-4" />
            {exporting ? 'Mengunduh...' : 'Generate & Export Excel'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 font-bold text-slate-800 px-5 py-4 border-b">
          <Clock className="w-5 h-5 text-slate-500" /> Riwayat Laporan
        </div>
        {HISTORY.map((r, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <r.icon className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800">{r.name}</div>
              <div className="text-xs text-slate-500">{r.date}</div>
            </div>
            <button type="button" onClick={handleExport} className="text-xs font-bold px-2 py-1 border rounded-lg flex items-center gap-1">
              <Download className="w-3 h-3" /> Unduh
            </button>
            <button type="button" className="p-1.5 hover:bg-slate-100 rounded-lg">
              <Share2 className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 font-bold text-slate-800 px-5 py-4 border-b">
          <Eye className="w-5 h-5 text-slate-500" /> Preview Laporan
        </div>
        <div className="p-5 bg-slate-50 m-4 rounded-xl text-sm space-y-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-400 font-bold">
            LAPORAN MINGGUAN — {p.name}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-600 mb-2">1. PROGRESS</div>
            <div className="grid grid-cols-3 gap-2">
              <PreviewStat label="Rencana" value={`${p.progress.plan}%`} color="text-blue-600" />
              <PreviewStat label="Realisasi" value={`${p.progress.actual}%`} color="text-emerald-600" />
              <PreviewStat label="Deviasi" value={`${p.progress.deviation}%`} color="text-amber-600" />
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-600 mb-2">2. KEUANGAN</div>
            <div className="grid grid-cols-2 gap-2">
              <PreviewStat label="Kontrak" value={formatRupiah(p.contractValue)} />
              <PreviewStat label="Realisasi" value={formatRupiah(p.rap.realisasi)} color="text-rose-600" />
              <PreviewStat label="Dana Masuk" value={formatRupiah(normalized.totalPemasukan)} color="text-emerald-600" />
              <PreviewStat label="Est. Laba" value={formatRupiah(p.rap.estLaba)} color="text-emerald-600" />
            </div>
          </div>
          <button type="button" onClick={handleExport} disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs">
            <FileDown className="w-4 h-4" /> Export RAP Excel
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewStat({ label, value, color = 'text-slate-900' }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center p-2 bg-white rounded-lg">
      <div className={`text-base font-black ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-400">{label}</div>
    </div>
  );
}
