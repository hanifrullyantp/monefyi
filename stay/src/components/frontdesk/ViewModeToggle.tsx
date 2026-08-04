import { useCallback, useEffect, useState } from 'react';
import { Calendar, LayoutGrid, Map } from 'lucide-react';
import type { ViewMode } from '../../types/frontdesk.types';
import { cn } from '../../utils/cn';

const STORAGE_KEY = 'stay-frontdesk-view-mode';

export interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  enableLegacyViews?: boolean;
}

const OPTIONS: {
  mode: ViewMode;
  label: string;
  icon: typeof LayoutGrid;
  legacy?: boolean;
}[] = [
  { mode: 'grid', label: 'Grid View', icon: LayoutGrid },
  { mode: 'floorplan', label: 'Denah Lantai', icon: Map, legacy: true },
  { mode: 'timeline', label: 'Timeline', icon: Calendar, legacy: true },
];

export function readViewModePreference(): ViewMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'grid' || raw === 'floorplan' || raw === 'timeline') return raw;
  } catch {
    /* ignore */
  }
  return 'grid';
}

export function persistViewMode(mode: ViewMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

/**
 * Toggle 3 mode tampilan Front Desk dengan persist localStorage.
 */
export default function ViewModeToggle({
  value,
  onChange,
  enableLegacyViews = false,
}: ViewModeToggleProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = useCallback(
    (mode: ViewMode) => {
      persistViewMode(mode);
      onChange(mode);
    },
    [onChange]
  );

  return (
    <div
      className="inline-flex w-full rounded-xl border border-slate-200 bg-white p-1 shadow-sm transition dark:border-slate-700 dark:bg-slate-900 sm:w-auto"
      data-testid="view-mode-toggle"
      role="tablist"
      aria-label="Mode tampilan"
    >
      {OPTIONS.map(({ mode, label, icon: Icon, legacy }) => {
        const disabled = legacy && !enableLegacyViews;
        const isActive = value === mode && !disabled;

        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={disabled}
            title={disabled ? 'Segera hadir' : label}
            onClick={() => !disabled && handleChange(mode)}
            className={cn(
              'flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-bold transition-all duration-200 sm:min-h-[40px] sm:flex-initial sm:gap-2 sm:px-3 sm:text-xs',
              isActive
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200',
              disabled && 'cursor-not-allowed opacity-40',
              mounted && 'transition-colors'
            )}
            data-testid={`view-mode-${mode}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.split(' ')[0]}</span>
          </button>
        );
      })}
    </div>
  );
}
