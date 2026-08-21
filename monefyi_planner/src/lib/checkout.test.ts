import { describe, expect, it, vi } from 'vitest';
import { buildCheckoutUrl, normalizeCheckoutProduct } from './checkout';
import { ESTIMATOR_PRICE_IDR, PRO_PRICE_MONTHLY_IDR } from './entitlement';

describe('checkout - buildCheckoutUrl', () => {
  it('normalizes legacy estimator to estimator_standard', () => {
    expect(normalizeCheckoutProduct('estimator')).toBe('estimator_standard');
    expect(normalizeCheckoutProduct('pro')).toBe('planner_pro');
  });

  it('builds Lynk checkout with org and user when base URL configured', () => {
    vi.stubEnv('VITE_LYNK_ESTIMATOR_STANDARD', 'https://lynk.id/store/estimator-standard/checkout');
    const url = buildCheckoutUrl('estimator', {
      orgId: 'org-1',
      userId: 'user-1',
      email: 'a@test.com',
      returnUrl: 'https://planner.test/app/estimator',
    });
    expect(url.startsWith('https://lynk.id/store/estimator-standard/checkout?')).toBe(true);
    expect(url).toContain('org_id=org-1');
    expect(url).toContain('user_id=user-1');
    expect(url).toContain('product=estimator_standard');
    expect(url).toContain(`amount=${ESTIMATOR_PRICE_IDR}`);
    expect(url).toContain(encodeURIComponent('https://planner.test/app/estimator'));
    vi.unstubAllEnvs();
  });

  it('includes credit param for planner pro upgrade', () => {
    vi.stubEnv('VITE_LYNK_PLANNER_PRO', 'https://lynk.id/store/planner-pro/checkout');
    const url = buildCheckoutUrl('pro', {
      orgId: 'org-1',
      userId: 'user-1',
      creditAmount: 99000,
      returnUrl: 'https://planner.test/app',
    });
    expect(url).toContain(`amount=${PRO_PRICE_MONTHLY_IDR}`);
    expect(url).toContain('credit=99000');
    expect(url).toContain('product=planner_pro');
    vi.unstubAllEnvs();
  });
});
