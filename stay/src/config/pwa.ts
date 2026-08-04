/**
 * STAY PWA / Web Push configuration.
 * Public VAPID key is safe to embed client-side.
 */
export const STAY_VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_STAY_VAPID_PUBLIC_KEY as string | undefined) ||
  'BMJJIwvCqMjWLD216G44hRNSMqoR923OPkQ4xZCV2WmaUGTr67hoPrZ8ddJB7LLeu6PfPgDvnosKWGz5Ku-4mYQ';

export function getStayPushSubscribeUrl(): string {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '');
  if (!base) return '';
  return `${base}/functions/v1/stay-push-subscribe`;
}
