import type { BonusApp } from '../types';
import { DEFAULT_BONUS_APP_URLS } from './mini-app-urls';

export const bonusAppsData: BonusApp[] = [
  {
    id: 'bagi-hasil',
    name: 'Kalkulator Bagi Hasil',
    description: 'Hitung bagi hasil Mudharabah & Musyarakah sesuai syariat Islam',
    icon: 'Calculator',
    color: 'green',
    value: 199000,
    url: DEFAULT_BONUS_APP_URLS['bagi-hasil'],
  },
  {
    id: 'salary',
    name: 'Kalkulator Gaji & PPh21',
    description: 'Hitung take-home pay dan PPh21 TER dengan slip gaji otomatis',
    icon: 'Receipt',
    color: 'blue',
    value: 199000,
    url: DEFAULT_BONUS_APP_URLS.salary,
  },
  {
    id: 'debt-free',
    name: 'Debt Freedom Planner',
    description: 'Rencana bebas hutang dengan strategi Snowball atau Avalanche',
    icon: 'Target',
    color: 'purple',
    value: 199000,
    url: DEFAULT_BONUS_APP_URLS['debt-free'],
  },
  {
    id: 'budget',
    name: 'Budget Planner',
    description: 'Buat budget ideal dengan 4 metode dan donut chart interaktif',
    icon: 'PieChart',
    color: 'amber',
    value: 199000,
    url: DEFAULT_BONUS_APP_URLS.budget,
  },
];
