import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { Project } from '../../../store/appStore';
import { useAppStore } from '../../../store/appStore';
import { useGanttStore } from '../../../store/ganttStore';
import { flattenTasks } from '../../../lib/gantt/utils';
import { persistGanttDependency, removeGanttDependency } from '../../../services/ganttDependencyService';
import { useGanttData } from './useGanttData';
import GanttToolbar from './GanttToolbar';
import TaskListPanel from './TaskListPanel';
import GanttTimeline from './GanttTimeline';
import GanttDetailPanel from './GanttDetailPanel';
import GanttEditModal from './GanttEditModal';

interface GanttPlannerViewProps {
  projects: Project[];
  onOpenProject: (p: Project) => void;
}

export default function GanttPlannerView({ projects, onOpenProject }: GanttPlannerViewProps) {
  const tenant = useAppStore(s => s.tenant);
  const {
    tasks, expandedIds, projectOrder, setProjectOrder,
    leftWidth, rightWidth, setLeftWidth, setRightWidth, detailOpen,
    searchQuery, filterStatus, editTaskId, setEditTaskId,
  } = useGanttStore();

  const { saveTaskDates, workItemsRef } = useGanttData(projects, tenant?.id, tenant?.currency);
  const scrollToTodayRef = useRef<(() => void) | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isWide, setIsWide] = useState(true);

  const filteredTasks = useMemo(() => tasks.filter(t => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || t.name.toLowerCase().includes(q)
      || (t.code?.toLowerCase().includes(q) ?? false)
      || (t.clientName?.toLowerCase().includes(q) ?? false);

    let matchFilter = true;
    if (filterStatus === 'active') matchFilter = t.status === 'active' || t.status === 'in_progress';
    else if (filterStatus === 'planning') matchFilter = t.status === 'planning' || t.status === 'draft' || t.status === 'pending';
    else if (filterStatus === 'at_risk') matchFilter = t.healthStatus === 'at_risk' || t.healthStatus === 'behind';
    else if (filterStatus === 'completed') matchFilter = t.status === 'completed' || t.status === 'archived';

    if (t.parentId && !matchSearch) {
      const parent = tasks.find(p => p.id === t.parentId);
      if (parent) {
        const parentMatch = !q || parent.name.toLowerCase().includes(q);
        return matchFilter && parentMatch;
      }
    }

    return matchSearch && matchFilter;
  }), [tasks, searchQuery, filterStatus]);

  const rows = useMemo(
    () => flattenTasks(filteredTasks, expandedIds, projectOrder),
    [filteredTasks, expandedIds, projectOrder],
  );

  const editTask = editTaskId ? tasks.find(t => t.id === editTaskId) : null;
  const editProject = editTask?.type === 'project'
    ? projects.find(p => p.id === editTask.id)
    : editTask
      ? projects.find(p => p.id === editTask.projectId)
      : undefined;

  useEffect(() => {
    const check = () => setIsWide(window.innerWidth >= 1280);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleReorder = useCallback((order: string[]) => {
    setProjectOrder(order);
  }, [setProjectOrder]);

  const handlePersistDependency = useCallback(async (dep: Parameters<typeof persistGanttDependency>[1]) => {
    if (!tenant?.id) return;
    await persistGanttDependency(tenant.id, dep, useGanttStore.getState().tasks, workItemsRef.current);
    const wi = workItemsRef.current.find(w => w.id === dep.toTaskId);
    if (wi && !(wi.dependencies || []).includes(dep.fromTaskId)) {
      workItemsRef.current = workItemsRef.current.map(w =>
        w.id === dep.toTaskId
          ? { ...w, dependencies: [...(w.dependencies || []), dep.fromTaskId] }
          : w,
      );
    }
  }, [tenant?.id, workItemsRef]);

  const handleRemoveDependency = useCallback(async (dep: Parameters<typeof removeGanttDependency>[1]) => {
    if (!tenant?.id) return;
    await removeGanttDependency(tenant.id, dep, workItemsRef.current);
    workItemsRef.current = workItemsRef.current.map(w =>
      w.id === dep.toTaskId
        ? { ...w, dependencies: (w.dependencies || []).filter(id => id !== dep.fromTaskId) }
        : w,
    );
  }, [tenant?.id, workItemsRef]);

  const startResize = useCallback((side: 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = side === 'left' ? leftWidth : rightWidth;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      if (side === 'left') setLeftWidth(startW + dx);
      else setRightWidth(startW - dx);
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [leftWidth, rightWidth, setLeftWidth, setRightWidth]);

  const scrollToToday = () => scrollToTodayRef.current?.();

  if (!projects.length) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
        <p className="text-sm text-slate-500">Tidak ada proyek untuk Gantt chart.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <GanttToolbar projectCount={projects.length} onScrollToToday={scrollToToday} />

      <div
        ref={containerRef}
        className="relative flex bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden gantt-planner"
        style={{ height: 'calc(100vh - 320px)', minHeight: 520 }}
      >
        <div style={{ width: leftWidth }} className="shrink-0 h-full overflow-hidden">
          <TaskListPanel
            rows={rows}
            onReorder={handleReorder}
            onEditTask={setEditTaskId}
          />
        </div>

        <div
          className="w-1.5 shrink-0 cursor-col-resize hover:bg-emerald-200/60 active:bg-emerald-300 transition-colors z-10"
          onMouseDown={e => startResize('left', e)}
          role="separator"
          aria-orientation="vertical"
        />

        <GanttTimeline
          rows={rows}
          onSaveDates={saveTaskDates}
          scrollToTodayRef={scrollToTodayRef}
          onEditTask={setEditTaskId}
          onPersistDependency={handlePersistDependency}
          onRemoveDependency={handleRemoveDependency}
        />

        {(isWide || detailOpen) && (
          <>
            <div
              className="w-1.5 shrink-0 cursor-col-resize hover:bg-emerald-200/60 active:bg-emerald-300 transition-colors z-10"
              onMouseDown={e => startResize('right', e)}
              role="separator"
              aria-orientation="vertical"
            />
            <div style={{ width: isWide ? rightWidth : 0 }} className={`shrink-0 h-full overflow-hidden ${!isWide && detailOpen ? 'fixed right-0 top-0 bottom-0 w-80 z-50 shadow-2xl' : ''}`}>
              <GanttDetailPanel onEditTask={setEditTaskId} />
            </div>
          </>
        )}

        {!isWide && !detailOpen && <GanttDetailPanel onEditTask={setEditTaskId} />}
      </div>

      <AnimatePresence>
        {editTask && (
          <GanttEditModal
            key={editTask.id}
            task={editTask}
            project={editProject}
            onClose={() => setEditTaskId(null)}
            onSaved={() => {}}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
