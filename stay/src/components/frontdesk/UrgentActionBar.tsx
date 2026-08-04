import { useCallback, useState } from 'react';
import { AlertTriangle, ChevronDown, Loader2, X } from 'lucide-react';
import type { UrgentAction } from '../../types/frontdesk.types';
import type { UrgentActionHandler } from '../../hooks/useUrgentActions';
import { cn } from '../../utils/cn';

export interface UrgentActionBarProps {
  actions: UrgentAction[];
  loadingId?: string | null;
  onAction: UrgentActionHandler;
  onDismiss: () => void;
  onViewAll?: () => void;
  compact?: boolean;
}

const MAX_VISIBLE = 3;

/**
 * Banner alert untuk kamar yang butuh aksi segera.
 */
export default function UrgentActionBar({
  actions,
  loadingId,
  onAction,
  onDismiss,
  onViewAll,
  compact = false,
}: UrgentActionBarProps) {
  const [expanded, setExpanded] = useState(false);

  const handleAction = useCallback(
    async (action: UrgentAction) => {
      await onAction(action);
    },
    [onAction]
  );

  if (actions.length === 0) return null;

  const visible = expanded ? actions : actions.slice(0, MAX_VISIBLE);
  const hasMore = actions.length > MAX_VISIBLE;

  if (compact && !expanded) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl border border-coral-200 bg-coral-50 px-3 py-2 dark:border-coral-800 dark:bg-coral-950/40"
        data-testid="urgent-action-bar"
        role="alert"
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-coral-600 animate-pulse-urgent" />
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="min-w-0 flex-1 truncate text-left text-xs font-bold text-coral-900 dark:text-coral-200"
        >
          {actions.length} perlu aksi segera — ketuk untuk detail
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded p-1 text-coral-500 hover:bg-coral-100"
          aria-label="Tutup"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-coral-200/80 bg-gradient-to-r from-coral-50 via-orange-50 to-amber-50 shadow-sm dark:border-coral-800/60 dark:from-coral-950/40 dark:via-orange-950/30 dark:to-amber-950/20"
      style={{ borderLeftWidth: 4, borderLeftColor: 'var(--color-coral-500)' }}
      data-testid="urgent-action-bar"
      role="alert"
    >
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <div
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral-100 text-coral-600 animate-pulse-urgent dark:bg-coral-900/60 dark:text-coral-300"
          aria-hidden
        >
          <AlertTriangle className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-black uppercase tracking-wide text-coral-900 dark:text-coral-200">
              ⚠️ Perlu Aksi Segera ({actions.length})
            </h2>
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 rounded-lg p-1.5 text-coral-600 opacity-70 transition hover:bg-coral-100 hover:opacity-100 dark:text-coral-300 dark:hover:bg-coral-900/50"
              aria-label="Tutup banner urgent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ul
            className={cn(
              'space-y-2',
              expanded && hasMore && 'max-h-48 overflow-y-auto pr-1'
            )}
          >
            {visible.map((action) => {
              const isLoading = loadingId === action.id;
              return (
                <li
                  key={action.id}
                  className="flex flex-col gap-2 rounded-xl border border-coral-100/80 bg-white/80 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between dark:border-coral-900/40 dark:bg-slate-900/60"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 dark:text-white">
                      [{action.title}]
                    </span>{' '}
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {action.description}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleAction(action)}
                    className={cn(
                      'inline-flex min-h-[36px] shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold',
                      'bg-coral-600 text-white hover:bg-coral-700 disabled:opacity-60',
                      'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-400'
                    )}
                    data-testid={`urgent-action-${action.id}`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      action.actionLabel
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {hasMore && (
            <button
              type="button"
              onClick={() => {
                if (expanded) {
                  onViewAll?.();
                } else {
                  setExpanded(true);
                }
              }}
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-coral-700 hover:text-coral-900 dark:text-coral-300"
            >
              {expanded ? 'Lihat Semua di Filter' : `Lihat Semua (${actions.length - MAX_VISIBLE} lagi)`}
              <ChevronDown className={cn('h-3.5 w-3.5 transition', expanded && 'rotate-180')} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
