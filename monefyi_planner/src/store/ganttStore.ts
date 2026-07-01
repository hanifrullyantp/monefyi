import { create } from 'zustand';
import type {
  GanttDependency,
  GanttDragState,
  GanttTask,
  GanttViewMode,
} from '../lib/gantt/types';

interface GanttState {
  orgId: string | null;
  tasks: GanttTask[];
  dependencies: GanttDependency[];
  projectOrder: string[];
  expandedIds: Set<string>;
  selectedIds: Set<string>;
  viewMode: GanttViewMode;
  zoomLevel: number;
  scrollLeft: number;
  detailOpen: boolean;
  leftWidth: number;
  rightWidth: number;
  drag: GanttDragState | null;
  searchQuery: string;
  filterStatus: string;
  editTaskId: string | null;

  init: (orgId: string) => void;
  setTasks: (tasks: GanttTask[]) => void;
  setDependencies: (deps: GanttDependency[]) => void;
  updateTask: (id: string, patch: Partial<GanttTask>) => void;
  setProjectOrder: (order: string[]) => void;
  toggleExpand: (id: string) => void;
  selectTask: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  setViewMode: (mode: GanttViewMode) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setScrollLeft: (v: number) => void;
  setDetailOpen: (v: boolean) => void;
  setLeftWidth: (v: number) => void;
  setRightWidth: (v: number) => void;
  setDrag: (drag: GanttDragState | null) => void;
  addDependency: (dep: GanttDependency) => void;
  removeDependency: (id: string) => void;
  setSearchQuery: (q: string) => void;
  setFilterStatus: (s: string) => void;
  setEditTaskId: (id: string | null) => void;
}

export const useGanttStore = create<GanttState>((set, get) => ({
  orgId: null,
  tasks: [],
  dependencies: [],
  projectOrder: [],
  expandedIds: new Set(),
  selectedIds: new Set(),
  viewMode: 'month',
  zoomLevel: 1,
  scrollLeft: 0,
  detailOpen: true,
  leftWidth: 280,
  rightWidth: 300,
  drag: null,
  searchQuery: '',
  filterStatus: 'all',
  editTaskId: null,

  init: orgId => {
    set({
      orgId,
      dependencies: [],
      expandedIds: new Set(),
      selectedIds: new Set(),
    });
  },

  setTasks: tasks => set({ tasks }),

  setDependencies: deps => set({ dependencies: deps }),

  updateTask: (id, patch) =>
    set(s => ({
      tasks: s.tasks.map(t => (t.id === id ? { ...t, ...patch } : t)),
    })),

  setProjectOrder: order => set({ projectOrder: order }),

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
        return { selectedIds: next, detailOpen: true };
      }
      return { selectedIds: new Set([id]), detailOpen: true };
    }),

  clearSelection: () => set({ selectedIds: new Set() }),

  setViewMode: mode => set({ viewMode: mode }),

  zoomIn: () =>
    set(s => {
      const modes: GanttViewMode[] = ['month', 'week', 'day'];
      const idx = modes.indexOf(s.viewMode);
      if (idx < modes.length - 1) return { viewMode: modes[idx + 1] };
      return s;
    }),

  zoomOut: () =>
    set(s => {
      const modes: GanttViewMode[] = ['month', 'week', 'day'];
      const idx = modes.indexOf(s.viewMode);
      if (idx > 0) return { viewMode: modes[idx - 1] };
      return s;
    }),

  setScrollLeft: v => set({ scrollLeft: v }),

  setDetailOpen: v => set({ detailOpen: v }),

  setLeftWidth: v => set({ leftWidth: Math.max(200, Math.min(480, v)) }),

  setRightWidth: v => set({ rightWidth: Math.max(240, Math.min(420, v)) }),

  setDrag: drag => set({ drag }),

  addDependency: dep => {
    const { dependencies } = get();
    if (dependencies.some(d => d.fromTaskId === dep.fromTaskId && d.toTaskId === dep.toTaskId)) return;
    set({ dependencies: [...dependencies, dep] });
  },

  removeDependency: id => {
    set(s => ({ dependencies: s.dependencies.filter(d => d.id !== id) }));
  },

  setSearchQuery: q => set({ searchQuery: q }),

  setFilterStatus: s => set({ filterStatus: s }),

  setEditTaskId: id => set({ editTaskId: id }),
}));
