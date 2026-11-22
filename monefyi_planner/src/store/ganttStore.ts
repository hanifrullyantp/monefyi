import { create } from 'zustand';
import type {
  GanttAdvancedFilters,
  GanttDependency,
  GanttDragState,
  GanttTask,
  GanttViewMode,
  WorkItemAttachment,
  WorkItemNote,
} from '../lib/gantt/types';
import { DEFAULT_ADVANCED_FILTERS as DEFAULT_FILTERS } from '../lib/gantt/types';
import { cloneSnapshot, pickSnapshot, snapshotsEqual, type GanttSnapshot } from '../lib/gantt/snapshot';
import { ZOOM_SCALE_MAX, ZOOM_SCALE_MIN, ZOOM_SCALE_STEP } from '../lib/gantt/constants';

const MAX_HISTORY = 50;

export interface GanttConflictInfo {
  workItemId: string;
  taskName: string;
  localUpdatedAt?: string | null;
  serverUpdatedAt?: string | null;
  message: string;
}

function collectDescendantTaskIds(rootId: string, tasks: GanttTask[]): Set<string> {
  const removed = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const t of tasks) {
      if (t.parentId && removed.has(t.parentId) && !removed.has(t.id)) {
        removed.add(t.id);
        changed = true;
      }
    }
  }
  return removed;
}

function computeDirty(current: GanttSnapshot | null, baseline: GanttSnapshot | null): boolean {
  return !snapshotsEqual(current, baseline);
}

interface GanttState {
  orgId: string | null;
  tasks: GanttTask[];
  dependencies: GanttDependency[];
  projectOrder: string[];
  barColors: Record<string, string>;
  baseline: GanttSnapshot | null;
  undoStack: GanttSnapshot[];
  redoStack: GanttSnapshot[];
  expandedIds: Set<string>;
  selectedIds: Set<string>;
  viewMode: GanttViewMode;
  scrollLeft: number;
  scrollToTaskId: string | null;
  detailOpen: boolean;
  leftWidth: number;
  rightWidth: number;
  drag: GanttDragState | null;
  searchQuery: string;
  filterStatus: string;
  advancedFilters: GanttAdvancedFilters;
  showAdvancedFilters: boolean;
  editTaskId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  hasDraft: boolean;
  expandedView: boolean;
  zoomScale: number;
  hiddenProjectIds: Set<string>;
  miniDashboardProjectId: string | null;
  editProjectId: string | null;
  addWorkItemProjectId: string | null;
  todoModalTaskId: string | null;
  showCriticalPath: boolean;
  conflictPrompt: GanttConflictInfo | null;

  init: (orgId: string) => void;
  setTasks: (tasks: GanttTask[]) => void;
  setDependencies: (deps: GanttDependency[], recordHistory?: boolean) => void;
  setBarColors: (colors: Record<string, string>) => void;
  commitBaseline: () => void;
  restoreSnapshot: (snap: GanttSnapshot) => void;
  pushHistory: (snapshot?: GanttSnapshot) => void;
  undo: () => void;
  redo: () => void;
  updateTask: (id: string, patch: Partial<GanttTask>, recordHistory?: boolean) => void;
  updateMultipleTasks: (
    updates: Array<{ id: string; patch: Partial<GanttTask> }>,
    recordHistory?: boolean,
  ) => void;
  addTask: (
    task: GanttTask,
    options?:
      | boolean
      | {
          recordHistory?: boolean;
          syncBaseline?: boolean;
          expandParent?: boolean;
          dependencies?: GanttDependency[];
        },
  ) => void;
  removeTask: (
    id: string,
    options?: boolean | { recordHistory?: boolean; syncBaseline?: boolean },
  ) => void;
  updateTaskExtendedMetaLocal: (
    taskId: string,
    patch: {
      notes?: WorkItemNote[];
      attachments?: WorkItemAttachment[];
      updatedAt?: string;
    },
  ) => void;
  setProjectOrder: (order: string[]) => void;
  toggleExpand: (id: string) => void;
  selectTask: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  setViewMode: (mode: GanttViewMode) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setScrollLeft: (v: number) => void;
  setScrollToTaskId: (id: string | null) => void;
  setDetailOpen: (v: boolean) => void;
  toggleDetailOpen: () => void;
  setLeftWidth: (v: number) => void;
  setRightWidth: (v: number) => void;
  setDrag: (drag: GanttDragState | null) => void;
  addDependency: (dep: GanttDependency) => void;
  removeDependency: (id: string) => void;
  setSearchQuery: (q: string) => void;
  setFilterStatus: (s: string) => void;
  setAdvancedFilters: (f: Partial<GanttAdvancedFilters>) => void;
  resetAdvancedFilters: () => void;
  setShowAdvancedFilters: (v: boolean) => void;
  setEditTaskId: (id: string | null) => void;
  setBarColor: (
    taskId: string,
    color: string | null,
    options?: boolean | { skipHistory?: boolean },
  ) => void;
  setIsSaving: (v: boolean) => void;
  setHasDraft: (v: boolean) => void;
  getSnapshot: () => GanttSnapshot;
  discardToBaseline: () => void;
  toggleExpandedView: () => void;
  setExpandedView: (v: boolean) => void;
  setZoomScale: (v: number) => void;
  toggleHideProject: (id: string) => void;
  setMiniDashboardProjectId: (id: string | null) => void;
  setEditProjectId: (id: string | null) => void;
  setAddWorkItemProjectId: (id: string | null) => void;
  setTodoModalTaskId: (id: string | null) => void;
  setShowCriticalPath: (v: boolean) => void;
  toggleCriticalPath: () => void;
  setConflictPrompt: (conflict: GanttConflictInfo | null) => void;
}

export const useGanttStore = create<GanttState>((set, get) => ({
  orgId: null,
  tasks: [],
  dependencies: [],
  projectOrder: [],
  barColors: {},
  baseline: null,
  undoStack: [],
  redoStack: [],
  expandedIds: new Set(),
  selectedIds: new Set(),
  viewMode: 'month',
  scrollLeft: 0,
  scrollToTaskId: null,
  detailOpen: false,
  leftWidth: 280,
  rightWidth: 300,
  drag: null,
  searchQuery: '',
  filterStatus: 'all',
  advancedFilters: { ...DEFAULT_FILTERS },
  showAdvancedFilters: false,
  editTaskId: null,
  isDirty: false,
  isSaving: false,
  hasDraft: false,
  expandedView: false,
  zoomScale: 1,
  hiddenProjectIds: new Set(),
  miniDashboardProjectId: null,
  editProjectId: null,
  addWorkItemProjectId: null,
  todoModalTaskId: null,
  showCriticalPath: true,
  conflictPrompt: null,

  init: orgId => {
    set({
      orgId,
      dependencies: [],
      expandedIds: new Set(),
      selectedIds: new Set(),
      undoStack: [],
      redoStack: [],
      isDirty: false,
      conflictPrompt: null,
    });
  },

  getSnapshot: () => pickSnapshot(get()),

  commitBaseline: () => {
    const snap = pickSnapshot(get());
    set({ baseline: snap, isDirty: false, undoStack: [], redoStack: [] });
  },

  restoreSnapshot: snap => {
    const cloned = cloneSnapshot(snap);
    const nextBarColors = { ...(cloned.barColors || {}) };
    const syncedTasks = cloned.tasks.map(t => ({
      ...t,
      barColor: nextBarColors[t.id] || undefined,
    }));
    const normalizedSnap: GanttSnapshot = {
      tasks: syncedTasks,
      dependencies: cloned.dependencies,
      projectOrder: [...cloned.projectOrder],
      barColors: nextBarColors,
    };
    set({
      tasks: normalizedSnap.tasks,
      dependencies: normalizedSnap.dependencies,
      projectOrder: normalizedSnap.projectOrder,
      barColors: normalizedSnap.barColors,
      isDirty: computeDirty(normalizedSnap, get().baseline),
    });
  },

  pushHistory: snapshot => {
    const isSnap = snapshot && typeof snapshot === 'object' && Array.isArray(snapshot.tasks);
    const snap = isSnap ? cloneSnapshot(snapshot) : pickSnapshot(get());
    set(s => {
      const top = s.undoStack[s.undoStack.length - 1];
      if (top && snapshotsEqual(top, snap)) {
        return s.redoStack.length ? { redoStack: [] } : s;
      }
      return {
        undoStack: [...s.undoStack.slice(-(MAX_HISTORY - 1)), snap],
        redoStack: [],
      };
    });
  },

  undo: () => {
    const { undoStack } = get();
    if (!undoStack.length) return;
    const prev = undoStack[undoStack.length - 1];
    const current = pickSnapshot(get());
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, current],
    });
    get().restoreSnapshot(prev);
  },

  redo: () => {
    const { redoStack } = get();
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    const current = pickSnapshot(get());
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...get().undoStack, current],
    });
    get().restoreSnapshot(next);
  },

  setTasks: tasks => {
    set({ tasks });
    set({ isDirty: computeDirty(get().getSnapshot(), get().baseline) });
  },

  setDependencies: (deps, recordHistory = false) => {
    if (recordHistory) get().pushHistory();
    set({ dependencies: deps });
    if (recordHistory || get().baseline) {
      set({ isDirty: computeDirty(get().getSnapshot(), get().baseline) });
    }
  },

  setBarColors: colors =>
    set(s => ({
      barColors: { ...colors },
      tasks: s.tasks.map(t => ({
        ...t,
        barColor: colors[t.id] || undefined,
      })),
    })),

  updateTask: (id, patch, recordHistory = true) => {
    if (recordHistory) get().pushHistory();
    set(s => ({
      tasks: s.tasks.map(t => (t.id === id ? { ...t, ...patch } : t)),
      isDirty: true,
    }));
    set({ isDirty: computeDirty(get().getSnapshot(), get().baseline) });
  },

  updateMultipleTasks: (updates, recordHistory = true) => {
    if (!updates.length) return;
    if (recordHistory) get().pushHistory();
    const byId = new Map(updates.map(u => [u.id, u.patch]));
    set(s => ({
      tasks: s.tasks.map(t => {
        const patch = byId.get(t.id);
        return patch ? { ...t, ...patch } : t;
      }),
    }));
    set({ isDirty: computeDirty(get().getSnapshot(), get().baseline) });
  },

  addTask: (task, options = false) => {
    const recordHistory = typeof options === 'boolean' ? options : (options?.recordHistory ?? false);
    const syncBaseline = typeof options === 'boolean' ? false : Boolean(options?.syncBaseline);
    const expandParent = typeof options === 'boolean' ? true : (options?.expandParent ?? true);
    const extraDeps = typeof options === 'boolean' ? [] : (options?.dependencies ?? []);

    if (recordHistory) get().pushHistory();

    set(s => {
      const exists = s.tasks.some(t => t.id === task.id);
      const nextTasks = exists
        ? s.tasks.map(t => (t.id === task.id ? task : t))
        : [...s.tasks, task];

      const existingDepIds = new Set(s.dependencies.map(d => d.id));
      const newDeps = extraDeps.filter(d => !existingDepIds.has(d.id));
      const nextDeps = newDeps.length ? [...s.dependencies, ...newDeps] : s.dependencies;

      const nextExpanded = expandParent
        ? new Set([
            ...s.expandedIds,
            ...(task.projectId ? [task.projectId] : []),
            ...(task.parentId ? [task.parentId] : []),
          ])
        : s.expandedIds;

      let nextBaseline = s.baseline;
      if (syncBaseline && s.baseline) {
        const baseCloned = cloneSnapshot(s.baseline);
        const taskClone = JSON.parse(JSON.stringify(task)) as GanttTask;
        const baseExists = baseCloned.tasks.some(t => t.id === task.id);
        baseCloned.tasks = baseExists
          ? baseCloned.tasks.map(t => (t.id === task.id ? taskClone : t))
          : [...baseCloned.tasks, taskClone];
        if (newDeps.length) {
          const baseDepIds = new Set(baseCloned.dependencies.map(d => d.id));
          for (const d of newDeps) {
            if (!baseDepIds.has(d.id)) {
              baseCloned.dependencies.push({ ...d });
            }
          }
        }
        nextBaseline = baseCloned;
      }

      return {
        tasks: nextTasks,
        dependencies: nextDeps,
        expandedIds: nextExpanded,
        baseline: nextBaseline,
      };
    });
    set({ isDirty: computeDirty(get().getSnapshot(), get().baseline) });
  },

  removeTask: (id, options = true) => {
    const recordHistory = typeof options === 'boolean' ? options : (options?.recordHistory ?? false);
    const syncBaseline = typeof options === 'boolean' ? false : Boolean(options?.syncBaseline);
    const currentTasks = get().tasks;
    if (!currentTasks.some(t => t.id === id)) return;

    if (recordHistory) get().pushHistory();

    const removedIds = collectDescendantTaskIds(id, currentTasks);

    set(s => {
      const nextTasks = s.tasks.filter(t => !removedIds.has(t.id));
      const nextDeps = s.dependencies.filter(
        d => !removedIds.has(d.fromTaskId) && !removedIds.has(d.toTaskId),
      );
      const nextBarColors = { ...s.barColors };
      for (const rid of removedIds) {
        delete nextBarColors[rid];
      }
      const nextSelected = new Set([...s.selectedIds].filter(sid => !removedIds.has(sid)));

      let nextBaseline = s.baseline;
      if (syncBaseline && s.baseline) {
        const baseCloned = cloneSnapshot(s.baseline);
        baseCloned.tasks = baseCloned.tasks.filter(t => !removedIds.has(t.id));
        baseCloned.dependencies = baseCloned.dependencies.filter(
          d => !removedIds.has(d.fromTaskId) && !removedIds.has(d.toTaskId),
        );
        for (const rid of removedIds) {
          delete baseCloned.barColors[rid];
        }
        nextBaseline = baseCloned;
      }

      return {
        tasks: nextTasks,
        dependencies: nextDeps,
        barColors: nextBarColors,
        selectedIds: nextSelected,
        editTaskId: s.editTaskId && removedIds.has(s.editTaskId) ? null : s.editTaskId,
        todoModalTaskId: s.todoModalTaskId && removedIds.has(s.todoModalTaskId) ? null : s.todoModalTaskId,
        baseline: nextBaseline,
      };
    });
    set({ isDirty: computeDirty(get().getSnapshot(), get().baseline) });
  },

  updateTaskExtendedMetaLocal: (taskId, patch) => {
    const applyPatch = (t: GanttTask): GanttTask => {
      if (t.id !== taskId) return t;
      const notes = patch.notes !== undefined ? patch.notes : t.notes;
      const attachments = patch.attachments !== undefined ? patch.attachments : t.attachments;
      return {
        ...t,
        ...(patch.notes !== undefined ? { notes, notesCount: notes?.length ?? 0 } : {}),
        ...(patch.attachments !== undefined
          ? { attachments, attachmentsCount: attachments?.length ?? 0 }
          : {}),
        ...(patch.updatedAt !== undefined ? { updatedAt: patch.updatedAt } : {}),
      };
    };

    set(s => {
      const nextTasks = s.tasks.map(applyPatch);
      const nextBaseline = s.baseline
        ? { ...cloneSnapshot(s.baseline), tasks: s.baseline.tasks.map(applyPatch) }
        : null;
      const nextUndo = s.undoStack.map(snap => ({
        ...snap,
        tasks: snap.tasks.map(applyPatch),
      }));
      const nextRedo = s.redoStack.map(snap => ({
        ...snap,
        tasks: snap.tasks.map(applyPatch),
      }));
      return {
        tasks: nextTasks,
        baseline: nextBaseline,
        undoStack: nextUndo,
        redoStack: nextRedo,
      };
    });
    set({ isDirty: computeDirty(get().getSnapshot(), get().baseline) });
  },

  setProjectOrder: order => {
    get().pushHistory();
    set({ projectOrder: order, isDirty: true });
    set({ isDirty: computeDirty(get().getSnapshot(), get().baseline) });
  },

  toggleExpand: id =>
    set(s => {
      const next = new Set(s.expandedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { expandedIds: next };
    }),

  selectTask: (id, multi = false) =>
    set(s => {
      if (multi) {
        const next = new Set(s.selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { selectedIds: next, scrollToTaskId: id };
      }
      return { selectedIds: new Set([id]), scrollToTaskId: id };
    }),

  clearSelection: () => set({ selectedIds: new Set() }),

  setViewMode: mode => set({ viewMode: mode }),

  zoomIn: () =>
    set(s => {
      if (s.zoomScale < ZOOM_SCALE_MAX) {
        return { zoomScale: Math.min(ZOOM_SCALE_MAX, +(s.zoomScale + ZOOM_SCALE_STEP).toFixed(2)) };
      }
      const modes: GanttViewMode[] = ['month', 'week', 'day'];
      const idx = modes.indexOf(s.viewMode);
      if (idx < modes.length - 1) return { viewMode: modes[idx + 1], zoomScale: 1 };
      return s;
    }),

  zoomOut: () =>
    set(s => {
      if (s.zoomScale > ZOOM_SCALE_MIN) {
        return { zoomScale: Math.max(ZOOM_SCALE_MIN, +(s.zoomScale - ZOOM_SCALE_STEP).toFixed(2)) };
      }
      const modes: GanttViewMode[] = ['month', 'week', 'day'];
      const idx = modes.indexOf(s.viewMode);
      if (idx > 0) return { viewMode: modes[idx - 1], zoomScale: 1 };
      return s;
    }),

  setScrollLeft: v => set({ scrollLeft: v }),

  setScrollToTaskId: id => set({ scrollToTaskId: id }),

  setDetailOpen: v => set({ detailOpen: v }),

  toggleDetailOpen: () => set(s => ({ detailOpen: !s.detailOpen })),

  setLeftWidth: v => set({ leftWidth: Math.max(200, Math.min(480, v)) }),

  setRightWidth: v => set({ rightWidth: Math.max(240, Math.min(420, v)) }),

  setDrag: drag => set({ drag }),

  addDependency: dep => {
    const { dependencies } = get();
    if (dependencies.some(d => d.fromTaskId === dep.fromTaskId && d.toTaskId === dep.toTaskId)) return;
    get().pushHistory();
    set({
      dependencies: [...dependencies, dep],
      isDirty: true,
    });
    set({ isDirty: computeDirty(get().getSnapshot(), get().baseline) });
  },

  removeDependency: id => {
    get().pushHistory();
    set(s => ({
      dependencies: s.dependencies.filter(d => d.id !== id),
      isDirty: true,
    }));
    set({ isDirty: computeDirty(get().getSnapshot(), get().baseline) });
  },

  setSearchQuery: q => set({ searchQuery: q }),

  setFilterStatus: s => set({ filterStatus: s }),

  setAdvancedFilters: f =>
    set(s => ({ advancedFilters: { ...s.advancedFilters, ...f } })),

  resetAdvancedFilters: () => set({ advancedFilters: { ...DEFAULT_FILTERS } }),

  setShowAdvancedFilters: v => set({ showAdvancedFilters: v }),

  setEditTaskId: id => set({ editTaskId: id }),

  setBarColor: (taskId, color, options = true) => {
    const shouldRecord = typeof options === 'boolean' ? options : !options?.skipHistory;
    const nextColor = color || undefined;
    const currentState = get();
    const prevColor = currentState.barColors[taskId] || undefined;
    const prevTaskColor = currentState.tasks.find(t => t.id === taskId)?.barColor || undefined;
    if (prevColor === nextColor && prevTaskColor === nextColor) {
      return;
    }
    if (shouldRecord) get().pushHistory();
    set(s => {
      const next = { ...s.barColors };
      if (nextColor) next[taskId] = nextColor;
      else delete next[taskId];
      return {
        barColors: next,
        tasks: s.tasks.map(t => (t.id === taskId ? { ...t, barColor: nextColor } : t)),
      };
    });
    set({ isDirty: computeDirty(get().getSnapshot(), get().baseline) });
  },

  setIsSaving: v => set({ isSaving: v }),

  setHasDraft: v => set({ hasDraft: v }),

  discardToBaseline: () => {
    const { baseline } = get();
    if (!baseline) return;
    get().restoreSnapshot(baseline);
    set({ isDirty: false, undoStack: [], redoStack: [] });
  },

  toggleExpandedView: () => set(s => ({ expandedView: !s.expandedView })),

  setExpandedView: v => set({ expandedView: v }),

  setZoomScale: v => set({ zoomScale: Math.max(ZOOM_SCALE_MIN, Math.min(ZOOM_SCALE_MAX, v)) }),

  toggleHideProject: id =>
    set(s => {
      const next = new Set(s.hiddenProjectIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { hiddenProjectIds: next };
    }),

  setMiniDashboardProjectId: id => set({ miniDashboardProjectId: id }),

  setEditProjectId: id => set({ editProjectId: id }),

  setAddWorkItemProjectId: id => set({ addWorkItemProjectId: id }),

  setTodoModalTaskId: id => set({ todoModalTaskId: id }),

  setShowCriticalPath: v => set({ showCriticalPath: v }),

  toggleCriticalPath: () => set(s => ({ showCriticalPath: !s.showCriticalPath })),

  setConflictPrompt: conflict => set({ conflictPrompt: conflict }),
}));
