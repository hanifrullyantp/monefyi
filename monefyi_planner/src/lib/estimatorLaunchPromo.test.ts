import { describe, expect, it } from 'vitest';
import {
  launchPromoAdminSeverity,
  normalizeLaunchPromoStatus,
  resolveEstimatorStandardCheckoutAmount,
} from './estimatorLaunchPromo';

describe('estimatorLaunchPromo', () => {
  it('resolves checkout amount from promo status', () => {
    const active = normalizeLaunchPromoStatus({
      used: 50,
      limit: 100,
      promoActive: true,
      promoPrice: 93000,
      listPrice: 99000,
    });
    expect(resolveEstimatorStandardCheckoutAmount(active)).toBe(93000);

    const exhausted = normalizeLaunchPromoStatus({
      used: 100,
      limit: 100,
      promoActive: false,
      promoPrice: 93000,
      listPrice: 99000,
    });
    expect(resolveEstimatorStandardCheckoutAmount(exhausted)).toBe(99000);
  });

  it('warns admin when remaining slots are low', () => {
    const status = normalizeLaunchPromoStatus({
      used: 86,
      limit: 100,
      promoActive: true,
      promoPrice: 93000,
      listPrice: 99000,
    });
    expect(status?.remaining).toBe(14);
    expect(launchPromoAdminSeverity(status!)).toBe('info');
  });
});
