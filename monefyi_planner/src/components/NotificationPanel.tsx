import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, X, CheckCheck, AlertTriangle, Lightbulb, TrendingUp, Users, Settings } from 'lucide-react';
import { markNotificationRead as markReadDb, markAllNotificationsRead as markAllReadDb } from '../services/notificationService';
import { useAppStore } from '../store/appStore';

interface Props {
  onClose: () => void;
}

const typeConfig = {
  alert: { icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-50' },
  recommendation: { icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-50' },
  update: { icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50' },
  hr: { icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  system: { icon: Settings, color: 'text-slate-500', bg: 'bg-slate-50' },
};

const priorityBadge = {
  critical: 'bg-rose-100 text-rose-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} mnt lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  return `${Math.floor(hrs / 24)} hari lalu`;
}

export default function NotificationPanel({ onClose }: Props) {
  const { notifications, markNotificationRead, markAllNotificationsRead, user } = useAppStore();
  const navigate = useNavigate();

  const handleRead = async (id: string, actionUrl?: string) => {
    markNotificationRead(id);
    try {
      await markReadDb(id);
    } catch (e) {
      console.error(e);
    }
    if (actionUrl) {
      navigate(actionUrl.startsWith('/') ? actionUrl : `/app${actionUrl}`);
      onClose();
    }
  };

  const handleReadAll = async () => {
    markAllNotificationsRead();
    if (user?.id) {
      try {
        await markAllReadDb(user.id);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-600" />
            <span className="font-bold text-slate-800 text-sm">Notifikasi</span>
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-full">
                {notifications.filter(n => !n.read).length} baru
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReadAll}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Baca semua
            </button>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-10">
              <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Tidak ada notifikasi</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const config = typeConfig[notif.type];
              const IconComp = config.icon;
              return (
                <button
                  key={notif.id}
                  onClick={() => handleRead(notif.id, notif.action_url)}
                  className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 ${!notif.read ? 'bg-emerald-50/30' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <IconComp className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-slate-800 truncate">{notif.title}</span>
                      {!notif.read && <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{notif.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-slate-400">{timeAgo(notif.created_at)}</span>
                      {notif.priority && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${priorityBadge[notif.priority]}`}>
                          {notif.priority}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </motion.div>
    </>
  );
}
