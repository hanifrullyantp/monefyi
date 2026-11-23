import type { BusinessSnapshot } from '../project-normalize';
import type { BalanceLine, BalanceSheet } from './types';

/**
 * Build business balance sheet with consistent line items.
 */
export function buildBusinessSheet(business: BusinessSnapshot): BalanceSheet {
  const piutang = business.piutangList.reduce((s, p) => s + p.amount, 0);
  const persediaan = business.assets.reduce((s, a) => s + a.value, 0);
  const prabayar = Number(business.prabayar ?? 0);

  const lines: BalanceLine[] = [
    { key: 'kas', label: 'Kas & Bank', side: 'aktiva', amount: business.totalKas, icon: 'wallet' },
    { key: 'piutang', label: 'Piutang Klien', side: 'aktiva', amount: piutang, icon: 'file-check' },
    { key: 'persediaan', label: 'Persediaan', side: 'aktiva', amount: persediaan, icon: 'package' },
    { key: 'asetTetap', label: 'Aset Tetap', side: 'aktiva', amount: business.asetTetap, icon: 'building-2' },
  ];

  if (prabayar > 0) {
    lines.push({ key: 'prabayar', label: 'Prabayar', side: 'aktiva', amount: prabayar, icon: 'clock' });
  }

  lines.push(
    { key: 'hutang', label: 'Total Hutang', side: 'pasiva', amount: business.totalHutang, icon: 'receipt' },
    { key: 'modal', label: 'Modal', side: 'ekuitas', amount: business.modal, icon: 'wallet' },
    {
      key: 'labaDitahan',
      label: 'Laba Ditahan',
      side: 'ekuitas',
      amount: business.labaDitahan,
      icon: 'trending-up',
    },
  );

  const aktiva = lines.filter(l => l.side === 'aktiva').reduce((s, l) => s + l.amount, 0);
  const pasiva = lines.filter(l => l.side === 'pasiva').reduce((s, l) => s + l.amount, 0);
  const ekuitas = lines.filter(l => l.side === 'ekuitas').reduce((s, l) => s + l.amount, 0);

  return {
    scope: 'business',
    lines,
    aktiva,
    pasiva,
    ekuitas,
    meta: {
      storedTotalAktiva: business.totalAktiva,
      storedEkuitas: business.ekuitas,
      piutangFromList: piutang,
      persediaanFromAssets: persediaan,
      inventoryFromItems: persediaan > 0,
      asetTetapField: business.asetTetap,
    },
  };
}
