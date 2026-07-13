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
import GanttMiniProjectDashboard from './GanttMiniProjectDashboard';
import GanttAddWorkItemModal from './GanttAddWorkItemModal';
import GanttTodoModal from './GanttTodoModal';
import EditProjectModal from '../EditProjectModal';
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
  onOpenProjectDetail,
}: GanttPlannerViewProps) {
  const tenant = useAppStore(s => s.tenant);
  const user = useAppStore(s => s.user);
  const updateProject = useAppStore(s => s.updateProject);
  const showToast = useUiStore(s => s.showToast);
  const {
    tasks, expandedIds, projectOrder, setProjectOrder,
    leftWidth, setLeftWidth, detailOpen,
    searchQuery, filterStatus, advancedFilters, hiddenProjectIds,
    editTaskId, setEditTaskId, isDirty, discardToBaseline,
    orgId, setHasDraft, undo, redo, expandedView, setExpandedView,
    miniDashboardProjectId, setMiniDashboardProjectId,
    editProjectId, setEditProjectId,
    addWorkItemProjectId, setAddWorkItemProjectId,
    todoModalTaskId, setTodoModalTaskId,
  } = useGanttStore();

  const { commitDates, saveAll, addWorkItem } = useGanttData(projects, tenant?.id, tenant?.currency);
  const scrollToTodayRef = useRef<(() => void) | null>(null);
  const scrollToTaskRef = useRef<((id: string) => void) | null>(null);
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const pendingViewRef = useRef<ProjectView | null>(null);
  const pendingActionRef = useRef<(() => void) | null>(null);
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

  const visibleTasks = useMemo(
    () => filteredTasks.filter(t => {
      if (t.type === 'project' && hiddenProjectIds.has(t.id)) return false;
      if (t.parentId && hiddenProjectIds.has(t.parentId)) return false;
      return true;
    }),
    [filteredTasks, hiddenProjectIds],
  );

  const rows = useMemo(
    () => flattenTasks(visibleTasks, expandedIds, projectOrder),
    [visibleTasks, expandedIds, projectOrder],
  );

  const editTask = editTaskId ? tasks.find(t => t.id === editTaskId) : null;
  const todoTask = todoModalTaskId ? tasks.find(t => t.id === todoModalTaskId) : null;
  const editProject = editTask?.type === 'project'
    ? projects.find(p => p.id === editTask.id)
    : editTask ? projects.find(p => p.id === editTask.projectId) : undefined;

  const miniDashboardProject = miniDashboardProjectId
    ? projects.find(p => p.id === miniDashboardProjectId)
    : null;
  const addWorkItemProject = addWorkItemProjectId
    ? projects.find(p => p.id === addWorkItemProjectId)
    : null;
  const editProjectModal = editProjectId
    ? projects.find(p => p.id === editProjectId)
    : null;

  const promptLeave = useCallback((): Promise<boolean> => {
    if (!isDirty) return Promise.resolve(true);
    return new Promise(resolve => {
      leaveResolveRef.current = resolve;
      setUnsavedOpen(true);
    });
  }, [isDirty]);

  const runGuarded = useCallback((action: () => void) => {
    if (!isDirty) {
      action();
      return;
    }
    pendingActionRef.current = action;
    setUnsavedOpen(true);
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
      if (e.key === 'Escape') {
        if (miniDashboardProjectId) setMiniDashboardProjectId(null);
        else if (expandedView) setExpandedView(false);
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
        if (e.key === 's') { e.preventDefault(); saveAll(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, saveAll, expandedView, setExpandedView, miniDashboardProjectId, setMiniDashboardProjectId]);

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
    const pendingAction = pendingActionRef.current;
    pendingViewRef.current = null;
    pendingActionRef.current = null;

    if (choice === 'cancel') {
      leaveResolveRef.current?.(false);
      leaveResolveRef.current = null;
      return;
    }

    if (choice === 'save') {
      const ok = await saveAll();
      if (!ok) {
        pendingViewRef.current = pendingView;
        pendingActionRef.current = pendingAction;
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
    else pendingAction?.();
  }, [saveAll, discardToBaseline, orgId, setHasDraft, showToast, onSetView]);

  const handleReorder = useCallback((order: string[]) => {
    setProjectOrder(order);
  }, [setProjectOrder]);

  const handleOpenProjectDetail = useCallback((projectId: string) => {
    const p = projects.find(x => x.id === projectId);
    if (!p) return;
    runGuarded(() => onOpenProjectDetail(p));
  }, [projects, onOpenProjectDetail, runGuarded]);

  const handleOpenMiniDashboard = useCallback((projectId: string) => {
    setMiniDashboardProjectId(projectId);
  }, [setMiniDashboardProjectId]);

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
        className="relative flex bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden gantt-planner flex-1 min-h-0 min-w-0"
        style={{
          height: expandedView ? undefined : 'calc(100vh - 300px)',
          minHeight: expandedView ? 0 : 480,
        }}
      >
        <div style={{ width: leftWidth, minWidth: 160, maxWidth: '45vw' }} className="shrink-0 h-full overflow-hidden">
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
          onOpenProjectDetail={handleOpenProjectDetail}
        />

        {detailOpen && (
          <>
            <div className="w-1.5 shrink-0 bg-slate-100 hidden md:block" />
            <div className="w-full md:w-72 xl:w-80 shrink-0 h-full overflow-hidden border-l border-slate-100 max-md:absolute max-md:right-0 max-md:top-0 max-md:bottom-0 max-md:z-20 max-md:shadow-xl max-md:bg-white">
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

      {todoTask && tenant?.id && (
        <GanttTodoModal
          task={todoTask}
          orgId={tenant.id}
          userId={user?.id}
          onClose={() => setTodoModalTaskId(null)}
        />
      )}

      {miniDashboardProject && tenant?.id && (
        <GanttMiniProjectDashboard
          project={miniDashboardProject}
          orgId={tenant.id}
          onClose={() => setMiniDashboardProjectId(null)}
          onOpenDetail={() => {
            setMiniDashboardProjectId(null);
            handleOpenProjectDetail(miniDashboardProject.id);
          }}
        />
      )}

      {addWorkItemProject && (
        <GanttAddWorkItemModal
          project={addWorkItemProject}
          onClose={() => setAddWorkItemProjectId(null)}
          onSubmit={data => addWorkItem(addWorkItemProject.id, data)}
        />
      )}

      {editProjectModal && (
        <EditProjectModal
          project={editProjectModal}
          onClose={() => setEditProjectId(null)}
          onSaved={updated => {
            updateProject(updated.id, updated);
            useGanttStore.getState().updateTask(updated.id, {
              name: updated.name,
              startDate: updated.start_date,
              endDate: updated.end_date,
              progress: updated.progress_percentage,
              status: updated.status,
            }, false);
            setEditProjectId(null);
          }}
        />
      )}
    </div>
  );
}
