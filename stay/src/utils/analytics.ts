import type {
  Booking,
  DashboardStats,
  OccupancyData,
  Payment,
  RevenueData,
  Room,
} from '../types';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function computeDashboardStats(
  bookings: Booking[],
  rooms: Room[],
  payments: Payment[]
): DashboardStats {
  const today = new Date().toISOString().split('T')[0];
  const totalRooms = rooms.filter((r) => r.isActive).length;
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length;
  const availableRooms = rooms.filter((r) => r.status === 'available').length;
  const maintenanceRooms = rooms.filter((r) => r.status === 'maintenance').length;

  const revenueToday = payments
    .filter((p) => p.createdAt.startsWith(today) && p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const monthPrefix = today.slice(0, 7);
  const revenueMonth = payments
    .filter((p) => p.createdAt.startsWith(monthPrefix) && p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const checkInsToday = bookings.filter(
    (b) => b.checkIn === today && ['confirmed', 'checked_in'].includes(b.status)
  ).length;

  const checkOutsToday = bookings.filter(
    (b) => b.checkOut === today && ['checked_in', 'checked_out'].includes(b.status)
  ).length;

  const pendingBookings = bookings.filter((b) =>
    ['pending', 'confirmed'].includes(b.status)
  ).length;

  const occupancyRate = totalRooms > 0
    ? Math.round((occupiedRooms / totalRooms) * 1000) / 10
    : 0;

  return {
    revenueToday,
    revenueMonth,
    occupancyRate,
    checkInsToday,
    checkOutsToday,
    pendingBookings,
    availableRooms,
    totalRooms,
    occupiedRooms,
    maintenanceRooms,
  };
}

export function computeRevenueData(
  payments: Payment[],
  days = 7
): RevenueData[] {
  const result: RevenueData[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayPayments = payments.filter(
      (p) => p.createdAt.startsWith(dateStr) && p.status === 'paid'
    );
    result.push({
      date: `${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`,
      revenue: dayPayments.reduce((sum, p) => sum + p.amount, 0),
      bookings: new Set(dayPayments.map((p) => p.bookingId)).size,
    });
  }

  return result;
}

export function computeOccupancyData(bookings: Booking[], months = 6): OccupancyData[] {
  const result: OccupancyData[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = d.toISOString().split('T')[0];
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const monthEnd = nextMonth.toISOString().split('T')[0];

    const monthBookings = bookings.filter(
      (b) =>
        !['cancelled', 'no_show'].includes(b.status) &&
        b.checkIn < monthEnd &&
        b.checkOut > monthStart
    );

    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const occupiedNights = monthBookings.reduce((sum, b) => sum + b.nights, 0);
    const rate = Math.min(100, Math.round((occupiedNights / (daysInMonth * 12)) * 100));

    result.push({
      month: MONTH_LABELS[d.getMonth()],
      rate,
    });
  }

  return result;
}

export function computePaymentMethodBreakdown(payments: Payment[]) {
  const totals: Record<string, number> = {};
  let grandTotal = 0;

  for (const p of payments) {
    if (p.status !== 'paid') continue;
    totals[p.method] = (totals[p.method] || 0) + p.amount;
    grandTotal += p.amount;
  }

  const labels: Record<string, string> = {
    cash: 'Tunai',
    transfer: 'Transfer',
    qris: 'QRIS',
    ewallet: 'E-Wallet',
    virtual_account: 'Virtual Account',
    credit_card: 'Kartu Kredit',
  };

  return Object.entries(totals).map(([method, amount]) => ({
    name: labels[method] || method,
    value: grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0,
    amount,
  }));
}

export function exportToCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
