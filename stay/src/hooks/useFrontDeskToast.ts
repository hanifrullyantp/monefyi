import { useCallback, useRef, useState } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'urgent';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface FrontDeskToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  title?: string;
  action?: ToastAction;
  /** Progress 0–100 for long operations; undefined = no bar */
  progress?: number;
  durationMs?: number;
}

const VARIANT_DURATION: Record<ToastVariant, number> = {
  success: 4000,
  error: 6000,
  warning: 5000,
  info: 4000,
  urgent: 8000,
};

const MAX_VISIBLE = 4;

/**
 * Toast queue dengan progress bar, action buttons, dan prioritas urgent.
 */
export function useFrontDeskToast() {
  const [toasts, setToasts] = useState<FrontDeskToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const scheduleDismiss = useCallback(
    (id: string, durationMs: number) => {
      const existing = timersRef.current.get(id);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => dismiss(id), durationMs);
      timersRef.current.set(id, timer);
    },
    [dismiss]
  );

  const showToast = useCallback(
    (
      message: string,
      variant: ToastVariant = 'success',
      options?: {
        title?: string;
        action?: ToastAction;
        progress?: number;
        durationMs?: number;
      }
    ) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = options?.durationMs ?? VARIANT_DURATION[variant];
      const item: FrontDeskToastItem = {
        id,
        message,
        variant,
        title: options?.title,
        action: options?.action,
        progress: options?.progress,
        durationMs: duration,
      };

      setToasts((prev) => {
        const sorted = variant === 'urgent' ? [item, ...prev] : [...prev, item];
        return sorted.slice(-MAX_VISIBLE);
      });

      if (options?.progress === undefined) {
        scheduleDismiss(id, duration);
      }

      return id;
    },
    [scheduleDismiss]
  );

  const updateToast = useCallback(
    (id: string, patch: Partial<Pick<FrontDeskToastItem, 'message' | 'progress' | 'variant'>>) => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
      );
      if (patch.progress === 100) {
        scheduleDismiss(id, 1500);
      }
    },
    [scheduleDismiss]
  );

  return { toasts, showToast, dismiss, updateToast };
}

export type ShowToastFn = ReturnType<typeof useFrontDeskToast>['showToast'];
