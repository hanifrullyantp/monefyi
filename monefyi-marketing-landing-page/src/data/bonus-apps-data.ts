import type { BonusApp } from '../types';

export const bonusAppsData: BonusApp[] = [
  {
    id: 'bagi-hasil',
    name: 'Kalkulator Bagi Hasil',
    description: 'Hitung bagi hasil Mudharabah & Musyarakah sesuai syariat Islam',
    icon: 'Calculator',
    color: 'green',
    value: 199000,
  },
  {
    id: 'salary',
    name: 'Kalkulator Gaji & PPh21',
    description: 'Hitung take-home pay dan PPh21 TER dengan slip gaji otomatis',
    icon: 'Receipt',
    color: 'blue',
    value: 199000,
  },
  {
    id: 'debt-free',
    name: 'Debt Freedom Planner',
    description: 'Rencana bebas hutang dengan strategi Snowball atau Avalanche',
    icon: 'Target',
    color: 'purple',
    value: 199000,
  },
  {
    id: 'budget',
    name: 'Budget Planner',
    description: 'Buat budget ideal dengan 4 metode dan donut chart interaktif',
    icon: 'PieChart',
    color: 'amber',
    value: 199000,
  },
];
