import { useState } from 'react';
import {
  Wallet, CreditCard, TrendingUp, Receipt, FileCheck, Info, Lock,
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
import ProjectCloseFinanceWizard from '../../finance-v2/ProjectCloseFinanceWizard';
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
  const [closeWizardOpen, setCloseWizardOpen] = useState(false);
  const p = normalized.project;
  const hutang = p.budget.hutang || 0;
  const piutang = p.budget.piutang || 0;
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
    {
      label: 'Dana Masuk',
      value: normalized.totalPemasukan,
      icon: 'card' as const,
    },
    {
      label: 'Hutang Vendor',
      value: hutang,
      icon: 'receipt' as const,
      valueClass: hutang > 0 ? 'text-rose-600' : 'text-slate-800',
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
      {canManage && project.finance_status !== 'finance_closed'
        && (project.status === 'completed' || normalized.totalPemasukan > 0) && (
        <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <Lock className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-violet-900 text-sm">Siap tutup keuangan?</p>
              <p className="text-xs text-violet-700 mt-0.5">
                Transfer sisa kas ke Kas Bisnis dan catat laba (basis kas) ke neraca organisasi.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCloseWizardOpen(true)}
            className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700"
          >
            Tutup Keuangan
          </button>
        </div>
      )}

      {project.finance_status === 'finance_closed' && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-600 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Keuangan proyek sudah ditutup.
          {project.final_profit != null && (
            <span className="font-bold text-emerald-700">Laba: {formatRupiah(project.final_profit)}</span>
          )}
        </div>
      )}

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

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        />
        <StatCard
          label="Piutang"
          value={formatRupiah(piutang)}
          icon={FileCheck}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          onClick={() => setPopup('piutang')}
        />
      </div>

      <NeracaGrid
        title="Neraca Project"
        aktivaTitle="Aktiva (Penggunaan)"
        pasivaTitle="Pasiva (Sumber)"
        totalAktivaLabel="TOTAL AKTIVA"
        totalPasivaLabel="TOTAL PASIVA"
        aktivaRows={aktivaRows}
        pasivaRows={pasivaRows}
        totalAktiva={normalized.totalAktiva}
        totalPasiva={normalized.totalPasiva}
        balanceBadge={balanceBadge}
        footer={(
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              Balance: Realisasi + Saldo + Piutang = Dana Masuk + Hutang
            </span>
            <span className="font-bold text-emerald-600">
              Est. Laba: {formatRupiah(normalized.estLaba)}
            </span>
          </div>
        )}
      />

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
                : popup === 'hutang' && canManage
                  ? [
                      {
                        label: 'Tambah Hutang',
                        variant: 'primary' as const,
                        onClick: () => { setPopup(null); setModal('hutang'); },
                      },
                      {
                        label: 'Bayar Hutang',
                        onClick: () => { setPopup(null); setModal('hutang'); },
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

      <ProjectCloseFinanceWizard
        open={closeWizardOpen}
        onClose={() => setCloseWizardOpen(false)}
        orgId={orgId}
        projectId={project.id}
        userId={userId}
        onSuccess={onRefresh}
      />
    </div>
  );
}
