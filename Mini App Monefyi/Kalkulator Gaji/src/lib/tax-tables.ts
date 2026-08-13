export type PTKPStatus = 'TK/0' | 'TK/1' | 'K/0' | 'K/1' | 'K/2' | 'K/3';
export type TERCategory = 'A' | 'B' | 'C';

export const ptkpOptions: { value: PTKPStatus; label: string; amount: number }[] = [
  { value: 'TK/0', label: 'TK/0 — Lajang tanpa tanggungan', amount: 54000000 },
  { value: 'TK/1', label: 'TK/1 — Lajang, 1 tanggungan', amount: 58500000 },
  { value: 'K/0', label: 'K/0 — Menikah tanpa tanggungan', amount: 58500000 },
  { value: 'K/1', label: 'K/1 — Menikah, 1 tanggungan', amount: 63000000 },
  { value: 'K/2', label: 'K/2 — Menikah, 2 tanggungan', amount: 67500000 },
  { value: 'K/3', label: 'K/3 — Menikah, 3 tanggungan', amount: 72000000 },
];

export function getPTKPCategory(status: PTKPStatus): TERCategory {
  if (status === 'K/3') return 'C';
  if (status === 'K/1' || status === 'K/2') return 'B';
  return 'A';
}

interface TERBracket {
  min: number;
  max: number;
  rate: number;
}

export const TERTableA: TERBracket[] = [
  { min: 0, max: 5400000, rate: 0 },
  { min: 5400001, max: 5650000, rate: 0.0025 },
  { min: 5650001, max: 5950000, rate: 0.005 },
  { min: 5950001, max: 6300000, rate: 0.0075 },
  { min: 6300001, max: 6750000, rate: 0.01 },
  { min: 6750001, max: 7500000, rate: 0.0125 },
  { min: 7500001, max: 8550000, rate: 0.015 },
  { min: 8550001, max: 9650000, rate: 0.0175 },
  { min: 9650001, max: 10050000, rate: 0.02 },
  { min: 10050001, max: 10700000, rate: 0.025 },
  { min: 10700001, max: 11600000, rate: 0.03 },
  { min: 11600001, max: 12500000, rate: 0.04 },
  { min: 12500001, max: 13750000, rate: 0.05 },
  { min: 13750001, max: 15100000, rate: 0.06 },
  { min: 15100001, max: 16950000, rate: 0.07 },
  { min: 16950001, max: 19750000, rate: 0.08 },
  { min: 19750001, max: 24150000, rate: 0.09 },
  { min: 24150001, max: 26450000, rate: 0.10 },
  { min: 26450001, max: 28000000, rate: 0.11 },
  { min: 28000001, max: 30050000, rate: 0.12 },
  { min: 30050001, max: 35400000, rate: 0.14 },
  { min: 35400001, max: 39100000, rate: 0.15 },
  { min: 39100001, max: 43850000, rate: 0.16 },
  { min: 43850001, max: 47800000, rate: 0.17 },
  { min: 47800001, max: 51400000, rate: 0.175 },
  { min: 51400001, max: 56300000, rate: 0.18 },
  { min: 56300001, max: 62500000, rate: 0.19 },
  { min: 62500001, max: 69000000, rate: 0.20 },
  { min: 69000001, max: 79000000, rate: 0.21 },
  { min: 79000001, max: 89000000, rate: 0.22 },
  { min: 89000001, max: 108000000, rate: 0.23 },
  { min: 108000001, max: Infinity, rate: 0.24 },
];

export const TERTableB: TERBracket[] = [
  { min: 0, max: 6200000, rate: 0 },
  { min: 6200001, max: 6500000, rate: 0.0025 },
  { min: 6500001, max: 6850000, rate: 0.005 },
  { min: 6850001, max: 7300000, rate: 0.0075 },
  { min: 7300001, max: 9200000, rate: 0.01 },
  { min: 9200001, max: 10750000, rate: 0.015 },
  { min: 10750001, max: 11250000, rate: 0.02 },
  { min: 11250001, max: 11600000, rate: 0.025 },
  { min: 11600001, max: 12600000, rate: 0.03 },
  { min: 12600001, max: 13600000, rate: 0.04 },
  { min: 13600001, max: 14950000, rate: 0.05 },
  { min: 14950001, max: 16400000, rate: 0.06 },
  { min: 16400001, max: 18450000, rate: 0.07 },
  { min: 18450001, max: 21850000, rate: 0.08 },
  { min: 21850001, max: 26000000, rate: 0.09 },
  { min: 26000001, max: 27700000, rate: 0.10 },
  { min: 27700001, max: 29350000, rate: 0.11 },
  { min: 29350001, max: 31450000, rate: 0.12 },
  { min: 31450001, max: 33950000, rate: 0.13 },
  { min: 33950001, max: 37100000, rate: 0.14 },
  { min: 37100001, max: 41100000, rate: 0.15 },
  { min: 41100001, max: 45800000, rate: 0.16 },
  { min: 45800001, max: 49500000, rate: 0.17 },
  { min: 49500001, max: 53800000, rate: 0.175 },
  { min: 53800001, max: 58500000, rate: 0.18 },
  { min: 58500001, max: 64000000, rate: 0.19 },
  { min: 64000001, max: 71000000, rate: 0.20 },
  { min: 71000001, max: 80000000, rate: 0.21 },
  { min: 80000001, max: 93000000, rate: 0.22 },
  { min: 93000001, max: 109000000, rate: 0.23 },
  { min: 109000001, max: Infinity, rate: 0.24 },
];

export const TERTableC: TERBracket[] = [
  { min: 0, max: 6600000, rate: 0 },
  { min: 6600001, max: 6950000, rate: 0.0025 },
  { min: 6950001, max: 7350000, rate: 0.005 },
  { min: 7350001, max: 7800000, rate: 0.0075 },
  { min: 7800001, max: 8850000, rate: 0.01 },
  { min: 8850001, max: 9800000, rate: 0.015 },
  { min: 9800001, max: 10950000, rate: 0.02 },
  { min: 10950001, max: 11200000, rate: 0.025 },
  { min: 11200001, max: 12050000, rate: 0.03 },
  { min: 12050001, max: 12950000, rate: 0.04 },
  { min: 12950001, max: 14150000, rate: 0.05 },
  { min: 14150001, max: 15550000, rate: 0.06 },
  { min: 15550001, max: 17050000, rate: 0.07 },
  { min: 17050001, max: 19500000, rate: 0.08 },
  { min: 19500001, max: 22700000, rate: 0.09 },
  { min: 22700001, max: 24500000, rate: 0.10 },
  { min: 24500001, max: 26600000, rate: 0.11 },
  { min: 26600001, max: 28100000, rate: 0.12 },
  { min: 28100001, max: 30100000, rate: 0.13 },
  { min: 30100001, max: 32600000, rate: 0.14 },
  { min: 32600001, max: 36400000, rate: 0.15 },
  { min: 36400001, max: 39900000, rate: 0.16 },
  { min: 39900001, max: 43900000, rate: 0.17 },
  { min: 43900001, max: 47600000, rate: 0.175 },
  { min: 47600001, max: 52700000, rate: 0.18 },
  { min: 52700001, max: 56500000, rate: 0.19 },
  { min: 56500001, max: 62200000, rate: 0.20 },
  { min: 62200001, max: 70400000, rate: 0.21 },
  { min: 70400001, max: 76400000, rate: 0.22 },
  { min: 76400001, max: 94100000, rate: 0.23 },
  { min: 94100001, max: Infinity, rate: 0.24 },
];

export function getTERRate(bruto: number, category: TERCategory): number {
  let table: TERBracket[];
  if (category === 'A') table = TERTableA;
  else if (category === 'B') table = TERTableB;
  else table = TERTableC;

  const bracket = table.find(b => bruto >= b.min && bruto <= b.max);
  return bracket ? bracket.rate : 0.24;
}
