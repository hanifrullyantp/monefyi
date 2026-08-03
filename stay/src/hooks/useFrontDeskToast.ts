import { useCallback, useState } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface FrontDeskToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

/**
 * Toast ringan untuk aksi urgent Front Desk.
 */
export function useFrontDeskToast() {
  const [toasts, setToasts] = useState<FrontDeskToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'success') => {
      const id = `toast-${Date.now()}`;
      setToasts((prev) => [...prev.slice(-2), { id, message, variant }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  return { toasts, showToast, dismiss };
}
