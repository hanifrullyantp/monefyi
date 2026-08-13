/** Extra bonuses — selaras dengan monefyi.com section EXTRA BONUSES */

export type BonusAppId = 'bagi-hasil' | 'salary' | 'debt-free' | 'budget';

export const LIFETIME_CHECKOUT_URL =
  'https://lynk.id/asfin-ai/j3q0x5ke3g49/checkout';
export const MONEFYI_HOME_URL = 'https://monefyi.com';
export const MONEFYI_PRICING_URL = 'https://monefyi.com/#pricing';
export const MONEFYI_BONUS_URL = 'https://monefyi.com/#bonus';

export const BONUS_TOTAL_VALUE = 796_000;
export const BONUS_APP_VALUE = 199_000;
export const LIFETIME_PRICE_DISPLAY = 'Rp 99.000';

export interface BonusAppMeta {
  id: BonusAppId;
  name: string;
  description: string;
  value: number;
}

/** 4 aplikasi bonus Lifetime — mirror bonus-apps-data.ts landing page */
export const BONUS_APPS: BonusAppMeta[] = [
  {
    id: 'bagi-hasil',
    name: 'Kalkulator Bagi Hasil',
    description: 'Hitung bagi hasil Mudharabah & Musyarakah sesuai syariat Islam',
    value: 199_000,
  },
  {
    id: 'salary',
    name: 'Kalkulator Gaji & PPh21',
    description: 'Hitung take-home pay dan PPh21 TER dengan slip gaji otomatis',
    value: 199_000,
  },
  {
    id: 'debt-free',
    name: 'Debt Freedom Planner',
    description: 'Rencana bebas hutang dengan strategi Snowball atau Avalanche',
    value: 199_000,
  },
  {
    id: 'budget',
    name: 'Budget Planner',
    description: 'Buat budget ideal dengan 4 metode dan donut chart interaktif',
    value: 199_000,
  },
];

export function getBonusApp(id: BonusAppId): BonusAppMeta {
  const app = BONUS_APPS.find((a) => a.id === id);
  if (!app) throw new Error(`Unknown bonus app: ${id}`);
  return app;
}

export function formatBonusRupiah(value: number): string {
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
}
