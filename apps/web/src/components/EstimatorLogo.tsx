import { ESTIMATOR_LOGO_SRC } from '../lib/estimatorBrand';
import { resolveSpaAssetUrl } from '../lib/spaAssets';

interface EstimatorLogoProps {
  className?: string;
  alt?: string;
}

export function EstimatorLogo({
  className = 'w-9 h-9 rounded-xl object-contain shrink-0',
  alt = 'Froyek Estimator',
}: EstimatorLogoProps) {
  return (
    <img
      src={resolveSpaAssetUrl(ESTIMATOR_LOGO_SRC)}
      alt={alt}
      className={className}
    />
  );
}
