import type { PricelistCategory } from '../types/estimator';

/** Map estimator line category → planner_rap_items.type */
export function mapEstimationCategoryToRapType(category: string | null | undefined): string {
  switch ((category || 'material').toLowerCase()) {
    case 'material':
      return 'material';
    case 'upah':
    case 'borongan':
      return 'labor';
    case 'alat':
      return 'equipment';
    case 'jasa':
    case 'other':
      return 'other';
    default:
      return 'other';
  }
}

export function isPricelistCategory(value: string): value is PricelistCategory {
  return ['material', 'upah', 'alat', 'jasa', 'borongan', 'other'].includes(value);
}

export function defaultSelectedEstimationItemIds(
  items: Array<{ id: string; included?: boolean; is_bonus?: boolean; name?: string }>,
): string[] {
  return items
    .filter(item => item.id && item.included !== false && !item.is_bonus && (item.name || '').trim())
    .map(item => item.id);
}

export function formatDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export interface ConvertEstimationProjectInput {
  name: string;
  clientName: string;
  clientPhone: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

export function buildDefaultProjectInputFromEstimation(est: {
  title: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  notes?: string | null;
}): ConvertEstimationProjectInput {
  const start = new Date();
  const end = addDays(start, 30);
  return {
    name: est.title || '',
    clientName: est.customer_name || '',
    clientPhone: est.customer_phone || '',
    location: est.customer_address || '',
    startDate: formatDateInputValue(start),
    endDate: formatDateInputValue(end),
    description: est.notes || '',
  };
}

export function needsConvertWarning(status: string): boolean {
  return status !== 'accepted' && status !== 'converted';
}
