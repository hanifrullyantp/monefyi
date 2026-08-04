import { useCallback, useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown, LayoutGrid, Map } from 'lucide-react';
import type { ViewMode } from '../../types/frontdesk.types';
import { cn } from '../../utils/cn';
import { persistViewMode } from './ViewModeToggle';

const OPTIONS: {
  mode: ViewMode;
  label: string;
  short: string;
  icon: typeof LayoutGrid;
}[] = [
  { mode: 'grid', label: 'Grid View', short: 'Grid', icon: LayoutGrid },
  { mode: 'floorplan', label: 'Denah Lantai', short: 'Denah', icon: Map },
  { mode: 'timeline', label: 'Timeline', short: 'Timeline', icon: Calendar },
];

export interface ViewModeDropdownProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

/**
 * Pilih mode tampilan via dropdown — hemat ruang toolbar.
 */
export default function ViewModeDropdown({ value, onChange, className }: ViewModeDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = OPTIONS.find((o) => o.mode === value) ?? OPTIONS[0];
  const ActiveIcon = active.icon;

  const handleChange = useCallback(
    (mode: ViewMode) => {
      persistViewMode(mode);
      onChange(mode);
      setOpen(false);
    },
    [onChange]
  );

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 min-w-[88px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 sm:min-w-[96px] sm:px-2.5 sm:text-xs"
        aria-haspopup="listbox"
        aria-expanded={open}
        data-testid="view-mode-dropdown"
      >
        <ActiveIcon className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
        <span className="truncate">{active.short}</span>
        <ChevronDown className={cn('ml-auto h-3.5 w-3.5 text-slate-400 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {OPTIONS.map(({ mode, label, icon: Icon }) => (
            <li key={mode} role="option" aria-selected={value === mode}>
              <button
                type="button"
                onClick={() => handleChange(mode)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold',
                  value === mode
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                )}
                data-testid={`view-mode-${mode}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
