import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, CreditCard, Sparkles, Wrench, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '../../utils/cn';
import { topbarIconButtonClass } from '../layout/TopbarActions';
import { useAppStore } from '../../store/appStore';
import { useFrontDeskStore } from '../../stores/frontDeskStore';
import { mapRoomsToCardData } from '../../utils/mapRoomsToCardData';
import { trackFrontDeskEvent } from '../../utils/frontDeskAnalytics';
import { playSound } from '../../utils/sounds';
import { useUrgentActions } from '../../hooks/useUrgentActions';

export type NotificationCategory = 'booking' | 'payment' | 'housekeeping' | 'system' | 'urgent';

export interface FrontDeskNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  roomId?: string;
  bookingId?: string;
  href?: string;
}

const CATEGORY_ICONS: Record<NotificationCategory, typeof Bell> = {
  booking: Sparkles,
  payment: CreditCard,
  housekeeping: Wrench,
  system: Bell,
  urgent: AlertTriangle,
};

const CATEGORY_STYLES: Record<NotificationCategory, string> = {
  booking: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  payment: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  housekeeping: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  system: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  urgent: 'bg-coral-100 text-coral-800 dark:bg-coral-950 dark:text-coral-300',
};

export default function NotificationCenter({
  buttonClassName = topbarIconButtonClass,
  panelAlign = 'right',
}: {
  buttonClassName?: string;
  panelAlign?: 'left' | 'right';
}) {
  const navigate = useNavigate();
  const { bookings, rooms, notifications, housekeepingTasks } = useAppStore();
  const selectRoom = useFrontDeskStore((s) => s.selectRoom);
  const { allActions: urgentActions } = useUrgentActions();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  const notificationsList = useMemo(() => {
    const items: FrontDeskNotification[] = [];

    for (const n of notifications) {
      items.push({
        id: n.id,
        category: n.type === 'booking' ? 'booking' : 'system',
        title: n.title,
        message: n.message,
        createdAt: n.createdAt,
        isRead: n.isRead,
      });
    }

    for (const b of bookings.filter((bk) => bk.paymentStatus === 'partial' || bk.paymentStatus === 'unpaid')) {
      items.push({
        id: `pay-${b.id}`,
        category: 'payment',
        title: 'Tagihan Belum Lunas',
        message: `${b.guest?.name ?? 'Tamu'} · ${b.bookingCode}`,
        createdAt: b.updatedAt,
        isRead: false,
        bookingId: b.id,
        roomId: b.roomId,
      });
    }

    for (const t of housekeepingTasks.filter((hk) => hk.status !== 'done')) {
      const room = rooms.find((r) => r.id === t.roomId);
      items.push({
        id: `hk-${t.id}`,
        category: 'housekeeping',
        title: 'Tugas Housekeeping',
        message: `Kamar ${room?.number ?? '?'} · ${t.type.replace(/_/g, ' ')}`,
        createdAt: t.createdAt,
        isRead: false,
        roomId: t.roomId,
      });
    }

    for (const action of urgentActions) {
      items.push({
        id: `urgent-${action.id}`,
        category: 'urgent',
        title: action.title,
        message: `${action.description} · Kamar ${action.roomNumber}`,
        createdAt: action.createdAt,
        isRead: false,
        roomId: action.roomId,
      });
    }

    return items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [notifications, bookings, housekeepingTasks, rooms, urgentActions]);

  const unreadCount = notificationsList.filter((n) => !readIds.has(n.id) && !n.isRead).length;

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const markAllRead = () => {
    setReadIds(new Set(notificationsList.map((n) => n.id)));
  };

  const handleClick = (n: FrontDeskNotification) => {
    setReadIds((prev) => new Set([...prev, n.id]));
    trackFrontDeskEvent('notification_click', { category: n.category, id: n.id });
    setOpen(false);

    if (n.roomId) {
      const card = mapRoomsToCardData(rooms, bookings).find((r) => r.id === n.roomId);
      if (card) selectRoom(card);
      return;
    }
    if (n.href) {
      navigate(n.href);
      return;
    }
    if (n.category === 'payment') navigate('/payments');
    if (n.category === 'housekeeping') navigate('/housekeeping');
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) playSound('click');
        }}
        className={cn(buttonClassName)}
        aria-label={`Notifikasi${unreadCount > 0 ? `, ${unreadCount} belum dibaca` : ''}`}
        data-testid="notification-bell"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-black text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            'absolute top-full z-50 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900',
            panelAlign === 'right' ? 'right-0' : 'left-0'
          )}
          data-testid="notification-panel"
          role="region"
          aria-label="Pusat notifikasi"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h3 className="text-sm font-black text-slate-800 dark:text-white">Notifikasi</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Tandai semua dibaca
              </button>
            )}
          </div>

          <ul className="max-h-[min(400px,60vh)] overflow-y-auto">
            {notificationsList.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-slate-500">
                Tidak ada notifikasi baru
              </li>
            ) : (
              notificationsList.map((n) => {
                const Icon = CATEGORY_ICONS[n.category];
                const isUnread = !readIds.has(n.id) && !n.isRead;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      className={cn(
                        'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50',
                        isUnread && 'bg-emerald-50/50 dark:bg-emerald-950/20'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                          CATEGORY_STYLES[n.category]
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{n.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{n.message}</p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {formatDistanceToNow(new Date(n.createdAt), {
                            addSuffix: true,
                            locale: localeId,
                          })}
                        </p>
                      </div>
                      {isUnread && (
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
