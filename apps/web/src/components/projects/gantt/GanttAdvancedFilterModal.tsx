import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useGanttStore } from '../../../store/ganttStore';
import { countActiveAdvancedFilters } from '../../../lib/gantt/utils';
import type { GanttAdvancedFilters, GanttPriority } from '../../../lib/gantt/types';
import { PRIORITY_LABEL } from '../../../lib/gantt/constants';
import { HEALTH_CONFIG } from '../../../utils/projectUi';
import type { Project } from '../../../store/appStore';

export default function GanttAdvancedFilterModal() {
  const {
    showAdvancedFilters, setShowAdvancedFilters,
    advancedFilters, setAdvancedFilters, resetAdvancedFilters,
  } = useGanttStore();

  if (!showAdvancedFilters) return null;

  const active = countActiveAdvancedFilters(advancedFilters);

  const set = (patch: Partial<GanttAdvancedFilters>) => setAdvancedFilters(patch);

  return (
    <div
      className="fixed inset-0 z-[65] bg-black/40 flex items-start justify-center pt-24 p-4"
      onClick={() => setShowAdvancedFilters(false)}
    >
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="font-black text-slate-900">Filter Lainnya</h3>
            {active > 0 && (
              <p className="text-[10px] text-emerald-600 font-bold">{active} filter aktif</p>
            )}
          </div>
          <button type="button" onClick={() => setShowAdvancedFilters(false)} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Klien</label>
            <input
              value={advancedFilters.clientName}
              onChange={e => set({ clientName: e.target.value })}
              placeholder="Nama klien..."
              className="w-full mt-1 px-3 py-2 border rounded-xl text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Prioritas</label>
              <select
                value={advancedFilters.priority}
                onChange={e => set({ priority: e.target.value as GanttPriority | 'all' })}
                className="w-full mt-1 px-3 py-2 border rounded-xl text-sm"
              >
                <option value="all">Semua</option>
                {(Object.keys(PRIORITY_LABEL) as GanttPriority[]).map(p => (
                  <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Kesehatan</label>
              <select
                value={advancedFilters.healthStatus}
                onChange={e => set({ healthStatus: e.target.value as Project['health_status'] | 'all' })}
                className="w-full mt-1 px-3 py-2 border rounded-xl text-sm"
              >
                <option value="all">Semua</option>
                {(Object.keys(HEALTH_CONFIG) as Project['health_status'][]).map(h => (
                  <option key={h} value={h}>{HEALTH_CONFIG[h].label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">
              Progress {advancedFilters.progressMin}% – {advancedFilters.progressMax}%
            </label>
            <div className="flex gap-3 mt-2">
              <input
                type="range"
                min={0}
                max={100}
                value={advancedFilters.progressMin}
                onChange={e => set({ progressMin: Math.min(Number(e.target.value), advancedFilters.progressMax) })}
                className="flex-1 accent-emerald-500"
              />
              <input
                type="range"
                min={0}
                max={100}
                value={advancedFilters.progressMax}
                onChange={e => set({ progressMax: Math.max(Number(e.target.value), advancedFilters.progressMin) })}
                className="flex-1 accent-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Mulai setelah</label>
              <input
                type="date"
                value={advancedFilters.dateFrom}
                onChange={e => set({ dateFrom: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Selesai sebelum</label>
              <input
                type="date"
                value={advancedFilters.dateTo}
                onChange={e => set({ dateTo: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-xl text-sm"
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex gap-2 bg-slate-50/80 rounded-b-2xl">
          <button
            type="button"
            onClick={() => { resetAdvancedFilters(); }}
            className="flex-1 py-2.5 border rounded-xl text-sm font-bold text-slate-600 hover:bg-white"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(false)}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700"
          >
            Terapkan
          </button>
        </div>
      </motion.div>
    </div>
  );
}
