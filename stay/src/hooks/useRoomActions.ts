import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { openWhatsAppMessage } from '../utils/whatsapp';
import { trackFrontDeskEvent } from '../utils/frontDeskAnalytics';
import type { PaymentMethod } from '../types';
import type { ToastVariant } from './useFrontDeskToast';

export type RoomActionKey =
  | 'checkIn'
  | 'checkOut'
  | 'extendStay'
  | 'payment'
  | 'assignCleaning'
  | 'markClean'
  | 'markCleaning'
  | 'blockRoom'
  | 'sendWA'
  | 'sendReminder'
  | 'markMaintenanceDone'
  | 'cancelBooking';

export interface RoomActionResult {
  success: boolean;
  message: string;
}

export type ToastFn = (message: string, variant?: ToastVariant) => void;

/**
 * Handler aksi kamar Front Desk dengan mock delay + optimistic update.
 */
export function useRoomActions(onToast?: ToastFn) {
  const navigate = useNavigate();
  const {
    checkInBooking,
    checkoutBooking,
    updateRoomStatus,
    updateBooking,
    addHousekeepingTask,
    recordBookingPayment,
    tenant,
  } = useAppStore();

  const [loadingAction, setLoadingAction] = useState<RoomActionKey | null>(null);

  const notify = useCallback(
    (result: RoomActionResult, actionKey?: RoomActionKey) => {
      onToast?.(result.message, result.success ? 'success' : 'error');
      if (result.success && actionKey) {
        trackFrontDeskEvent('action_executed', { action: actionKey });
      } else if (!result.success && actionKey) {
        trackFrontDeskEvent('action_error', { action: actionKey });
      }
      return result;
    },
    [onToast]
  );

  const runAction = useCallback(
    async (
      key: RoomActionKey,
      fn: () => RoomActionResult | Promise<RoomActionResult>
    ) => {
      setLoadingAction(key);
      try {
        await new Promise((r) => setTimeout(r, 600));
        const result = await fn();
        return notify(result, key);
      } catch (error) {
        return notify(
          {
            success: false,
            message: error instanceof Error ? error.message : 'Aksi gagal',
          },
          key
        );
      } finally {
        setLoadingAction(null);
      }
    },
    [notify]
  );

  const handleCheckIn = useCallback(
    (bookingId: string, roomId: string) =>
      runAction('checkIn', () => {
        checkInBooking(bookingId, roomId);
        return { success: true, message: 'Check-in berhasil diproses' };
      }),
    [checkInBooking, runAction]
  );

  const handleCheckOut = useCallback(
    (bookingId: string, roomId: string, guestPhone?: string, guestName?: string, bookingCode?: string) =>
      runAction('checkOut', () => {
        checkoutBooking(bookingId, roomId, {
          sendSurvey: Boolean(guestPhone),
          guestPhone,
          guestName,
          bookingCode,
        });
        return { success: true, message: 'Check-out berhasil — kamar perlu dibersihkan' };
      }),
    [checkoutBooking, runAction]
  );

  const handleExtendStay = useCallback(
    (bookingId: string) =>
      runAction('extendStay', () => {
        const booking = useAppStore.getState().bookings.find((b) => b.id === bookingId);
        if (!booking) return { success: false, message: 'Booking tidak ditemukan' };
        const newCheckOut = new Date(booking.checkOut);
        newCheckOut.setDate(newCheckOut.getDate() + 1);
        updateBooking(bookingId, {
          checkOut: newCheckOut.toISOString().split('T')[0],
          nights: booking.nights + 1,
        });
        return { success: true, message: 'Perpanjangan 1 malam ditambahkan' };
      }),
    [runAction, updateBooking]
  );

  const handlePayment = useCallback(
    (bookingId: string, amount: number, method: PaymentMethod = 'cash') =>
      runAction('payment', () => {
        const payment = recordBookingPayment(bookingId, amount, method, undefined, 'Front desk panel');
        if (!payment) {
          return { success: false, message: 'Gagal mencatat pembayaran' };
        }
        return {
          success: true,
          message: `Pembayaran Rp ${amount.toLocaleString('id-ID')} berhasil dicatat`,
        };
      }),
    [recordBookingPayment, runAction]
  );

  const handleAssignCleaning = useCallback(
    (roomId: string) =>
      runAction('assignCleaning', () => {
        addHousekeepingTask({
          tenantId: tenant.id,
          roomId,
          status: 'pending',
          type: 'daily_cleaning',
          notes: 'Assign dari front desk',
          scheduledAt: new Date().toISOString(),
        });
        return { success: true, message: 'Tugas cleaning telah diassign' };
      }),
    [addHousekeepingTask, runAction, tenant.id]
  );

  const handleMarkClean = useCallback(
    (roomId: string) =>
      runAction('markClean', () => {
        updateRoomStatus(roomId, 'available');
        return { success: true, message: 'Kamar ditandai bersih & siap dijual' };
      }),
    [runAction, updateRoomStatus]
  );

  const handleMarkCleaning = useCallback(
    (roomId: string) =>
      runAction('markCleaning', () => {
        updateRoomStatus(roomId, 'cleaning');
        return { success: true, message: 'Kamar sedang dibersihkan' };
      }),
    [runAction, updateRoomStatus]
  );

  const handleBlockRoom = useCallback(
    (roomId: string, reason = 'Diblokir front desk') =>
      runAction('blockRoom', () => {
        updateRoomStatus(roomId, 'blocked');
        return { success: true, message: `Kamar diblokir: ${reason}` };
      }),
    [runAction, updateRoomStatus]
  );

  const handleSendWA = useCallback(
    (phone: string, message: string) =>
      runAction('sendWA', () => {
        openWhatsAppMessage(phone, message);
        return { success: true, message: 'WhatsApp dibuka' };
      }),
    [runAction]
  );

  const handleSendReminder = useCallback(
    (phone: string, guestName: string, roomNumber: string, balance: number) =>
      runAction('sendReminder', () => {
        openWhatsAppMessage(
          phone,
          `Halo ${guestName}, reminder pembayaran kamar ${roomNumber}. Sisa tagihan: Rp ${balance.toLocaleString('id-ID')}. Terima kasih.`
        );
        return { success: true, message: 'Reminder WA terkirim' };
      }),
    [runAction]
  );

  const handleMarkMaintenanceDone = useCallback(
    (roomId: string) =>
      runAction('markMaintenanceDone', () => {
        updateRoomStatus(roomId, 'available');
        return { success: true, message: 'Maintenance selesai — kamar tersedia' };
      }),
    [runAction, updateRoomStatus]
  );

  const handleCancelBooking = useCallback(
    (bookingId: string) =>
      runAction('cancelBooking', () => {
        updateBooking(bookingId, { status: 'cancelled' });
        return { success: true, message: 'Booking dibatalkan' };
      }),
    [runAction, updateBooking]
  );

  const goToPos = useCallback(
    (bookingId: string) => {
      navigate('/pos', { state: { bookingId } });
    },
    [navigate]
  );

  const goToNewBooking = useCallback(
    (roomId: string) => {
      navigate('/bookings', { state: { openNew: true, roomId } });
    },
    [navigate]
  );

  return {
    loadingAction,
    handleCheckIn,
    handleCheckOut,
    handleExtendStay,
    handlePayment,
    handleAssignCleaning,
    handleMarkClean,
    handleMarkCleaning,
    handleBlockRoom,
    handleSendWA,
    handleSendReminder,
    handleMarkMaintenanceDone,
    handleCancelBooking,
    goToPos,
    goToNewBooking,
  };
}
