import type { BonusAppId } from './bonus-config';

export interface MiniAppMeta {
  name: string;
  subtitle: string;
  bonusAppId: BonusAppId | null;
}

export const MINI_APP_META: MiniAppMeta = {
  name: 'Budget Planner',
  subtitle: 'Extra Bonus Monefyi · Versi Lite',
  bonusAppId: 'budget',
};
