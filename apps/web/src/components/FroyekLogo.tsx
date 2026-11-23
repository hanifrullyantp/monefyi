import React from 'react';
import { resolveSpaAssetUrl } from '../lib/spaAssets';

export interface FroyekLogoProps {
  className?: string;
  alt?: string;
  variant?: 'mark' | 'lockup' | 'horizontal' | 'stacked';
  color?: 'forest' | 'white';
  size?: number;
}

export function FroyekLogo({
  className = 'w-8 h-8 object-contain shrink-0',
  alt = 'froyek',
  variant = 'mark',
  color = 'forest',
}: FroyekLogoProps) {
  if (variant === 'mark') {
    const src = color === 'white' ? '/brand/svg/froyek-mark-white.svg' : '/brand/svg/froyek-mark-forest.svg';
    return (
      <img
        src={resolveSpaAssetUrl(src)}
        alt={alt}
        className={className}
      />
    );
  }

  const horizontalSrc =
    color === 'white'
      ? '/brand/svg/froyek-horizontal-white.svg'
      : '/brand/svg/froyek-horizontal-forest.svg';

  return (
    <img
      src={resolveSpaAssetUrl(horizontalSrc)}
      alt={alt}
      className={`h-8 object-contain shrink-0 ${className}`}
    />
  );
}

export const PlannerLogo = FroyekLogo;
export const MonefyiLogo = FroyekLogo;
export default FroyekLogo;

