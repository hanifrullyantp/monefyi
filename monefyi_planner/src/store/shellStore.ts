import { create } from 'zustand';

export type BreadcrumbItem = {
  label: string;
  path?: string;
};

type ShellState = {
  breadcrumb: BreadcrumbItem[];
  projectId: string | null;
  hideRightPanel: boolean;
  onOpenRap: (() => void) | null;
  onOpenProgress: (() => void) | null;
  estimatorCode: string | null;
  onEstimatorBack: (() => void) | null;
  setShellMeta: (meta: {
    breadcrumb?: BreadcrumbItem[];
    projectId?: string | null;
    hideRightPanel?: boolean;
    onOpenRap?: (() => void) | null;
    onOpenProgress?: (() => void) | null;
    estimatorCode?: string | null;
    onEstimatorBack?: (() => void) | null;
  }) => void;
  clearShellMeta: () => void;
};

export const useShellStore = create<ShellState>(set => ({
  breadcrumb: [],
  projectId: null,
  hideRightPanel: false,
  onOpenRap: null,
  onOpenProgress: null,
  estimatorCode: null,
  onEstimatorBack: null,
  setShellMeta: meta => set(state => ({
    breadcrumb: meta.breadcrumb ?? state.breadcrumb,
    projectId: meta.projectId !== undefined ? meta.projectId : state.projectId,
    hideRightPanel: meta.hideRightPanel !== undefined ? meta.hideRightPanel : state.hideRightPanel,
    onOpenRap: meta.onOpenRap !== undefined ? meta.onOpenRap : state.onOpenRap,
    onOpenProgress: meta.onOpenProgress !== undefined ? meta.onOpenProgress : state.onOpenProgress,
    estimatorCode: meta.estimatorCode !== undefined ? meta.estimatorCode : state.estimatorCode,
    onEstimatorBack: meta.onEstimatorBack !== undefined ? meta.onEstimatorBack : state.onEstimatorBack,
  })),
  clearShellMeta: () => set({
    breadcrumb: [],
    projectId: null,
    hideRightPanel: false,
    onOpenRap: null,
    onOpenProgress: null,
    estimatorCode: null,
    onEstimatorBack: null,
  }),
}));
