import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { useFrontDeskPreferencesStore } from '../stores/frontDeskPreferencesStore';
import { showOsNotification } from '../services/pwa/pushNotification';
import { detectUrgentActions, mergeWithDemoUrgent } from '../utils/urgentActions';
import { mapRoomsToCardData } from '../utils/mapRoomsToCardData';

const URGENT_DEBOUNCE_MS = 30_000;

interface StayNotificationRow {
  id: string;
  tenant_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface StayBookingRow {
  id: string;
  tenant_id: string;
  booking_code: string;
  status: string;
  payment_status: string;
  total_amount: number;
}

interface StayPaymentRow {
  id: string;
  tenant_id: string;
  booking_id: string;
  amount: number;
  method: string;
  status: string;
}

interface StayHousekeepingRow {
  id: string;
  tenant_id: string;
  room_id: string;
  type: string;
  status: string;
}

function formatIdr(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

async function notifyIfEnabled(
  enabled: boolean,
  options: Parameters<typeof showOsNotification>[0]
): Promise<void> {
  if (!enabled) return;
  await showOsNotification(options, { enabled });
}

/**
 * OS notifications triggered client-side from Supabase realtime + urgent action changes.
 */
export function useOsNotifications() {
  const navigate = useNavigate();
  const tenantId = useAuthStore((s) => s.tenant?.id);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const osNotificationsEnabled = useFrontDeskPreferencesStore((s) => s.osNotificationsEnabled);
  const { rooms, bookings, payments } = useAppStore();
  const prevUrgentCountRef = useRef(0);
  const lastUrgentNotifRef = useRef(0);
  const seenKeysRef = useRef<Set<string>>(new Set());

  const markSeen = (key: string): boolean => {
    if (seenKeysRef.current.has(key)) return true;
    seenKeysRef.current.add(key);
    if (seenKeysRef.current.size > 200) {
      const arr = [...seenKeysRef.current];
      seenKeysRef.current = new Set(arr.slice(-100));
    }
    return false;
  };

  // Handle notification click from service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg?.type !== 'NOTIFICATION_CLICKED') return;
      const data = msg.data || {};
      const url = (data.url as string) || '/front-desk';
      const path = url.startsWith('/stay') ? url.replace(/^\/stay/, '') || '/front-desk' : url;
      navigate(path.startsWith('/') ? path : `/${path}`);
    };

    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [navigate]);

  // Realtime: operational events
  useEffect(() => {
    if (!isAuthenticated || !tenantId || !osNotificationsEnabled) return;
    if (!isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel(`stay-os-notif-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stay_notifications',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const row = payload.new as StayNotificationRow;
          const key = `notif-${row.id}`;
          if (markSeen(key)) return;

          void notifyIfEnabled(osNotificationsEnabled, {
            title: row.title,
            body: row.message,
            tag: key,
            data: { url: '/front-desk', notificationId: row.id, type: row.type },
            urgent: row.type === 'payment' || row.type === 'urgent',
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stay_bookings',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const row = payload.new as StayBookingRow;
          const key = `booking-${row.id}`;
          if (markSeen(key)) return;

          void notifyIfEnabled(osNotificationsEnabled, {
            title: 'Booking Baru',
            body: `${row.booking_code} · ${formatIdr(Number(row.total_amount))}`,
            tag: key,
            data: { url: '/bookings', bookingId: row.id },
            urgent: row.payment_status === 'unpaid',
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stay_payments',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const row = payload.new as StayPaymentRow;
          if (row.status !== 'paid' && row.status !== 'completed') return;
          const key = `payment-${row.id}`;
          if (markSeen(key)) return;

          void notifyIfEnabled(osNotificationsEnabled, {
            title: 'Pembayaran Diterima',
            body: `${formatIdr(Number(row.amount))} · ${row.method}`,
            tag: key,
            data: { url: '/payments', bookingId: row.booking_id },
            urgent: true,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stay_housekeeping_tasks',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const row = payload.new as StayHousekeepingRow;
          const key = `hk-${row.id}`;
          if (markSeen(key)) return;

          void notifyIfEnabled(osNotificationsEnabled, {
            title: 'Tugas Housekeeping',
            body: `${row.type} · status ${row.status}`,
            tag: key,
            data: { url: '/housekeeping', roomId: row.room_id },
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAuthenticated, tenantId, osNotificationsEnabled]);

  // Urgent actions count increase
  useEffect(() => {
    if (!isAuthenticated || !osNotificationsEnabled) return;

    const roomCards = mapRoomsToCardData(rooms, bookings);
    const detected = detectUrgentActions(roomCards, bookings, payments);
    const actions = mergeWithDemoUrgent(detected);
    const count = actions.length;
    const prev = prevUrgentCountRef.current;
    prevUrgentCountRef.current = count;

    if (count <= prev || count === 0) return;

    const now = Date.now();
    if (now - lastUrgentNotifRef.current < URGENT_DEBOUNCE_MS) return;
    lastUrgentNotifRef.current = now;

    void notifyIfEnabled(osNotificationsEnabled, {
      title: 'Tindakan Segera Diperlukan',
      body: `${count} kamar perlu tindakan segera di Front Desk`,
      tag: `stay-urgent-${count}`,
      data: { url: '/front-desk' },
      urgent: true,
      requireInteraction: true,
    });
  }, [isAuthenticated, osNotificationsEnabled, rooms, bookings, payments]);
}
