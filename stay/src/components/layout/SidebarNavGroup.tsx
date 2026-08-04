import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { RouteConfig } from '../../config/routes';

export interface SidebarNavGroupProps {
  label: string;
  icon: LucideIcon;
  items: RouteConfig[];
  itemIcons: Record<string, React.ReactNode>;
  onNavigate?: () => void;
  compact?: boolean;
}

/**
 * Grup menu sidebar — klik ikon untuk dropdown flyout.
 */
export default function SidebarNavGroup({
  label,
  icon: Icon,
  items,
  itemIcons,
  onNavigate,
  compact = false,
}: SidebarNavGroupProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isGroupActive = items.some((item) => location.pathname.startsWith(item.path));

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (items.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={label}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl text-sm font-medium transition-all',
          compact ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
          isGroupActive || open
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'
        )}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!compact && (
          <>
            <span className="flex-1 text-left">{label}</span>
            <span className="text-[10px] font-bold text-slate-400">{items.length}</span>
          </>
        )}
      </button>

      {open && (
        <div
          className={cn(
            'absolute z-50 min-w-[200px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900',
            compact ? 'left-full top-0 ml-2' : 'left-0 right-0 top-full mt-1'
          )}
        >
          <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
            {label}
          </p>
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                )
              }
            >
              <span className="shrink-0 opacity-80">{itemIcons[item.path]}</span>
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
