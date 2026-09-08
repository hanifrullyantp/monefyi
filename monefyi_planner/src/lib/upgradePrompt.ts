import type { UpgradeModalTrigger } from '../types/entitlement';

export type UpgradePromptDetail = {
  trigger?: UpgradeModalTrigger;
  featureName?: string;
};

/** Buka modal upgrade dari luar Layout (mis. route guard). */
export function promptPlannerUpgrade(detail: UpgradePromptDetail = {}): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('monefyi:open-upgrade', { detail }));
}
