import type { ChartAccount } from '../types/finance';

/** Default chart of accounts for STAY hospitality accounting */
export function buildDefaultChartOfAccounts(tenantId: string): ChartAccount[] {
  const rows: Omit<ChartAccount, 'id'>[] = [
    { tenantId, code: '1101', name: 'Kas Tunai', accountType: 'aktiva', subType: 'kas', isSystem: true, isActive: true, currentBalance: 15_000_000 },
    { tenantId, code: '1102', name: 'Kas Bank BCA', accountType: 'aktiva', subType: 'bank', isSystem: true, isActive: true, currentBalance: 25_000_000 },
    { tenantId, code: '1103', name: 'Kas Bank Mandiri', accountType: 'aktiva', subType: 'bank', isSystem: true, isActive: true, currentBalance: 10_000_000 },
    { tenantId, code: '1104', name: 'Saldo Xendit', accountType: 'aktiva', subType: 'xendit', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '1201', name: 'Piutang Tamu', accountType: 'aktiva', subType: 'piutang', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '1202', name: 'Piutang Karyawan', accountType: 'aktiva', subType: 'piutang', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '1203', name: 'Piutang Xendit', accountType: 'aktiva', subType: 'piutang', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '1204', name: 'Piutang OTA', accountType: 'aktiva', subType: 'piutang', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '1301', name: 'Perlengkapan Kamar', accountType: 'aktiva', subType: 'stok', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '1302', name: 'Perlengkapan Kebersihan', accountType: 'aktiva', subType: 'stok', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '1303', name: 'Persediaan F&B', accountType: 'aktiva', subType: 'stok', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '1401', name: 'Bangunan', accountType: 'aktiva', subType: 'aset_tetap', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '1402', name: 'Peralatan', accountType: 'aktiva', subType: 'aset_tetap', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '1403', name: 'Furniture', accountType: 'aktiva', subType: 'aset_tetap', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '1499', name: 'Akumulasi Penyusutan', accountType: 'aktiva', subType: 'aset_tetap', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '1501', name: 'Sewa Dibayar Dimuka', accountType: 'aktiva', subType: 'prabayar', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '1502', name: 'Asuransi Dimuka', accountType: 'aktiva', subType: 'prabayar', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '2101', name: 'Hutang Dagang', accountType: 'pasiva', subType: 'hutang_dagang', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '2102', name: 'Hutang Gaji Karyawan', accountType: 'pasiva', subType: 'hutang_gaji', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '2103', name: 'Hutang Pajak', accountType: 'pasiva', subType: 'hutang_pajak', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '2104', name: 'Pendapatan Diterima Dimuka', accountType: 'pasiva', subType: 'pendapatan_dimuka', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '2105', name: 'Hutang Lainnya', accountType: 'pasiva', subType: 'hutang_lain', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '2201', name: 'Hutang Bank / Pinjaman', accountType: 'pasiva', subType: 'hutang_bank', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '3101', name: 'Modal Pemilik', accountType: 'pasiva', subType: 'modal', isSystem: true, isActive: true, currentBalance: 50_000_000 },
    { tenantId, code: '3102', name: 'Tambahan Modal', accountType: 'pasiva', subType: 'modal', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '3103', name: 'Simpanan / Cadangan', accountType: 'pasiva', subType: 'simpanan', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '3104', name: 'Laba Ditahan', accountType: 'pasiva', subType: 'laba_ditahan', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '3105', name: 'Laba Periode Berjalan', accountType: 'pasiva', subType: 'laba', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '4101', name: 'Pendapatan Kamar', accountType: 'pendapatan', subType: 'pendapatan', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '4102', name: 'Pendapatan Extra Charges', accountType: 'pendapatan', subType: 'pendapatan', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '4103', name: 'Pendapatan Late Checkout', accountType: 'pendapatan', subType: 'pendapatan', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '4104', name: 'Pendapatan F&B', accountType: 'pendapatan', subType: 'pendapatan', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '4105', name: 'Pendapatan Laundry', accountType: 'pendapatan', subType: 'pendapatan', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '4199', name: 'Pendapatan Lainnya', accountType: 'pendapatan', subType: 'pendapatan', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '5101', name: 'Beban Gaji & Tunjangan', accountType: 'beban', subType: 'beban', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '5102', name: 'Beban Utilitas', accountType: 'beban', subType: 'beban', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '5103', name: 'Beban Kebersihan', accountType: 'beban', subType: 'beban', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '5104', name: 'Beban Perlengkapan', accountType: 'beban', subType: 'beban', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '5105', name: 'Beban Payment Gateway', accountType: 'beban', subType: 'beban', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '5106', name: 'Beban Maintenance', accountType: 'beban', subType: 'beban', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '5107', name: 'Beban Marketing', accountType: 'beban', subType: 'beban', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '5108', name: 'Beban Administrasi', accountType: 'beban', subType: 'beban', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '5109', name: 'Beban Penyusutan', accountType: 'beban', subType: 'beban', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '5199', name: 'Beban Lainnya', accountType: 'beban', subType: 'beban', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '5201', name: 'Beban Bunga', accountType: 'beban', subType: 'beban', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '5202', name: 'Beban Pajak', accountType: 'beban', subType: 'beban', isSystem: true, isActive: true, currentBalance: 0 },
    { tenantId, code: '5203', name: 'Retur Pendapatan / Refund', accountType: 'beban', subType: 'beban', isSystem: true, isActive: true, currentBalance: 0 },
  ];

  return rows.map((r, i) => ({ ...r, id: `coa-${tenantId}-${i + 1}` }));
}

export function findAccountByCode(accounts: ChartAccount[], code: string): ChartAccount | undefined {
  return accounts.find((a) => a.code === code && a.isActive);
}

export function findAccountBySubType(
  accounts: ChartAccount[],
  subType: ChartAccount['subType'],
  nameHint?: string
): ChartAccount | undefined {
  const matches = accounts.filter((a) => a.subType === subType && a.isActive);
  if (nameHint) {
    const hint = matches.find((a) => a.name.toLowerCase().includes(nameHint.toLowerCase()));
    if (hint) return hint;
  }
  return matches[0];
}
