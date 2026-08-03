import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import {
  LayoutDashboard, BedDouble, CalendarDays, Users, CreditCard,
  BarChart3, Settings, LogOut, Home, ClipboardList, ChevronRight, X,
  Building2, TrendingUp
} from 'lucide-react';
import type { UserRole } from '../../types';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  roles: UserRole[];
  badge?: number;
}

const navItems: NavItem[] = [
  { label: 'Front Desk', to: '/front-desk', icon: <LayoutDashboard className="h-5 w-5" />, roles: ['owner', 'manager', 'receptionist'] },
  { label: 'Kasir / POS', to: '/pos', icon: <CreditCard className="h-5 w-5" />, roles: ['owner', 'manager', 'receptionist'] },
  { label: 'Manajemen Staff', to: '/staff', icon: <Users className="h-5 w-5" />, roles: ['owner', 'manager'] },
  { label: 'Dynamic Pricing', to: '/pricing', icon: <TrendingUp className="h-5 w-5" />, roles: ['owner', 'manager'] },
  { label: 'Accounting', to: '/accounting', icon: <BarChart3 className="h-5 w-5" />, roles: ['owner', 'manager'] },
  { label: 'Analytics', to: '/dashboard', icon: <TrendingUp className="h-5 w-5" />, roles: ['owner', 'manager'] },
  { label: 'Keuangan', to: '/finance', icon: <BarChart3 className="h-5 w-5" />, roles: ['owner', 'manager'] },
  { label: 'Kamar', to: '/rooms', icon: <BedDouble className="h-5 w-5" />, roles: ['owner', 'manager', 'receptionist'] },
  { label: 'Booking', to: '/bookings', icon: <CalendarDays className="h-5 w-5" />, roles: ['owner', 'manager', 'receptionist'] },
  { label: 'Tamu', to: '/guests', icon: <Users className="h-5 w-5" />, roles: ['owner', 'manager', 'receptionist'] },
  { label: 'Housekeeping', to: '/housekeeping', icon: <ClipboardList className="h-5 w-5" />, roles: ['owner', 'manager', 'receptionist'] },
  { label: 'Pengaturan', to: '/settings', icon: <Settings className="h-5 w-5" />, roles: ['owner', 'manager'] },
];

export default function Sidebar() {
  const { user, tenant, logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const navigate = useNavigate();

  const filtered = navItems.filter(item => user && item.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300',
        'lg:translate-x-0 lg:static lg:z-auto',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm">
              <Home className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm leading-tight">STAY</p>
              <p className="text-xs text-slate-400 leading-tight">monefyi.com/stay</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Property badge */}
        <div className="mx-4 mt-4 px-3 py-2.5 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-emerald-700 truncate">{tenant?.name}</p>
            <p className="text-xs text-emerald-500">Properti Aktif</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 mt-4 space-y-1 overflow-y-auto">
          {filtered.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              )}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && (
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User profile */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 cursor-pointer group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">
                {user?.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300" />
          </div>
          <button
            onClick={handleLogout}
            className="mt-1 w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </button>
        </div>
      </aside>
    </>
  );
}
