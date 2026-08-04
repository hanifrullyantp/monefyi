import { ChevronDown, ChevronUp } from 'lucide-react';
import { useLiveClock } from '../../hooks/useLiveClock';
import type { FrontDeskStatKey, FrontDeskStatSummary } from '../../types/frontdesk.types';
import { cn } from '../../utils/cn';
import LiveClockDisplay from './LiveClockDisplay';

export type DashboardHeaderMode = 'compact' | 'expanded';

const STORAGE_KEY = 'stay-dashboard-header-mode';

export function readDashboardHeaderMode(): DashboardHeaderMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'compact' || stored === 'expanded') return stored;
  } catch {
    /* ignore */
  }
  return 'compact';
}

export function persistDashboardHeaderMode(mode: DashboardHeaderMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export interface FrontDeskHeaderProps {
  userName: string;
  stats: FrontDeskStatSummary;
  activeStatKey?: FrontDeskStatKey | null;
  onStatClick?: (key: FrontDeskStatKey) => void;
  mode?: DashboardHeaderMode;
  onModeChange?: (mode: DashboardHeaderMode) => void;
}

const STAT_ITEMS: {
  key: FrontDeskStatKey;
  label: string;
  short: string;
  getValue: (s: FrontDeskStatSummary) => number;
  accent?: string;
}[] = [
  { key: 'total', label: 'Total Kamar', short: 'Tot', getValue: (s) => s.totalRooms },
  { key: 'occupied', label: 'Terisi', short: 'Isi', getValue: (s) => s.occupied, accent: 'text-emerald-700' },
  { key: 'available', label: 'Tersedia', short: 'Sedia', getValue: (s) => s.available, accent: 'text-emerald-600' },
  { key: 'checkInToday', label: 'Check-in Hari Ini', short: 'In', getValue: (s) => s.checkInsToday, accent: 'text-blue-600' },
  { key: 'checkOutToday', label: 'Check-out Hari Ini', short: 'Out', getValue: (s) => s.checkOutsToday, accent: 'text-indigo-600' },
  { key: 'urgent', label: 'Perlu Perhatian', short: '!', getValue: (s) => s.urgentCount, accent: 'text-coral-600' },
];

/**
 * Header Front Desk — mode ringkas (default) atau expanded dengan stat penuh.
 */
export default function FrontDeskHeader({
  userName,
  stats,
  activeStatKey,
  onStatClick,
  mode = 'compact',
  onModeChange,
}: FrontDeskHeaderProps) {
  const clock = useLiveClock(userName);
  const isCompact = mode === 'compact';

  const toggleMode = () => {
    const next = isCompact ? 'expanded' : 'compact';
    persistDashboardHeaderMode(next);
    onModeChange?.(next);
  };

  if (isCompact) {
    return (
      <header
        className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
        data-testid="front-desk-header"
      >
        <div className="flex items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm" aria-hidden>
                {clock.greetingEmoji}
              </span>
              <p className="truncate text-xs font-bold text-slate-800 dark:text-white sm:text-sm">
                {clock.greetingLabel.split(',')[0]}, {userName}
              </p>
            </div>
            <p className="truncate text-[10px] capitalize text-slate-500 dark:text-slate-400">
              {clock.dateLabel}
            </p>
          </div>

          <LiveClockDisplay time={clock.time} compact />

          <div className="hidden items-center gap-0.5 sm:flex">
            {STAT_ITEMS.map(({ key, short, getValue, accent }) => {
              const value = getValue(stats);
              const isActive = activeStatKey === key;
              const isUrgent = key === 'urgent' && value > 0;
              return (
                <button
                  key={key}
                  type="button"
                  title={STAT_ITEMS.find((s) => s.key === key)?.label}
                  onClick={() => onStatClick?.(key)}
                  className={cn(
                    'flex min-w-[32px] flex-col items-center rounded-lg px-1 py-0.5 transition-colors',
                    'hover:bg-slate-50 dark:hover:bg-slate-800',
                    isActive && 'bg-emerald-50 ring-1 ring-emerald-300 dark:bg-emerald-950/40',
                    isUrgent && !isActive && 'bg-coral-50 dark:bg-coral-950/30'
                  )}
                  data-testid={`stat-${key}`}
                >
                  <span className={cn('text-sm font-black tabular-nums', accent ?? 'text-slate-800 dark:text-white')}>
                    {value}
                  </span>
                  <span className="text-[8px] font-bold uppercase text-slate-400">{short}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={toggleMode}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Perbesar dashboard"
            title="Perbesar dashboard"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* Stat scroll row — mobile only */}
        <div className="flex gap-1 overflow-x-auto border-t border-slate-100 px-2 py-1.5 sm:hidden dark:border-slate-800">
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
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1',
                  isActive
                    ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80',
                  isUrgent && !isActive && 'border-coral-200 bg-coral-50'
                )}
                data-testid={`stat-mobile-${key}`}
              >
                <span className={cn('text-sm font-black tabular-nums', accent ?? 'text-slate-800')}>
                  {value}
                </span>
                <span className="text-[9px] font-bold uppercase text-slate-500">{label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </header>
    );
  }

  return (
    <header
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
      data-testid="front-desk-header"
    >
      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              <span className="mr-2" aria-hidden>
                {clock.greetingEmoji}
              </span>
              {clock.greetingLabel}
            </h1>
            <p className="mt-0.5 text-sm capitalize text-slate-500 dark:text-slate-400">
              {clock.dateLabel}
            </p>
          </div>
          <LiveClockDisplay time={clock.time} />
          <button
            type="button"
            onClick={toggleMode}
            className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Perkecil dashboard"
            title="Perkecil dashboard"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px bg-slate-100 dark:bg-slate-800 sm:grid-cols-6">
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
                'flex min-h-[72px] flex-col items-center justify-center gap-0.5 bg-white px-2 py-2 transition-colors dark:bg-slate-900',
                'hover:bg-slate-50 dark:hover:bg-slate-800/80',
                isActive && 'bg-emerald-50 ring-2 ring-inset ring-emerald-400 dark:bg-emerald-950/40',
                isUrgent && !isActive && 'bg-coral-50/50 dark:bg-coral-950/20'
              )}
              data-testid={`stat-${key}`}
            >
              <span
                className={cn(
                  'text-2xl font-black tabular-nums',
                  accent ?? 'text-slate-800 dark:text-white',
                  isUrgent && 'animate-pulse-urgent'
                )}
              >
                {value}
              </span>
              <span className="text-center text-[9px] font-bold uppercase leading-tight tracking-wide text-slate-500 dark:text-slate-400">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
