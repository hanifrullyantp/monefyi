import { CHECKOUT_BASE_URL, ESTIMATOR_PRICE_IDR, PRO_PRICE_MONTHLY_IDR } from './entitlement';

export type CheckoutProduct = 'estimator' | 'pro' | 'enterprise';

export interface CheckoutRedirectOptions {
  orgId: string;
  userId: string;
  creditAmount?: number;
  returnUrl?: string;
}

export function buildCheckoutUrl(
  product: CheckoutProduct,
  options: CheckoutRedirectOptions,
): string {
  const returnUrl = options.returnUrl
    ?? (typeof window !== 'undefined' ? window.location.href : 'https://planner.monefyi.com/app/estimator');

  const params = new URLSearchParams({
    org_id: options.orgId,
    user_id: options.userId,
    product,
    return_url: returnUrl,
  });

  if (product === 'estimator') {
    params.set('amount', String(ESTIMATOR_PRICE_IDR));
  }
  if (product === 'pro') {
    params.set('amount', String(PRO_PRICE_MONTHLY_IDR));
  }
  if (options.creditAmount && options.creditAmount > 0) {
    params.set('credit', String(options.creditAmount));
  }

  return `${CHECKOUT_BASE_URL}/${product}?${params.toString()}`;
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
