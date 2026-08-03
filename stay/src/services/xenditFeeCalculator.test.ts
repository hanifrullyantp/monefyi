import { describe, it, expect } from 'vitest';
import { calculateXenditFee } from './xenditFeeCalculator';
import type { PaymentMethodConfig } from '../types/pos';

const vaMethod: PaymentMethodConfig = {
  id: '1', tenantId: 't1', code: 'va', name: 'VA', category: 'xendit_va',
  isActive: true, feeType: 'fixed', feeAmount: 4000, feePercent: 0, feeBearer: 'hotel', sortOrder: 1,
};

const qrisMethod: PaymentMethodConfig = {
  id: '2', tenantId: 't1', code: 'qris', name: 'QRIS', category: 'xendit_qris',
  isActive: true, feeType: 'percent', feeAmount: 0, feePercent: 0.007, feeBearer: 'hotel', sortOrder: 2,
};

describe('xenditFeeCalculator', () => {
  it('VA fixed fee Rp 4000', () => {
    const result = calculateXenditFee(500000, vaMethod);
    expect(result.fee).toBe(4000);
    expect(result.net).toBe(496000);
  });

  it('QRIS 0.7% fee', () => {
    const result = calculateXenditFee(1000000, qrisMethod);
    expect(result.fee).toBe(7000);
  });

  it('guest bears fee', () => {
    const guestMethod = { ...qrisMethod, feeBearer: 'guest' as const };
    const result = calculateXenditFee(1000000, guestMethod);
    expect(result.guestSurcharge).toBe(7000);
    expect(result.gross).toBe(1007000);
  });
});
