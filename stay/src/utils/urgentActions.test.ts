import { describe, expect, it } from 'vitest';
import { detectUrgentActions } from './urgentActions';
import { RoomStatus, type RoomCardData } from '../types/frontdesk.types';
import type { Booking, Payment } from '../types';

const baseRoom = (overrides: Partial<RoomCardData>): RoomCardData => ({
  id: 'r1',
  number: '101',
  floor: 1,
  roomTypeName: 'Deluxe',
  basePrice: 500000,
  status: RoomStatus.AVAILABLE,
  rawStatus: 'available',
  isActive: true,
  urgencyLevel: 0,
  shouldPulse: false,
  facilities: [],
  ...overrides,
});

describe('detectUrgentActions - Checkout within 1 hour - Flags checkout_soon', () => {
  it('detects imminent checkout', () => {
    const now = new Date('2026-08-03T14:00:00');
    const checkOut = new Date('2026-08-03T14:30:00').toISOString();
    const rooms = [
      baseRoom({
        id: 'r1',
        status: RoomStatus.OCCUPIED,
        activeBooking: {
          id: 'b1',
          bookingCode: 'BK-001',
          checkIn: '2026-08-01',
          checkOut,
          nights: 2,
          paymentStatus: 'paid',
          status: 'checked_in',
          totalAmount: 1000000,
          paidAmount: 1000000,
          balanceDue: 0,
        },
      }),
    ];

    const actions = detectUrgentActions(rooms, [], [], now);
    expect(actions.some((a) => a.type === 'checkout_soon')).toBe(true);
  });
});

describe('detectUrgentActions - Dirty room over 2 hours - Flags dirty_backlog', () => {
  it('detects dirty backlog', () => {
    const now = new Date('2026-08-03T14:00:00');
    const lastCheckout = new Date('2026-08-03T10:00:00').toISOString();
    const rooms = [
      baseRoom({
        status: RoomStatus.DIRTY,
        lastCheckoutAt: lastCheckout,
      }),
    ];

    const actions = detectUrgentActions(rooms, [], [], now);
    expect(actions.some((a) => a.type === 'dirty_backlog')).toBe(true);
  });
});

describe('detectUrgentActions - Expired payment - Flags payment_expired', () => {
  it('detects expired payment', () => {
    const now = new Date('2026-08-03T14:00:00');
    const rooms = [
      baseRoom({
        id: 'r2',
        number: '202',
        status: RoomStatus.RESERVED,
        upcomingBooking: {
          id: 'b2',
          bookingCode: 'BK-002',
          checkIn: '2026-08-04',
          checkOut: '2026-08-06',
          nights: 2,
          paymentStatus: 'unpaid',
          status: 'confirmed',
          totalAmount: 800000,
          paidAmount: 0,
          balanceDue: 800000,
        },
      }),
    ];
    const payments: Payment[] = [
      {
        id: 'p1',
        bookingId: 'b2',
        amount: 800000,
        status: 'unpaid',
        expiryDate: '2026-08-03T12:00:00',
        method: 'bank_transfer',
        createdAt: '2026-08-01T10:00:00',
        updatedAt: '2026-08-01T10:00:00',
        tenantId: 't1',
      } as Payment,
    ];

    const actions = detectUrgentActions(rooms, [], payments, now);
    expect(actions.some((a) => a.type === 'payment_expired')).toBe(true);
  });
});
