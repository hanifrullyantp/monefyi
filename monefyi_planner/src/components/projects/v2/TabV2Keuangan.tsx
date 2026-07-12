import { Wallet, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
import type { NormalizedProjectView } from '../../../lib/migration/project-normalize';
import type { BalanceCheckResult } from '../../../lib/migration/balance-sheet';
import { formatRupiah } from '../../../utils/projectUi';

type Props = {
  normalized: NormalizedProjectView;
  balanceCheck: BalanceCheckResult;
  onOpenDiagnosis: () => void;
};

export default function TabV2Keuangan({ normalized, balanceCheck, onOpenDiagnosis }: Props) {
  const p = normalized.project;
  const pemasukanPct = p.contractValue > 0
    ? Math.min((normalized.totalPemasukan / p.contractValue) * 100, 100)
    : 0;
  const realisasiVsPemasukan = normalized.totalPemasukan > 0
    ? Math.min((normalized.totalRealisasi / normalized.totalPemasukan) * 100, 100)
    : 0;
  const marginPct = p.contractValue > 0
    ? (((p.rap?.estLaba || 0) / p.contractValue) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-600 mb-3">
          <Wallet className="w-5 h-5 text-emerald-600" />
          Saldo Project
        </div>
        <div className="text-4xl font-black text-slate-900 tracking-tight mb-4">
          {formatRupiah(p.saldo)}
        </div>
        <div className="h-7 bg-slate-100 rounded-lg overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-lg flex items-center justify-center text-white text-xs font-bold min-w-[5rem]"
            style={{ width: `${Math.max(pemasukanPct, pemasukanPct > 0 ? 18 : 0)}%` }}
          >
            {normalized.totalPemasukan > 0 && formatRupiah(normalized.totalPemasukan)}
          </div>
        </div>
        <p className="text-center text-sm text-slate-500 mt-2">
          Sisa Pembayaran: {formatRupiah(normalized.sisaPembayaran)}
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <FinanceStatCard
          label="Pembayaran"
          icon={CreditCard}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          amount={normalized.totalPemasukan}
          barPct={realisasiVsPemasukan}
          barLabel={formatRupiah(normalized.totalRealisasi)}
          barColor="bg-rose-500"
          subLabel={`Sisa ${formatRupiah(normalized.totalPemasukan - normalized.totalRealisasi)}`}
        />
        <FinanceStatCard
          label="Est. Laba"
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          amount={p.rap?.estLaba || 0}
          barPct={Number(marginPct)}
          barLabel={formatRupiah(p.rap?.estLaba || 0)}
          barColor="bg-emerald-500"
          subLabel={`Margin ${marginPct}%`}
        />
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase">Neraca</span>
            <button
              type="button"
              onClick={onOpenDiagnosis}
              className={`text-xs font-bold px-2 py-1 rounded-full ${
                balanceCheck.isBalanced ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {balanceCheck.isBalanced ? 'Balance' : 'Diagnosa'}
            </button>
          </div>
          <div className="space-y-1.5 text-sm">
            <Row label="Aktiva" value={formatRupiah(normalized.totalAktiva)} />
            <Row label="Pasiva" value={formatRupiah(normalized.totalPasiva)} bold />
            <Row label="Hutang" value={formatRupiah(p.budget.hutang)} />
          </div>
        </div>
      </div>

      {p.budget.hutang > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">Hutang Vendor: {formatRupiah(p.budget.hutang)}</p>
            <p className="text-xs text-amber-700 mt-0.5">Realisasi melebihi dana masuk — periksa pembayaran klien.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function FinanceStatCard({
  label, icon: Icon, iconBg, iconColor, amount, barPct, barLabel, barColor, subLabel,
}: {
  label: string;
  icon: typeof Wallet;
  iconBg: string;
  iconColor: string;
  amount: number;
  barPct: number;
  barLabel: string;
  barColor: string;
  subLabel: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
      </div>
      <div className="text-lg font-black text-slate-900 mb-2">{formatRupiah(amount)}</div>
      <div className="h-5 bg-slate-100 rounded-md overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-md flex items-center justify-center text-white text-[10px] font-bold min-w-[4rem]`}
          style={{ width: `${Math.max(barPct, amount > 0 ? 20 : 0)}%` }}
        >
          {barLabel}
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-1.5">{subLabel}</p>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold pt-1.5 border-t border-slate-100' : ''}`}>
      <span className="text-slate-600">{label}</span>
      <span>{value}</span>
    </div>
  );
}
