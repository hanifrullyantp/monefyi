import { Activity, Calendar, Check, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { NormalizedProjectView } from '../../../lib/migration/project-normalize';
import type { WorkItem } from '../../../services/workItemService';
import { formatDateId } from '../../../utils/projectUi';
import BottomActionBar from '../../sandbox-ui/BottomActionBar';

type Props = {
  normalized: NormalizedProjectView;
  workItems: WorkItem[];
  onRefresh: () => Promise<void>;
};

function DonutRing({ pct, color, label }: { pct: number; color: string; label: string }) {
  const dash = (pct / 100) * 314;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg width="112" height="112" viewBox="0 0 120 120" className="rotate-[-90deg]">
          <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle cx="60" cy="60" r="50" fill="none" stroke={color} strokeWidth="10"
            strokeLinecap="round" strokeDasharray={`${dash} 314`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-slate-900">{pct}%</span>
          <span className="text-[10px] text-slate-400 uppercase">{label}</span>
        </div>
      </div>
    </div>
  );
}

export default function TabV2Progress({ normalized, workItems }: Props) {
  const p = normalized.project;
  const prog = p.progress;

  return (
    <div className="space-y-5 pb-4">
      <div className="rounded-2xl p-6 text-white"
        style={{ background: 'linear-gradient(135deg, #064E3B, #065F46, #059669)' }}>
        <div className="text-xs font-bold uppercase opacity-70 flex items-center gap-1.5 mb-2">
          <Activity className="w-4 h-4" /> Progress Keseluruhan
        </div>
        <div className="text-5xl font-black tracking-tight">{prog.actual}%</div>
        <span className="inline-block mt-3 px-3 py-1 rounded-full bg-amber-500/20 text-amber-100 text-xs font-bold">
          {prog.deviation}% Deviasi dari Rencana
        </span>
        <div className="relative h-5 bg-white/15 rounded-full overflow-hidden mt-4">
          <div className="absolute inset-y-0 left-0 bg-white/25 rounded-full" style={{ width: `${prog.plan}%` }} />
          <div className="absolute inset-y-0 left-0 bg-white rounded-full" style={{ width: `${prog.actual}%` }} />
        </div>
        <div className="flex justify-between text-xs opacity-80 mt-2">
          <span>Rencana: {prog.plan}%</span>
          <span>Realisasi: {prog.actual}%</span>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white rounded-xl border px-4 py-3">
        <button type="button" className="p-1 hover:bg-slate-100 rounded-lg"><ChevronLeft className="w-5 h-5 text-slate-500" /></button>
        <span className="text-sm font-bold text-slate-700">Timeline Proyek</span>
        <button type="button" className="p-1 hover:bg-slate-100 rounded-lg"><ChevronRight className="w-5 h-5 text-slate-500" /></button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border p-5 text-center shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase mb-4">Rencana</div>
          <DonutRing pct={prog.plan} color="#2563EB" label="Rencana" />
        </div>
        <div className="bg-white rounded-2xl border p-5 text-center shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase mb-4">Realisasi</div>
          <DonutRing pct={prog.actual} color="#10B981" label="Aktual" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 font-bold text-slate-800 px-5 py-4 border-b">
          <Calendar className="w-5 h-5 text-slate-500" /> Timeline Pekerjaan
        </div>
        <div className="p-5 space-y-4">
          {(p.timeline.length ? p.timeline : workItems.map((w, i) => ({
            id: i, name: w.name, weight: Number(w.weight) || 10,
            progress: Number(w.progress_pct) || 0, planProgress: Number(w.progress_pct) || 0,
            status: w.status || 'pending', start: w.planned_start, end: w.planned_end,
          }))).map(item => (
            <div key={item.id} className="flex gap-4">
              <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${
                item.status === 'done' ? 'bg-emerald-500' : item.status === 'active' ? 'bg-blue-500' : 'bg-slate-200'
              }`}>
                {item.status === 'done' && <Check className="w-4 h-4 text-white" />}
              </div>
              <div className="flex-1 min-w-0 pb-4 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-slate-800">{item.name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    Bobot {item.weight}%
                  </span>
                  {item.progress < item.planProgress && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 flex items-center gap-0.5">
                      <AlertTriangle className="w-3 h-3" />{item.progress - item.planProgress}%
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {formatDateId(item.start)} – {formatDateId(item.end)}
                  {item.progress > 0 ? ` • ${item.progress}% selesai` : ' • Belum dimulai'}
                </div>
                {item.progress > 0 && (
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
                    <div className={`h-full rounded-full ${item.status === 'done' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${item.progress}%` }} />
                  </div>
                )}
              </div>
            </div>
          ))}
          {!p.timeline.length && !workItems.length && (
            <p className="text-sm text-slate-500 text-center py-4">Belum ada pekerjaan. Buat dari wizard atau Command Center.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-5 shadow-sm">
        <div className="text-sm font-bold text-slate-700 mb-3">S-Curve Progress</div>
        <div className="h-32 bg-slate-50 rounded-xl flex items-center justify-center text-xs text-slate-400">
          Grafik S-Curve — data akan tampil setelah beberapa periode progress
        </div>
      </div>

      <BottomActionBar
        actions={[
          { label: 'Tambah Pekerjaan', onClick: () => {} },
          { label: 'Lapor Progress', onClick: () => {}, variant: 'primary' },
        ]}
      />
    </div>
  );
}
