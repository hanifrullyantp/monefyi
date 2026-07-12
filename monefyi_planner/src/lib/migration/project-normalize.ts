import type { FinanceAccount } from '../../types/financeV2';
import type { MappedProjectView, MappedRapItem } from './planner-mapper';

export type WorkItemRow = {
  item: MappedRapItem;
  idx: number;
  kind: 'material' | 'worker';
};

export type BusinessSnapshot = {
  name: string;
  totalKas: number;
  totalHutang: number;
  modal: number;
  labaDitahan: number;
  asetTetap: number;
  totalAktiva: number;
  ekuitas: number;
  piutangList: Array<{ amount: number }>;
  assets: Array<{ value: number }>;
  prabayar?: number;
  cashflowData?: number[];
};

/**
 * Build business snapshot from Finance V2 accounts (read model for balance validator).
 */
export function buildBusinessSnapshotFromAccounts(
  orgName: string,
  accounts: FinanceAccount[],
  totalHutangOpen = 0,
): BusinessSnapshot {
  const byType = (type: string) =>
    accounts.filter(a => a.type === type).reduce((s, a) => s + (Number(a.current_balance) || 0), 0);

  const totalKas = byType('kas');
  const piutang = byType('piutang');
  const persediaan = byType('stok');
  const asetTetap = byType('aset_tetap');
  const prabayar = byType('prabayar');
  const modal = accounts
    .filter(a => a.type === 'modal_disetor')
    .reduce((s, a) => s + (Number(a.current_balance) || 0), 0);
  const labaDitahan = accounts
    .filter(a => a.type === 'laba_ditahan' || a.type === 'laba')
    .reduce((s, a) => s + (Number(a.current_balance) || 0), 0);

  const aktiva = totalKas + piutang + persediaan + asetTetap + prabayar;
  const ekuitas = modal + labaDitahan;
  const pasivaEkuitas = totalHutangOpen + ekuitas;

  return {
    name: orgName,
    totalKas,
    totalHutang: totalHutangOpen,
    modal,
    labaDitahan,
    asetTetap,
    totalAktiva: aktiva,
    ekuitas: pasivaEkuitas,
    piutangList: piutang > 0 ? [{ amount: piutang }] : [],
    assets: persediaan > 0 ? [{ value: persediaan }] : [],
    prabayar: prabayar > 0 ? prabayar : undefined,
  };
}

export type NormalizedProjectView = {
  project: MappedProjectView;
  totalRealisasi: number;
  totalPemasukan: number;
  sisaKontrak: number;
  sisaPembayaran: number;
  realisasiPct: string;
  totalAktiva: number;
  totalPasiva: number;
  estLaba: number;
  bahanActual: number;
  tukangActual: number;
  hutangItems: MappedProjectView['hutangPiutang'];
  piutangItems: MappedProjectView['hutangPiutang'];
  workItems: WorkItemRow[];
  checkedCount: number;
  totalWorkItems: number;
  allTransactions: Array<
    | (MappedProjectView['payments'][number] & { sortDate: string })
    | (MappedProjectView['expenses'][number] & { sortDate: string })
  >;
};

export function normalizeProjectView(project: MappedProjectView): NormalizedProjectView {
  const bahanActual = project.budget?.bahan?.actual || 0;
  const tukangActual = project.budget?.tukang?.actual || 0;
  const itemRealisasi = bahanActual + tukangActual;
  const totalRealisasi = project.rap?.realisasi ?? itemRealisasi;
  const totalPemasukan = project.payments.reduce((s, pay) => s + pay.amount, 0);
  const piutang = project.budget?.piutang || 0;
  const hutang = project.budget?.hutang || 0;
  const estLaba = project.rap?.estLaba || 0;
  const materials = project.rap?.materials || [];
  const workers = project.rap?.workers || [];

  const workItems: WorkItemRow[] = [
    ...materials.map((item, idx) => ({ item, idx, kind: 'material' as const })),
    ...workers.map((item, idx) => ({ item, idx: materials.length + idx, kind: 'worker' as const })),
  ];
  const checkedCount = workItems.filter(
    w => w.item.checked || w.item.qtyActual > 0,
  ).length;
  const hutangItems = project.hutangPiutang.filter(h => h.type === 'hutang');
  const piutangItems = project.hutangPiutang.filter(h => h.type === 'piutang');
  const allTransactions = [
    ...project.payments.map(tx => ({ ...tx, sortDate: tx.date })),
    ...project.expenses.map(tx => ({ ...tx, sortDate: tx.date })),
  ].sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());

  // Neraca gambar 3: Aktiva = Bahan + Tukang + Piutang + Saldo
  const totalAktiva = bahanActual + tukangActual + piutang + project.saldo;
  // Pasiva = Dana Masuk − Hutang + Est. Laba
  const totalPasiva = totalPemasukan - hutang + estLaba;

  return {
    project,
    totalRealisasi,
    totalPemasukan,
    sisaKontrak: project.contractValue - totalRealisasi,
    sisaPembayaran: project.contractValue - totalPemasukan,
    realisasiPct:
      project.contractValue > 0
        ? ((totalRealisasi / project.contractValue) * 100).toFixed(1)
        : '0',
    totalAktiva,
    totalPasiva,
    estLaba,
    bahanActual,
    tukangActual,
    hutangItems,
    piutangItems,
    workItems,
    checkedCount,
    totalWorkItems: workItems.length,
    allTransactions,
  };
}
