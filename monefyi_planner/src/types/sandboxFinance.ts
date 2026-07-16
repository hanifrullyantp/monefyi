/** Tab Keuangan Bisnis — struktur sandbox (9 tab). */

export const SANDBOX_FINANCE_TABS = [
  { slug: 'overview', label: 'Overview', path: '' },
  { slug: 'kasbank', label: 'Kas & Bank', path: 'kasbank' },
  { slug: 'hutangpiutang', label: 'Hutang Piutang', path: 'hutangpiutang' },
  { slug: 'labarugi', label: 'Laba Rugi', path: 'labarugi' },
  { slug: 'operasional', label: 'Operasional', path: 'operasional' },
  { slug: 'aset', label: 'Aset', path: 'aset' },
  { slug: 'perencanaan', label: 'Perencanaan', path: 'perencanaan' },
  { slug: 'budget', label: 'Budget', path: 'budget' },
  { slug: 'laporan', label: 'Laporan', path: 'laporan' },
] as const;

export type SandboxFinanceTabSlug = (typeof SANDBOX_FINANCE_TABS)[number]['slug'];

export const LEGACY_FINANCE_REDIRECTS: Record<string, string> = {
  kas: 'kasbank',
  piutang: 'hutangpiutang',
  hutang: 'hutangpiutang',
  stok: 'aset',
  prabayar: 'aset',
  investor: 'overview',
  opex: 'operasional',
};
