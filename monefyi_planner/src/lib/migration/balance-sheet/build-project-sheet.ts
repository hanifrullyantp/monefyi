import type { MappedProjectView } from '../planner-mapper';
import type { BalanceLine, BalanceSheet } from './types';

/**
 * Build project balance sheet.
 * Identity: Realisasi + Saldo + Piutang = Dana Masuk + Hutang
 */
export function buildProjectSheet(project: MappedProjectView): BalanceSheet {
  const totalPemasukan = project.payments.reduce((s, p) => s + p.amount, 0);
  const piutang = project.budget?.piutang || 0;
  const hutang = project.budget?.hutang || 0;
  const saldo = project.saldo;
  const received = totalPemasukan;
  const spent = project.rap?.realisasi ?? 0;
  const contractValue = project.contractValue;
  const bahanActual = project.budget?.bahan?.actual || 0;
  const tukangActual = project.budget?.tukang?.actual || 0;
  const hutangListSum = project.hutangPiutang
    .filter(h => h.type === 'hutang')
    .reduce((s, h) => s + h.amount, 0);
  const piutangListSum = project.hutangPiutang
    .filter(h => h.type === 'piutang')
    .reduce((s, h) => s + h.amount, 0);

  const lines: BalanceLine[] = [
    { key: 'bahan', label: 'Bahan (Actual)', side: 'aktiva', amount: bahanActual, icon: 'package' },
    { key: 'tukang', label: 'Tukang (Actual)', side: 'aktiva', amount: tukangActual, icon: 'hardhat' },
    { key: 'saldo', label: 'Saldo Kas', side: 'aktiva', amount: saldo, icon: 'wallet' },
    { key: 'piutang', label: 'Piutang Klien', side: 'aktiva', amount: piutang, icon: 'file-check' },
    { key: 'pemasukan', label: 'Dana Masuk', side: 'pasiva', amount: totalPemasukan, icon: 'credit-card' },
    { key: 'hutang', label: 'Hutang Vendor', side: 'pasiva', amount: hutang, icon: 'receipt' },
  ];

  const aktiva = spent + saldo + piutang;
  const pasiva = totalPemasukan + hutang;
  const ekuitas = 0;

  return {
    scope: 'project',
    projectId: project.id,
    lines,
    aktiva,
    pasiva,
    ekuitas,
    meta: {
      totalPemasukan,
      hutang,
      saldo,
      piutang,
      received,
      spent,
      contractValue,
      expectedSaldo: received - spent,
      expectedPiutang: Math.max(0, contractValue - received),
      hutangListSum,
      piutangListSum,
      estLaba: project.rap?.estLaba || 0,
    },
  };
}
