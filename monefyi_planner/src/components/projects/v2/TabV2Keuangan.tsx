import { useState } from 'react';
import {
  Wallet, CreditCard, TrendingUp, Receipt, Scale, Info,
  Plus, ArrowLeftRight,
} from 'lucide-react';
import type { NormalizedProjectView } from '../../../lib/migration/project-normalize';
import type { BalanceCheckResult } from '../../../lib/migration/balance-sheet';
import type { Project } from '../../../store/appStore';
import { formatRupiah } from '../../../utils/projectUi';
import StatCard from '../../sandbox-ui/StatCard';
import NeracaGrid from '../../sandbox-ui/NeracaGrid';
import TransactionList from '../../sandbox-ui/TransactionList';
import BottomActionBar from '../../sandbox-ui/BottomActionBar';
import ProgressBarLg from '../../sandbox-ui/ProgressBarLg';
import ProjectTransactionModals, { type ModalKind } from './ProjectTransactionModals';

type Props = {
  normalized: NormalizedProjectView;
  balanceCheck: BalanceCheckResult;
  onOpenDiagnosis: () => void;
  project: Project;
  orgId: string;
  userId: string;
  canManage: boolean;
  onRefresh: () => void | Promise<void>;
};

export default function TabV2Keuangan({
  normalized, balanceCheck, onOpenDiagnosis, project, orgId, userId, canManage, onRefresh,
}: Props) {
  const [modal, setModal] = useState<ModalKind>(null);
  const p = normalized.project;
  const hutang = p.budget.hutang || 0;
  const pemasukanPct = p.contractValue > 0
    ? Math.min((normalized.totalPemasukan / p.contractValue) * 100, 100)
    : 0;
  const realisasiVsPemasukan = normalized.totalPemasukan > 0
    ? Math.min((normalized.totalRealisasi / normalized.totalPemasukan) * 100, 100)
    : 0;
  const marginPct = p.contractValue > 0
    ? (((p.rap?.estLaba || 0) / p.contractValue) * 100).toFixed(1)
    : '0';

  const aktivaRows = [
    { label: 'Bahan (Actual)', value: normalized.bahanActual, icon: 'package' as const },
    { label: 'Tukang (Actual)', value: normalized.tukangActual, icon: 'hardhat' as const },
    { label: 'Piutang Klien', value: p.budget.piutang, icon: 'file' as const },
    { label: 'Saldo Kas', value: p.saldo, icon: 'wallet' as const },
  ];

  const pasivaRows = [
    ...p.payments.map(pay => ({
      label: pay.name,
      value: pay.amount,
      icon: 'card' as const,
    })),
    { label: 'Hutang Vendor', value: hutang, icon: 'receipt' as const, negative: true, valueClass: 'text-rose-600' },
    { label: 'Est. Laba', value: normalized.estLaba, icon: 'trend' as const, valueClass: 'text-emerald-600' },
  ];

  const balanceBadge = (
    <button
      type="button"
      onClick={onOpenDiagnosis}
      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
        balanceCheck.isBalanced ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
      }`}
    >
      {balanceCheck.isBalanced ? '✓ Balance' : 'Tidak Balance'}
    </button>
  );

  return (
    <div className="space-y-5 pb-4">
      {/* Saldo Hero */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-600 mb-3">
          <Wallet className="w-5 h-5 text-emerald-600" />
          Saldo Project
        </div>
        <div className="text-4xl font-black text-slate-900 tracking-tight mb-4">
          {formatRupiah(p.saldo)}
        </div>
        <ProgressBarLg
          value={pemasukanPct}
          label={normalized.totalPemasukan > 0 ? formatRupiah(normalized.totalPemasukan) : undefined}
          variant="orange"
        />
        <p className="text-center text-sm text-slate-500 mt-2">
          Sisa Pembayaran: {formatRupiah(normalized.sisaPembayaran)}
        </p>
      </div>

      {/* 3 Stat Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard
          label="Pembayaran"
          value={formatRupiah(normalized.totalPemasukan)}
          icon={CreditCard}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          sparkData={[40, 55, 45, 70, 60, 80, 85]}
          barPct={realisasiVsPemasukan}
          barLabel={formatRupiah(normalized.totalRealisasi)}
          subLabel={`Sisa ${formatRupiah(normalized.totalPemasukan - normalized.totalRealisasi)}`}
        />
        <StatCard
          label="Est. Laba"
          value={formatRupiah(p.rap?.estLaba || 0)}
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          sparkData={[30, 35, 42, 38, 45, 52, 58]}
          barPct={Number(marginPct)}
          barLabel={formatRupiah(p.rap?.estLaba || 0)}
          barVariant="success"
          subLabel={`Margin ${marginPct}%`}
        />
        <StatCard
          label="Hutang"
          value={formatRupiah(hutang)}
          icon={Receipt}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
          badge={
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-600">
              {normalized.hutangItems.length} item
            </span>
          }
        />
      </div>

      {/* Neraca */}
      <NeracaGrid
        aktivaRows={aktivaRows}
        pasivaRows={pasivaRows}
        totalAktiva={normalized.totalAktiva}
        totalPasiva={normalized.totalPasiva}
        balanceBadge={balanceBadge}
        footer={(
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              Balance: Aktiva harus = Pasiva (dana masuk + laba − hutang)
            </span>
            <span className="font-bold text-emerald-600">
              Est. Laba: {formatRupiah(normalized.estLaba)}
            </span>
          </div>
        )}
      />

      {/* Hutang / Piutang detail */}
      <div className="grid md:grid-cols-2 gap-4">
        <DetailCard
          title="Hutang"
          total={hutang}
          items={normalized.hutangItems}
          color="rose"
        />
        <DetailCard
          title="Piutang"
          total={p.budget.piutang}
          items={normalized.piutangItems}
          color="emerald"
        />
      </div>

      {/* Semua Transaksi */}
      <TransactionList
        transactions={normalized.allTransactions.map(tx => ({
          id: tx.id,
          type: tx.type,
          name: tx.name,
          amount: tx.amount,
          date: tx.date,
          time: 'time' in tx ? tx.time : undefined,
        }))}
        title="Semua Transaksi"
        onAdd={() => setModal('income')}
      />

      <BottomActionBar
        actions={[
          { label: 'Tambah Transaksi', icon: <Plus className="w-4 h-4" />, onClick: () => setModal('income') },
          { label: 'Transfer', icon: <ArrowLeftRight className="w-4 h-4" />, onClick: () => setModal('transfer'), variant: 'primary' },
        ]}
      />

      <ProjectTransactionModals
        open={modal !== null}
        kind={modal}
        onClose={() => setModal(null)}
        project={project}
        orgId={orgId}
        userId={userId}
        canManage={canManage}
        onUpdated={onRefresh}
      />
    </div>
  );
}

function DetailCard({
  title, total, items, color,
}: {
  title: string;
  total: number;
  items: Array<{ name: string; amount: number }>;
  color: 'rose' | 'emerald';
}) {
  const text = color === 'rose' ? 'text-rose-600' : 'text-emerald-600';
  const bg = color === 'rose' ? 'bg-rose-50' : 'bg-emerald-50';
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
          <Scale className={`w-4 h-4 ${text}`} />
        </div>
        <span className={`text-xs font-bold uppercase ${text}`}>{title}</span>
      </div>
      <div className={`text-xl font-black mb-3 ${text}`}>{formatRupiah(total)}</div>
      <div className="space-y-1">
        {items.length === 0 ? (
          <p className="text-xs text-slate-400">Tidak ada item.</p>
        ) : items.map((h, i) => (
          <div key={i} className="flex justify-between text-xs py-1.5 border-b border-slate-50 last:border-0">
            <span className="text-slate-600 truncate pr-2">{h.name}</span>
            <span className={`font-bold shrink-0 ${text}`}>{formatRupiah(h.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
