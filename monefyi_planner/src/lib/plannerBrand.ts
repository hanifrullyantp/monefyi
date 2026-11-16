/** Brand froyek. Lisensi estimator tetap memakai logo Estimator. */
import { resolveSpaAssetUrl } from './spaAssets';

const V = '2026-11-16-froyek';

export const PLANNER_LOGO_SRC = `/icons/froyek/mark-dark.svg?v=${V}`;
export const PLANNER_FAVICON_SRC = `/icons/froyek/favicon.svg?v=${V}`;
export const PLANNER_APPLE_ICON_SRC = `/icons/froyek/favicon.svg?v=${V}`;

export const PLANNER_BRAND_NAME = 'froyek';
export const PLANNER_TAGLINE = 'Agent for your Project';
export const PLANNER_THEME_COLOR = '#0A3A2E';

export function applyPlannerDocumentBrand(): void {
  if (typeof document === 'undefined') return;

  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  const apple = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

  if (icon) icon.href = resolveSpaAssetUrl(PLANNER_FAVICON_SRC);
  if (apple) apple.href = resolveSpaAssetUrl(PLANNER_APPLE_ICON_SRC);
  if (theme) theme.content = PLANNER_THEME_COLOR;
}
