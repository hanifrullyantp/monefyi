/** Brand assets — Monefyi Estimator (logo hijau-hitam). */
import { resolveSpaAssetUrl } from './spaAssets';

export const ESTIMATOR_LOGO_SRC = '/icons/estimator/estimator-logo.png?v=2026-09-08';
export const ESTIMATOR_FAVICON_SRC = '/icons/estimator/favicon.png?v=2026-09-08';
export const ESTIMATOR_APPLE_ICON_SRC = '/icons/estimator/icon-180.png?v=2026-09-08';
export const ESTIMATOR_ICON_192_SRC = '/icons/estimator/icon-192.png?v=2026-09-08';

export const ESTIMATOR_BRAND_NAME = 'Monefyi Estimator';
export const ESTIMATOR_THEME_COLOR = '#76b82a';

/** True on estimator.monefyi.com or /app/estimator routes. */
export function isEstimatorBrandContext(): boolean {
  if (typeof window === 'undefined') return false;
  const { hostname, pathname } = window.location;
  if (hostname === 'estimator.monefyi.com' || hostname.startsWith('estimator.')) return true;
  return pathname.startsWith('/app/estimator');
}

/** Swap favicon + theme-color saat user di modul Estimator. */
export function applyEstimatorDocumentBrand(active: boolean): void {
  if (typeof document === 'undefined') return;

  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  const apple = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

  if (active) {
    if (icon) icon.href = resolveSpaAssetUrl(ESTIMATOR_FAVICON_SRC);
    if (apple) apple.href = resolveSpaAssetUrl(ESTIMATOR_APPLE_ICON_SRC);
    if (theme) theme.content = ESTIMATOR_THEME_COLOR;
    document.title = document.title.includes('Estimator')
      ? document.title
      : `Estimator — ${document.title}`;
    return;
  }

  if (icon) icon.href = resolveSpaAssetUrl('/icons/favicon.png?v=2026-08-13-m');
  if (apple) apple.href = resolveSpaAssetUrl('/icons/icon-180.png?v=2026-08-13-m');
  if (theme) theme.content = '#059669';
}
