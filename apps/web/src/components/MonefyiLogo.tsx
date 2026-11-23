import { PLANNER_BRAND_NAME, PLANNER_LOGO_SRC } from '../lib/plannerBrand';
import { resolveSpaAssetUrl } from '../lib/spaAssets';

/** @deprecated Jangan pakai monefyi-logo.png (Ø). Gunakan PlannerLogo. */
export const MONEFYI_LOGO_SRC = PLANNER_LOGO_SRC;

interface PlannerLogoProps {
  className?: string;
  alt?: string;
  /** mark = tanda f saja. lockup = tanda + wordmark, untuk header terang. */
  variant?: 'mark' | 'lockup';
}

/** Logo froyek. Tanpa bayangan atau outline. */
export function PlannerLogo({
  className = 'w-8 h-8 object-contain shrink-0',
  alt = PLANNER_BRAND_NAME,
  variant = 'mark',
}: PlannerLogoProps) {
  const mark = (
    <img src={resolveSpaAssetUrl(PLANNER_LOGO_SRC)} alt={variant === 'lockup' ? '' : alt} className={variant === 'lockup' ? 'w-8 h-8 object-contain shrink-0' : className} />
  );
  if (variant === 'mark') return mark;
  return (
    <span className={`inline-flex items-center gap-3 min-w-[160px] ${className}`}>
      {mark}
      <span className="froyek-wordmark text-[22px] leading-none">{PLANNER_BRAND_NAME}</span>
    </span>
  );
}

/** Alias lama — tetap Planner mark, bukan Ø. */
export function MonefyiLogo(props: PlannerLogoProps) {
  return <PlannerLogo {...props} />;
}
