import { NavLink } from 'react-router-dom';
import { cn } from '../../utils/cn';
import {
  LayoutDashboard, BedDouble, CalendarDays, Users, CreditCard
} from 'lucide-react';

export default function BottomNav() {
  const items = [
    { label: 'Front', to: '/front-desk', icon: LayoutDashboard },
    { label: 'POS', to: '/pos', icon: CreditCard },
    { label: 'Kamar', to: '/rooms', icon: BedDouble },
    { label: 'Booking', to: '/bookings', icon: CalendarDays },
    { label: 'Tamu', to: '/guests', icon: Users },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-20">
      <div className="flex items-center justify-around px-2 py-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
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
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
