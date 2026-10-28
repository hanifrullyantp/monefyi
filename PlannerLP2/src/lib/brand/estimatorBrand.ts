/**
 * @deprecated Prefer brand.config + BrandLogo / BrandHead.
 * Kept for backward-compatible imports.
 */
import { BRANDS } from "./brand.config";

const e = BRANDS.estimator;

export const ESTIMATOR_LOGO_SRC = e.assets.mark;
export const ESTIMATOR_FAVICON_32 = e.assets.favicon32;
export const ESTIMATOR_APPLE_ICON = e.assets.appleTouchIcon;
export const ESTIMATOR_ICON_192 = e.assets.icon192;
export const ESTIMATOR_BRAND_NAME = e.name;
export const ESTIMATOR_THEME_COLOR = e.themeColor;
