import { FroyekLogo, type FroyekLogoProps } from './FroyekLogo';
import { PLANNER_BRAND_NAME } from '../lib/plannerBrand';

export { FroyekLogo };
export const MONEFYI_LOGO_SRC = '/brand/svg/froyek-mark-forest.svg';

export interface PlannerLogoProps extends FroyekLogoProps {}

export function PlannerLogo(props: PlannerLogoProps) {
  return <FroyekLogo {...props} />;
}

/** Alias lama — menampilkan logo froyek */
export function MonefyiLogo(props: PlannerLogoProps) {
  return <FroyekLogo {...props} />;
}

export default FroyekLogo;
