/** SPA static files live on monefyi-planner; custom domains only proxy /app. */
const SPA_ORIGIN =
  (import.meta.env.VITE_PLANNER_APP_ORIGIN as string | undefined)?.replace(/\/$/, '')
  || 'https://monefyi-planner.vercel.app';

const PROXIED_HOSTS = ['estimator.monefyi.com', 'planner.monefyi.com'];

/** Resolve /icons/... when app runs behind estimator/planner domain proxy. */
export function resolveSpaAssetUrl(path: string): string {
  if (typeof window === 'undefined' || !path.startsWith('/')) return path;
  const host = window.location.hostname;
  if (!PROXIED_HOSTS.includes(host)) return path;
  return `${SPA_ORIGIN}${path}`;
}
