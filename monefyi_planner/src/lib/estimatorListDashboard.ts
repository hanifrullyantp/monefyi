import { daysSinceIso, ESTIMATION_STATUS_LABEL, formatRupiahCompact } from './estimatorFormat';
import { normalizeEstimationStatus } from './estimationStatus';
import { ESTIMATOR_RECENCY_THRESHOLDS } from './estimatorListThresholds';
import type { Estimation, EstimationStatus } from '../types/estimator';

export type DashboardBucket = 'active' | 'lead';
export type DashboardListFilter = 'all' | 'active' | 'lead' | 'stale';
export type RecencyTone = 'fresh' | 'aging' | 'stale';
export type DashboardPill = 'terbaru' | 'active' | 'lead' | null;

/** Active di kartu dashboard: closing sampai finishing (selesai → arsip). */
export const DASHBOARD_ACTIVE_STATUSES: EstimationStatus[] = [
  'closing',
  'proses',
  'finishing',
];

/** Arsip outcome: pekerjaan selesai atau ditolak (converted tetap arsip terpisah). */
export const DASHBOARD_ARCHIVE_OUTCOME_STATUSES: EstimationStatus[] = [
  'selesai',
  'rejected',
];

/** Lead di kartu dashboard: masih di pipeline penjualan. */
export const DASHBOARD_LEAD_STATUSES: EstimationStatus[] = [
  'wa',
  'survei',
  'penawaran',
];

export type EstimatorDashboardStats = {
  newInWindow: number;
  totalOpen: number;
  newRatio: number;
  activeCount: number;
  activeValue: number;
  leadCount: number;
  leadValue: number;
  staleCount: number;
};

function createdAtMs(est: Pick<Estimation, 'created_at' | 'updated_at'>): number {
  const iso = est.created_at || est.updated_at;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function updatedAtMs(est: Pick<Estimation, 'updated_at' | 'created_at'>): number {
  const iso = est.updated_at || est.created_at;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function isEstimationArchived(status: EstimationStatus | string): boolean {
  const normalized = normalizeEstimationStatus(status);
  return (
    normalized === 'converted'
    || DASHBOARD_ARCHIVE_OUTCOME_STATUSES.includes(normalized)
  );
}

export function isDashboardActive(status: EstimationStatus | string): boolean {
  return DASHBOARD_ACTIVE_STATUSES.includes(normalizeEstimationStatus(status));
}

export function isDashboardLead(status: EstimationStatus | string): boolean {
  return DASHBOARD_LEAD_STATUSES.includes(normalizeEstimationStatus(status));
}

export function getDashboardBucket(status: EstimationStatus | string): DashboardBucket | null {
  if (isDashboardActive(status)) return 'active';
  if (isDashboardLead(status)) return 'lead';
  return null;
}

export function daysSinceUpdated(est: Pick<Estimation, 'updated_at' | 'created_at'>): number {
  return daysSinceIso(est.updated_at || est.created_at);
}

export function isEstimationStale(
  est: Pick<Estimation, 'status' | 'updated_at' | 'created_at'>,
  nowMs = Date.now(),
): boolean {
  if (isEstimationArchived(est.status)) return false;
  const updated = updatedAtMs(est);
  if (!updated) return false;
  const days = Math.max(0, Math.floor((nowMs - updated) / 86_400_000));
  return days > ESTIMATOR_RECENCY_THRESHOLDS.staleDays;
}

export function recencyToneFromDays(days: number): RecencyTone {
  if (days <= ESTIMATOR_RECENCY_THRESHOLDS.freshDays) return 'fresh';
  if (days <= ESTIMATOR_RECENCY_THRESHOLDS.staleDays) return 'aging';
  return 'stale';
}

export function recencyToneForEstimation(
  est: Pick<Estimation, 'updated_at' | 'created_at'>,
): RecencyTone {
  return recencyToneFromDays(daysSinceUpdated(est));
}

/** "Update 4 hari lalu" / "Update 4 bulan lalu" — hari sampai ambang mandek. */
export function formatUpdateAgeLabel(
  iso: string | null | undefined,
  nowMs = Date.now(),
): string {
  if (!iso) return 'Update —';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Update —';
  const days = Math.max(0, Math.floor((nowMs - d.getTime()) / 86_400_000));
  if (days <= 0) return 'Update hari ini';
  if (days <= ESTIMATOR_RECENCY_THRESHOLDS.staleDays) return `Update ${days} hari lalu`;
  const months = Math.max(1, Math.floor(days / 30));
  return `Update ${months} bulan lalu`;
}

export function estimationSourceLabel(est: Pick<Estimation, 'wa_at' | 'customer_phone'>): string {
  if (est.wa_at || est.customer_phone?.trim()) return 'WA';
  return 'Manual';
}

export function estimationMarginPct(value: number, profit: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round((profit / value) * 100);
}

export function matchesDashboardFilter(
  est: Pick<Estimation, 'status' | 'updated_at' | 'created_at'>,
  filter: DashboardListFilter,
  nowMs = Date.now(),
): boolean {
  if (filter === 'all') return !isEstimationArchived(est.status);
  if (filter === 'active') return isDashboardActive(est.status);
  if (filter === 'lead') return isDashboardLead(est.status);
  return isEstimationStale(est, nowMs);
}

/**
 * TODO(estimator-dashboard): pindahkan agregasi ini ke backend
 * (RPC / view per org) bila jumlah estimasi tenant membesar.
 * Saat ini dihitung di klien dari hasil loadEstimations yang sudah ada.
 */
export function getEstimatorDashboardStats(
  rows: Estimation[],
  nowMs = Date.now(),
): EstimatorDashboardStats {
  const windowMs = ESTIMATOR_RECENCY_THRESHOLDS.newWindowDays * 86_400_000;
  const open = rows.filter(r => !isEstimationArchived(r.status));

  let newInWindow = 0;
  let activeCount = 0;
  let activeValue = 0;
  let leadCount = 0;
  let leadValue = 0;
  let staleCount = 0;

  for (const row of open) {
    const created = createdAtMs(row);
    if (created && nowMs - created <= windowMs) newInWindow += 1;

    const value = Number(row.total_selling_price) || 0;
    if (isDashboardActive(row.status)) {
      activeCount += 1;
      activeValue += value;
    } else if (isDashboardLead(row.status)) {
      leadCount += 1;
      leadValue += value;
    }

    if (isEstimationStale(row, nowMs)) staleCount += 1;
  }

  const totalOpen = open.length;
  return {
    newInWindow,
    totalOpen,
    newRatio: totalOpen > 0 ? newInWindow / totalOpen : 0,
    activeCount,
    activeValue,
    leadCount,
    leadValue,
    staleCount,
  };
}

export function formatDashboardValue(n: number): string {
  return formatRupiahCompact(n);
}

/**
 * Urutan mode "Semua":
 * 1. paling baru dibuat (pill Terbaru)
 * 2. semua Active, created_at desc
 * 3. sisanya, created_at desc
 */
export function sortEstimationsForDashboard(rows: Estimation[]): Estimation[] {
  if (rows.length === 0) return [];

  const byCreatedDesc = (a: Estimation, b: Estimation) => createdAtMs(b) - createdAtMs(a);
  const newest = [...rows].sort(byCreatedDesc)[0];
  const rest = rows.filter(r => r.id !== newest.id);
  const active = rest.filter(r => isDashboardActive(r.status)).sort(byCreatedDesc);
  const others = rest.filter(r => !isDashboardActive(r.status)).sort(byCreatedDesc);
  return [newest, ...active, ...others];
}

export function dashboardPillForRow(
  est: Estimation,
  newestId: string | null,
): DashboardPill {
  if (newestId && est.id === newestId) return 'terbaru';
  const bucket = getDashboardBucket(est.status);
  if (bucket === 'active') return 'active';
  if (bucket === 'lead') return 'lead';
  return null;
}

export const DASHBOARD_FILTER_LABEL: Record<DashboardListFilter, string> = {
  all: 'Semua estimasi',
  active: 'Active',
  lead: 'Leads',
  stale: 'Mandek',
};

/** Label pill yang sama di beranda dan halaman detail. */
export function dashboardStatusLabel(status: EstimationStatus | string): 'Active' | 'Lead' | 'Arsip' | string {
  if (isEstimationArchived(status)) return 'Arsip';
  if (isDashboardActive(status)) return 'Active';
  if (isDashboardLead(status)) return 'Lead';
  return ESTIMATION_STATUS_LABEL[normalizeEstimationStatus(status)] || status;
}
