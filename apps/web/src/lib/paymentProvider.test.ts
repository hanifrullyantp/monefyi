import { describe, expect, it, vi } from 'vitest';
import { resolvePaymentProvider } from './paymentProvider';

describe('paymentProvider - resolvePaymentProvider', () => {
  it('defaults to lynk', () => {
    vi.stubEnv('VITE_PLANNER_PAYMENT_PROVIDER', '');
    expect(resolvePaymentProvider()).toBe('lynk');
    vi.unstubAllEnvs();
  });

  it('reads mayar from env', () => {
    vi.stubEnv('VITE_PLANNER_PAYMENT_PROVIDER', 'mayar');
    expect(resolvePaymentProvider()).toBe('mayar');
    vi.unstubAllEnvs();
  });

  it('honors explicit override', () => {
    vi.stubEnv('VITE_PLANNER_PAYMENT_PROVIDER', 'lynk');
    expect(resolvePaymentProvider('mayar')).toBe('mayar');
    vi.unstubAllEnvs();
  });
});
