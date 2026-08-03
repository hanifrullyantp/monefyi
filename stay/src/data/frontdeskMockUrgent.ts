import type { UrgentAction } from '../types/frontdesk.types';

const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
const minsAhead = (m: number) => new Date(now.getTime() + m * 60000).toISOString();

/** Mock urgent actions untuk preview visual (development) */
export const DEMO_URGENT_ACTIONS: UrgentAction[] = [
  {
    id: 'demo-unpaid-103',
    roomId: 'demo-dirty',
    roomNumber: '103',
    type: 'unpaid',
    title: 'Kamar 103',
    description: 'Belum bayar 2 hari',
    urgencyLevel: 3,
    createdAt: hoursAgo(48),
    actionLabel: 'Kirim Reminder',
    actionTarget: 'pos',
    bookingId: 'demo-bk-unpaid',
  },
  {
    id: 'demo-checkout-205',
    roomId: 'demo-unpaid',
    roomNumber: '205',
    type: 'checkout_soon',
    title: 'Kamar 205',
    description: 'Checkout 30 menit lagi',
    urgencyLevel: 3,
    createdAt: minsAhead(30),
    actionLabel: 'Proses',
    actionTarget: 'checkout',
    bookingId: 'demo-bk-checkout',
  },
  {
    id: 'demo-dirty-301',
    roomId: 'demo-maintenance',
    roomNumber: '301',
    type: 'dirty_backlog',
    title: 'Kamar 301',
    description: 'Dirty sejak 3 jam',
    urgencyLevel: 2,
    createdAt: hoursAgo(3),
    actionLabel: 'Assign Cleaning',
    actionTarget: 'housekeeping',
  },
  {
    id: 'demo-checkin-105',
    roomId: 'demo-reserved',
    roomNumber: '105',
    type: 'check_in_overdue',
    title: 'Kamar 105',
    description: 'Check-in terlambat',
    urgencyLevel: 3,
    createdAt: now.toISOString(),
    actionLabel: 'Check-in',
    actionTarget: 'room_detail',
    bookingId: 'demo-bk-checkin',
  },
  {
    id: 'demo-payexp-201',
    roomId: 'demo-occupied',
    roomNumber: '201',
    type: 'payment_expired',
    title: 'Kamar 201',
    description: 'Pembayaran expired',
    urgencyLevel: 3,
    createdAt: hoursAgo(1),
    actionLabel: 'Buat Invoice Baru',
    actionTarget: 'pos',
    bookingId: 'demo-bk-payexp',
  },
];
