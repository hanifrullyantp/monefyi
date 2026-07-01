import { useState } from 'react';
import type { RapItem } from '../../../services/rapService';
import type { WorkItem } from '../../../services/workItemService';
import type { RapActualAgg } from '../../../services/costService';
import { formatRupiah } from '../../../utils/projectUi';

interface TabBahanTukangProps {
  rapItems: RapItem[];
  rapActuals: Record<string, RapActualAgg>;
  workItems: WorkItem[];
}

export default function TabBahanTukang({ rapItems, rapActuals, workItems }: TabBahanTukangProps) {
  const [sub, setSub] = useState<'material' | 'labor'>('material');

  const materials = rapItems.filter(r => r.type === 'material');
  const labor = rapItems.filter(r => r.type === 'labor');
  const items = sub === 'material' ? materials : labor;

  const totalWorkers = workItems.reduce(
    (s, w) => s + (Number(w.actual_workers) || Number(w.planned_workers) || 0), 0,
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[
          { id: 'material' as const, label: `🧱 Material (${materials.length})` },
          { id: 'labor' as const, label: `👷 Tukang (${labor.length})` },
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSub(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${sub === t.id ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {sub === 'material' ? (
          <>
            <StatCard label="Total Item" value={String(materials.length)} />
            <StatCard label="Direncanakan" value={String(materials.reduce((s, r) => s + Number(r.quantity), 0))} />
            <StatCard label="Terealisasi" value={String(materials.filter(r => (rapActuals[r.id]?.qty ?? 0) > 0).length)} />
            <StatCard label="Belum" value={String(materials.filter(r => !(rapActuals[r.id]?.qty)).length)} />
          </>
        ) : (
          <>
            <StatCard label="Item Upah" value={String(labor.length)} />
            <StatCard label="Tukang Aktif" value={String(totalWorkers || '—')} />
            <StatCard label="Total Upah RAP" value={formatRupiah(labor.reduce((s, r) => s + Number(r.quantity) * Number(r.unit_price), 0))} />
            <StatCard label="Task Assign" value={String(workItems.length)} />
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-bold text-slate-500">No</th>
              <th className="text-left px-4 py-2 text-xs font-bold text-slate-500">Nama</th>
              <th className="text-left px-4 py-2 text-xs font-bold text-slate-500">Sat</th>
              <th className="text-right px-4 py-2 text-xs font-bold text-slate-500">RAB</th>
              <th className="text-right px-4 py-2 text-xs font-bold text-slate-500">Real</th>
              <th className="text-left px-4 py-2 text-xs font-bold text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">Belum ada data {sub === 'material' ? 'material' : 'tenaga kerja'}.</td></tr>
            ) : items.map((row, i) => {
              const agg = rapActuals[row.id];
              const planned = Number(row.quantity) || 0;
              const actual = agg?.qty ?? 0;
              const status = actual >= planned ? '🟢' : actual > 0 ? '🟡' : '🔴';
              return (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-500">{i + 1}</td>
                  <td className="px-4 py-2 font-medium">{row.name}</td>
                  <td className="px-4 py-2 text-slate-500">{row.unit}</td>
                  <td className="px-4 py-2 text-right font-mono">{planned}</td>
                  <td className="px-4 py-2 text-right font-mono">{actual || '—'}</td>
                  <td className="px-4 py-2">{status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <div className="text-[10px] font-bold uppercase text-slate-500">{label}</div>
      <div className="text-lg font-black text-slate-900 truncate">{value}</div>
    </div>
  );
}
