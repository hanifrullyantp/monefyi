import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { Project } from '../../../store/appStore';
import { useAppStore } from '../../../store/appStore';
import { useGanttStore } from '../../../store/ganttStore';
import { flattenTasks, matchesAdvancedFilters } from '../../../lib/gantt/utils';
import { saveGanttDraft, clearGanttDraft, loadGanttDraft } from '../../../services/ganttDraftService';
import { useGanttData } from './useGanttData';
import GanttToolbar from './GanttToolbar';
import TaskListPanel from './TaskListPanel';
import GanttTimeline from './GanttTimeline';
import GanttDetailPanel from './GanttDetailPanel';
import GanttEditModal from './GanttEditModal';
import GanttAdvancedFilterModal from './GanttAdvancedFilterModal';
import GanttUnsavedDialog, { type UnsavedChoice } from './GanttUnsavedDialog';
import { useUiStore } from '../../../store/uiStore';

type ProjectView = 'list' | 'kanban' | 'timeline' | 'calendar';

interface GanttPlannerViewProps {
  projects: Project[];
  projectView: ProjectView;
  onSetView: (v: ProjectView) => void;
  focusProjectId?: string | null;
  onOpenProject: (p: Project) => void;
  onOpenProjectDetail: (p: Project) => void;
}

export default function GanttPlannerView({
  projects,
  projectView,
  onSetView,
  focusProjectId,
  onOpenProject,
  onOpenProjectDetail,
}: GanttPlannerViewProps) {
  const tenant = useAppStore(s => s.tenant);
  const showToast = useUiStore(s => s.showToast);
  const {
    tasks, expandedIds, projectOrder, setProjectOrder,
    leftWidth, setLeftWidth, detailOpen,
    searchQuery, filterStatus, advancedFilters,
    editTaskId, setEditTaskId, isDirty, discardToBaseline,
    orgId, setHasDraft, undo, redo, expandedView, setExpandedView,
  } = useGanttStore();

  const { commitDates, saveAll, workItemsRef } = useGanttData(projects, tenant?.id, tenant?.currency);
  const scrollToTodayRef = useRef<(() => void) | null>(null);
  const scrollToTaskRef = useRef<((id: string) => void) | null>(null);
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const pendingViewRef = useRef<ProjectView | null>(null);
  const leaveResolveRef = useRef<((v: boolean) => void) | null>(null);

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

    const matchAdvanced = matchesAdvancedFilters(t, advancedFilters);

    if (t.parentId && !matchSearch) {
      const parent = tasks.find(p => p.id === t.parentId);
      if (parent) {
        const parentMatch = !q || parent.name.toLowerCase().includes(q);
        return matchFilter && matchAdvanced && parentMatch;
      }
    }

    return matchSearch && matchFilter && matchAdvanced;
  }), [tasks, searchQuery, filterStatus, advancedFilters]);

  const rows = useMemo(
    () => flattenTasks(filteredTasks, expandedIds, projectOrder),
    [filteredTasks, expandedIds, projectOrder],
  );

  const editTask = editTaskId ? tasks.find(t => t.id === editTaskId) : null;
  const editProject = editTask?.type === 'project'
    ? projects.find(p => p.id === editTask.id)
    : editTask ? projects.find(p => p.id === editTask.projectId) : undefined;

  const promptLeave = useCallback((): Promise<boolean> => {
    if (!isDirty) return Promise.resolve(true);
    return new Promise(resolve => {
      leaveResolveRef.current = resolve;
      setUnsavedOpen(true);
    });
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) {
      useUiStore.getState().setNavigationGuard(null);
      return;
    }
    useUiStore.getState().setNavigationGuard({ promptLeave });
    return () => useUiStore.getState().setNavigationGuard(null);
  }, [isDirty, promptLeave]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedView) {
        setExpandedView(false);
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
        if (e.key === 's') { e.preventDefault(); saveAll(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, saveAll, expandedView, setExpandedView]);

  useEffect(() => {
    if (!focusProjectId) return;
    useGanttStore.getState().selectTask(focusProjectId);
    useGanttStore.getState().setScrollToTaskId(focusProjectId);
  }, [focusProjectId]);

  const handleSetView = useCallback(async (v: ProjectView) => {
    if (v === projectView) return;
    if (isDirty) {
      pendingViewRef.current = v;
      setUnsavedOpen(true);
      return;
    }
    onSetView(v);
  }, [isDirty, onSetView, projectView]);

  const handleUnsavedChoice = useCallback(async (choice: UnsavedChoice) => {
    setUnsavedOpen(false);
    const pendingView = pendingViewRef.current;
    pendingViewRef.current = null;

    if (choice === 'cancel') {
      leaveResolveRef.current?.(false);
      leaveResolveRef.current = null;
      return;
    }

    if (choice === 'save') {
      const ok = await saveAll();
      if (!ok) {
        leaveResolveRef.current?.(false);
        leaveResolveRef.current = null;
        return;
      }
    } else if (choice === 'draft') {
      if (orgId) {
        saveGanttDraft(orgId, useGanttStore.getState().getSnapshot());
        setHasDraft(true);
        showToast('Draft disimpan — dapat dipulihkan saat kembali', 'success');
      }
    } else if (choice === 'discard') {
      discardToBaseline();
      if (orgId) clearGanttDraft(orgId);
      setHasDraft(false);
    }

    leaveResolveRef.current?.(true);
    leaveResolveRef.current = null;

    if (pendingView) onSetView(pendingView);
  }, [saveAll, discardToBaseline, orgId, setHasDraft, showToast, onSetView]);

  const handleReorder = useCallback((order: string[]) => {
    setProjectOrder(order);
  }, [setProjectOrder]);

  const handleOpenProjectDetail = useCallback((projectId: string) => {
    const p = projects.find(x => x.id === projectId);
    if (p) onOpenProjectDetail(p);
  }, [projects, onOpenProjectDetail]);

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

  if (!projects.length) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
        <p className="text-sm text-slate-500">Tidak ada proyek untuk Gantt chart.</p>
      </div>
    );
  }

  return (
    <div className={expandedView ? 'flex flex-col flex-1 min-h-0 gap-2' : 'space-y-3'}>
      <GanttToolbar
        projectCount={projects.length}
        projectView={projectView}
        onSetView={handleSetView}
        onScrollToToday={() => scrollToTodayRef.current?.()}
        onSave={saveAll}
      />

      <div
        className="relative flex bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden gantt-planner flex-1 min-h-0"
        style={{
          height: expandedView ? undefined : 'calc(100vh - 300px)',
          minHeight: expandedView ? 0 : 540,
        }}
      >
        <div style={{ width: leftWidth }} className="shrink-0 h-full overflow-hidden">
          <TaskListPanel
            rows={rows}
            onReorder={handleReorder}
            onEditTask={setEditTaskId}
            onOpenProjectDetail={handleOpenProjectDetail}
          />
        </div>

        <div
          className="w-1.5 shrink-0 cursor-col-resize hover:bg-emerald-200/60 active:bg-emerald-300 transition-colors z-10"
          onMouseDown={startResizeLeft}
          role="separator"
          aria-orientation="vertical"
        />

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
            <div className="w-72 xl:w-80 shrink-0 h-full overflow-hidden border-l border-slate-100">
              <GanttDetailPanel onEditTask={setEditTaskId} />
            </div>
          </>
        )}
      </div>

      {orgId && useGanttStore.getState().hasDraft && isDirty && (
        <div className="flex items-center justify-between px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl text-sm">
          <span className="text-blue-700">Draft tersimpan tersedia.</span>
          <button
            type="button"
            onClick={() => {
              const draft = loadGanttDraft(orgId);
              if (draft) {
                useGanttStore.getState().restoreSnapshot(draft.snapshot);
                showToast('Draft dipulihkan', 'success');
              }
            }}
            className="text-blue-600 font-bold hover:underline"
          >
            Pulihkan draft
          </button>
        </div>
      )}

      <GanttAdvancedFilterModal />

      <GanttUnsavedDialog
        open={unsavedOpen}
        hasDraft={useGanttStore.getState().hasDraft}
        onChoice={handleUnsavedChoice}
      />

      <AnimatePresence>
        {editTask && (
          <GanttEditModal
            key={editTask.id}
            task={editTask}
            project={editProject}
            onClose={() => setEditTaskId(null)}
            onSaved={() => setEditTaskId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
