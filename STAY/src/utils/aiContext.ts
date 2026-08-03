import type { Booking, HousekeepingTask, Payment, Room } from '../types';
import { computeDashboardStats } from './analytics';
import { formatCurrency } from './format';

export interface StayAiContext {
  stats: ReturnType<typeof computeDashboardStats>;
  availableRooms: string[];
  pendingHousekeeping: number;
  checkoutsToday: string[];
}

export function buildStayAiContext(
  bookings: Booking[],
  rooms: Room[],
  payments: Payment[],
  housekeepingTasks: HousekeepingTask[]
): StayAiContext {
  const stats = computeDashboardStats(bookings, rooms, payments);
  const available = rooms.filter((r) => r.status === 'available').map((r) => r.number);
  const pendingHk = housekeepingTasks.filter((t) => t.status === 'pending').length;
  const today = new Date().toISOString().split('T')[0];
  const checkoutsToday = bookings
    .filter((b) => b.checkOut === today && b.status === 'checked_in')
    .map((b) => b.guest?.name || 'Tamu');

  return { stats, availableRooms: available, pendingHousekeeping: pendingHk, checkoutsToday };
}

/** Keyword fallback when LLM unavailable. */
export function buildKeywordReply(text: string, ctx: StayAiContext): string {
  const lower = text.toLowerCase();

  if (lower.includes('kamar') && (lower.includes('kosong') || lower.includes('available'))) {
    return ctx.availableRooms.length
      ? `Malam ini ada ${ctx.availableRooms.length} kamar kosong: ${ctx.availableRooms.join(', ')}.`
      : 'Saat ini tidak ada kamar kosong.';
  }
  if (lower.includes('pendapatan') || lower.includes('revenue')) {
    return `Pendapatan hari ini ${formatCurrency(ctx.stats.revenueToday)}, bulan ini ${formatCurrency(ctx.stats.revenueMonth)}. Occupancy ${ctx.stats.occupancyRate}%.`;
  }
  if (lower.includes('housekeeping') || lower.includes('tugas')) {
    return `Ada ${ctx.pendingHousekeeping} tugas housekeeping menunggu. ${ctx.stats.maintenanceRooms} kamar dalam maintenance.`;
  }
  if (lower.includes('checkout')) {
    return ctx.checkoutsToday.length
      ? `Hari ini ${ctx.checkoutsToday.length} tamu checkout: ${ctx.checkoutsToday.join(', ')}.`
      : 'Tidak ada checkout terjadwal hari ini.';
  }
  return 'Saya bisa bantu cek kamar kosong, pendapatan, checkout hari ini, atau status housekeeping. Coba tanya lebih spesifik!';
}

export function contextToPrompt(ctx: StayAiContext): string {
  return JSON.stringify({
    revenue_today: ctx.stats.revenueToday,
    revenue_month: ctx.stats.revenueMonth,
    occupancy_pct: ctx.stats.occupancyRate,
    available_rooms: ctx.availableRooms,
    pending_housekeeping: ctx.pendingHousekeeping,
    checkouts_today: ctx.checkoutsToday,
    total_rooms: ctx.stats.totalRooms,
    occupied_rooms: ctx.stats.occupiedRooms,
  });
}
