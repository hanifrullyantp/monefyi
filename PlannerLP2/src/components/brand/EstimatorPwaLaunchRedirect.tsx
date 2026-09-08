'use client';

import { useEffect } from 'react';
import { plannerAppPath } from '@/lib/config/plannerApp';

const isEstimatorStandalone =
  process.env.NEXT_PUBLIC_ESTIMATOR_STANDALONE === 'true';

/** PWA lama dengan start_url `/` — arahkan langsung ke app Estimator. */
export default function EstimatorPwaLaunchRedirect() {
  useEffect(() => {
    if (!isEstimatorStandalone) return;
    if (typeof window === 'undefined') return;
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!standalone) return;
    if (window.location.pathname.startsWith('/app')) return;
    window.location.replace(plannerAppPath('/app/estimator'));
  }, []);

  return null;
}
