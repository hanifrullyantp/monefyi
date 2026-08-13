import type { BonusAppId } from './bonus-config';

export interface MiniAppMeta {
  name: string;
  subtitle: string;
  bonusAppId: BonusAppId | null;
}

export const MINI_APP_META: MiniAppMeta = {
  name: 'Hitung Waris',
  subtitle: 'by Monefyi · Versi Lite',
  bonusAppId: null,
};
