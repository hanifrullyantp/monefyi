import { CheckCircle, Info, X, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { FrontDeskToastItem } from '../../hooks/useFrontDeskToast';

interface FrontDeskToastProps {
  toasts: FrontDeskToastItem[];
  onDismiss: (id: string) => void;
}

const variantStyles = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  error: 'border-coral-300 bg-coral-50 text-coral-900 dark:border-coral-800 dark:bg-coral-950 dark:text-coral-200',
  info: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200',
};

export default function FrontDeskToast({ toasts, onDismiss }: FrontDeskToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[100] flex flex-col gap-2 sm:bottom-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            'flex min-w-[260px] max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg animate-in fade-in slide-in-from-bottom-2',
            variantStyles[toast.variant]
          )}
        >
          {toast.variant === 'success' && <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          {toast.variant === 'error' && <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          {toast.variant === 'info' && <Info className="mt-0.5 h-4 w-4 shrink-0" />}
          <p className="flex-1 text-sm font-semibold">{toast.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="shrink-0 opacity-60 hover:opacity-100"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
