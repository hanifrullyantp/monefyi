import type { BonusAppId } from './bonus-config';

export interface MiniAppMeta {
  name: string;
  subtitle: string;
  bonusAppId: BonusAppId | null;
}

export const MINI_APP_META: MiniAppMeta = {
  name: 'Kalkulator Bagi Hasil',
  subtitle: 'Extra Bonus Monefyi · Versi Lite',
  bonusAppId: 'bagi-hasil',
};
