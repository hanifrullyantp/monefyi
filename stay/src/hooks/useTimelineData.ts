import { useMemo } from 'react';
import {
  addDays,
  differenceInCalendarDays,
  isBefore,
  parseISO,
  startOfDay,
} from 'date-fns';
import type { Booking } from '../types';
import type { RoomCardData } from '../types/frontdesk.types';

export type TimelineBookingVariant = 'paid' | 'unpaid' | 'reserved' | 'past' | 'checked_in';

export interface TimelineBookingSegment {
  booking: Booking;
  startOffset: number;
  spanDays: number;
  variant: TimelineBookingVariant;
  guestName: string;
}

export interface TimelineRoomRowData {
  room: RoomCardData;
  segments: TimelineBookingSegment[];
  /** Hari kosong dalam range (untuk quick-book) */
  gapOffsets: number[];
}

export interface TimelineDaySummary {
  date: string;
  occupiedRooms: number;
  occupancyRate: number;
}

export interface UseTimelineDataInput {
  rooms: RoomCardData[];
  bookings: Booking[];
  rangeStart: Date;
  rangeEnd: Date;
}

function resolveBookingVariant(booking: Booking, now = new Date()): TimelineBookingVariant {
  const checkout = startOfDay(parseISO(booking.checkOut));
  if (isBefore(checkout, startOfDay(now)) || booking.status === 'checked_out') {
    return 'past';
  }
  if (booking.status === 'checked_in') {
    if (booking.paymentStatus === 'unpaid' || booking.paidAmount < booking.totalAmount) {
      return 'unpaid';
    }
    return 'checked_in';
  }
  if (booking.paymentStatus === 'unpaid' || booking.paidAmount < booking.totalAmount) {
    return 'unpaid';
  }
  if (booking.status === 'confirmed' || booking.status === 'pending') {
    return 'reserved';
  }
  return 'paid';
}

function bookingOverlapsRange(
  booking: Booking,
  rangeStart: Date,
  rangeEnd: Date
): boolean {
  if (booking.status === 'cancelled' || booking.status === 'no_show') return false;
  const checkIn = startOfDay(parseISO(booking.checkIn));
  const lastNight = addDays(startOfDay(parseISO(booking.checkOut)), -1);
  return !(isBefore(lastNight, rangeStart) || isBefore(rangeEnd, checkIn));
}

function computeSegment(
  booking: Booking,
  rangeStart: Date,
  rangeEnd: Date
): TimelineBookingSegment | null {
  const checkIn = startOfDay(parseISO(booking.checkIn));
  const lastNight = addDays(startOfDay(parseISO(booking.checkOut)), -1);

  const visibleStart = checkIn.getTime() > rangeStart.getTime() ? checkIn : rangeStart;
  const visibleEnd = lastNight.getTime() < rangeEnd.getTime() ? lastNight : rangeEnd;

  if (isBefore(visibleEnd, visibleStart)) return null;

  const startOffset = differenceInCalendarDays(visibleStart, rangeStart);
  const spanDays = differenceInCalendarDays(visibleEnd, visibleStart) + 1;

  return {
    booking,
    startOffset,
    spanDays,
    variant: resolveBookingVariant(booking),
    guestName: booking.guest?.name ?? 'Tamu',
  };
}

/**
 * Format data timeline: kamar × booking bars dalam range tanggal.
 */
export function buildTimelineRows(
  rooms: RoomCardData[],
  bookings: Booking[],
  rangeStart: Date,
  rangeEnd: Date
): { rows: TimelineRoomRowData[]; daySummaries: TimelineDaySummary[]; dayCount: number } {
  const normalizedStart = startOfDay(rangeStart);
  const normalizedEnd = startOfDay(rangeEnd);
  const dayCount =
    differenceInCalendarDays(normalizedEnd, normalizedStart) + 1;

  const rows: TimelineRoomRowData[] = rooms.map((room) => {
    const roomBookings = bookings.filter(
      (b) =>
        b.roomId === room.id &&
        bookingOverlapsRange(b, normalizedStart, normalizedEnd)
    );

    const segments = roomBookings
      .map((b) => computeSegment(b, normalizedStart, normalizedEnd))
      .filter((s): s is TimelineBookingSegment => s != null)
      .sort((a, b) => a.startOffset - b.startOffset);

    const occupied = new Set<number>();
    for (const seg of segments) {
      for (let i = 0; i < seg.spanDays; i++) {
        occupied.add(seg.startOffset + i);
      }
    }

    const gapOffsets: number[] = [];
    for (let d = 0; d < dayCount; d++) {
      if (!occupied.has(d)) gapOffsets.push(d);
    }

    return { room, segments, gapOffsets };
  });

  const daySummaries: TimelineDaySummary[] = [];
  for (let d = 0; d < dayCount; d++) {
    const date = addDays(normalizedStart, d);
    const dateKey = date.toISOString().split('T')[0];
    let occupied = 0;
    for (const row of rows) {
      const hasBooking = row.segments.some(
        (s) => s.startOffset <= d && s.startOffset + s.spanDays > d
      );
      if (hasBooking) occupied += 1;
    }
    daySummaries.push({
      date: dateKey,
      occupiedRooms: occupied,
      occupancyRate:
        rooms.length > 0 ? Math.round((occupied / rooms.length) * 100) : 0,
    });
  }

  return { rows, daySummaries, dayCount };
}

export function useTimelineData({
  rooms,
  bookings,
  rangeStart,
  rangeEnd,
}: UseTimelineDataInput) {
  return useMemo(
    () => buildTimelineRows(rooms, bookings, rangeStart, rangeEnd),
    [rooms, bookings, rangeStart, rangeEnd]
  );
}
