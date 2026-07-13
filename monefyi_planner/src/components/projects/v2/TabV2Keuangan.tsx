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
import CardPopup from '../../migration/CardPopup';
import ProjectTransactionModals, { type ModalKind } from './ProjectTransactionModals';
import { buildProjectPopupConfig, type ProjectPopupKind } from './project-popup-config';

type Props = {
  normalized: NormalizedProjectView;
  balanceCheck: BalanceCheckResult;
  onOpenDiagnosis: () => void;
  project: Project;
  orgId: string;
  userId: string;
  canManage: boolean;
  onRefresh: () => void | Promise<void>;
  onEditProject?: () => void;
};

export default function TabV2Keuangan({
  normalized, balanceCheck, onOpenDiagnosis, project, orgId, userId, canManage, onRefresh, onEditProject,
}: Props) {
  const [modal, setModal] = useState<ModalKind>(null);
  const [popup, setPopup] = useState<ProjectPopupKind | null>(null);
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
    {
      label: 'Saldo Kas',
      value: p.saldo,
      icon: 'wallet' as const,
      valueClass: p.saldo < 0 ? 'text-rose-600' : 'text-slate-800',
    },
  ];

  const pasivaRows = [
    ...p.payments.map(pay => ({
      label: pay.name,
      value: pay.amount,
      icon: 'card' as const,
    })),
    {
      label: `Piutang (${p.client})`,
      value: p.budget.piutang,
      icon: 'file' as const,
      valueClass: 'text-emerald-600',
    },
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

  const popupConfig = buildProjectPopupConfig(popup, normalized);

  return (
    <div className="space-y-5 pb-4">
      <button
        type="button"
        onClick={() => setPopup('saldo')}
        className="w-full bg-white rounded-2xl border border-slate-100 p-6 shadow-sm text-left hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-2 text-sm font-bold text-slate-600 mb-3">
          <Wallet className="w-5 h-5 text-emerald-600" />
          Saldo Project
        </div>
        <div className={`text-4xl font-black tracking-tight mb-4 ${p.saldo < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
          {formatRupiah(p.saldo)}
        </div>
        {p.saldo < 0 && (
          <p className="text-xs text-rose-600 mb-2 font-semibold">
            Defisit kas — realisasi melebihi dana masuk ({formatRupiah(hutang)} hutang)
          </p>
        )}
        <ProgressBarLg
          value={pemasukanPct}
          label={normalized.totalPemasukan > 0 ? formatRupiah(normalized.totalPemasukan) : undefined}
          variant="orange"
        />
        <p className="text-center text-sm text-slate-500 mt-2">
          Sisa Pembayaran: {formatRupiah(normalized.sisaPembayaran)}
        </p>
      </button>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard
          label="Pembayaran"
          value={formatRupiah(normalized.totalPemasukan)}
          icon={CreditCard}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          onClick={() => setPopup('pembayaran')}
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
          onClick={() => setPopup('laba')}
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
          onClick={() => setPopup('hutang')}
          badge={
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-600">
              {normalized.hutangItems.length} pihak
            </span>
          }
        />
      </div>

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
              Balance: Realisasi + Saldo + Piutang = Dana Masuk + Piutang
              {hutang > 0 && ' · Hutang tercermin di saldo negatif'}
            </span>
            <span className="font-bold text-emerald-600">
              Est. Laba: {formatRupiah(normalized.estLaba)}
            </span>
          </div>
        )}
      />

      <div className="grid md:grid-cols-2 gap-4">
        <DetailCard
          title="Hutang"
          subtitle="Kepada (vendor / pinjaman)"
          total={hutang}
          items={normalized.hutangItems}
          color="rose"
          onClick={() => setPopup('hutang')}
        />
        <DetailCard
          title="Piutang"
          subtitle={`Dari ${p.client || 'klien'}`}
          total={p.budget.piutang}
          items={
            normalized.piutangItems.length > 0
              ? normalized.piutangItems
              : p.budget.piutang > 0
                ? [{
                    name: `Piutang ${p.client || 'Klien'}`,
                    partyName: p.client || 'Klien',
                    amount: p.budget.piutang,
                  }]
                : []
          }
          color="emerald"
          onClick={() => setPopup('piutang')}
        />
      </div>

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
          { label: 'Edit Project', onClick: () => onEditProject?.() },
          { label: 'Tambah Transaksi', icon: <Plus className="w-4 h-4" />, onClick: () => setModal('income') },
          { label: 'Transfer', icon: <ArrowLeftRight className="w-4 h-4" />, onClick: () => setModal('transfer'), variant: 'primary' },
        ]}
      />

      {popupConfig && (
        <CardPopup
          open={popup !== null}
          onClose={() => setPopup(null)}
          title={popupConfig.title}
          cards={popupConfig.cards}
          list={popupConfig.list}
          detailLabel="Buka Detail"
          onOpenDetail={() => popupConfig.detailTab && setPopup(null)}
          actions={
            popup === 'pembayaran' && canManage
              ? [{
                  label: 'Tambah Pembayaran',
                  variant: 'primary' as const,
                  onClick: () => { setPopup(null); setModal('income'); },
                }]
              : popup === 'piutang' && canManage
                ? [
                    {
                      label: 'Tambah Piutang',
                      variant: 'primary' as const,
                      onClick: () => { setPopup(null); setModal('receivable'); },
                    },
                    {
                      label: 'Catat Pembayaran',
                      onClick: () => { setPopup(null); setModal('receivable'); },
                    },
                  ]
                : undefined
          }
        />
      )}

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
  title, subtitle, total, items, color, onClick,
}: {
  title: string;
  subtitle: string;
  total: number;
  items: Array<{ name: string; partyName?: string; amount: number }>;
  color: 'rose' | 'emerald';
  onClick?: () => void;
}) {
  const text = color === 'rose' ? 'text-rose-600' : 'text-emerald-600';
  const bg = color === 'rose' ? 'bg-rose-50' : 'bg-emerald-50';
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-100 p-4 shadow-sm text-left w-full ${
        onClick ? 'hover:shadow-md transition-shadow cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
          <Scale className={`w-4 h-4 ${text}`} />
        </div>
        <div>
          <span className={`text-xs font-bold uppercase ${text}`}>{title}</span>
          <div className="text-[10px] text-slate-400">{subtitle}</div>
        </div>
      </div>
      <div className={`text-xl font-black mb-3 ${text}`}>{formatRupiah(total)}</div>
      <div className="space-y-1">
        {items.length === 0 ? (
          <p className="text-xs text-slate-400">Tidak ada item.</p>
        ) : items.map((h, i) => (
          <div key={i} className="flex justify-between text-xs py-1.5 border-b border-slate-50 last:border-0">
            <span className="text-slate-600 truncate pr-2">
              {h.partyName ? `${h.partyName}` : h.name}
            </span>
            <span className={`font-bold shrink-0 ${text}`}>{formatRupiah(h.amount)}</span>
          </div>
        ))}
      </div>
    </Wrapper>
  );
}
