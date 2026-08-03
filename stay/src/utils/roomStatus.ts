import {
  differenceInCalendarDays,
  differenceInHours,
  differenceInMinutes,
  isAfter,
  isBefore,
  isToday,
  parseISO,
  startOfDay,
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { formatDistanceToNowStrict } from 'date-fns';

import {
  getStatusDefinition,
  ROOM_STATUS_DEFINITIONS,
  type FrontDeskStatusKey,
} from '../constants/roomStatus';
import { RoomStatus, type RoomCardData } from '../types/frontdesk.types';
import type { Booking, Room } from '../types';

/** Map enum RoomStatus redesign ke definisi konstanta */
export function getRoomStatusConfig(status: RoomStatus) {
  return getStatusDefinition(status as FrontDeskStatusKey);
}

/**
 * Resolve status Front Desk dari entity Room + booking opsional.
 * UNPAID override OCCUPIED jika tagihan belum lunas.
 */
export function resolveFrontDeskStatus(
  room: Room,
  activeBooking?: Booking,
  upcomingBooking?: Booking
): RoomStatus {
  if (activeBooking?.status === 'checked_in') {
    const balance = activeBooking.totalAmount - activeBooking.paidAmount;
    if (activeBooking.paymentStatus === 'unpaid' || balance > 0) {
      return RoomStatus.UNPAID;
    }
    return RoomStatus.OCCUPIED;
  }

  if (
    upcomingBooking &&
    (upcomingBooking.status === 'confirmed' || upcomingBooking.status === 'pending')
  ) {
    return RoomStatus.RESERVED;
  }

  switch (room.status) {
    case 'cleaning':
      return RoomStatus.DIRTY;
    case 'maintenance':
    case 'blocked':
      return RoomStatus.MAINTENANCE;
    case 'occupied':
      return RoomStatus.OCCUPIED;
    default:
      return RoomStatus.AVAILABLE;
  }
}

/** Hitung urgency 0–3 dari kartu kamar */
export function getUrgencyLevel(room: Pick<RoomCardData, 'status' | 'activeBooking' | 'checkoutLabel'>): 0 | 1 | 2 | 3 {
  if (room.status === RoomStatus.UNPAID) return 3;

  if (room.status === RoomStatus.DIRTY || room.status === RoomStatus.MAINTENANCE) {
    return 2;
  }

  if (room.activeBooking && room.checkoutLabel) {
    const checkout = parseISO(room.activeBooking.checkOut);
    const hoursLeft = differenceInHours(checkout, new Date());
    if (hoursLeft <= 2 && hoursLeft >= 0) return 2;
  }

  if (room.status === RoomStatus.RESERVED || room.status === RoomStatus.OCCUPIED) {
    return 1;
  }

  return 0;
}

/**
 * Progress menginap dalam persen (0–100).
 * Menggunakan tanggal kalender, bukan jam check-in/out.
 */
export function getStayProgress(checkIn: string, checkOut: string, now = new Date()): number {
  const start = startOfDay(parseISO(checkIn)).getTime();
  const end = startOfDay(parseISO(checkOut)).getTime();
  const current = startOfDay(now).getTime();

  if (end <= start) return 0;
  if (current <= start) return 0;
  if (current >= end) return 100;

  const progress = ((current - start) / (end - start)) * 100;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

/** Format durasi menginap dalam Bahasa Indonesia */
export function formatStayDuration(checkIn: string, checkOut: string): string {
  const nights = differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn));
  const today = startOfDay(new Date());
  const checkoutDay = startOfDay(parseISO(checkOut));
  const daysLeft = differenceInCalendarDays(checkoutDay, today);

  const nightLabel = nights === 1 ? '1 malam' : `${nights} malam`;

  if (daysLeft <= 0) {
    return `${nightLabel} · checkout hari ini`;
  }
  if (daysLeft === 1) {
    return `${nightLabel} · 1 hari tersisa`;
  }
  return `${nightLabel} · ${daysLeft} hari tersisa`;
}

/** Countdown checkout relatif, mis. "2 jam lagi" */
export function getTimeUntilCheckout(checkOut: string, now = new Date()): string {
  const checkoutAt = parseISO(checkOut);

  if (isBefore(checkoutAt, now)) {
    return 'Sudah lewat checkout';
  }

  if (isToday(checkoutAt)) {
    const hoursLeft = differenceInHours(checkoutAt, now);
    if (hoursLeft <= 0) {
      const minsLeft = differenceInMinutes(checkoutAt, now);
      if (minsLeft <= 0) return 'Checkout sekarang';
      return `${minsLeft} menit lagi`;
    }
    if (hoursLeft === 1) return '1 jam lagi';
    return `${hoursLeft} jam lagi`;
  }

  const daysLeft = differenceInCalendarDays(startOfDay(checkoutAt), startOfDay(now));
  if (daysLeft === 1) return 'Checkout besok';
  return `Checkout ${daysLeft} hari lagi`;
}

/** Apakah kartu perlu animasi pulse urgent */
export function shouldPulse(room: Pick<RoomCardData, 'status' | 'urgencyLevel' | 'activeBooking'>, now = new Date()): boolean {
  if (room.status === RoomStatus.UNPAID) return true;
  if (room.urgencyLevel >= 3) return true;

  if (room.activeBooking?.checkOut) {
    const checkout = parseISO(room.activeBooking.checkOut);
    if (isToday(checkout) && isAfter(checkout, now)) {
      const hoursLeft = differenceInHours(checkout, now);
      return hoursLeft <= 2;
    }
  }

  return false;
}

/** Label waktu relatif untuk aksi urgent */
export function formatRelativeTimeId(dateStr: string): string {
  return formatDistanceToNowStrict(parseISO(dateStr), {
    addSuffix: true,
    locale: localeId,
  });
}

/** Semua konfigurasi status sebagai array (untuk legend / filter chips) */
export function getAllRoomStatusConfigs() {
  return Object.values(ROOM_STATUS_DEFINITIONS);
}
