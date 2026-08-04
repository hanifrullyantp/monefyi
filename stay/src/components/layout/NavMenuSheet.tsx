import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { RouteConfig } from '../../config/routes';
import { ROUTE_GROUPS } from '../../config/routeGroups';

export interface NavMenuSheetProps {
  open: boolean;
  onClose: () => void;
  routes: RouteConfig[];
  icons: Record<string, React.ReactNode>;
}

/**
 * Bottom sheet menu — rute tambahan yang dikelompokkan.
 */
export default function NavMenuSheet({ open, onClose, routes, icons }: NavMenuSheetProps) {
  if (!open) return null;

  const pathSet = new Set(routes.map((r) => r.path));
  const ungrouped = routes.filter(
    (r) => !ROUTE_GROUPS.some((g) => g.paths.includes(r.path)) && r.path !== '/front-desk'
  );

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed inset-x-0 bottom-0 z-50 max-h-[70dvh] overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white pb-safe dark:border-slate-700 dark:bg-slate-900 lg:hidden"
        role="dialog"
        aria-label="Menu navigasi"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-bold text-slate-800 dark:text-white">Menu</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Tutup menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {ROUTE_GROUPS.map((group) => {
            const items = group.paths
              .map((path) => routes.find((r) => r.path === path))
              .filter((r): r is RouteConfig => !!r && pathSet.has(r.path));
            if (items.length === 0) return null;

            return (
              <div key={group.id}>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {group.label}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      data-tour={item.path === '/reports' ? 'nav-reports' : undefined}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                          isActive
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'border-slate-100 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                        )
                      }
                    >
                      <span className="shrink-0">{icons[item.path]}</span>
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}

          {ungrouped.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Lainnya
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ungrouped.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium',
                        isActive
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-100 text-slate-600'
                      )
                    }
                  >
                    <span className="shrink-0">{icons[item.path]}</span>
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
