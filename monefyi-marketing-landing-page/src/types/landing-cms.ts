import type { SiteSettings } from './index';

export interface LandingCmsPayload {
  version: 1;
  settings: SiteSettings;
  textOverrides: Record<string, string>;
}
