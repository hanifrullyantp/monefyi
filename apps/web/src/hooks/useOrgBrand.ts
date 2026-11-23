import { useMemo } from 'react';
import { deriveOrgBrandPalette, orgBrandCssVars, DEFAULT_ORG_BRAND } from '../lib/orgBrand';

export function useOrgBrand(brandColor?: string | null) {
  const palette = useMemo(
    () => deriveOrgBrandPalette(brandColor || DEFAULT_ORG_BRAND),
    [brandColor],
  );

  const style = useMemo(() => orgBrandCssVars(palette), [palette]);

  return { palette, style };
}
