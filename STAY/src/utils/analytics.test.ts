import { describe, it, expect } from 'vitest';
import { computeDashboardStats, computeRevenueData } from './analytics';
import type { Booking, Payment, Room } from '../types';

const rooms: Room[] = [
  { id: 'r1', tenantId: 't1', roomTypeId: 'rt1', number: '101', floor: 1, status: 'occupied', isActive: true },
  { id: 'r2', tenantId: 't1', roomTypeId: 'rt1', number: '102', floor: 1, status: 'available', isActive: true },
];

const bookings: Booking[] = [
  {
    id: 'b1', tenantId: 't1', bookingCode: 'STY-001', guestId: 'g1', roomId: 'r1',
    checkIn: new Date().toISOString().split('T')[0], checkOut: new Date().toISOString().split('T')[0],
    nights: 1, adults: 2, children: 0, status: 'checked_in', paymentStatus: 'paid',
    totalAmount: 500000, paidAmount: 500000, source: 'manual', createdBy: 'u1',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
];

const payments: Payment[] = [
  {
    id: 'p1', tenantId: 't1', bookingId: 'b1', amount: 500000, method: 'cash',
    status: 'paid', createdAt: new Date().toISOString(),
  },
];

describe('computeDashboardStats', () => {
  it('calculates occupancy from rooms', () => {
    const stats = computeDashboardStats(bookings, rooms, payments);
    expect(stats.totalRooms).toBe(2);
    expect(stats.occupiedRooms).toBe(1);
    expect(stats.occupancyRate).toBe(50);
  });

  it('sums revenue today from payments', () => {
    const stats = computeDashboardStats(bookings, rooms, payments);
    expect(stats.revenueToday).toBe(500000);
  });
});

describe('computeRevenueData', () => {
  it('returns array for chart', () => {
    const data = computeRevenueData(payments, 3);
    expect(data.length).toBe(3);
    expect(data.some((d) => d.revenue >= 0)).toBe(true);
  });
});
