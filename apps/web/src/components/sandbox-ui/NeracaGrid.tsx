import type { ReactNode } from 'react';
import { Wallet, Package, HardHat, FileCheck, CreditCard, Receipt, TrendingUp, Scale } from 'lucide-react';
import { formatRupiah } from '../../utils/projectUi';

export type NeracaRow = {
  label: string;
  value: number;
  icon?: 'wallet' | 'package' | 'hardhat' | 'file' | 'card' | 'receipt' | 'trend';
  valueClass?: string;
};

type Props = {
  title?: string;
  aktivaTitle?: string;
  pasivaTitle?: string;
  aktivaRows: NeracaRow[];
  pasivaRows: NeracaRow[];
  totalAktiva: number;
  totalPasiva: number;
  totalAktivaLabel?: string;
  totalPasivaLabel?: string;
  balanceBadge?: ReactNode;
  footer?: ReactNode;
};

const ICONS = {
  wallet: Wallet,
  package: Package,
  hardhat: HardHat,
  file: FileCheck,
  card: CreditCard,
  receipt: Receipt,
  trend: TrendingUp,
};

function formatNeracaValue(value: number): string {
  if (value < 0) return `Rp ${value.toLocaleString('id-ID')}`;
  return formatRupiah(value);
}

function NeracaCol({
  title,
  rows,
  total,
  totalLabel,
}: {
  title: string;
  rows: NeracaRow[];
  total: number;
  totalLabel: string;
}) {
  return (
    <div className="p-4 md:p-5">
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">{title}</div>
      {rows.map((r, i) => {
        const Icon = r.icon ? ICONS[r.icon] : null;
        return (
          <div
            key={i}
            className="flex items-center justify-between py-1.5 text-[13px] border-b border-slate-50 last:border-0"
          >
            <span className="flex items-center gap-1.5 text-slate-600">
              {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
              {r.label}
            </span>
            <span className={`font-bold ${r.valueClass || 'text-slate-800'}`}>
              {formatNeracaValue(r.value)}
            </span>
          </div>
        );
      })}
      <div className="flex justify-between pt-3 mt-2 font-extrabold text-sm text-slate-900 border-t-2 border-slate-200">
        <span>{totalLabel}</span>
        <span>{formatNeracaValue(total)}</span>
      </div>
    </div>
  );
}

export default function NeracaGrid({
  title = 'Neraca Bisnis',
  aktivaTitle = 'Aktiva',
  pasivaTitle = 'Pasiva + Ekuitas',
  aktivaRows,
  pasivaRows,
  totalAktiva,
  totalPasiva,
  totalAktivaLabel = 'TOTAL AKTIVA',
  totalPasivaLabel = 'TOTAL PASIVA + EKUITAS',
  balanceBadge,
  footer,
}: Props) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Scale className="w-4 h-4 text-slate-500" />
          {title}
        </h3>
        {balanceBadge}
      </div>
      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        <NeracaCol
          title={aktivaTitle}
          rows={aktivaRows}
          total={totalAktiva}
          totalLabel={totalAktivaLabel}
        />
        <NeracaCol
          title={pasivaTitle}
          rows={pasivaRows}
          total={totalPasiva}
          totalLabel={totalPasivaLabel}
        />
      </div>
      {footer && (
        <div className="px-5 py-3 bg-slate-50/60 text-xs text-slate-500 border-t border-slate-100">
          {footer}
        </div>
      )}
    </div>
  );
}
