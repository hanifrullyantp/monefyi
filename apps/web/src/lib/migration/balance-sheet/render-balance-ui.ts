import { formatRupiah } from '../../../utils/projectUi';
import type { BalanceCheckResult } from './types';

export function balanceGapLabel(check: BalanceCheckResult): string {
  if (check.isBalanced) return 'Aktiva = Pasiva + Ekuitas';
  return `Selisih ${formatRupiah(Math.abs(check.gap))} (${check.gap > 0 ? 'Aktiva lebih besar' : 'Pasiva+Ekuitas lebih besar'})`;
}

export function balanceStatusTitle(scope: BalanceCheckResult['scope']): string {
  return scope === 'business' ? 'Neraca Bisnis' : 'Neraca Project';
}
