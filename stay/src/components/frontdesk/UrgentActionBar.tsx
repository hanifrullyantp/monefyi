import { useCallback, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, X } from 'lucide-react';
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
  const [listExpanded, setListExpanded] = useState(false);

  const handleAction = useCallback(
    async (action: UrgentAction) => {
      await onAction(action);
    },
    [onAction]
  );

  if (actions.length === 0) return null;

  const visible = listExpanded ? actions : actions.slice(0, MAX_VISIBLE);
  const hasMore = actions.length > MAX_VISIBLE;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-coral-200/80 bg-gradient-to-r from-coral-50 via-orange-50 to-amber-50 shadow-sm dark:border-coral-800/60 dark:from-coral-950/40 dark:via-orange-950/30 dark:to-amber-950/20',
        compact ? 'rounded-lg' : 'rounded-2xl'
      )}
      style={{ borderLeftWidth: 4, borderLeftColor: 'var(--color-coral-500)' }}
      data-testid="urgent-action-bar"
      role="alert"
    >
      <div className={cn('flex items-start gap-2', compact ? 'p-2.5 sm:p-3' : 'gap-3 p-4 sm:p-5')}>
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-coral-100 text-coral-600 animate-pulse-urgent dark:bg-coral-900/60 dark:text-coral-300',
            compact ? 'mt-0.5 h-7 w-7' : 'mt-0.5 h-9 w-9'
          )}
          aria-hidden
        >
          <AlertTriangle className={compact ? 'h-3.5 w-3.5' : 'h-5 w-5'} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2
              className={cn(
                'font-black uppercase tracking-wide text-coral-900 dark:text-coral-200',
                compact ? 'text-[10px]' : 'text-sm'
              )}
            >
              Perlu Aksi ({actions.length})
            </h2>
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 rounded-lg p-1 text-coral-600 opacity-70 transition hover:bg-coral-100 hover:opacity-100 dark:text-coral-300 dark:hover:bg-coral-900/50"
              aria-label="Sembunyikan banner (masih ada di notifikasi)"
              title="Sembunyikan — lihat lagi lewat notifikasi atau chip di bawah"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <ul className={cn('space-y-1.5', listExpanded && hasMore && 'max-h-40 overflow-y-auto pr-1')}>
            {visible.map((action) => {
              const isLoading = loadingId === action.id;
              return (
                <li
                  key={action.id}
                  className={cn(
                    'flex flex-col gap-1.5 rounded-lg border border-coral-100/80 bg-white/80 px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-coral-900/40 dark:bg-slate-900/60',
                    compact && 'py-1.5'
                  )}
                >
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {action.title}
                    </span>{' '}
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 sm:text-xs">
                      {action.description}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleAction(action)}
                    className={cn(
                      'inline-flex min-h-[32px] shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold sm:text-xs',
                      'bg-coral-600 text-white hover:bg-coral-700 disabled:opacity-60'
                    )}
                    data-testid={`urgent-action-${action.id}`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        ...
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
                if (listExpanded) {
                  onViewAll?.();
                } else {
                  setListExpanded(true);
                }
              }}
              className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-coral-700 hover:text-coral-900 dark:text-coral-300 sm:text-xs"
            >
              {listExpanded ? 'Lihat Semua di Filter' : `+${actions.length - MAX_VISIBLE} lagi`}
              <ChevronDown className={cn('h-3 w-3 transition', listExpanded && 'rotate-180')} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Chip kecil untuk buka kembali banner yang disembunyikan */
export function UrgentCollapsedChip({
  count,
  onExpand,
}: {
  count: number;
  onExpand: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className="flex w-full items-center gap-2 rounded-xl border border-coral-200 bg-coral-50 px-3 py-2 text-left transition hover:bg-coral-100 dark:border-coral-800 dark:bg-coral-950/40 dark:hover:bg-coral-950/60"
      data-testid="urgent-collapsed-chip"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-coral-600 animate-pulse-urgent" />
      <span className="flex-1 text-xs font-bold text-coral-900 dark:text-coral-200">
        {count} perlu aksi segera
      </span>
      <ChevronUp className="h-4 w-4 text-coral-500" />
    </button>
  );
}
