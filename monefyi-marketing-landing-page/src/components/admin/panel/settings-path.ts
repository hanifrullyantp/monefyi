import type { SiteSettings } from '../../../types';

/** Immutable deep set by dot path (e.g. content.hero.headline1) */
export function setSettingsPath<T extends SiteSettings>(
  source: T,
  path: string,
  value: unknown
): T {
  const next = structuredClone(source);
  const keys = path.split('.');
  let cursor: Record<string, unknown> = next as Record<string, unknown>;

  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    if (cursor[key] == null || typeof cursor[key] !== 'object') {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }

  cursor[keys[keys.length - 1]] = value;
  return next;
}
