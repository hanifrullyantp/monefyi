import { useCallback, useMemo, useRef } from 'react';
import { Minus, Plus, Save } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import type { Project } from '../../../store/appStore';
import { useAppStore } from '../../../store/appStore';
import { useGanttStore } from '../../../store/ganttStore';
import { flattenTasks } from '../../../lib/gantt/utils';
import { useProjectGanttData } from '../gantt/useProjectGanttData';
import type { WorkItem } from '../../../services/workItemService';
import TaskListPanel from '../gantt/TaskListPanel';
import GanttTimeline from '../gantt/GanttTimeline';
import GanttDetailPanel from '../gantt/GanttDetailPanel';
import GanttEditModal from '../gantt/GanttEditModal';
import GanttTodoModal from '../gantt/GanttTodoModal';

interface ProjectScheduleGanttProps {
  project: Project;
  workItems: WorkItem[];
  onRefresh: () => void;
}

export default function ProjectScheduleGantt({ project, workItems, onRefresh }: ProjectScheduleGanttProps) {
  const tenant = useAppStore(s => s.tenant);
  const user = useAppStore(s => s.user);
  const {
    tasks, expandedIds, leftWidth, setLeftWidth, detailOpen, toggleDetailOpen,
    viewMode, setViewMode, zoomIn, zoomOut, editTaskId, setEditTaskId,
    todoModalTaskId, setTodoModalTaskId,
    isDirty, isSaving,
  } = useGanttStore();

  const { commitDates, saveAll } = useProjectGanttData(project, workItems, tenant?.id, tenant?.currency);
  const scrollToTodayRef = useRef<(() => void) | null>(null);
  const scrollToTaskRef = useRef<((id: string) => void) | null>(null);

  const rows = useMemo(
    () => flattenTasks(tasks, expandedIds, [project.id]),
    [tasks, expandedIds, project.id],
  );

  const editTask = editTaskId ? tasks.find(t => t.id === editTaskId) : null;
  const todoTask = todoModalTaskId ? tasks.find(t => t.id === todoModalTaskId) : null;

  const startResizeLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = leftWidth;
    const onMove = (ev: MouseEvent) => setLeftWidth(startW + (ev.clientX - startX));
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [leftWidth, setLeftWidth]);

  const handleSave = async () => {
    const ok = await saveAll();
    if (ok) onRefresh();
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-xl border border-slate-200 p-2">
        <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
          {(['day', 'week', 'month'] as const).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setViewMode(v)}
              className={`px-3 py-1 rounded-md capitalize ${viewMode === v ? 'bg-white shadow text-emerald-700' : 'text-slate-500'}`}
            >
              {v === 'day' ? 'Hari' : v === 'week' ? 'Minggu' : 'Bulan'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-1">
          <button type="button" onClick={zoomOut} className="p-1.5 hover:bg-slate-50 rounded" aria-label="Zoom out"><Minus className="w-4 h-4" /></button>
          <button type="button" onClick={zoomIn} className="p-1.5 hover:bg-slate-50 rounded" aria-label="Zoom in"><Plus className="w-4 h-4" /></button>
        </div>
        <button type="button" onClick={() => scrollToTodayRef.current?.()} className="px-3 py-1.5 text-xs font-bold text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50">
          Hari Ini
        </button>
        <button type="button" onClick={toggleDetailOpen} className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg hover:bg-slate-50">
          {detailOpen ? 'Sembunyikan Panel' : 'Tampilkan Panel'}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className={`ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black ${
            isDirty ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-100 text-slate-400'
          }`}
        >
          <Save className="w-3.5 h-3.5" />
          {isSaving ? 'Menyimpan...' : isDirty ? 'Simpan *' : 'Tersimpan'}
        </button>
      </div>

      <div
        className="relative flex bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden gantt-planner"
        style={{ height: 'calc(100vh - 380px)', minHeight: 400 }}
      >
        <div style={{ width: leftWidth }} className="shrink-0 h-full overflow-hidden">
          <TaskListPanel rows={rows} onReorder={() => {}} onEditTask={setEditTaskId} />
        </div>
        <div className="w-1.5 shrink-0 cursor-col-resize hover:bg-emerald-200/60 active:bg-emerald-300 z-10" onMouseDown={startResizeLeft} role="separator" />
        <GanttTimeline
          rows={rows}
          onCommitDates={commitDates}
          scrollToTodayRef={scrollToTodayRef}
          scrollToTaskRef={scrollToTaskRef}
          onEditTask={setEditTaskId}
        />
        {detailOpen && (
          <>
            <div className="w-1.5 shrink-0 bg-slate-100" />
            <div className="w-72 shrink-0 h-full overflow-hidden border-l border-slate-100">
              <GanttDetailPanel onEditTask={setEditTaskId} />
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {editTask && (
          <GanttEditModal
            key={editTask.id}
            task={editTask}
            project={project}
            onClose={() => setEditTaskId(null)}
            onSaved={() => { setEditTaskId(null); onRefresh(); }}
          />
        )}
      </AnimatePresence>

      {todoTask && tenant?.id && (
        <GanttTodoModal
          task={todoTask}
          orgId={tenant.id}
          userId={user?.id}
          onClose={() => setTodoModalTaskId(null)}
        />
      )}
    </div>
  );
}
