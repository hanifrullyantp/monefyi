import { create } from 'zustand';

export interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UiState {
  toast: ToastState | null;
  showToast: (message: string, type?: ToastState['type']) => void;
  clearToast: () => void;
}

export const useUiStore = create<UiState>(set => ({
  toast: null,
  showToast: (message, type = 'info') => set({ toast: { message, type } }),
  clearToast: () => set({ toast: null }),
}));

export function showToast(message: string, type: ToastState['type'] = 'info') {
  useUiStore.getState().showToast(message, type);
}
