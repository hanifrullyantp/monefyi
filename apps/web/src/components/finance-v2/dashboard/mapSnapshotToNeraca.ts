import type { FinanceAccount, FinanceKpis } from '../../../types/financeV2';
import type { NeracaData } from './types';

function sumType(accounts: FinanceAccount[], type: FinanceAccount['type']): number {
  return accounts
    .filter(a => a.type === type)
    .reduce((s, a) => s + a.current_balance, 0);
}

export function mapAccountsToNeracaData(
  accounts: FinanceAccount[],
  opts?: { isLoading?: boolean; error?: string; lastUpdated?: Date },
): NeracaData {
  const kasAccounts = accounts.filter(a => a.type === 'kas');
  const piutangAccounts = accounts.filter(a => a.type === 'piutang');

  return {
    kas: round(kasAccounts.reduce((s, a) => s + a.current_balance, 0)),
    kasBreakdown: kasAccounts.map(a => ({
      name: a.name,
      amount: a.current_balance,
      id: a.id,
    })),
    piutang: round(sumType(accounts, 'piutang')),
    piutangBreakdown: piutangAccounts.map(a => ({
      name: a.name,
      amount: a.current_balance,
      id: a.id,
    })),
    stok: round(sumType(accounts, 'stok')),
    propertiPeralatan: round(sumType(accounts, 'aset_tetap')),
    praBayar: round(sumType(accounts, 'prabayar')),
    hutangDagang: round(sumType(accounts, 'hutang_dagang')),
    hutangPajak: round(sumType(accounts, 'hutang_pajak')),
    hutangLain: round(sumType(accounts, 'hutang_lain')),
    modalDisetor: round(sumType(accounts, 'modal_disetor')),
    labaDitahan: round(sumType(accounts, 'laba_ditahan')),
    labaPeriode: round(sumType(accounts, 'laba')),
    lastUpdated: opts?.lastUpdated ?? new Date(),
    isLoading: opts?.isLoading ?? false,
    error: opts?.error,
  };
}

export function computeNeracaTotals(data: NeracaData) {
  const totalAktiva = round(
    data.kas + data.piutang + data.stok + data.propertiPeralatan + data.praBayar,
  );
  const totalKewajiban = round(data.hutangDagang + data.hutangPajak + data.hutangLain);
  const totalModal = round(data.modalDisetor + data.labaDitahan + data.labaPeriode);
  const totalPasiva = round(totalKewajiban + totalModal);
  const variance = round(totalAktiva - totalPasiva);
  const isBalanced = Math.abs(variance) < 1;
  return { totalAktiva, totalKewajiban, totalModal, totalPasiva, variance, isBalanced };
}

export function kasBebasFromAccounts(accounts: FinanceAccount[]): number {
  return round(
    accounts
      .filter(a => a.type === 'kas' && !a.project_id)
      .reduce((s, a) => s + a.current_balance, 0),
  );
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

export function emptyNeracaData(): NeracaData {
  return mapAccountsToNeracaData([]);
}
