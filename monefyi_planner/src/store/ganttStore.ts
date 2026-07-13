import { create } from 'zustand';
import type {
  GanttAdvancedFilters,
  GanttDependency,
  GanttDragState,
  GanttTask,
  GanttViewMode,
} from '../lib/gantt/types';
import { DEFAULT_ADVANCED_FILTERS as DEFAULT_FILTERS } from '../lib/gantt/types';
import { cloneSnapshot, pickSnapshot, snapshotsEqual, type GanttSnapshot } from '../lib/gantt/snapshot';
import { ZOOM_SCALE_MAX, ZOOM_SCALE_MIN, ZOOM_SCALE_STEP } from '../lib/gantt/constants';

const MAX_HISTORY = 50;

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

  init: (orgId: string) => void;
  setTasks: (tasks: GanttTask[]) => void;
  setDependencies: (deps: GanttDependency[]) => void;
  setBarColors: (colors: Record<string, string>) => void;
  commitBaseline: () => void;
  restoreSnapshot: (snap: GanttSnapshot) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  updateTask: (id: string, patch: Partial<GanttTask>, recordHistory?: boolean) => void;
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
  setBarColor: (taskId: string, color: string | null) => void;
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

  init: orgId => {
    set({
      orgId,
      dependencies: [],
      expandedIds: new Set(),
      selectedIds: new Set(),
      undoStack: [],
      redoStack: [],
      isDirty: false,
    });
  },

  getSnapshot: () => pickSnapshot(get()),

  commitBaseline: () => {
    const snap = pickSnapshot(get());
    set({ baseline: snap, isDirty: false, undoStack: [], redoStack: [] });
  },

  restoreSnapshot: snap => {
    set({
      tasks: cloneSnapshot(snap).tasks,
      dependencies: cloneSnapshot(snap).dependencies,
      projectOrder: [...snap.projectOrder],
      barColors: { ...snap.barColors },
      isDirty: computeDirty(snap, get().baseline),
    });
  },

  pushHistory: () => {
    const snap = pickSnapshot(get());
    set(s => ({
      undoStack: [...s.undoStack.slice(-(MAX_HISTORY - 1)), snap],
      redoStack: [],
    }));
  },

  undo: () => {
    const { undoStack, baseline } = get();
    if (!undoStack.length) return;
    const prev = undoStack[undoStack.length - 1];
    const current = pickSnapshot(get());
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, current],
    });
    get().restoreSnapshot(prev);
    set({ isDirty: computeDirty(prev, baseline) });
  },

  redo: () => {
    const { redoStack, baseline } = get();
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    const current = pickSnapshot(get());
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...get().undoStack, current],
    });
    get().restoreSnapshot(next);
    set({ isDirty: computeDirty(next, baseline) });
  },

  setTasks: tasks => {
    set({ tasks });
    set({ isDirty: computeDirty(get().getSnapshot(), get().baseline) });
  },

  setDependencies: deps => set({ dependencies: deps }),

  setBarColors: colors => set({ barColors: colors }),

  updateTask: (id, patch, recordHistory = true) => {
    if (recordHistory) get().pushHistory();
    set(s => ({
      tasks: s.tasks.map(t => (t.id === id ? { ...t, ...patch } : t)),
      isDirty: true,
    }));
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

  setBarColor: (taskId, color) => {
    get().pushHistory();
    set(s => {
      const next = { ...s.barColors };
      if (color) next[taskId] = color;
      else delete next[taskId];
      return {
        barColors: next,
        tasks: s.tasks.map(t => t.id === taskId ? { ...t, barColor: color || undefined } : t),
        isDirty: true,
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
}));
