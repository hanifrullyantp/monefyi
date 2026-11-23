import { isEstimatorBrandContext } from './estimatorBrand';
import { estimatorAppEntryPath } from './pwaBrand';

/** Destinasi aman menggantikan landing SPA lama (`/`). */
export function publicAppHomePath(isAuthenticated: boolean): string {
  const appPath = isEstimatorBrandContext() ? estimatorAppEntryPath() : '/app';
  if (isAuthenticated) return appPath;
  return `/login?next=${encodeURIComponent(appPath)}`;
}
