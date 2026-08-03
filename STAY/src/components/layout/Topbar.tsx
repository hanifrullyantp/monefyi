import { Bell, Menu, Search } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Topbar() {
  const { user } = useAuthStore();
  const { notifications, toggleSidebar, markAllNotificationsRead } = useAppStore();
  const [showNotifs, setShowNotifs] = useState(false);
  const navigate = useNavigate();

  const unread = notifications.filter(n => !n.isRead).length;

  const notifIcons: Record<string, string> = {
    booking: '📅',
    payment: '💳',
    checkin: '🏠',
    checkout: '👋',
    housekeeping: '🧹',
    system: '⚙️',
  };

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-slate-100">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Menu toggle (mobile) */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-500"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Greeting */}
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800 leading-tight">
            Halo, {user?.name.split(' ')[0]}! 👋
          </p>
          <p className="text-xs text-slate-400 hidden sm:block">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Search */}
        <button
          onClick={() => navigate('/bookings')}
          className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 text-slate-400 text-sm hover:bg-slate-100 transition-colors"
        >
          <Search className="h-4 w-4" />
          <span>Cari booking...</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) markAllNotificationsRead(); }}
            className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowNotifs(false)} />
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="font-semibold text-slate-800">Notifikasi</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-400 text-sm">
                      Tidak ada notifikasi
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-emerald-50/50' : ''}`}>
                        <div className="flex gap-3">
                          <span className="text-xl flex-shrink-0">{notifIcons[n.type]}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800">{n.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {new Date(n.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {!n.isRead && (
                            <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">
            {user?.name.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  );
}
