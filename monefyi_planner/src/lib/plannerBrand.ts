/** Brand assets — Monefyi Planner (bukan logo Ø / umbrella). */
import { resolveSpaAssetUrl } from './spaAssets';

const V = '2026-10-28-planner';

/** Mark aplikasi Planner — icon PWA, bukan monefyi-logo.png (Ø). */
export const PLANNER_LOGO_SRC = `/icons/icon-192.png?v=${V}`;
export const PLANNER_FAVICON_SRC = `/icons/favicon.png?v=${V}`;
export const PLANNER_APPLE_ICON_SRC = `/icons/icon-180.png?v=${V}`;

export const PLANNER_BRAND_NAME = 'Monefyi Planner';
export const PLANNER_THEME_COLOR = '#059669';

export function applyPlannerDocumentBrand(): void {
  if (typeof document === 'undefined') return;

  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  const apple = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

  if (icon) icon.href = resolveSpaAssetUrl(PLANNER_FAVICON_SRC);
  if (apple) apple.href = resolveSpaAssetUrl(PLANNER_APPLE_ICON_SRC);
  if (theme) theme.content = PLANNER_THEME_COLOR;
}
