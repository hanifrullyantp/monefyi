import { describe, it, expect } from 'vitest';
import { calculateBookingTotal } from './pricing';
import { resolveDiscountAmount } from './discountCodes';

describe('calculateBookingTotal - Standard stay - Includes tax and service', () => {
  it('calculates total with tenant tax and service charge', () => {
    const total = calculateBookingTotal({
      basePrice: 350_000,
      checkIn: '2026-08-10',
      checkOut: '2026-08-12',
      tenant: { taxPercent: 10, serviceChargePercent: 5 },
      discountAmount: 0,
    });
    // 2 nights * 350k = 700k; tax 10% = 70k; service 5% = 35k => 805k
    expect(total).toBe(805_000);
  });
});

describe('resolveDiscountAmount - MEMBER50 - Returns fixed discount', () => {
  it('returns 50000 for MEMBER50 code', () => {
    const result = resolveDiscountAmount('MEMBER50');
    expect(result?.amount).toBe(50_000);
  });
});

describe('resolveDiscountAmount - STAY10 - Returns percentage discount', () => {
  it('returns 10% of subtotal for STAY10 codes', () => {
    const result = resolveDiscountAmount('STAY10-ABC123', undefined, 1_000_000);
    expect(result?.amount).toBe(100_000);
  });
});
