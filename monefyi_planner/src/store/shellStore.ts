import { create } from 'zustand';

export type BreadcrumbItem = {
  label: string;
  path?: string;
};

type ShellState = {
  breadcrumb: BreadcrumbItem[];
  projectId: string | null;
  onOpenRap: (() => void) | null;
  onOpenProgress: (() => void) | null;
  setShellMeta: (meta: {
    breadcrumb?: BreadcrumbItem[];
    projectId?: string | null;
    onOpenRap?: (() => void) | null;
    onOpenProgress?: (() => void) | null;
  }) => void;
  clearShellMeta: () => void;
};

export const useShellStore = create<ShellState>(set => ({
  breadcrumb: [],
  projectId: null,
  onOpenRap: null,
  onOpenProgress: null,
  setShellMeta: meta => set(state => ({
    breadcrumb: meta.breadcrumb ?? state.breadcrumb,
    projectId: meta.projectId !== undefined ? meta.projectId : state.projectId,
    onOpenRap: meta.onOpenRap !== undefined ? meta.onOpenRap : state.onOpenRap,
    onOpenProgress: meta.onOpenProgress !== undefined ? meta.onOpenProgress : state.onOpenProgress,
  })),
  clearShellMeta: () => set({
    breadcrumb: [],
    projectId: null,
    onOpenRap: null,
    onOpenProgress: null,
  }),
}));
