import {
  ESTIMATOR_PRICE_IDR,
  ESTIMATOR_PRO_PRICE_IDR,
  PRO_PRICE_MONTHLY_IDR,
} from './entitlement';

export type CheckoutProduct = 'estimator_standard' | 'estimator_pro' | 'planner_pro' | 'estimator' | 'pro' | 'enterprise';

export interface CheckoutRedirectOptions {
  orgId: string;
  userId: string;
  creditAmount?: number;
  returnUrl?: string;
  email?: string;
}

const ENV_KEYS: Record<'estimator_standard' | 'estimator_pro' | 'planner_pro', string> = {
  estimator_standard: 'VITE_LYNK_ESTIMATOR_STANDARD',
  estimator_pro: 'VITE_LYNK_ESTIMATOR_PRO',
  planner_pro: 'VITE_LYNK_PLANNER_PRO',
};

function readEnv(key: string): string {
  const env = import.meta.env as Record<string, string | undefined>;
  return (
    env[key]?.trim() ||
    env[key.replace('VITE_', 'NEXT_PUBLIC_')]?.trim() ||
    ''
  );
}

export function resolveLynkBaseUrl(product: 'estimator_standard' | 'estimator_pro' | 'planner_pro'): string {
  return readEnv(ENV_KEYS[product]);
}

/** Map legacy product ids to Lynk product keys. */
export function normalizeCheckoutProduct(product: CheckoutProduct): 'estimator_standard' | 'estimator_pro' | 'planner_pro' {
  if (product === 'estimator' || product === 'estimator_standard') return 'estimator_standard';
  if (product === 'pro' || product === 'planner_pro') return 'planner_pro';
  if (product === 'estimator_pro') return 'estimator_pro';
  return 'estimator_standard';
}

export function buildCheckoutUrl(
  product: CheckoutProduct,
  options: CheckoutRedirectOptions,
): string {
  const lynkProduct = normalizeCheckoutProduct(product);
  const base = resolveLynkBaseUrl(lynkProduct);
  if (!base) {
    throw new Error(`Checkout Lynk belum dikonfigurasi (${ENV_KEYS[lynkProduct]}).`);
  }

  const returnUrl = options.returnUrl
    ?? (typeof window !== 'undefined' ? window.location.href : 'https://planner.monefyi.com/app/estimator');

  const url = new URL(base);
  url.searchParams.set('org_id', options.orgId);
  url.searchParams.set('user_id', options.userId);
  url.searchParams.set('product', lynkProduct);
  if (options.email) url.searchParams.set('customer_email', options.email);
  url.searchParams.set('return_url', returnUrl);

  if (lynkProduct === 'estimator_standard') {
    url.searchParams.set('amount', String(ESTIMATOR_PRICE_IDR));
  }
  if (lynkProduct === 'estimator_pro') {
    url.searchParams.set('amount', String(ESTIMATOR_PRO_PRICE_IDR));
  }
  if (lynkProduct === 'planner_pro') {
    url.searchParams.set('amount', String(PRO_PRICE_MONTHLY_IDR));
    if (options.creditAmount && options.creditAmount > 0) {
      url.searchParams.set('credit', String(options.creditAmount));
    }
  }

  return url.toString();
}

export function redirectToCheckout(
  product: CheckoutProduct,
  options: CheckoutRedirectOptions,
): void {
  window.location.href = buildCheckoutUrl(product, options);
}

export function cleanPaymentQueryFromUrl(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('payment');
  url.searchParams.delete('order_id');
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, '', next);
}

export function readPaymentReturnStatus(): 'success' | 'failed' | 'cancelled' | null {
  if (typeof window === 'undefined') return null;
  const payment = new URLSearchParams(window.location.search).get('payment');
  if (payment === 'success' || payment === 'failed' || payment === 'cancelled') {
    return payment;
  }
  return null;
}
