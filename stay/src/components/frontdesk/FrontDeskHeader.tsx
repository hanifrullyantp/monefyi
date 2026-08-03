import { useLiveClock } from '../../hooks/useLiveClock';
import type { FrontDeskStatKey, FrontDeskStatSummary } from '../../types/frontdesk.types';
import { cn } from '../../utils/cn';

export interface FrontDeskHeaderProps {
  userName: string;
  stats: FrontDeskStatSummary;
  activeStatKey?: FrontDeskStatKey | null;
  onStatClick?: (key: FrontDeskStatKey) => void;
}

const STAT_ITEMS: {
  key: FrontDeskStatKey;
  label: string;
  getValue: (s: FrontDeskStatSummary) => number;
  accent?: string;
}[] = [
  { key: 'total', label: 'Total Kamar', getValue: (s) => s.totalRooms },
  { key: 'occupied', label: 'Terisi', getValue: (s) => s.occupied, accent: 'text-sage-700' },
  { key: 'available', label: 'Tersedia', getValue: (s) => s.available, accent: 'text-emerald-600' },
  { key: 'checkInToday', label: 'Check-in Hari Ini', getValue: (s) => s.checkInsToday, accent: 'text-blue-600' },
  { key: 'checkOutToday', label: 'Check-out Hari Ini', getValue: (s) => s.checkOutsToday, accent: 'text-indigo-mist-600' },
  {
    key: 'urgent',
    label: 'Perlu Perhatian',
    getValue: (s) => s.urgentCount,
    accent: 'text-coral-600',
  },
];

/**
 * Header Front Desk — sapaan personal, jam live, quick stats.
 */
export default function FrontDeskHeader({
  userName,
  stats,
  activeStatKey,
  onStatClick,
}: FrontDeskHeaderProps) {
  const clock = useLiveClock(userName);

  return (
    <header
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
      data-testid="front-desk-header"
    >
      {/* Section 1 — Greeting */}
      <div className="border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              <span className="mr-2" aria-hidden>
                {clock.greetingEmoji}
              </span>
              {clock.greetingLabel}
            </h1>
            <p className="mt-1 text-sm capitalize text-slate-500 dark:text-slate-400">
              {clock.dateLabel}
            </p>
          </div>
          <div
            className="font-mono text-3xl font-bold tabular-nums tracking-wider text-emerald-600 dark:text-emerald-400 sm:text-4xl"
            aria-live="polite"
            data-testid="live-clock"
          >
            {clock.time}
          </div>
        </div>
      </div>

      {/* Section 2 — Quick Stats */}
      <div className="grid grid-cols-2 gap-px bg-slate-100 dark:bg-slate-800 sm:grid-cols-3 lg:grid-cols-6">
        {STAT_ITEMS.map(({ key, label, getValue, accent }) => {
          const value = getValue(stats);
          const isActive = activeStatKey === key;
          const isUrgent = key === 'urgent' && value > 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onStatClick?.(key)}
              className={cn(
                'flex min-h-[88px] flex-col items-center justify-center gap-1 bg-white px-2 py-3 transition-colors dark:bg-slate-900',
                'hover:bg-slate-50 dark:hover:bg-slate-800/80',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset',
                isActive && 'bg-emerald-50 ring-2 ring-inset ring-emerald-400 dark:bg-emerald-950/40',
                isUrgent && !isActive && 'bg-coral-50/50 dark:bg-coral-950/20'
              )}
              data-testid={`stat-${key}`}
            >
              <span
                className={cn(
                  'text-2xl font-black tabular-nums sm:text-3xl',
                  accent ?? 'text-slate-800 dark:text-white',
                  isUrgent && 'animate-pulse-urgent rounded-lg px-1'
                )}
              >
                {value}
              </span>
              <span className="text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-500 dark:text-slate-400">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
