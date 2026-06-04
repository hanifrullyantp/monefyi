import { create } from 'zustand';

export interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface UndoToastState {
  message: string;
  actionId: string;
}

interface UiState {
  toast: ToastState | null;
  undoToast: UndoToastState | null;
  showToast: (message: string, type?: ToastState['type']) => void;
  clearToast: () => void;
  showUndoToast: (message: string, actionId: string) => void;
  clearUndoToast: () => void;
}

export const useUiStore = create<UiState>(set => ({
  toast: null,
  undoToast: null,
  showToast: (message, type = 'info') => set({ toast: { message, type } }),
  clearToast: () => set({ toast: null }),
  showUndoToast: (message, actionId) => set({ undoToast: { message, actionId } }),
  clearUndoToast: () => set({ undoToast: null }),
}));

export function showToast(message: string, type: ToastState['type'] = 'info') {
  useUiStore.getState().showToast(message, type);
}
