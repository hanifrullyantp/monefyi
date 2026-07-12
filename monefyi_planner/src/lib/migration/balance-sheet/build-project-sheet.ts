import type { MappedProjectView } from '../planner-mapper';
import type { BalanceLine, BalanceSheet } from './types';

/**
 * Build project balance sheet.
 */
export function buildProjectSheet(project: MappedProjectView): BalanceSheet {
  const totalPemasukan = project.payments.reduce((s, p) => s + p.amount, 0);
  const piutang = project.budget?.piutang || 0;
  const hutang = project.budget?.hutang || 0;
  const saldo = project.saldo;
  const received = totalPemasukan;
  const spent = project.rap?.realisasi ?? 0;
  const contractValue = project.contractValue;
  const hutangListSum = project.hutangPiutang
    .filter(h => h.type === 'hutang')
    .reduce((s, h) => s + h.amount, 0);
  const piutangListSum = project.hutangPiutang
    .filter(h => h.type === 'piutang')
    .reduce((s, h) => s + h.amount, 0);

  const lines: BalanceLine[] = [
    { key: 'saldo', label: 'Saldo Kas', side: 'aktiva', amount: saldo, icon: 'wallet' },
    { key: 'piutang', label: 'Piutang Klien', side: 'aktiva', amount: piutang, icon: 'file-check' },
    { key: 'pemasukan', label: 'Dana Masuk', side: 'pasiva', amount: totalPemasukan, icon: 'credit-card' },
    { key: 'hutang', label: 'Hutang Vendor', side: 'pasiva', amount: hutang, icon: 'receipt' },
  ];

  const aktiva = saldo + piutang;
  const pasiva = totalPemasukan;
  const ekuitas = 0;

  return {
    scope: 'project',
    projectId: project.id,
    lines,
    aktiva,
    pasiva: pasiva - hutang,
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
