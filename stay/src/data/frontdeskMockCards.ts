import { RoomStatus, type RoomCardData } from '../types/frontdesk.types';

const today = new Date();
const fmt = (d: Date) => d.toISOString().split('T')[0];
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return fmt(d);
};
const daysAhead = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return fmt(d);
};
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString();

const base = (overrides: Partial<RoomCardData> & Pick<RoomCardData, 'id' | 'number' | 'status'>): RoomCardData => ({
  floor: 1,
  roomTypeName: 'Deluxe',
  basePrice: 550000,
  rawStatus: 'available',
  isActive: true,
  urgencyLevel: 0,
  shouldPulse: false,
  facilities: ['AC', 'WiFi', 'TV'],
  ...overrides,
});

/** Sample kartu untuk demo & development */
export const MOCK_ROOM_CARDS: RoomCardData[] = [
  base({
    id: 'demo-available',
    number: '102',
    status: RoomStatus.AVAILABLE,
    roomTypeName: 'Standard',
    basePrice: 350000,
    rawStatus: 'available',
  }),
  base({
    id: 'demo-occupied',
    number: '201',
    status: RoomStatus.OCCUPIED,
    urgencyLevel: 1,
    checkoutLabel: 'Checkout besok 12:00',
    stayProgress: 65,
    activeBooking: {
      id: 'bk-1',
      bookingCode: 'STY-2026-101',
      checkIn: daysAgo(2),
      checkOut: daysAhead(1),
      nights: 3,
      paymentStatus: 'paid',
      status: 'checked_in',
      totalAmount: 1650000,
      paidAmount: 1650000,
      balanceDue: 0,
      guest: { id: 'g1', name: 'Dewi Rahayu' },
    },
    indicators: { breakfast: true, vip: true },
    ribbon: 'VIP',
  }),
  base({
    id: 'demo-reserved',
    number: '105',
    status: RoomStatus.RESERVED,
    urgencyLevel: 1,
    rawStatus: 'available',
    upcomingBooking: {
      id: 'bk-2',
      bookingCode: 'STY-2026-102',
      checkIn: `${daysAhead(0)}T14:00:00`,
      checkOut: daysAhead(2),
      nights: 2,
      paymentStatus: 'partial',
      status: 'confirmed',
      totalAmount: 1100000,
      paidAmount: 500000,
      balanceDue: 600000,
      guest: { id: 'g2', name: 'Agus Permana' },
    },
    ribbon: 'BARU',
    indicators: { kids: true },
  }),
  base({
    id: 'demo-dirty',
    number: '103',
    status: RoomStatus.DIRTY,
    urgencyLevel: 2,
    rawStatus: 'cleaning',
    lastCheckoutAt: hoursAgo(2),
    indicators: { needsCleaning: true },
  }),
  base({
    id: 'demo-maintenance',
    number: '301',
    status: RoomStatus.MAINTENANCE,
    floor: 3,
    urgencyLevel: 2,
    rawStatus: 'maintenance',
    maintenanceNote: 'Perbaikan AC & pipa air',
    roomTypeName: 'Suite',
  }),
  base({
    id: 'demo-unpaid',
    number: '203',
    status: RoomStatus.UNPAID,
    urgencyLevel: 3,
    shouldPulse: true,
    rawStatus: 'occupied',
    checkoutLabel: 'Checkout 2 jam lagi',
    ribbon: 'URGENT',
    activeBooking: {
      id: 'bk-3',
      bookingCode: 'STY-2026-103',
      checkIn: daysAgo(1),
      checkOut: daysAhead(0),
      nights: 2,
      paymentStatus: 'unpaid',
      status: 'checked_in',
      totalAmount: 1265000,
      paidAmount: 300000,
      balanceDue: 965000,
      guest: { id: 'g3', name: 'Budi Santoso' },
    },
    indicators: { unpaid: true, extended: true },
  }),
];

export function getMockRoomCardByStatus(status: RoomStatus): RoomCardData | undefined {
  return MOCK_ROOM_CARDS.find((r) => r.status === status);
}
