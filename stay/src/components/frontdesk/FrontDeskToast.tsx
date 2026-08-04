import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Info,
  Siren,
  X,
  XCircle,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import type { FrontDeskToastItem } from '../../hooks/useFrontDeskToast';
import { playSound } from '../../utils/sounds';

interface FrontDeskToastProps {
  toasts: FrontDeskToastItem[];
  onDismiss: (id: string) => void;
}

const variantConfig: Record<
  FrontDeskToastItem['variant'],
  { icon: typeof CheckCircle; styles: string; playedSound: 'success' | 'error' | 'ting' }
> = {
  success: {
    icon: CheckCircle,
    styles:
      'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    playedSound: 'success',
  },
  error: {
    icon: XCircle,
    styles:
      'border-coral-300 bg-coral-50 text-coral-900 dark:border-coral-800 dark:bg-coral-950 dark:text-coral-200',
    playedSound: 'error',
  },
  warning: {
    icon: AlertTriangle,
    styles:
      'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
    playedSound: 'ting',
  },
  info: {
    icon: Info,
    styles:
      'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200',
    playedSound: 'ting',
  },
  urgent: {
    icon: Siren,
    styles:
      'border-red-400 bg-red-50 text-red-900 ring-2 ring-red-300 dark:border-red-700 dark:bg-red-950 dark:text-red-200 dark:ring-red-800',
    playedSound: 'ting',
  },
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: FrontDeskToastItem;
  onDismiss: (id: string) => void;
}) {
  const [entered, setEntered] = useState(false);
  const config = variantConfig[toast.variant];
  const Icon = config.icon;

  useEffect(() => {
    playSound(config.playedSound);
    requestAnimationFrame(() => setEntered(true));
  }, [config.playedSound]);

  return (
    <div
      role="status"
      aria-live={toast.variant === 'urgent' ? 'assertive' : 'polite'}
      data-testid={`frontdesk-toast-${toast.variant}`}
      className={cn(
        'relative flex min-w-[280px] max-w-sm flex-col gap-2 overflow-hidden rounded-xl border px-4 py-3 shadow-lg transition-all duration-300',
        config.styles,
        entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          {toast.title && (
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
              STAY · {toast.title}
            </p>
          )}
          <p className="text-sm font-semibold leading-snug">{toast.message}</p>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                onDismiss(toast.id);
              }}
              className="mt-2 text-xs font-bold underline underline-offset-2 hover:opacity-80"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 opacity-60 hover:opacity-100"
          aria-label="Tutup notifikasi"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {toast.progress !== undefined && (
        <div
          className="h-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
          role="progressbar"
          aria-valuenow={toast.progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${Math.min(100, toast.progress)}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function FrontDeskToast({ toasts, onDismiss }: FrontDeskToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 right-4 z-[100] flex flex-col gap-2 sm:bottom-6"
      aria-label="Notifikasi"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
