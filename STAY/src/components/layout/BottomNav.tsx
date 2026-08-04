import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../store/authStore';
import { ROUTES } from '../../config/routes';
import { getBottomNavPrimary, getBottomNavOverflow } from '../../config/routeGroups';
import {
  LayoutDashboard, BedDouble, CalendarDays, CreditCard, Menu,
} from 'lucide-react';
import NavMenuSheet from './NavMenuSheet';

const BOTTOM_ICONS: Record<string, typeof LayoutDashboard> = {
  '/front-desk': LayoutDashboard,
  '/pos': CreditCard,
  '/rooms': BedDouble,
  '/bookings': CalendarDays,
  '/guests': LayoutDashboard,
  '/housekeeping': LayoutDashboard,
  '/payments': CreditCard,
  '/dashboard': LayoutDashboard,
  '/reports': LayoutDashboard,
  '/finance': LayoutDashboard,
  '/staff': LayoutDashboard,
  '/pricing': LayoutDashboard,
  '/settings': LayoutDashboard,
  '/xendit': CreditCard,
};

const BOTTOM_TOUR_TARGETS: Record<string, string> = {
  '/front-desk': 'nav-front-desk',
  '/bookings': 'nav-bookings',
  '/rooms': 'nav-rooms',
};

const ICON_NODES: Record<string, React.ReactNode> = Object.fromEntries(
  Object.entries(BOTTOM_ICONS).map(([path, Icon]) => [path, <Icon key={path} className="h-4 w-4" />])
);

export default function BottomNav() {
  const { user } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const allItems = ROUTES.filter(
    (r) => (r.showInBottomNav || r.showInSidebar) && user && r.roles.includes(user.role)
  );
  const primaryItems = getBottomNavPrimary(allItems);
  const overflowItems = getBottomNavOverflow(allItems);
  const overflowActive = overflowItems.some((r) => location.pathname.startsWith(r.path));

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-slate-100 safe-bottom">
        <div className="flex items-stretch justify-around px-1 pt-0.5 pb-0.5">
          {primaryItems.map((item) => {
            const Icon = BOTTOM_ICONS[item.path] || LayoutDashboard;
            const shortLabel =
              item.path === '/front-desk' ? 'Front' : item.label.split(/[\s/]/)[0];

            return (
              <NavLink
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.path.replace(/^\//, '')}`}
                data-tour={BOTTOM_TOUR_TARGETS[item.path]}
                className={({ isActive }) =>
                  cn(
                    'flex flex-1 flex-col items-center justify-center gap-0.5 py-1 min-w-0 max-w-[72px]',
                    isActive ? 'text-emerald-600' : 'text-slate-400'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={cn(
                        'flex h-7 w-9 items-center justify-center rounded-lg transition-all',
                        isActive && 'bg-emerald-50'
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.25 : 2} />
                    </div>
                    <span className="text-[9px] font-semibold truncate leading-none">{shortLabel}</span>
                  </>
                )}
              </NavLink>
            );
          })}

          {overflowItems.length > 0 && (
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-1 min-w-0 max-w-[72px]',
                overflowActive || menuOpen ? 'text-emerald-600' : 'text-slate-400'
              )}
              aria-label="Menu lainnya"
              data-testid="nav-more"
            >
              <div
                className={cn(
                  'flex h-7 w-9 items-center justify-center rounded-lg',
                  (overflowActive || menuOpen) && 'bg-emerald-50'
                )}
              >
                <Menu className="h-[18px] w-[18px]" />
              </div>
              <span className="text-[9px] font-semibold leading-none">Menu</span>
            </button>
          )}
        </div>
      </nav>

      <NavMenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        routes={allItems}
        icons={ICON_NODES}
      />
    </>
  );
}
