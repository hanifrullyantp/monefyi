import { useMemo, useState } from 'react';
import type { Project } from '../../../store/appStore';
import { formatRupiah, HEALTH_CONFIG, formatDateId } from '../../../utils/projectUi';

interface TimelineViewProps {
  projects: Project[];
  onOpenProject: (p: Project) => void;
}

export default function TimelineView({ projects, onOpenProject }: TimelineViewProps) {
  const [zoom, setZoom] = useState<'month' | 'week'>('month');
  const pxPerDay = zoom === 'month' ? 3 : 8;

  const { minDate, maxDate, rangeDays } = useMemo(() => {
    if (!projects.length) {
      const now = Date.now();
      return { minDate: now, maxDate: now + 90 * 86400000, rangeDays: 90 };
    }
    const starts = projects.map(p => new Date(p.start_date).getTime());
    const ends = projects.map(p => new Date(p.end_date).getTime());
    const min = Math.min(...starts);
    const max = Math.max(...ends);
    const pad = 7 * 86400000;
    return { minDate: min - pad, maxDate: max + pad, rangeDays: Math.ceil((max + pad - (min - pad)) / 86400000) };
  }, [projects]);

  const todayOffset = ((Date.now() - minDate) / 86400000) * pxPerDay;
  const width = rangeDays * pxPerDay;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 overflow-x-auto">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-bold text-slate-700">Timeline proyek</span>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          <button type="button" onClick={() => setZoom('month')} className={`px-3 py-1 rounded text-xs font-bold ${zoom === 'month' ? 'bg-white shadow-sm' : ''}`}>Bulan</button>
          <button type="button" onClick={() => setZoom('week')} className={`px-3 py-1 rounded text-xs font-bold ${zoom === 'week' ? 'bg-white shadow-sm' : ''}`}>Minggu</button>
        </div>
      </div>

      <div className="relative" style={{ minWidth: width + 200 }}>
        <div className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10" style={{ left: 180 + todayOffset }} title="Hari ini" />

        {projects.map(p => {
          const start = new Date(p.start_date).getTime();
          const end = new Date(p.end_date).getTime();
          const left = ((start - minDate) / 86400000) * pxPerDay;
          const barW = Math.max(8, ((end - start) / 86400000) * pxPerDay);
          const health = HEALTH_CONFIG[p.health_status];

          return (
            <div key={p.id} className="flex items-center gap-3 mb-3 h-10">
              <button
                type="button"
                onClick={() => onOpenProject(p)}
                className="w-44 shrink-0 text-left text-xs font-bold text-slate-700 truncate hover:text-emerald-600"
              >
                {p.name}
              </button>
              <div className="relative flex-1 h-8 bg-slate-50 rounded-lg" style={{ minWidth: width }}>
                <button
                  type="button"
                  onClick={() => onOpenProject(p)}
                  title={`${formatDateId(p.start_date)} – ${formatDateId(p.end_date)} · ${formatRupiah(p.spent_amount)}`}
                  className={`absolute top-1 h-6 rounded-md ${health.dot} opacity-90 hover:opacity-100`}
                  style={{ left, width: barW }}
                />
              </div>
            </div>
          );
        })}

        {projects.length === 0 && (
          <p className="text-sm text-slate-400 py-8 text-center">Tidak ada proyek untuk timeline.</p>
        )}
      </div>
    </div>
  );
}
