import {
  differenceInHours,
  differenceInMinutes,
  isBefore,
  isToday,
  parseISO,
  startOfDay,
} from 'date-fns';
import type { Booking, Payment } from '../types';
import { RoomStatus, type RoomCardData, type UrgentAction } from '../types/frontdesk.types';
import { DEMO_URGENT_ACTIONS } from '../data/frontdeskMockUrgent';

const PRIORITY: Record<UrgentAction['type'], number> = {
  checkout_soon: 5,
  check_in_overdue: 4,
  payment_expired: 4,
  unpaid: 3,
  dirty_backlog: 2,
  maintenance_overdue: 1,
};

function hoursSince(iso: string, now: Date): number {
  return differenceInHours(now, parseISO(iso));
}

function minutesUntil(iso: string, now: Date): number {
  return differenceInMinutes(parseISO(iso), now);
}

/**
 * Deteksi urgent actions dari data kamar & booking.
 */
export function detectUrgentActions(
  roomCards: RoomCardData[],
  bookings: Booking[],
  payments: Payment[],
  now = new Date()
): UrgentAction[] {
  const actions: UrgentAction[] = [];
  const today = startOfDay(now).toISOString().split('T')[0];

  for (const room of roomCards) {
    const booking = room.activeBooking ?? room.upcomingBooking;
    const fullBooking = booking
      ? bookings.find((b) => b.id === booking.id)
      : undefined;

    // Belum bayar >24 jam (checked in)
    if (
      room.status === RoomStatus.UNPAID &&
      fullBooking?.status === 'checked_in' &&
      hoursSince(fullBooking.checkIn, now) >= 24
    ) {
      const days = Math.floor(hoursSince(fullBooking.checkIn, now) / 24);
      actions.push({
        id: `unpaid-${room.id}`,
        roomId: room.id,
        roomNumber: room.number,
        type: 'unpaid',
        title: `Kamar ${room.number}`,
        description: `Belum bayar ${days} hari`,
        urgencyLevel: 3,
        createdAt: fullBooking.updatedAt,
        actionLabel: 'Kirim Reminder',
        actionTarget: 'pos',
        bookingId: fullBooking.id,
      });
    }

    // Checkout <1 jam
    if (room.activeBooking?.checkOut) {
      const mins = minutesUntil(room.activeBooking.checkOut, now);
      if (mins >= 0 && mins <= 60) {
        actions.push({
          id: `checkout-${room.id}`,
          roomId: room.id,
          roomNumber: room.number,
          type: 'checkout_soon',
          title: `Kamar ${room.number}`,
          description: mins <= 0 ? 'Checkout sekarang' : `Checkout ${mins} menit lagi`,
          urgencyLevel: mins <= 30 ? 3 : 2,
          createdAt: now.toISOString(),
          actionLabel: 'Proses',
          actionTarget: 'checkout',
          bookingId: room.activeBooking.id,
        });
      }
    }

    // Dirty >2 jam
    if (room.status === RoomStatus.DIRTY && room.lastCheckoutAt) {
      const hrs = hoursSince(room.lastCheckoutAt, now);
      if (hrs >= 2) {
        actions.push({
          id: `dirty-${room.id}`,
          roomId: room.id,
          roomNumber: room.number,
          type: 'dirty_backlog',
          title: `Kamar ${room.number}`,
          description: `Dirty sejak ${hrs} jam`,
          urgencyLevel: 2,
          createdAt: room.lastCheckoutAt,
          actionLabel: 'Assign Cleaning',
          actionTarget: 'housekeeping',
        });
      }
    }

    // Check-in overdue (confirmed, check-in today, past 14:00 default)
    if (
      room.status === RoomStatus.RESERVED &&
      room.upcomingBooking?.checkIn.startsWith(today)
    ) {
      const checkInTime = parseISO(`${today}T14:00:00`);
      if (isBefore(checkInTime, now)) {
        actions.push({
          id: `checkin-${room.id}`,
          roomId: room.id,
          roomNumber: room.number,
          type: 'check_in_overdue',
          title: `Kamar ${room.number}`,
          description: 'Check-in terlambat',
          urgencyLevel: 3,
          createdAt: now.toISOString(),
          actionLabel: 'Check-in',
          actionTarget: 'room_detail',
          bookingId: room.upcomingBooking.id,
        });
      }
    }
  }

  // Payment expired
  for (const payment of payments) {
    if (payment.status !== 'unpaid' || !payment.expiryDate) continue;
    if (isBefore(parseISO(payment.expiryDate), now)) {
      const booking = bookings.find((b) => b.id === payment.bookingId);
      const room = roomCards.find(
        (r) => r.activeBooking?.id === payment.bookingId || r.upcomingBooking?.id === payment.bookingId
      );
      if (!room) continue;
      actions.push({
        id: `payexp-${payment.id}`,
        roomId: room.id,
        roomNumber: room.number,
        type: 'payment_expired',
        title: `Kamar ${room.number}`,
        description: 'Pembayaran expired',
        urgencyLevel: 3,
        createdAt: payment.expiryDate,
        actionLabel: 'Buat Invoice Baru',
        actionTarget: 'pos',
        bookingId: payment.bookingId,
      });
    }
  }

  return actions.sort(
    (a, b) =>
      b.urgencyLevel - a.urgencyLevel ||
      PRIORITY[b.type] - PRIORITY[a.type]
  );
}

/** Gabung dengan demo actions di development */
export function mergeWithDemoUrgent(actions: UrgentAction[]): UrgentAction[] {
  if (!import.meta.env.DEV) return actions;
  const ids = new Set(actions.map((a) => a.id));
  const extras = DEMO_URGENT_ACTIONS.filter((a) => !ids.has(a.id));
  return [...actions, ...extras].sort(
    (a, b) => b.urgencyLevel - a.urgencyLevel
  );
}

export function computeFrontDeskStats(
  roomCards: RoomCardData[],
  bookings: Booking[],
  urgentCount: number,
  now = new Date()
): import('../types/frontdesk.types').FrontDeskStatSummary {
  const today = startOfDay(now).toISOString().split('T')[0];
  const occupied = roomCards.filter(
    (r) => r.status === RoomStatus.OCCUPIED || r.status === RoomStatus.UNPAID
  ).length;
  const available = roomCards.filter((r) => r.status === RoomStatus.AVAILABLE).length;
  const checkInsToday = bookings.filter(
    (b) => b.checkIn === today && (b.status === 'confirmed' || b.status === 'pending')
  ).length;
  const checkOutsToday = bookings.filter(
    (b) => b.checkOut === today && b.status === 'checked_in'
  ).length;

  return {
    totalRooms: roomCards.length,
    occupied,
    available,
    reserved: roomCards.filter((r) => r.status === RoomStatus.RESERVED).length,
    dirty: roomCards.filter((r) => r.status === RoomStatus.DIRTY).length,
    maintenance: roomCards.filter((r) => r.status === RoomStatus.MAINTENANCE).length,
    unpaid: roomCards.filter((r) => r.status === RoomStatus.UNPAID).length,
    occupancyRate: roomCards.length > 0 ? Math.round((occupied / roomCards.length) * 100) : 0,
    revenueToday: 0,
    checkInsToday,
    checkOutsToday,
    urgentCount,
  };
}
