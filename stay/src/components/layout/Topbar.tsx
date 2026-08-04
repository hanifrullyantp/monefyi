import { Menu, Search } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { useNavigate } from 'react-router-dom';
import ConnectionIndicator from '../shared/ConnectionIndicator';
import TopbarActions from './TopbarActions';

export default function Topbar() {
  const { tenant, user } = useAuthStore();
  const { toggleSidebar } = useAppStore();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-500 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Buka menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden min-w-0 flex-1 md:block">
          <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
            {tenant?.name ?? 'STAY'}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <div className="flex-1 md:hidden" aria-hidden />

        <div className="hidden lg:block">
          <ConnectionIndicator />
        </div>

        <button
          onClick={() => navigate('/bookings')}
          className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 text-slate-400 text-sm hover:bg-slate-100 transition-colors dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          <Search className="h-4 w-4" />
          <span>Cari booking...</span>
        </button>

        <TopbarActions />

        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-xs sm:text-sm">
            {user?.name.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  );
}
