import type { RoomType, Tenant } from '../types';
import type { PricingRule } from '../store/appStore';
import { calculateNights } from './format';

interface BookingPriceInput {
  basePrice: number;
  checkIn: string;
  checkOut: string;
  tenant: Pick<Tenant, 'taxPercent' | 'serviceChargePercent'>;
  pricingRules?: PricingRule[];
  discountAmount?: number;
}

/**
 * Calculate booking total with tax, service charge, pricing rules, and discounts.
 */
export function calculateBookingTotal({
  basePrice,
  checkIn,
  checkOut,
  tenant,
  pricingRules = [],
  discountAmount = 0,
}: BookingPriceInput): number {
  const nights = calculateNights(checkIn, checkOut);
  if (nights <= 0) return 0;

  let subtotal = basePrice * nights;

  for (const rule of pricingRules.filter((r) => r.isActive)) {
    if (rule.type === 'weekend') {
      const start = new Date(checkIn);
      for (let i = 0; i < nights; i++) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        const dow = day.getDay();
        if (dow === 0 || dow === 6) {
          subtotal += basePrice * (rule.adjustment / 100);
        }
      }
    } else if (rule.type === 'seasonal' || rule.type === 'early_bird') {
      subtotal += subtotal * (rule.adjustment / 100);
    }
  }

  const tax = subtotal * (tenant.taxPercent / 100);
  const service = subtotal * (tenant.serviceChargePercent / 100);
  const total = subtotal + tax + service - discountAmount;

  return Math.max(0, Math.round(total));
}

export function getRoomTypeBasePrice(
  roomType: RoomType | undefined,
  roomTypes: RoomType[],
  roomTypeId: string | undefined
): number {
  const rt = roomType || roomTypes.find((t) => t.id === roomTypeId);
  return rt?.basePrice ?? 0;
}
