/** Checkout & app URLs — keep in sync with app/js/config.js Lynk links. */
export const checkoutUrls = {
  app: '/app/',
  trial: '/app/',
  monthly: 'https://lynk.id/asfin-ai/9zexz9z5wom1/checkout',
  lifetime: 'https://lynk.id/asfin-ai/j3q0x5ke3g49/checkout',
} as const;

/**
 * Resolve checkout URL for a pricing plan id.
 * @param {string} planId
 */
export function getPlanCheckoutUrl(planId: string): string {
  if (planId === 'gratis') return checkoutUrls.trial;
  if (planId === 'lifetime') return checkoutUrls.lifetime;
  if (planId === 'pro') return checkoutUrls.monthly;
  return checkoutUrls.app;
}
