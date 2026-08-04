import { cn } from '../../utils/cn';

const LEGEND_ITEMS = [
  { color: 'bg-emerald-500', label: 'Terisi' },
  { color: 'border border-emerald-200 bg-white dark:border-slate-600 dark:bg-slate-800', label: 'Tersedia' },
  { color: 'bg-amber-400', label: 'Dirty' },
  { color: 'bg-slate-400', label: 'Maint' },
  { color: 'bg-red-400', label: 'Belum Bayar' },
] as const;

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('h-2.5 w-2.5 shrink-0 rounded-sm', color)} aria-hidden />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
    </div>
  );
}

export interface RoomStatusLegendProps {
  className?: string;
  viewMode?: string;
}

/**
 * Legenda status kamar — inline di toolbar, tidak menutupi bottom nav.
 */
export default function RoomStatusLegend({ className, viewMode }: RoomStatusLegendProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3 dark:border-slate-800',
        className
      )}
      data-testid="room-status-legend"
      aria-label="Legenda status kamar"
    >
      {LEGEND_ITEMS.map((item) => (
        <LegendItem key={item.label} {...item} />
      ))}
      {viewMode && (
        <span className="ml-auto hidden text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:inline">
          View: {viewMode}
        </span>
      )}
    </div>
  );
}
