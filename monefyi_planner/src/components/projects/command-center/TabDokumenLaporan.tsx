import { FileText, Download } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

interface TabDokumenLaporanProps {
  rapChartData: { name: string; planned: number; actual: number }[];
  rapTotal: number;
  spent: number;
  evmPanel: React.ReactNode;
  onExport: () => void;
}

export default function TabDokumenLaporan({
  rapChartData, rapTotal, spent, evmPanel, onExport,
}: TabDokumenLaporanProps) {
  const reports = [
    'Laporan Progress Mingguan',
    'Laporan Keuangan Proyek',
    'Laporan Material Usage',
    'Laporan Hutang-Piutang',
    'Executive Summary (untuk klien)',
    'RAB vs Realisasi Detail',
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {['Dokumen', 'Laporan', 'Cetak'].map((t, i) => (
          <button
            key={t}
            type="button"
            className={`px-4 py-2 rounded-xl text-xs font-bold ${i === 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}
          >
            {i === 0 ? '📄' : i === 1 ? '📊' : '🖨'} {t}
          </button>
        ))}
        <button type="button" onClick={onExport} className="ml-auto flex items-center gap-1 px-3 py-2 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold">
          <Download className="w-3.5 h-3.5" /> Export Excel
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-4">RAP vs Realisasi (jt)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={rapChartData.length ? rapChartData : [{ name: 'Total', planned: rapTotal / 1e6, actual: spent / 1e6 }]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="planned" name="RAP" fill="#e2e8f0" radius={4} />
              <Bar dataKey="actual" name="Realisasi" fill="#059669" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {evmPanel}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-600" /> Laporan Otomatis
        </h3>
        <div className="space-y-2">
          {reports.map(r => (
            <div key={r} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <span className="text-sm text-slate-700">{r}</span>
              <button type="button" className="text-xs font-bold text-emerald-600 hover:underline px-3 py-1 rounded-lg border border-emerald-200">
                Generate
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
