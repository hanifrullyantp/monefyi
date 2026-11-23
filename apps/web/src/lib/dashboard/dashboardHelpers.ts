import type { HealthFilterType } from '../../components/common/HealthChips';

/**
 * Mencocokkan status kesehatan proyek terhadap filter aktif Dashboard.
 * Filter `'attention'` menampilkan proyek berstatus `'at_risk'` maupun `'behind'` (F-11).
 */
export function matchesDashboardHealthFilter(
  healthStatus: string | null | undefined,
  filter: HealthFilterType,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'attention') {
    return healthStatus === 'at_risk' || healthStatus === 'behind';
  }
  return healthStatus === filter;
}

/**
 * Mengembalikan pembuka ringkasan agen harian sesuai jam lokal (F-34),
 * selaras dengan sapaan `getGreeting()` pada header Dashboard.
 */
export function getAgentBriefingLead(hour?: number): string {
  const rawHour =
    typeof hour === 'number' && Number.isFinite(hour) ? hour : new Date().getHours();
  const normalizedHour = ((Math.floor(rawHour) % 24) + 24) % 24;
  if (normalizedHour < 12) return 'Laporan pagi:';
  if (normalizedHour < 15) return 'Laporan siang:';
  if (normalizedHour < 18) return 'Laporan sore:';
  return 'Laporan malam:';
}

/**
 * Membentuk tautan share WhatsApp dengan encoding URL aman (F-26).
 */
export function buildWhatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
