import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { useFrontDeskPreferencesStore } from '../stores/frontDeskPreferencesStore';
import { showOsNotification } from '../services/pwa/pushNotification';
import { hasActivePushSubscription } from '../services/pwa/webPushSubscribe';
import { detectUrgentActions, mergeWithDemoUrgent } from '../utils/urgentActions';
import { mapRoomsToCardData } from '../utils/mapRoomsToCardData';

const URGENT_DEBOUNCE_MS = 30_000;

/**
 * Client OS notifications for urgent actions only.
 * Booking/payment/housekeeping pushes are handled server-side (DB triggers + Web Push).
 */
export function useOsNotifications() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const osNotificationsEnabled = useFrontDeskPreferencesStore((s) => s.osNotificationsEnabled);
  const { rooms, bookings, payments } = useAppStore();
  const prevUrgentCountRef = useRef(0);
  const lastUrgentNotifRef = useRef(0);

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

    void (async () => {
      const pushActive = await hasActivePushSubscription();
      if (pushActive) return;

      await showOsNotification(
        {
          title: 'Tindakan Segera Diperlukan',
          body: `${count} kamar perlu tindakan segera di Front Desk`,
          tag: `stay-urgent-${count}`,
          data: { url: '/front-desk' },
          urgent: true,
          requireInteraction: true,
        },
        { enabled: osNotificationsEnabled }
      );
    })();
  }, [isAuthenticated, osNotificationsEnabled, rooms, bookings, payments]);
}
