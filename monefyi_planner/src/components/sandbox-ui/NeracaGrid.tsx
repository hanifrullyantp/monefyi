import type { ReactNode } from 'react';
import { Wallet, Package, HardHat, FileCheck, CreditCard, Receipt, TrendingUp } from 'lucide-react';
import { formatRupiah } from '../../utils/projectUi';

export type NeracaRow = {
  label: string;
  value: number;
  icon?: 'wallet' | 'package' | 'hardhat' | 'file' | 'card' | 'receipt' | 'trend';
  valueClass?: string;
  negative?: boolean;
};

type Props = {
  aktivaTitle?: string;
  pasivaTitle?: string;
  aktivaRows: NeracaRow[];
  pasivaRows: NeracaRow[];
  totalAktiva: number;
  totalPasiva: number;
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

function NeracaCol({ title, rows, total }: { title: string; rows: NeracaRow[]; total: number }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{title}</div>
      {rows.map((r, i) => {
        const Icon = r.icon ? ICONS[r.icon] : null;
        const display = r.negative ? `-${formatRupiah(r.value)}` : formatRupiah(r.value);
        return (
          <div key={i} className="flex items-center justify-between py-2 text-sm border-b border-slate-50 last:border-0">
            <span className="flex items-center gap-1.5 text-slate-600">
              {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
              {r.label}
            </span>
            <span className={`font-semibold ${r.valueClass || 'text-slate-800'}`}>{display}</span>
          </div>
        );
      })}
      <div className="flex justify-between pt-3 mt-2 border-t-2 border-slate-200 font-black text-sm">
        <span>TOTAL</span>
        <span>{formatRupiah(total)}</span>
      </div>
    </div>
  );
}

export default function NeracaGrid({
  aktivaTitle = 'Aktiva (Penggunaan)',
  pasivaTitle = 'Pasiva (Sumber)',
  aktivaRows,
  pasivaRows,
  totalAktiva,
  totalPasiva,
  balanceBadge,
  footer,
}: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
        <h3 className="font-bold text-slate-800 text-sm">Neraca Posisi Keuangan</h3>
        {balanceBadge}
      </div>
      <div className="p-5 grid md:grid-cols-2 gap-6">
        <NeracaCol title={aktivaTitle} rows={aktivaRows} total={totalAktiva} />
        <NeracaCol title={pasivaTitle} rows={pasivaRows} total={totalPasiva} />
      </div>
      {footer && <div className="px-5 py-3 bg-slate-50 border-t text-xs text-slate-500">{footer}</div>}
    </div>
  );
}
