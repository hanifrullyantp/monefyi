import { NavLink } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import {
  LayoutDashboard, BedDouble, CalendarDays, Users, CreditCard,
  BarChart3, Settings, Home, ClipboardList, X,
  Building2, TrendingUp, FileText, Wallet, PanelLeftClose, PanelLeft,
} from 'lucide-react';
import { ROUTES } from '../../config/routes';
import SidebarProfileMenu from './SidebarProfileMenu';

const ICONS: Record<string, React.ReactNode> = {
  '/front-desk': <LayoutDashboard className="h-5 w-5" />,
  '/pos': <CreditCard className="h-5 w-5" />,
  '/payments': <Wallet className="h-5 w-5" />,
  '/xendit': <CreditCard className="h-5 w-5" />,
  '/rooms': <BedDouble className="h-5 w-5" />,
  '/bookings': <CalendarDays className="h-5 w-5" />,
  '/guests': <Users className="h-5 w-5" />,
  '/housekeeping': <ClipboardList className="h-5 w-5" />,
  '/dashboard': <TrendingUp className="h-5 w-5" />,
  '/reports': <FileText className="h-5 w-5" />,
  '/finance': <BarChart3 className="h-5 w-5" />,
  '/staff': <Users className="h-5 w-5" />,
  '/pricing': <TrendingUp className="h-5 w-5" />,
  '/settings': <Settings className="h-5 w-5" />,
};

/** Urutan flat sidebar — tanpa grup Operasional/Manajemen */
const TOUR_TARGETS: Record<string, string> = {
  '/front-desk': 'nav-front-desk',
  '/bookings': 'nav-bookings',
  '/reports': 'nav-reports',
  '/rooms': 'nav-rooms',
};

const SIDEBAR_ORDER = [
  '/front-desk',
  '/pos',
  '/payments',
  '/xendit',
  '/rooms',
  '/bookings',
  '/guests',
  '/housekeeping',
  '/dashboard',
  '/reports',
  '/finance',
  '/staff',
  '/pricing',
  '/settings',
];

export default function Sidebar() {
  const { user, tenant } = useAuthStore();
  const { sidebarOpen, setSidebarOpen, sidebarCompact, toggleSidebarCompact } = useAppStore();

  const filtered = ROUTES.filter(
    (item) => item.showInSidebar && user && item.roles.includes(user.role)
  );
  const pathSet = new Set(filtered.map((r) => r.path));
  const menuItems = SIDEBAR_ORDER.map((path) => filtered.find((r) => r.path === path))
    .filter((r): r is (typeof filtered)[number] => !!r && pathSet.has(r.path));

  const closeMobile = () => setSidebarOpen(false);

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        data-tour="sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-100 flex flex-col transition-all duration-300',
          'lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          sidebarCompact ? 'w-[72px]' : 'w-56'
        )}
      >
        <div
          className={cn(
            'flex items-center border-b border-slate-100',
            sidebarCompact ? 'justify-center px-2 py-4' : 'justify-between px-4 py-4'
          )}
        >
          <div className={cn('flex items-center gap-2.5', sidebarCompact && 'flex-col gap-1')}>
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm shrink-0">
              <Home className="h-5 w-5 text-white" />
            </div>
            {!sidebarCompact && (
              <div className="min-w-0">
                <p className="font-bold text-slate-800 text-sm leading-tight">STAY</p>
                <p className="text-[10px] text-slate-400 leading-tight truncate max-w-[120px]">
                  {tenant?.name ?? 'monefyi.com/stay'}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!sidebarCompact && (
          <div className="mx-3 mt-3 px-2.5 py-2 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
            <p className="text-[10px] font-semibold text-emerald-700 truncate">{tenant?.name}</p>
          </div>
        )}

        <nav className="flex-1 px-2 mt-3 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeMobile}
              title={item.label}
              data-tour={TOUR_TARGETS[item.path]}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl text-sm font-medium transition-all',
                  sidebarCompact ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                )
              }
            >
              {ICONS[item.path]}
              {!sidebarCompact && <span className="flex-1 truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-2 border-t border-slate-100 space-y-1">
          <button
            type="button"
            onClick={toggleSidebarCompact}
            className={cn(
              'hidden lg:flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50',
              sidebarCompact && 'justify-center px-2'
            )}
            title={sidebarCompact ? 'Perlebar menu' : 'Perkecil menu'}
          >
            {sidebarCompact ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>Menu ringkas</span>
              </>
            )}
          </button>

          <SidebarProfileMenu compact={sidebarCompact} />
        </div>
      </aside>
    </>
  );
}
