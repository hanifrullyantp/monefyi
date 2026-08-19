import { describe, expect, it } from 'vitest';
import { buildCheckoutUrl } from './checkout';
import { CHECKOUT_BASE_URL, ESTIMATOR_PRICE_IDR, PRO_PRICE_MONTHLY_IDR } from './entitlement';

describe('checkout - buildCheckoutUrl', () => {
  it('builds estimator checkout with org and user', () => {
    const url = buildCheckoutUrl('estimator', {
      orgId: 'org-1',
      userId: 'user-1',
      returnUrl: 'https://planner.test/app/estimator',
    });
    expect(url.startsWith(`${CHECKOUT_BASE_URL}/estimator?`)).toBe(true);
    expect(url).toContain('org_id=org-1');
    expect(url).toContain('user_id=user-1');
    expect(url).toContain(`amount=${ESTIMATOR_PRICE_IDR}`);
    expect(url).toContain(encodeURIComponent('https://planner.test/app/estimator'));
  });

  it('includes credit param for pro upgrade', () => {
    const url = buildCheckoutUrl('pro', {
      orgId: 'org-1',
      userId: 'user-1',
      creditAmount: 99000,
      returnUrl: 'https://planner.test/app',
    });
    expect(url).toContain(`amount=${PRO_PRICE_MONTHLY_IDR}`);
    expect(url).toContain('credit=99000');
  });
});
