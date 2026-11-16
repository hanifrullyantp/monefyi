import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Minus, Plus, Redo2, Route, Save, Undo2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import type { Project } from '../../../store/appStore';
import { useAppStore } from '../../../store/appStore';
import { useGanttStore } from '../../../store/ganttStore';
import { flattenTasks, isTaskOverProjectDeadline } from '../../../lib/gantt/utils';
import { computeCriticalPath } from '../../../lib/gantt/criticalPath';
import type { GanttTask } from '../../../lib/gantt/types';
import { useProjectGanttData, type AddProjectWorkItemInput } from '../gantt/useProjectGanttData';
import type { WorkItem, WorkItemExtendedMeta } from '../../../services/workItemService';
import TaskListPanel from '../gantt/TaskListPanel';
import GanttTimeline from '../gantt/GanttTimeline';
import GanttDetailPanel from '../gantt/GanttDetailPanel';
import GanttEditModal from '../gantt/GanttEditModal';
import GanttAddWorkItemModal from '../gantt/GanttAddWorkItemModal';
import GanttConflictDialog from '../gantt/GanttConflictDialog';
import GanttTodoModal from '../gantt/GanttTodoModal';

interface ProjectScheduleGanttProps {
  project: Project;
  workItems: WorkItem[];
  onRefresh: () => void;
}

export default function ProjectScheduleGantt({
  project,
  workItems,
  onRefresh,
}: ProjectScheduleGanttProps) {
  const tenant = useAppStore(s => s.tenant);
  const user = useAppStore(s => s.user);
  const {
    tasks,
    dependencies,
    expandedIds,
    selectedIds,
    selectTask,
    leftWidth,
    setLeftWidth,
    detailOpen,
    toggleDetailOpen,
    viewMode,
    setViewMode,
    zoomIn,
    zoomOut,
    editTaskId,
    setEditTaskId,
    todoModalTaskId,
    setTodoModalTaskId,
    addWorkItemProjectId,
    setAddWorkItemProjectId,
    showCriticalPath,
    toggleCriticalPath,
    undo,
    redo,
    undoStack,
    redoStack,
    isDirty,
    isSaving,
  } = useGanttStore();

  const {
    commitDates,
    saveAll,
    orgMembers,
    conflictState,
    resolveConflictReload,
    resolveConflictForceOverwrite,
    dismissConflict,
    handleAddWorkItem,
    handleDeleteTask,
    handleDuplicateTask,
    handleUpdateMeta,
    extendProjectEndDate,
  } = useProjectGanttData(project, workItems, tenant?.id, tenant?.currency);

  const scrollToTodayRef = useRef<(() => void) | null>(null);
  const scrollToTaskRef = useRef<((id: string) => void) | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addParentWorkItemId, setAddParentWorkItemId] = useState<string | null>(null);
  const [conflictBusy, setConflictBusy] = useState(false);
  const [extendingBanner, setExtendingBanner] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || !(e.ctrlKey || e.metaKey)) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  const rows = useMemo(
    () => flattenTasks(tasks, expandedIds, [project.id]),
    [tasks, expandedIds, project.id],
  );

  const cpm = useMemo(() => computeCriticalPath(tasks, dependencies), [tasks, dependencies]);

  const projectTask = tasks.find(t => t.type === 'project' && t.id === project.id);
  const effectiveProjectEndDate = projectTask?.endDate ?? project.end_date;

  const overDeadlineTasks = useMemo(
    () =>
      tasks.filter(
        t =>
          t.type !== 'project' &&
          t.projectId === project.id &&
          isTaskOverProjectDeadline(t.endDate, effectiveProjectEndDate),
      ),
    [tasks, project.id, effectiveProjectEndDate],
  );

  const maxOverrunEndDate = useMemo(() => {
    if (!overDeadlineTasks.length) return '';
    return overDeadlineTasks.reduce(
      (max, t) => (t.endDate > max ? t.endDate : max),
      overDeadlineTasks[0].endDate,
    );
  }, [overDeadlineTasks]);

  const editTask = editTaskId ? tasks.find(t => t.id === editTaskId) : null;
  const todoTask = todoModalTaskId ? tasks.find(t => t.id === todoModalTaskId) : null;
  const isAddOpen = addModalOpen || addWorkItemProjectId === project.id;

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

  const handleToggleDetail = () => {
    if (!detailOpen && selectedIds.size === 0) {
      const firstTask =
        tasks.find(t => t.type === 'work_item' && t.projectId === project.id) ??
        tasks.find(t => t.projectId === project.id) ??
        tasks[0];
      if (firstTask) {
        selectTask(firstTask.id);
      }
    }
    toggleDetailOpen();
  };

  const handleOpenAddSubTask = useCallback((task: GanttTask) => {
    setAddParentWorkItemId(task.type === 'work_item' ? task.id : null);
    setAddModalOpen(true);
  }, []);

  const handleCloseAddModal = () => {
    setAddModalOpen(false);
    setAddParentWorkItemId(null);
    if (addWorkItemProjectId === project.id) {
      setAddWorkItemProjectId(null);
    }
  };

  const handleSubmitAdd = async (data: AddProjectWorkItemInput): Promise<boolean> => {
    const ok = await handleAddWorkItem(data);
    if (ok) onRefresh();
    return ok;
  };

  const handleDeleteAndRefresh = useCallback(
    async (taskId: string): Promise<boolean> => {
      const ok = await handleDeleteTask(taskId);
      if (ok) onRefresh();
      return ok;
    },
    [handleDeleteTask, onRefresh],
  );

  const handleDuplicateAndRefresh = useCallback(
    async (taskId: string): Promise<boolean> => {
      const ok = await handleDuplicateTask(taskId);
      if (ok) onRefresh();
      return ok;
    },
    [handleDuplicateTask, onRefresh],
  );

  const handleExtendAndRefresh = useCallback(
    async (newEndDate: string): Promise<boolean> => {
      const ok = await extendProjectEndDate(newEndDate);
      if (ok) onRefresh();
      return ok;
    },
    [extendProjectEndDate, onRefresh],
  );

  const handleUpdateMetaAndRefresh = useCallback(
    async (taskId: string, patch: WorkItemExtendedMeta): Promise<boolean> => {
      const ok = await handleUpdateMeta(taskId, patch);
      if (ok) onRefresh();
      return ok;
    },
    [handleUpdateMeta, onRefresh],
  );

  const handleSave = async () => {
    const ok = await saveAll();
    if (ok) onRefresh();
  };

  return (
    <div className="space-y-2">
      {overDeadlineTasks.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 text-xs text-amber-800">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{overDeadlineTasks.length} pekerjaan</strong> melewati deadline proyek (
              {effectiveProjectEndDate}).
            </span>
          </div>
          {maxOverrunEndDate && (
            <button
              type="button"
              disabled={extendingBanner}
              onClick={async () => {
                setExtendingBanner(true);
                try {
                  await handleExtendAndRefresh(maxOverrunEndDate);
                } finally {
                  setExtendingBanner(false);
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 disabled:opacity-50 shrink-0"
            >
              {extendingBanner ? 'Memperpanjang...' : `Perpanjang ke ${maxOverrunEndDate}`}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 bg-white rounded-xl border border-slate-200 p-2">
        <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
          {(['day', 'week', 'month'] as const).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setViewMode(v)}
              className={`px-3 py-1 rounded-md capitalize ${
                viewMode === v ? 'bg-white shadow text-emerald-700' : 'text-slate-500'
              }`}
            >
              {v === 'day' ? 'Hari' : v === 'week' ? 'Minggu' : 'Bulan'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-1">
          <button
            type="button"
            onClick={zoomOut}
            className="p-1.5 hover:bg-slate-50 rounded"
            aria-label="Zoom out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={zoomIn}
            className="p-1.5 hover:bg-slate-50 rounded"
            aria-label="Zoom in"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => scrollToTodayRef.current?.()}
          className="px-3 py-1.5 text-xs font-bold text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50"
        >
          Hari Ini
        </button>

        <button
          type="button"
          onClick={toggleCriticalPath}
          aria-pressed={showCriticalPath}
          title="Sorot Jalur Kritis (Critical Path Method)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
            showCriticalPath
              ? 'border-red-300 bg-red-50 text-red-700'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Route className="w-3.5 h-3.5 shrink-0" />
          <span>Jalur Kritis (CPM)</span>
          {cpm.criticalTaskIds.size > 0 && (
            <span
              className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                showCriticalPath ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {cpm.criticalTaskIds.size} · {cpm.projectDurationDays}h
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setAddParentWorkItemId(null);
            setAddModalOpen(true);
          }}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
        >
          <Plus className="w-3.5 h-3.5" />
          Pekerjaan
        </button>

        <button
          type="button"
          onClick={handleToggleDetail}
          className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          {detailOpen ? 'Sembunyikan Panel' : 'Tampilkan Panel'}
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={undo}
            disabled={!undoStack.length}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!redoStack.length}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!isDirty || isSaving}
          className={`ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black ${
            isDirty
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-slate-100 text-slate-400'
          }`}
        >
          <Save className="w-3.5 h-3.5" />
          {isSaving ? 'Menyimpan...' : isDirty ? 'Simpan *' : 'Tersimpan'}
        </button>
      </div>

      <div
        className="relative flex bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden gantt-planner min-w-0"
        style={{ height: 'calc(100vh - 380px)', minHeight: 400 }}
      >
        <div
          style={{ width: leftWidth, minWidth: 160, maxWidth: '45vw' }}
          className="shrink-0 h-full overflow-hidden"
        >
          <TaskListPanel
            rows={rows}
            onReorder={() => {}}
            onEditTask={setEditTaskId}
            onAddSubTask={handleOpenAddSubTask}
            onDuplicateTask={handleDuplicateAndRefresh}
            onDeleteTask={handleDeleteAndRefresh}
          />
        </div>
        <div
          className="w-1.5 shrink-0 cursor-col-resize hover:bg-emerald-200/60 active:bg-emerald-300 z-10"
          onMouseDown={startResizeLeft}
          role="separator"
        />
        <GanttTimeline
          rows={rows}
          onCommitDates={commitDates}
          scrollToTodayRef={scrollToTodayRef}
          scrollToTaskRef={scrollToTaskRef}
          onEditTask={setEditTaskId}
          onAddSubTask={handleOpenAddSubTask}
          onDuplicateTask={handleDuplicateAndRefresh}
          onDeleteTask={handleDeleteAndRefresh}
        />
        {detailOpen && (
          <>
            <div className="w-1.5 shrink-0 bg-slate-100 hidden md:block" />
            <div className="w-full md:w-72 shrink-0 h-full overflow-hidden border-l border-slate-100 max-md:absolute max-md:right-0 max-md:top-0 max-md:bottom-0 max-md:z-20 max-md:shadow-xl max-md:bg-white">
              <GanttDetailPanel
                onEditTask={setEditTaskId}
                onAddSubTask={handleOpenAddSubTask}
                onDuplicateTask={handleDuplicateAndRefresh}
                onDeleteTask={handleDeleteAndRefresh}
                onUpdateMeta={handleUpdateMetaAndRefresh}
                members={orgMembers}
              />
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
            members={orgMembers}
            onClose={() => setEditTaskId(null)}
            onSaved={() => {
              setEditTaskId(null);
            }}
            onDuplicateTask={handleDuplicateAndRefresh}
            onDeleteTask={handleDeleteAndRefresh}
            onExtendProjectEndDate={(_, newEnd) => handleExtendAndRefresh(newEnd)}
          />
        )}
      </AnimatePresence>

      {isAddOpen && (
        <GanttAddWorkItemModal
          project={project}
          orgId={tenant?.id}
          existingTasks={tasks.filter(t => t.projectId === project.id && t.type !== 'project')}
          parentWorkItemId={addParentWorkItemId}
          members={orgMembers}
          onExtendProjectEndDate={handleExtendAndRefresh}
          onClose={handleCloseAddModal}
          onSubmit={handleSubmitAdd}
        />
      )}

      <GanttConflictDialog
        open={Boolean(conflictState)}
        taskName={conflictState?.taskName}
        message={conflictState?.message}
        localUpdatedAt={conflictState?.localUpdatedAt}
        serverUpdatedAt={conflictState?.serverUpdatedAt}
        busy={conflictBusy}
        onReloadLatest={async () => {
          setConflictBusy(true);
          try {
            await resolveConflictReload();
            onRefresh();
          } finally {
            setConflictBusy(false);
          }
        }}
        onForceOverwrite={async () => {
          setConflictBusy(true);
          try {
            const ok = await resolveConflictForceOverwrite();
            if (ok) onRefresh();
          } finally {
            setConflictBusy(false);
          }
        }}
        onCancel={dismissConflict}
      />

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
