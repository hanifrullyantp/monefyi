import { PLANNER_LOGO_SRC, PLANNER_BRAND_NAME } from '../lib/plannerBrand';
import { resolveSpaAssetUrl } from '../lib/spaAssets';

/** @deprecated Jangan pakai monefyi-logo.png (Ø). Gunakan PlannerLogo. */
export const MONEFYI_LOGO_SRC = PLANNER_LOGO_SRC;

interface PlannerLogoProps {
  className?: string;
  alt?: string;
}

/** Logo produk Planner — icon PWA, bukan logo Ø umbrella. */
export function PlannerLogo({
  className = 'w-9 h-9 rounded-xl object-contain shrink-0',
  alt = PLANNER_BRAND_NAME,
}: PlannerLogoProps) {
  return <img src={resolveSpaAssetUrl(PLANNER_LOGO_SRC)} alt={alt} className={className} />;
}

/** Alias lama — tetap Planner mark, bukan Ø. */
export function MonefyiLogo(props: PlannerLogoProps) {
  return <PlannerLogo {...props} />;
}
