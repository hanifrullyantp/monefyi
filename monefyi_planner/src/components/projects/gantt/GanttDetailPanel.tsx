import { useMemo, useState } from 'react';
import { X, Plus, User, Pencil, Palette } from 'lucide-react';
import { useGanttStore } from '../../../store/ganttStore';
import { formatPeriod, daysBetween } from '../../../lib/gantt/utils';
import { GANTT_COLORS, PRIORITY_LABEL, WORK_ITEM_STATUS_LABEL, BAR_COLOR_PRESETS } from '../../../lib/gantt/constants';
import { STATUS_LABEL } from '../../../utils/projectUi';

type DetailTab = 'detail' | 'subtasks' | 'documents' | 'notes';

export default function GanttDetailPanel({ onEditTask }: { onEditTask?: (id: string) => void }) {
  const { tasks, selectedIds, detailOpen, setDetailOpen, setBarColor, pushHistory } = useGanttStore();
  const [tab, setTab] = useState<DetailTab>('subtasks');

  const selectedId = [...selectedIds][0];
  const task = tasks.find(t => t.id === selectedId);
  const subTasks = useMemo(
    () => (task ? tasks.filter(t => t.parentId === task.id) : []),
    [tasks, task],
  );

  if (!detailOpen) {
    return (
      <button
        type="button"
        onClick={() => setDetailOpen(true)}
        className="absolute right-0 top-1/2 -translate-y-1/2 bg-white border border-slate-200 rounded-l-lg px-1 py-4 shadow-sm text-slate-400 hover:text-emerald-600 z-10"
        aria-label="Buka panel detail"
      >
        ‹
      </button>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col h-full bg-white border-l border-slate-100 shrink-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <span className="text-sm font-bold text-slate-500">Detail</span>
          <button type="button" onClick={() => setDetailOpen(false)} className="p-1 rounded hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-sm text-slate-400 text-center">
          Pilih task di list atau timeline untuk melihat detail
        </div>
      </div>
    );
  }

  const statusLabel = task.type === 'project'
    ? STATUS_LABEL[task.status as keyof typeof STATUS_LABEL] || task.status
    : WORK_ITEM_STATUS_LABEL[task.status] || task.status;

  const statusColor = task.status === 'active' || task.status === 'in_progress'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : task.status === 'completed'
      ? 'bg-slate-100 text-slate-600 border-slate-200'
      : 'bg-amber-50 text-amber-700 border-amber-200';

  const tabs: { id: DetailTab; label: string; count?: number }[] = [
    { id: 'detail', label: 'Detail' },
    { id: 'subtasks', label: 'Sub Tugas', count: subTasks.length },
    { id: 'documents', label: 'Dokumen', count: 0 },
    { id: 'notes', label: 'Catatan', count: 0 },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-100 shrink-0">
      <div className="flex items-start justify-between px-4 py-3 border-b border-slate-100 gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-slate-900 truncate">{task.name}</h3>
          {task.code && <p className="text-[10px] text-slate-400 font-mono">{task.code}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onEditTask && (
            <button
              type="button"
              onClick={() => onEditTask(task.id)}
              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"
              title="Edit task"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <button type="button" onClick={() => setDetailOpen(false)} className="p-1 rounded hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3 border-b border-slate-100">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] text-slate-400 font-medium mb-1">Status</div>
            <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-medium mb-1">Prioritas</div>
            <span className={`text-xs font-bold ${task.priority === 'high' ? 'text-rose-600' : task.priority === 'low' ? 'text-slate-500' : 'text-amber-600'}`}>
              {PRIORITY_LABEL[task.priority]}
              {task.priority === 'high' && ' ↑'}
            </span>
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 font-medium mb-1">Progres</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${task.progress}%`, backgroundColor: GANTT_COLORS.selected }} />
            </div>
            <span className="text-xs font-black text-slate-700">{Math.round(task.progress)}%</span>
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 font-medium mb-1">Periode</div>
          <div className="text-xs text-slate-700">{formatPeriod(task.startDate, task.endDate)}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{daysBetween(task.startDate, task.endDate)} hari</div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 font-medium mb-1 flex items-center gap-1"><Palette className="w-3 h-3" /> Warna Bar</div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {BAR_COLOR_PRESETS.map(p => (
              <button
                key={p.id}
                type="button"
                title={p.label}
                onClick={() => { pushHistory(); setBarColor(task.id, p.color || null); }}
                className={`w-6 h-6 rounded-md border ${
                  (task.barColor || '') === p.color ? 'border-slate-800 ring-1 ring-slate-400' : 'border-slate-200'
                }`}
                style={{ backgroundColor: p.color || '#E2E8F0' }}
              />
            ))}
          </div>
        </div>

        {task.assigneeName && (
          <div>
            <div className="text-[10px] text-slate-400 font-medium mb-1">Penanggung Jawab</div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-xs font-semibold text-slate-700">{task.assigneeName}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex border-b border-slate-100 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-[10px] font-bold whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {t.label}{t.count !== undefined ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 gantt-scroll">
        {tab === 'subtasks' && (
          <div className="space-y-2">
            {subTasks.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Belum ada sub tugas</p>
            ) : (
              subTasks.map(st => {
                const stLabel = WORK_ITEM_STATUS_LABEL[st.status] || st.status;
                const stBadge = st.status === 'completed'
                  ? 'bg-slate-100 text-slate-600'
                  : st.status === 'in_progress'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-50 text-slate-500';

                return (
                  <div key={st.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">{st.name}</div>
                      <div className="text-[10px] text-slate-400">{Math.round(st.progress)}%</div>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${stBadge}`}>
                      {stLabel}{st.status === 'completed' ? ' ✓' : ''}
                    </span>
                  </div>
                );
              })
            )}
            <button type="button" className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-xs font-bold text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Tambah Sub Tugas
            </button>
          </div>
        )}

        {tab === 'detail' && (
          <div className="space-y-3 text-xs text-slate-600">
            {task.clientName && <p><span className="font-bold text-slate-800">Klien:</span> {task.clientName}</p>}
            <p><span className="font-bold text-slate-800">Tipe:</span> {task.type === 'project' ? 'Proyek' : 'Sub Tugas'}</p>
            {task.healthStatus && (
              <p><span className="font-bold text-slate-800">Kesehatan:</span> {task.healthStatus.replace('_', ' ')}</p>
            )}
          </div>
        )}

        {(tab === 'documents' || tab === 'notes') && (
          <p className="text-xs text-slate-400 text-center py-8">Fitur {tab === 'documents' ? 'dokumen' : 'catatan'} segera hadir</p>
        )}
      </div>
    </div>
  );
}
