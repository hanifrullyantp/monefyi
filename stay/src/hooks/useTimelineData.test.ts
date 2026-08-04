import { describe, expect, it } from 'vitest';
import { addDays, startOfDay } from 'date-fns';
import { buildTimelineRows } from './useTimelineData';
import type { Booking } from '../types';
import { RoomStatus, type RoomCardData } from '../types/frontdesk.types';

const baseRoom = (id: string, number: string): RoomCardData => ({
  id,
  number,
  floor: 1,
  roomTypeName: 'Deluxe',
  basePrice: 500000,
  status: RoomStatus.AVAILABLE,
  rawStatus: 'available',
  isActive: true,
  urgencyLevel: 0,
  shouldPulse: false,
  facilities: [],
});

describe('useTimelineData - Booking in range - Returns segment', () => {
  it('computes booking bar span', () => {
    const rangeStart = startOfDay(new Date('2026-08-01'));
    const rangeEnd = startOfDay(new Date('2026-08-14'));
    const rooms = [baseRoom('r1', '101')];
    const bookings: Booking[] = [
      {
        id: 'b1',
        tenantId: 't1',
        roomId: 'r1',
        guestId: 'g1',
        bookingCode: 'BK-001',
        checkIn: '2026-08-03',
        checkOut: '2026-08-06',
        nights: 3,
        status: 'confirmed',
        paymentStatus: 'paid',
        totalAmount: 1500000,
        paidAmount: 1500000,
        createdAt: '2026-08-01',
        updatedAt: '2026-08-01',
      } as Booking,
    ];

    const { rows } = buildTimelineRows(rooms, bookings, rangeStart, rangeEnd);

    expect(rows[0].segments).toHaveLength(1);
    expect(rows[0].segments[0].spanDays).toBe(3);
    expect(rows[0].segments[0].startOffset).toBe(2);
  });
});

describe('useTimelineData - Day summaries - Calculates occupancy', () => {
  it('returns occupancy per day', () => {
    const rangeStart = startOfDay(new Date('2026-08-03'));
    const rangeEnd = addDays(rangeStart, 2);
    const rooms = [baseRoom('r1', '101'), baseRoom('r2', '102')];
    const bookings: Booking[] = [
      {
        id: 'b1',
        tenantId: 't1',
        roomId: 'r1',
        guestId: 'g1',
        bookingCode: 'BK-002',
        checkIn: '2026-08-03',
        checkOut: '2026-08-04',
        nights: 1,
        status: 'checked_in',
        paymentStatus: 'paid',
        totalAmount: 500000,
        paidAmount: 500000,
        createdAt: '2026-08-01',
        updatedAt: '2026-08-01',
      } as Booking,
    ];

    const { daySummaries } = buildTimelineRows(rooms, bookings, rangeStart, rangeEnd);

    expect(daySummaries[0].occupiedRooms).toBe(1);
    expect(daySummaries[0].occupancyRate).toBe(50);
  });
});
