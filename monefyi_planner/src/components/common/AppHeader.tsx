import { Bell } from 'lucide-react';

type Props = {
  title?: string;
  isEstimator?: boolean;
  onOpenMenu: () => void;
  onOpenNotif: () => void;
  unreadCount?: number;
  userName?: string;
  isOnline?: boolean;
};

export default function AppHeader({
  title = 'Planner',
  isEstimator = false,
  onOpenMenu,
  onOpenNotif,
  unreadCount = 0,
  userName = 'User',
  isOnline = true,
}: Props) {
  const initial = userName.charAt(0).toLowerCase() || 'u';

  return (
    <header className="flex-shrink-0 h-14 flex items-center justify-between px-2 sm:px-4 bg-white border-b border-[#E5EAE8] z-20">
      <div className="flex items-center gap-1.5 min-w-0">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Menu"
          className="w-11 h-11 border-0 bg-transparent flex items-center justify-center p-0 text-slate-700 active:scale-95 transition-transform"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        <div
          className={`w-[30px] h-[30px] rounded-[9px] text-white font-extrabold text-base flex items-center justify-center shrink-0 ${
            isEstimator ? 'bg-[#157F5F]' : 'bg-[#059669]'
          }`}
        >
          {isEstimator ? 'E' : 'M'}
        </div>

        <div className="ml-1.5 leading-[1.15] min-w-0">
          <div className="font-extrabold text-base text-[#0F172A] truncate">
            {isEstimator ? 'Estimator' : title}
          </div>
          <div
            className={`text-[10px] font-bold ${
              isOnline ? 'text-[#047857]' : 'text-slate-500'
            }`}
          >
            {isOnline ? '● Online · tersinkron' : '○ Offline'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onOpenNotif}
          aria-label={unreadCount > 0 ? `Notifikasi, ${unreadCount} baru` : 'Notifikasi'}
          className="relative w-11 h-11 border-0 bg-transparent flex items-center justify-center p-0 text-slate-700 active:scale-95 transition-transform"
        >
          <Bell className="w-[22px] height-[22px]" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-[#E11D48] text-white text-[10px] font-extrabold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Menu akun: pratinjau, admin, pengaturan"
          className="w-11 h-11 border-0 bg-transparent flex items-center justify-center p-0 active:scale-95 transition-transform"
        >
          <span className="w-[34px] h-[34px] rounded-full bg-[#1D4ED8] text-white font-bold text-sm flex items-center justify-center capitalize">
            {initial}
          </span>
        </button>
      </div>
    </header>
  );
}
