import { NavLink } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../store/authStore';
import { ROUTES } from '../../config/routes';
import {
  LayoutDashboard, BedDouble, CalendarDays, Users, CreditCard, ClipboardList,
} from 'lucide-react';

const BOTTOM_ICONS: Record<string, typeof LayoutDashboard> = {
  '/front-desk': LayoutDashboard,
  '/pos': CreditCard,
  '/rooms': BedDouble,
  '/bookings': CalendarDays,
  '/guests': Users,
  '/housekeeping': ClipboardList,
};

export default function BottomNav() {
  const { user } = useAuthStore();

  const items = ROUTES.filter(
    (r) => r.showInBottomNav && user && r.roles.includes(user.role)
  );

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-20">
      <div className="flex items-center justify-around px-2 py-1">
        {items.map((item) => {
          const Icon = BOTTOM_ICONS[item.path] || LayoutDashboard;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              data-testid={`nav-${item.path.replace(/^\//, '')}`}
              className={({ isActive }) => cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-150 min-w-0',
                isActive ? 'text-emerald-600' : 'text-slate-400'
              )}
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    'w-10 h-8 flex items-center justify-center rounded-xl transition-all',
                    isActive ? 'bg-emerald-50' : ''
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-medium truncate">{item.label.split(' ')[0]}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
