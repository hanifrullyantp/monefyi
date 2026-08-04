import { Menu, Search } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { useNavigate } from 'react-router-dom';
import ConnectionIndicator from '../shared/ConnectionIndicator';
import TopbarActions from './TopbarActions';

export default function Topbar() {
  const { user } = useAuthStore();
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

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-800 leading-tight dark:text-slate-100 sm:text-sm">
            Halo, {user?.name.split(' ')[0]}! 👋
          </p>
          <p className="text-xs text-slate-400 hidden sm:block dark:text-slate-500">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <div className="hidden md:block">
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

        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">
            {user?.name.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  );
}
