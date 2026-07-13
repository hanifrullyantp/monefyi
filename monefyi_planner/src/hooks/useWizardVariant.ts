import { useEffect, useState } from 'react';

export type WizardVariant = 'mobile' | 'tablet' | 'desktop' | 'wide';

function getVariant(width: number): WizardVariant {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  if (width < 1440) return 'desktop';
  return 'wide';
}

export function useWizardVariant(): WizardVariant {
  const [variant, setVariant] = useState<WizardVariant>(() =>
    typeof window !== 'undefined' ? getVariant(window.innerWidth) : 'desktop',
  );

  useEffect(() => {
    const onResize = () => setVariant(getVariant(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return variant;
}

export function isMobileVariant(v: WizardVariant) {
  return v === 'mobile';
}
