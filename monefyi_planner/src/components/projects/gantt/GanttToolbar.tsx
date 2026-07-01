import {
  Search, Filter, Minus, Plus, List, Settings2, SlidersHorizontal,
  Undo2, Redo2, Save, PanelRightClose, PanelRightOpen,
  Columns3, GanttChart, Calendar, LayoutList,
} from 'lucide-react';
import { useGanttStore } from '../../../store/ganttStore';
import type { GanttViewMode } from '../../../lib/gantt/types';
import { countActiveAdvancedFilters } from '../../../lib/gantt/utils';

type ProjectView = 'list' | 'kanban' | 'timeline' | 'calendar';

interface GanttToolbarProps {
  projectCount: number;
  projectView: ProjectView;
  onSetView: (v: ProjectView) => void;
  onScrollToToday: () => void;
  onSave: () => void;
  onRequestLeave?: () => Promise<boolean>;
}

const VIEW_MODES: { id: GanttViewMode; label: string }[] = [
  { id: 'day', label: 'Hari' },
  { id: 'week', label: 'Minggu' },
  { id: 'month', label: 'Bulan' },
];

const PAGE_VIEWS: { id: ProjectView; icon: typeof List; label: string }[] = [
  { id: 'list', icon: LayoutList, label: 'List' },
  { id: 'kanban', icon: Columns3, label: 'Kanban' },
  { id: 'timeline', icon: GanttChart, label: 'Gantt' },
  { id: 'calendar', icon: Calendar, label: 'Kalender' },
];

export default function GanttToolbar({
  projectCount,
  projectView,
  onSetView,
  onScrollToToday,
  onSave,
}: GanttToolbarProps) {
  const {
    searchQuery, setSearchQuery, filterStatus, setFilterStatus,
    viewMode, setViewMode, zoomIn, zoomOut,
    detailOpen, toggleDetailOpen,
    undo, redo, undoStack, redoStack,
    isDirty, isSaving, advancedFilters, setShowAdvancedFilters,
    hasDraft,
  } = useGanttStore();

  const advCount = countActiveAdvancedFilters(advancedFilters);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
      <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center">
        <div className="flex-1 relative min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari nama, klien, atau kode..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-sm appearance-none bg-white min-w-[130px]"
            >
              <option value="all">Semua ({projectCount})</option>
              <option value="active">Aktif</option>
              <option value="planning">Planning</option>
              <option value="at_risk">Perlu Perhatian</option>
              <option value="completed">Selesai</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvancedFilters(true)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm transition-colors ${
              advCount > 0
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filter Lainnya
            {advCount > 0 && (
              <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{advCount}</span>
            )}
          </button>

          <div className="flex items-center gap-1 px-2 py-1 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-xs text-slate-500 px-1">Zoom</span>
            <button type="button" onClick={zoomOut} className="p-1.5 rounded-lg hover:bg-white" aria-label="Zoom out">
              <Minus className="w-4 h-4" />
            </button>
            <button type="button" onClick={zoomIn} className="p-1.5 rounded-lg hover:bg-white" aria-label="Zoom in">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            {VIEW_MODES.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => setViewMode(v.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  viewMode === v.id ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onScrollToToday}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-rose-600 hover:bg-rose-50"
          >
            Hari Ini
          </button>

          <div className="w-px h-8 bg-slate-200 hidden sm:block" />

          <button
            type="button"
            onClick={undo}
            disabled={!undoStack.length}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!redoStack.length}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={!isDirty || isSaving}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-black transition-all ${
              isDirty
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-100'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Menyimpan...' : isDirty ? 'Simpan *' : 'Tersimpan'}
          </button>

          {hasDraft && (
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Draft ada</span>
          )}

          <div className="w-px h-8 bg-slate-200 hidden sm:block" />

          <div className="flex bg-slate-100 p-1 rounded-xl">
            {PAGE_VIEWS.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => onSetView(v.id)}
                title={v.label}
                className={`p-2 rounded-lg ${projectView === v.id ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
              >
                <v.icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={toggleDetailOpen}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm transition-colors ${
              detailOpen
                ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                : 'border-emerald-300 bg-emerald-50 text-emerald-700'
            }`}
            title={detailOpen ? 'Sembunyikan panel detail' : 'Tampilkan panel detail'}
          >
            {detailOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            Tampilan
            <Settings2 className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
