import type { ComparisonRow } from '../types';

export const comparisonData: ComparisonRow[] = [
  { feature: 'Safe to Spend harian', excel: false, bankApp: false, other: false, monefyi: true },
  { feature: 'AI Financial Coach', excel: false, bankApp: false, other: false, monefyi: true },
  { feature: 'Prediksi saldo habis', excel: false, bankApp: false, other: 'Partial', monefyi: true },
  { feature: 'Budget multi-metode', excel: 'Manual', bankApp: false, other: 'Partial', monefyi: true },
  { feature: 'Debt payoff planner', excel: 'Manual', bankApp: false, other: false, monefyi: true },
  { feature: 'Notifikasi cerdas', excel: false, bankApp: 'Basic', other: 'Basic', monefyi: true },
  { feature: 'Offline mode', excel: true, bankApp: false, other: false, monefyi: true },
  { feature: 'Data privacy (no bank link)', excel: true, bankApp: false, other: 'Partial', monefyi: true },
  { feature: 'Update otomatis', excel: false, bankApp: true, other: true, monefyi: true },
  { feature: 'Multi rekening', excel: 'Manual', bankApp: '1 bank only', other: 'Partial', monefyi: true },
  { feature: 'Laporan visual', excel: 'Manual', bankApp: 'Basic', other: 'Partial', monefyi: true },
  { feature: 'Bonus apps', excel: false, bankApp: false, other: false, monefyi: '4 Apps' },
  { feature: 'Fitur syari (bagi hasil, zakat)', excel: false, bankApp: false, other: false, monefyi: true },
  { feature: 'Harga', excel: 'Rp 400rb/tahun', bankApp: 'Gratis*', other: 'Rp 150-500rb/tahun', monefyi: 'Rp 99rb selamanya' },
];
