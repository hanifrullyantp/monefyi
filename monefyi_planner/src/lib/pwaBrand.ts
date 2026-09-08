import {
  applyEstimatorDocumentBrand,
  ESTIMATOR_BRAND_NAME,
  isEstimatorBrandContext,
} from './estimatorBrand';

const PROXIED_PWA_HOSTS = ['estimator.monefyi.com', 'planner.monefyi.com'];

/** Sesuaikan manifest & meta PWA saat di domain/rute Estimator. */
export function initEstimatorPwaDocument(): void {
  if (typeof document === 'undefined' || !isEstimatorBrandContext()) return;

  applyEstimatorDocumentBrand(true);

  const onProxiedHost = PROXIED_PWA_HOSTS.includes(window.location.hostname);
  const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (manifest && !onProxiedHost) {
    // Langsung ke planner origin (dev / vercel.app) — pakai manifest khusus Estimator.
    manifest.href = '/manifest-estimator.webmanifest';
  }

  const appleTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
  if (appleTitle) appleTitle.content = 'Estimator';

  if (!document.title.includes('Estimator')) {
    document.title = ESTIMATOR_BRAND_NAME;
  }
}

/** Destinasi default setelah login / buka PWA Estimator. */
export function estimatorAppEntryPath(): string {
  return '/app/estimator';
}
