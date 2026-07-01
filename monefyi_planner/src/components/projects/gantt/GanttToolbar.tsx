import {
  Search, Filter, Minus, Plus, List, Settings2, SlidersHorizontal,
} from 'lucide-react';
import { useGanttStore } from '../../../store/ganttStore';
import type { GanttViewMode } from '../../../lib/gantt/types';

interface GanttToolbarProps {
  projectCount: number;
  onScrollToToday: () => void;
}

const VIEW_MODES: { id: GanttViewMode; label: string }[] = [
  { id: 'day', label: 'Hari' },
  { id: 'week', label: 'Minggu' },
  { id: 'month', label: 'Bulan' },
];

export default function GanttToolbar({ projectCount, onScrollToToday }: GanttToolbarProps) {
  const {
    searchQuery, setSearchQuery, filterStatus, setFilterStatus,
    viewMode, setViewMode, zoomIn, zoomOut, setDetailOpen,
  } = useGanttStore();

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 space-y-3">
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        <div className="flex-1 relative min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari nama, klien, atau kode..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-sm appearance-none bg-white min-w-[140px] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="all">Semua Proyek ({projectCount})</option>
              <option value="active">Aktif</option>
              <option value="planning">Planning</option>
              <option value="at_risk">Perlu Perhatian</option>
              <option value="completed">Selesai</option>
            </select>
          </div>

          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filter Lainnya
          </button>

          <div className="flex items-center gap-1 px-2 py-1 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-xs font-medium text-slate-500 px-1">Zoom</span>
            <button type="button" onClick={zoomOut} className="p-1.5 rounded-lg hover:bg-white text-slate-600 transition-colors" aria-label="Zoom out">
              <Minus className="w-4 h-4" />
            </button>
            <button type="button" onClick={zoomIn} className="p-1.5 rounded-lg hover:bg-white text-slate-600 transition-colors" aria-label="Zoom in">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            {VIEW_MODES.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => setViewMode(v.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === v.id ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onScrollToToday}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            Hari Ini
          </button>

          <button
            type="button"
            onClick={() => setDetailOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <List className="w-4 h-4" />
            Tampilan
            <Settings2 className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
