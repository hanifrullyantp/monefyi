import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Copy,
  FolderOpen,
  GanttChart,
  LayoutList,
  ListChecks,
  PanelRightOpen,
  Pencil,
  Plus,
  Trash2,
  User,
} from 'lucide-react';
import type { Project } from '../../../store/appStore';
import { useAppStore } from '../../../store/appStore';
import { useGanttStore } from '../../../store/ganttStore';
import {
  flattenTasks,
  isTaskOverProjectDeadline,
  matchesAdvancedFilters,
} from '../../../lib/gantt/utils';
import { computeCriticalPath, type CriticalPathResult } from '../../../lib/gantt/criticalPath';
import { PRIORITY_BADGE_COLOR, WORK_ITEM_STATUS_LABEL } from '../../../lib/gantt/constants';
import { STATUS_LABEL } from '../../../utils/projectUi';
import type { FlatGanttRow, GanttTask } from '../../../lib/gantt/types';
import { saveGanttDraft, clearGanttDraft, loadGanttDraft } from '../../../services/ganttDraftService';
import {
  saveDemoWorkItems,
  updateWorkItemExtendedMeta,
  type WorkItemExtendedMeta,
} from '../../../services/workItemService';
import { isDemoOrInvalidUuid } from '../../../lib/demo/demoMode';
import { buildFallbackWorkItem, useGanttData } from './useGanttData';
import GanttToolbar from './GanttToolbar';
import TaskListPanel from './TaskListPanel';
import GanttTimeline from './GanttTimeline';
import GanttDetailPanel from './GanttDetailPanel';
import GanttEditModal from './GanttEditModal';
import GanttAdvancedFilterModal from './GanttAdvancedFilterModal';
import GanttUnsavedDialog, { type UnsavedChoice } from './GanttUnsavedDialog';
import GanttConflictDialog from './GanttConflictDialog';
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
  const isDemoMode = useAppStore(s => s.isDemoMode);
  const updateProject = useAppStore(s => s.updateProject);
  const showToast = useUiStore(s => s.showToast);
  const {
    tasks,
    dependencies,
    expandedIds,
    toggleExpand,
    selectTask,
    projectOrder,
    setProjectOrder,
    leftWidth,
    setLeftWidth,
    detailOpen,
    setDetailOpen,
    showCriticalPath,
    searchQuery,
    filterStatus,
    advancedFilters,
    hiddenProjectIds,
    editTaskId,
    setEditTaskId,
    isDirty,
    discardToBaseline,
    orgId,
    setHasDraft,
    undo,
    redo,
    expandedView,
    setExpandedView,
    miniDashboardProjectId,
    setMiniDashboardProjectId,
    editProjectId,
    setEditProjectId,
    addWorkItemProjectId,
    setAddWorkItemProjectId,
    todoModalTaskId,
    setTodoModalTaskId,
    conflictPrompt,
    setConflictPrompt,
  } = useGanttStore();

  const {
    commitDates,
    saveAll,
    workItemsRef,
    addWorkItem,
    deleteTaskItem,
    duplicateTaskItem,
    extendProjectEndDate,
    reloadFromRemote,
    orgMembers,
    isDemo,
  } = useGanttData(projects, tenant?.id, tenant?.currency);

  const scrollToTodayRef = useRef<(() => void) | null>(null);
  const scrollToTaskRef = useRef<((id: string) => void) | null>(null);
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const [conflictBusy, setConflictBusy] = useState(false);
  const [addParentWorkItemId, setAddParentWorkItemId] = useState<string | null>(null);
  const [mobileViewMode, setMobileViewMode] = useState<'list' | 'timeline'>('list');
  const pendingViewRef = useRef<ProjectView | null>(null);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const leaveResolveRef = useRef<((v: boolean) => void) | null>(null);

  const filteredTasks = useMemo(
    () =>
      tasks.filter(t => {
        const q = searchQuery.toLowerCase();
        const matchSearch =
          !q ||
          t.name.toLowerCase().includes(q) ||
          (t.code?.toLowerCase().includes(q) ?? false) ||
          (t.clientName?.toLowerCase().includes(q) ?? false);

        let matchFilter = true;
        if (filterStatus === 'active')
          matchFilter = t.status === 'active' || t.status === 'in_progress';
        else if (filterStatus === 'planning')
          matchFilter = t.status === 'planning' || t.status === 'draft' || t.status === 'pending';
        else if (filterStatus === 'at_risk')
          matchFilter = t.healthStatus === 'at_risk' || t.healthStatus === 'behind';
        else if (filterStatus === 'completed')
          matchFilter = t.status === 'completed' || t.status === 'archived';

        const matchAdvanced = matchesAdvancedFilters(t, advancedFilters);

        if (t.parentId && !matchSearch) {
          const parent = tasks.find(p => p.id === t.parentId);
          if (parent) {
            const parentMatch = !q || parent.name.toLowerCase().includes(q);
            return matchFilter && matchAdvanced && parentMatch;
          }
        }

        return matchSearch && matchFilter && matchAdvanced;
      }),
    [tasks, searchQuery, filterStatus, advancedFilters],
  );

  const visibleTasks = useMemo(
    () =>
      filteredTasks.filter(t => {
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

  const cpm = useMemo(() => computeCriticalPath(tasks, dependencies), [tasks, dependencies]);
  const projectEndDateMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tasks) {
      if (t.type === 'project') map.set(t.id, t.endDate);
    }
    return map;
  }, [tasks]);

  const editTask = editTaskId ? tasks.find(t => t.id === editTaskId) : null;
  const todoTask = todoModalTaskId ? tasks.find(t => t.id === todoModalTaskId) : null;
  const editProject =
    editTask?.type === 'project'
      ? projects.find(p => p.id === editTask.id)
      : editTask
        ? projects.find(p => p.id === editTask.projectId)
        : undefined;

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

  const runGuarded = useCallback(
    (action: () => void) => {
      if (!isDirty) {
        action();
        return;
      }
      pendingActionRef.current = action;
      setUnsavedOpen(true);
    },
    [isDirty],
  );

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
        const target = e.target as HTMLElement | null;
        const isEditable = Boolean(
          target &&
            (target.tagName === 'INPUT' ||
              target.tagName === 'TEXTAREA' ||
              target.tagName === 'SELECT' ||
              target.isContentEditable),
        );
        const keyLower = e.key.toLowerCase();
        if (!isEditable && keyLower === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
        }
        if (!isEditable && (keyLower === 'y' || (keyLower === 'z' && e.shiftKey))) {
          e.preventDefault();
          redo();
        }
        if (keyLower === 's') {
          e.preventDefault();
          void saveAll();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    undo,
    redo,
    saveAll,
    expandedView,
    setExpandedView,
    miniDashboardProjectId,
    setMiniDashboardProjectId,
  ]);

  useEffect(() => {
    if (!focusProjectId) return;
    useGanttStore.getState().selectTask(focusProjectId);
    useGanttStore.getState().setScrollToTaskId(focusProjectId);
  }, [focusProjectId]);

  const handleSetView = useCallback(
    async (v: ProjectView) => {
      if (v === projectView) return;
      if (isDirty) {
        pendingViewRef.current = v;
        setUnsavedOpen(true);
        return;
      }
      onSetView(v);
    },
    [isDirty, onSetView, projectView],
  );

  const handleUnsavedChoice = useCallback(
    async (choice: UnsavedChoice) => {
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
    },
    [saveAll, discardToBaseline, orgId, setHasDraft, showToast, onSetView],
  );

  const handleReorder = useCallback(
    (order: string[]) => {
      setProjectOrder(order);
    },
    [setProjectOrder],
  );

  const handleOpenProjectDetail = useCallback(
    (projectId: string) => {
      const p = projects.find(x => x.id === projectId);
      if (!p) return;
      runGuarded(() => onOpenProjectDetail(p));
    },
    [projects, onOpenProjectDetail, runGuarded],
  );

  const handleOpenAddSubTask = useCallback(
    (task: GanttTask) => {
      if (task.type === 'project') {
        setAddParentWorkItemId(null);
        setAddWorkItemProjectId(task.id);
      } else {
        setAddParentWorkItemId(task.id);
        setAddWorkItemProjectId(task.projectId);
      }
    },
    [setAddWorkItemProjectId],
  );

  const handleUpdateMeta = useCallback(
    async (taskId: string, patch: WorkItemExtendedMeta): Promise<boolean> => {
      const storeTask = useGanttStore.getState().tasks.find(t => t.id === taskId);
      if (!storeTask || storeTask.type === 'project') return false;

      try {
        const isDemoTask = isDemo || isDemoOrInvalidUuid(taskId, isDemoMode);
        let nextUpdatedAt: string | undefined;
        if (isDemoTask) {
          nextUpdatedAt = new Date().toISOString();
        } else {
          const metaRes = await updateWorkItemExtendedMeta(storeTask.projectId, taskId, patch);
          nextUpdatedAt = metaRes?.updated_at;
        }

        const hasExistingWi = workItemsRef.current.some(w => w.id === taskId);
        const baseList = hasExistingWi
          ? workItemsRef.current
          : [...workItemsRef.current, buildFallbackWorkItem(storeTask)];

        workItemsRef.current = baseList.map(w => {
          if (w.id !== taskId) return w;
          return {
            ...w,
            ...(patch.notes !== undefined ? { notes: patch.notes ?? [] } : {}),
            ...(patch.attachments !== undefined ? { attachments: patch.attachments ?? [] } : {}),
            ...(patch.priority !== undefined && patch.priority !== null
              ? { priority: patch.priority }
              : {}),
            ...(patch.assigned_member_id !== undefined
              ? { assigned_member_id: patch.assigned_member_id }
              : {}),
            ...(nextUpdatedAt ? { updated_at: nextUpdatedAt } : {}),
          };
        });

        if (isDemoTask) {
          saveDemoWorkItems(
            storeTask.projectId,
            workItemsRef.current.filter(w => w.project_id === storeTask.projectId),
          );
        }

        if (patch.notes !== undefined || patch.attachments !== undefined) {
          useGanttStore.getState().updateTaskExtendedMetaLocal(taskId, {
            ...(patch.notes !== undefined ? { notes: patch.notes ?? [] } : {}),
            ...(patch.attachments !== undefined ? { attachments: patch.attachments ?? [] } : {}),
            ...(nextUpdatedAt ? { updatedAt: nextUpdatedAt } : {}),
          });
        }

        if (patch.assigned_member_id !== undefined || patch.priority !== undefined) {
          const member = patch.assigned_member_id
            ? orgMembers.find(m => m.id === patch.assigned_member_id)
            : undefined;
          const memberName = member
            ? member.profile?.name || member.employee_id || member.position || undefined
            : undefined;

          const applyMetaPatch = (t: GanttTask): GanttTask => {
            if (t.id !== taskId) return t;
            const nextAssigneeId =
              patch.assigned_member_id !== undefined
                ? patch.assigned_member_id
                : t.assignedMemberId;
            return {
              ...t,
              ...(patch.priority !== undefined && patch.priority !== null
                ? { priority: patch.priority }
                : {}),
              ...(patch.assigned_member_id !== undefined
                ? {
                    assignedMemberId: nextAssigneeId ?? null,
                    assigneeId: nextAssigneeId ?? undefined,
                    assigneeName: nextAssigneeId ? memberName : undefined,
                  }
                : {}),
              ...(nextUpdatedAt ? { updatedAt: nextUpdatedAt } : {}),
            };
          };

          useGanttStore.setState(s => ({
            tasks: s.tasks.map(applyMetaPatch),
            baseline: s.baseline
              ? { ...s.baseline, tasks: s.baseline.tasks.map(applyMetaPatch) }
              : null,
            undoStack: s.undoStack.map(snap => ({ ...snap, tasks: snap.tasks.map(applyMetaPatch) })),
            redoStack: s.redoStack.map(snap => ({ ...snap, tasks: snap.tasks.map(applyMetaPatch) })),
          }));
        }

        return true;
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Gagal memperbarui detail pekerjaan', 'error');
        return false;
      }
    },
    [isDemo, isDemoMode, orgMembers, workItemsRef, showToast],
  );

  const startResizeLeft = useCallback(
    (e: React.MouseEvent) => {
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
    },
    [leftWidth, setLeftWidth],
  );

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

      <GanttMobileModeSwitch
        label={`Jadwal (${rows.length} item)`}
        mode={mobileViewMode}
        onChange={setMobileViewMode}
      />

      {mobileViewMode === 'list' && (
        <GanttMobileTaskList
          rows={rows}
          cpmMetrics={cpm.metrics}
          projectEndDateById={projectEndDateMap}
          showCriticalPath={showCriticalPath}
          emptyText="Tidak ada proyek atau pekerjaan yang sesuai filter."
          onToggleExpand={toggleExpand}
          onEditTask={setEditTaskId}
          onOpenDetail={id => {
            selectTask(id);
            setDetailOpen(true);
          }}
          onAddSubTask={handleOpenAddSubTask}
          onOpenTodo={setTodoModalTaskId}
          onDuplicateTask={duplicateTaskItem}
          onDeleteTask={deleteTaskItem}
          onOpenProjectDetail={handleOpenProjectDetail}
        />
      )}

      {/* Desktop split-pane Gantt (>=768px) or optional mobile horizontal-scroll timeline */}
      <div
        className={`${
          mobileViewMode === 'timeline' ? 'flex max-md:overflow-x-auto' : 'hidden md:flex'
        } relative bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden gantt-planner flex-1 min-h-0 min-w-0`}
        style={{
          height: expandedView ? undefined : 'calc(100vh - 300px)',
          minHeight: expandedView ? 0 : 480,
        }}
      >
        <div className="flex flex-1 min-h-0 min-w-[680px] md:min-w-0">
          <div
            style={{ width: leftWidth, minWidth: 160, maxWidth: '45vw' }}
            className="shrink-0 h-full overflow-hidden"
          >
            <TaskListPanel
              rows={rows}
              onReorder={handleReorder}
              onEditTask={setEditTaskId}
              onOpenProjectDetail={handleOpenProjectDetail}
              onAddSubTask={handleOpenAddSubTask}
              onDuplicateTask={duplicateTaskItem}
              onDeleteTask={deleteTaskItem}
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
            onAddSubTask={handleOpenAddSubTask}
            onDuplicateTask={duplicateTaskItem}
            onDeleteTask={deleteTaskItem}
          />

          {detailOpen && (
            <>
              <div className="w-1.5 shrink-0 bg-slate-100 hidden md:block" />
              <div className="hidden md:block w-72 xl:w-80 shrink-0 h-full overflow-hidden border-l border-slate-100">
                <GanttDetailPanel
                  onEditTask={setEditTaskId}
                  onAddSubTask={handleOpenAddSubTask}
                  onDuplicateTask={duplicateTaskItem}
                  onDeleteTask={deleteTaskItem}
                  onUpdateMeta={handleUpdateMeta}
                  members={orgMembers}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {detailOpen && (
        <GanttMobileDetailDrawer onClose={() => setDetailOpen(false)}>
          <GanttDetailPanel
            onEditTask={setEditTaskId}
            onAddSubTask={handleOpenAddSubTask}
            onDuplicateTask={duplicateTaskItem}
            onDeleteTask={deleteTaskItem}
            onUpdateMeta={handleUpdateMeta}
            members={orgMembers}
          />
        </GanttMobileDetailDrawer>
      )}

      {orgId && useGanttStore.getState().hasDraft && isDirty && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl text-sm">
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

      <GanttConflictDialog
        open={Boolean(conflictPrompt)}
        taskName={conflictPrompt?.taskName}
        message={conflictPrompt?.message}
        localUpdatedAt={conflictPrompt?.localUpdatedAt}
        serverUpdatedAt={conflictPrompt?.serverUpdatedAt}
        busy={conflictBusy}
        onReloadLatest={async () => {
          setConflictBusy(true);
          try {
            await reloadFromRemote(false, { forceDiscardLocal: true });
          } finally {
            setConflictBusy(false);
          }
        }}
        onForceOverwrite={async () => {
          setConflictBusy(true);
          try {
            await saveAll({ forceOverwrite: true });
          } finally {
            setConflictBusy(false);
          }
        }}
        onCancel={() => setConflictPrompt(null)}
      />

      <AnimatePresence>
        {editTask && (
          <GanttEditModal
            key={editTask.id}
            task={editTask}
            project={editProject}
            members={orgMembers}
            onClose={() => setEditTaskId(null)}
            onSaved={() => setEditTaskId(null)}
            onDuplicateTask={duplicateTaskItem}
            onDeleteTask={deleteTaskItem}
            onExtendProjectEndDate={extendProjectEndDate}
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
          orgId={tenant?.id}
          existingTasks={tasks.filter(
            t => t.projectId === addWorkItemProject.id && t.type !== 'project',
          )}
          parentWorkItemId={addParentWorkItemId}
          members={orgMembers}
          onExtendProjectEndDate={newEnd =>
            extendProjectEndDate(addWorkItemProject.id, newEnd)
          }
          onClose={() => {
            setAddWorkItemProjectId(null);
            setAddParentWorkItemId(null);
          }}
          onSubmit={data => addWorkItem(addWorkItemProject.id, data)}
        />
      )}

      {editProjectModal && (
        <EditProjectModal
          project={editProjectModal}
          onClose={() => setEditProjectId(null)}
          onSaved={updated => {
            updateProject(updated.id, updated);
            useGanttStore.getState().updateTask(
              updated.id,
              {
                name: updated.name,
                startDate: updated.start_date,
                endDate: updated.end_date,
                progress: updated.progress_percentage,
                status: updated.status,
              },
              false,
            );
            setEditProjectId(null);
          }}
        />
      )}
    </div>
  );
}

/** Mobile (<768px) toggle between List-First view and horizontal-scroll Timeline view. */
export function GanttMobileModeSwitch({
  label,
  mode,
  onChange,
}: {
  label: string;
  mode: 'list' | 'timeline';
  onChange: (next: 'list' | 'timeline') => void;
}) {
  return (
    <div className="md:hidden flex items-center justify-between gap-2 bg-white rounded-xl border border-slate-200 px-3 py-2">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
        <button
          type="button"
          onClick={() => onChange('list')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
            mode === 'list' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'
          }`}
        >
          <LayoutList className="w-3.5 h-3.5" />
          <span>Daftar</span>
        </button>
        <button
          type="button"
          onClick={() => onChange('timeline')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
            mode === 'timeline' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'
          }`}
        >
          <GanttChart className="w-3.5 h-3.5" />
          <span>Timeline</span>
        </button>
      </div>
    </div>
  );
}

/** Mobile (<768px) card/list-first Gantt view with full wrapping titles and direct tap actions. */
export function GanttMobileTaskList({
  rows,
  cpmMetrics,
  projectEndDateById,
  showCriticalPath,
  emptyText,
  onToggleExpand,
  onEditTask,
  onOpenDetail,
  onAddSubTask,
  onOpenTodo,
  onDuplicateTask,
  onDeleteTask,
  onOpenProjectDetail,
}: {
  rows: FlatGanttRow[];
  cpmMetrics: CriticalPathResult['metrics'];
  projectEndDateById: Map<string, string>;
  showCriticalPath: boolean;
  emptyText: string;
  onToggleExpand: (id: string) => void;
  onEditTask: (id: string) => void;
  onOpenDetail: (id: string) => void;
  onAddSubTask: (task: GanttTask) => void;
  onOpenTodo: (id: string) => void;
  onDuplicateTask: (id: string) => void | Promise<unknown>;
  onDeleteTask: (id: string) => void | Promise<unknown>;
  onOpenProjectDetail?: (projectId: string) => void;
}) {
  return (
    <div className="md:hidden space-y-2.5">
      {rows.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500 px-4">
          {emptyText}
        </div>
      ) : (
        rows.map(row => {
          const { task, depth, hasChildren, isExpanded } = row;
          const isProject = task.type === 'project';
          const projectEndDate = projectEndDateById.get(task.projectId);
          const isCritical =
            !isProject && (cpmMetrics[task.id]?.isCritical ?? task.isCritical ?? false);
          const isOverDeadline =
            !isProject && isTaskOverProjectDeadline(task.endDate, projectEndDate);
          const prioMeta = PRIORITY_BADGE_COLOR[task.priority] ?? PRIORITY_BADGE_COLOR.medium;
          const progressPct = Math.min(100, Math.max(0, Math.round(task.progress)));
          const statusLabel = isProject
            ? STATUS_LABEL[task.status as keyof typeof STATUS_LABEL] || task.status
            : WORK_ITEM_STATUS_LABEL[task.status] || task.status;
          const statusBadgeClass =
            task.status === 'completed' || task.status === 'archived'
              ? 'bg-emerald-100 text-emerald-700'
              : task.status === 'active' || task.status === 'in_progress'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-600';

          return (
            <div
              key={task.id}
              className={`rounded-2xl border p-3.5 space-y-2.5 shadow-xs ${
                isProject
                  ? 'bg-emerald-50/40 border-emerald-200'
                  : 'bg-white border-slate-200'
              } ${depth >= 2 ? 'ml-3 border-l-4 border-l-emerald-300' : ''} ${
                showCriticalPath && isCritical ? 'border-l-4 border-l-red-500 bg-red-50/20' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-1.5 min-w-0 flex-1">
                  {hasChildren && (
                    <button
                      type="button"
                      onClick={() => onToggleExpand(task.id)}
                      aria-label={isExpanded ? 'Tutup sub pekerjaan' : 'Buka sub pekerjaan'}
                      className="p-1 -ml-1 rounded-lg hover:bg-slate-200/70 text-slate-500 shrink-0 mt-0.5"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <div className="min-w-0 flex-1">
                    {isProject && task.code && (
                      <span className="inline-block text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded mb-1">
                        {task.code}
                      </span>
                    )}
                    <h4 className="text-sm font-bold text-slate-900 break-words [overflow-wrap:anywhere] leading-snug">
                      {task.name}
                    </h4>
                    {isProject && task.clientName && (
                      <p className="text-xs text-slate-500 break-words mt-0.5">
                        Klien: {task.clientName}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${statusBadgeClass}`}
                >
                  {statusLabel}
                </span>
              </div>

              {!isProject && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${prioMeta.badgeClass}`}
                  >
                    {prioMeta.label}
                  </span>
                  {showCriticalPath && isCritical && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white">
                      CPM · Kritis
                    </span>
                  )}
                  {isOverDeadline && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      Melewati Deadline
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span className="tabular-nums">
                    {task.startDate.slice(0, 10)} → {task.endDate.slice(0, 10)}
                  </span>
                </span>
                {task.assigneeName && (
                  <span className="inline-flex items-center gap-1 text-slate-700 font-medium break-words">
                    <User className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span>{task.assigneeName}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      task.status === 'completed' || task.status === 'archived'
                        ? 'bg-emerald-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-700 tabular-nums shrink-0">
                  {progressPct}%
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onEditTask(task.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDetail(task.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <PanelRightOpen className="w-3.5 h-3.5" />
                  Detail
                </button>
                <button
                  type="button"
                  onClick={() => onAddSubTask(task)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isProject ? 'Tambah' : 'Sub Tugas'}
                </button>
                {isProject && onOpenProjectDetail ? (
                  <button
                    type="button"
                    onClick={() => onOpenProjectDetail(task.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold ml-auto"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Buka Proyek
                  </button>
                ) : !isProject ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onOpenTodo(task.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-blue-600 hover:bg-blue-50"
                    >
                      <ListChecks className="w-3.5 h-3.5" />
                      Todo
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDuplicateTask(task.id)}
                      aria-label={`Duplikasi ${task.name}`}
                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          typeof window === 'undefined' ||
                          window.confirm(`Hapus pekerjaan "${task.name}"?`)
                        ) {
                          void onDeleteTask(task.id);
                        }
                      }}
                      aria-label={`Hapus ${task.name}`}
                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-600 hover:bg-rose-100 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/** Mobile (<768px) slide-over container for GanttDetailPanel. */
export function GanttMobileDetailDrawer({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="md:hidden fixed inset-0 z-50 bg-black/40 flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-white shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
