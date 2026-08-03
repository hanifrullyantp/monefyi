import { describe, expect, it } from 'vitest';
import {
  formatStayDuration,
  getRoomStatusConfig,
  getStayProgress,
  getTimeUntilCheckout,
  getUrgencyLevel,
  resolveFrontDeskStatus,
  shouldPulse,
} from './roomStatus';
import { RoomStatus, type RoomCardData } from '../types/frontdesk.types';
import type { Booking, Room } from '../types';

const baseRoom: Room = {
  id: 'r1',
  tenantId: 't1',
  roomTypeId: 'rt1',
  number: '101',
  floor: 1,
  status: 'available',
  isActive: true,
};

describe('getRoomStatusConfig - AVAILABLE - Returns Indonesian label', () => {
  it('returns Tersedia label', () => {
    const config = getRoomStatusConfig(RoomStatus.AVAILABLE);
    expect(config.label).toBe('Tersedia');
    expect(config.priority).toBe(0);
  });
});

describe('resolveFrontDeskStatus - Checked in unpaid - Returns UNPAID', () => {
  it('overrides occupied with UNPAID when balance due', () => {
    const booking: Booking = {
      id: 'b1',
      tenantId: 't1',
      bookingCode: 'STY-1',
      guestId: 'g1',
      roomId: 'r1',
      checkIn: '2026-08-01',
      checkOut: '2026-08-03',
      nights: 2,
      adults: 1,
      children: 0,
      status: 'checked_in',
      paymentStatus: 'unpaid',
      totalAmount: 500000,
      paidAmount: 0,
      source: 'manual',
      createdBy: 'u1',
      createdAt: '2026-08-01',
      updatedAt: '2026-08-01',
    };

    expect(resolveFrontDeskStatus(baseRoom, booking)).toBe(RoomStatus.UNPAID);
  });
});

describe('getStayProgress - Mid stay - Returns percentage', () => {
  it('returns 50 for halfway through stay', () => {
    const progress = getStayProgress('2026-08-01', '2026-08-05', new Date('2026-08-03'));
    expect(progress).toBe(50);
  });
});

describe('formatStayDuration - Two nights - Includes malam label', () => {
  it('formats in Bahasa Indonesia', () => {
    const label = formatStayDuration('2026-08-01', '2026-08-03');
    expect(label).toContain('2 malam');
  });
});

describe('getTimeUntilCheckout - Same day - Returns jam lagi', () => {
  it('returns hours remaining label', () => {
    const now = new Date('2026-08-03T10:00:00');
    const label = getTimeUntilCheckout('2026-08-03T14:00:00', now);
    expect(label).toMatch(/jam lagi/);
  });
});

describe('shouldPulse - UNPAID room - Returns true', () => {
  it('pulses for unpaid status', () => {
    const card: Pick<RoomCardData, 'status' | 'urgencyLevel' | 'activeBooking'> = {
      status: RoomStatus.UNPAID,
      urgencyLevel: 3,
    };
    expect(shouldPulse(card)).toBe(true);
  });
});

describe('getUrgencyLevel - DIRTY room - Returns 2', () => {
  it('returns priority 2 for dirty', () => {
    const level = getUrgencyLevel({
      status: RoomStatus.DIRTY,
      urgencyLevel: 0,
    });
    expect(level).toBe(2);
  });
});
