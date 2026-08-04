import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { useFrontDeskStore } from '../stores/frontDeskStore';
import { mapRoomsToCardData } from '../utils/mapRoomsToCardData';
import {
  detectUrgentActions,
  mergeWithDemoUrgent,
} from '../utils/urgentActions';
import type { UrgentAction } from '../types/frontdesk.types';

export type UrgentActionHandler = (
  action: UrgentAction
) => Promise<{ success: boolean; message: string }>;

const DISMISS_KEY = 'stay-urgent-action-dismissed';

function readDismissedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeDismissedIds(ids: Set<string>): void {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

/**
 * Deteksi & kelola urgent actions dengan refresh 30 detik.
 * Tutup banner = collapse saja; item tetap ada di notifikasi & chip expand.
 */
export function useUrgentActions() {
  const { rooms, bookings, payments } = useAppStore();
  const [tick, setTick] = useState(0);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(readDismissedIds);
  const barCollapsed = useFrontDeskStore((s) => s.urgentBarCollapsed);
  const collapseUrgentBar = useFrontDeskStore((s) => s.collapseUrgentBar);
  const expandUrgentBar = useFrontDeskStore((s) => s.expandUrgentBar);
  const prevSignatureRef = useRef('');

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const roomCards = useMemo(
    () => mapRoomsToCardData(rooms, bookings),
    [rooms, bookings, tick]
  );

  const allActions = useMemo(() => {
    const detected = detectUrgentActions(roomCards, bookings, payments);
    return mergeWithDemoUrgent(detected);
  }, [roomCards, bookings, payments]);

  const signature = useMemo(
    () => allActions.map((a) => a.id).join('|'),
    [allActions]
  );

  useEffect(() => {
    if (signature !== prevSignatureRef.current && signature) {
      expandUrgentBar();
    }
    prevSignatureRef.current = signature;
  }, [signature, expandUrgentBar]);

  const visibleActions = useMemo(
    () => allActions.filter((a) => !dismissedIds.has(a.id)),
    [allActions, dismissedIds]
  );

  /** Collapse banner — item tetap bisa dibuka lagi */
  const dismissBar = useCallback(() => {
    collapseUrgentBar();
  }, [collapseUrgentBar]);

  const expandBar = useCallback(() => {
    expandUrgentBar();
  }, [expandUrgentBar]);

  const dismissAction = useCallback((actionId: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(actionId);
      writeDismissedIds(next);
      return next;
    });
  }, []);

  const runAction: UrgentActionHandler = useCallback(async (action) => {
    setLoadingId(action.id);
    await new Promise((r) => setTimeout(r, 800));

    let message = 'Aksi berhasil diproses';
    switch (action.type) {
      case 'unpaid':
        message = `Reminder pembayaran terkirim ke tamu kamar ${action.roomNumber}`;
        break;
      case 'checkout_soon':
        message = `Checkout kamar ${action.roomNumber} siap diproses`;
        break;
      case 'dirty_backlog':
        message = `Tugas cleaning kamar ${action.roomNumber} telah diassign`;
        break;
      case 'check_in_overdue':
        message = `Check-in kamar ${action.roomNumber} ditandai untuk follow-up`;
        break;
      case 'payment_expired':
        message = `Invoice baru untuk kamar ${action.roomNumber} dibuat`;
        break;
      default:
        break;
    }

    setLoadingId(null);
    dismissAction(action.id);
    return { success: true, message };
  }, [dismissAction]);

  return {
    actions: visibleActions,
    allActions: visibleActions,
    barCollapsed,
    dismissBar,
    expandBar,
    runAction,
    loadingId,
    showBar: visibleActions.length > 0 && !barCollapsed,
    showCollapsedChip: visibleActions.length > 0 && barCollapsed,
  };
}
