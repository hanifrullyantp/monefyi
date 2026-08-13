import type { BonusAppId } from './bonus-config';

export interface MiniAppMeta {
  name: string;
  subtitle: string;
  bonusAppId: BonusAppId | null;
}

export const MINI_APP_META: MiniAppMeta = {
  name: 'Kalkulator Gaji & PPh21',
  subtitle: 'Extra Bonus Monefyi · Versi Lite',
  bonusAppId: 'salary',
};
