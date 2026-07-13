import { useCallback, useMemo, useState } from 'react';
import {
  Calendar, Wallet, Package, HardHat, FileCheck, ListChecks,
  Filter, ArrowUpDown, Plus, Pencil,
} from 'lucide-react';
import type { NormalizedProjectView } from '../../../lib/migration/project-normalize';
import type { MappedRapItem } from '../../../lib/migration/planner-mapper';
import type { RapItem } from '../../../services/rapService';
import { setRapItemRealization } from '../../../services/costService';
import { formatRupiah, formatDateId } from '../../../utils/projectUi';
import { useUiStore } from '../../../store/uiStore';
import CardPopup from '../../migration/CardPopup';
import WorkItemRow from '../../sandbox-ui/WorkItemRow';
import TransactionList from '../../sandbox-ui/TransactionList';
import BottomActionBar from '../../sandbox-ui/BottomActionBar';
import ProjectTransactionModals, { type ModalKind } from './ProjectTransactionModals';
import { buildProjectPopupConfig, type ProjectPopupKind } from './project-popup-config';
import type { Project } from '../../../store/appStore';

type PopupKind = ProjectPopupKind;
type SortKey = 'name' | 'status' | 'qty';

type Props = {
  normalized: NormalizedProjectView;
  project: Project;
  orgId: string;
  userId: string;
  rapItems: RapItem[];
  canManage?: boolean;
  onRefresh: () => void | Promise<void>;
  onSwitchTab?: (tab: 'keuangan' | 'rap') => void;
  onEditProject?: () => void;
};

export default function TabV2Overview({
  normalized, project, orgId, userId, rapItems, canManage = true, onRefresh, onSwitchTab, onEditProject,
}: Props) {
  const showToast = useUiStore(s => s.showToast);
  const [popup, setPopup] = useState<PopupKind>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'over' | 'pending'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [toggleBusy, setToggleBusy] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);

  const rapByPlannerId = useMemo(() => {
    const m = new Map<string, RapItem>();
    for (const r of rapItems) m.set(r.id, r);
    return m;
  }, [rapItems]);

  const handleToggleRealization = useCallback(async (item: MappedRapItem) => {
    const rapId = item.plannerId;
    if (!rapId || !userId || !canManage) return;
    const row = rapByPlannerId.get(rapId);
    if (!row) return;
    const isRealized = item.qtyActual > 0 || item.checked;
    setToggleBusy(rapId);
    try {
      await setRapItemRealization({
        projectId: project.id,
        rapItemId: rapId,
        rapItemName: row.name,
        plannedQty: Number(row.quantity) || 0,
        plannedUnitPrice: Number(row.unit_price) || 0,
        realized: !isRealized,
        recordedBy: userId,
      });
      await onRefresh();
      showToast(!isRealized ? 'Item ditandai realisasi' : 'Realisasi dihapus', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal mengubah realisasi', 'error');
    } finally {
      setToggleBusy(null);
    }
  }, [project.id, rapByPlannerId, userId, canManage, onRefresh, showToast]);

  const p = normalized.project;
  const totalRap = p.rap?.totalRAP || 0;
  const nilaiProyek = normalized.totalAktiva;
  const realisasiPct = Math.min(
    nilaiProyek > 0 ? (normalized.totalRealisasi / nilaiProyek) * 100 : 0,
    100,
  );
  const bahanPlan = p.budget.bahan.plan || 1;
  const tukangPlan = p.budget.tukang.plan || 1;
  const bahanPct = Math.min((p.budget.bahan.actual / bahanPlan) * 100, 100);
  const tukangPct = Math.min((p.budget.tukang.actual / tukangPlan) * 100, 100);

  const workItems = useMemo(() => {
    let rows = [...normalized.workItems];
    if (statusFilter !== 'all') {
      rows = rows.filter(r => r.item.status === statusFilter);
    }
    rows.sort((a, b) => {
      if (sortKey === 'qty') return b.item.qtyActual - a.item.qtyActual;
      if (sortKey === 'status') return a.item.status.localeCompare(b.item.status);
      return a.item.name.localeCompare(b.item.name);
    });
    return rows;
  }, [normalized.workItems, statusFilter, sortKey]);

  const popupConfig = buildProjectPopupConfig(popup, normalized);

  return (
    <div className="space-y-5 pb-4">
      <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">{p.name}</h3>
            <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
              <Calendar className="w-4 h-4" />
              {formatDateId(p.startDate)} – {formatDateId(p.endDate)} ({p.duration} hari)
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSwitchTab?.('keuangan')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm font-bold border border-emerald-100 hover:bg-emerald-100 transition-colors shrink-0"
          >
            <Wallet className="w-4 h-4" />
            Saldo: {formatRupiah(p.saldo)}
          </button>
        </div>
        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Total Nilai Proyek</p>
        <div className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">
          {formatRupiah(nilaiProyek)}
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Realisasi {formatRupiah(normalized.totalRealisasi)}
          {' + '}Saldo {formatRupiah(p.saldo)}
          {' + '}Piutang {formatRupiah(p.budget.piutang)}
        </p>
        <div className="h-7 bg-slate-100 rounded-lg overflow-hidden relative">
          <div
            className="h-full bg-rose-500 rounded-lg flex items-center justify-center text-white text-xs font-bold min-w-[5rem] transition-all"
            style={{ width: `${Math.max(realisasiPct, realisasiPct > 0 ? 18 : 0)}%` }}
          >
            {normalized.totalRealisasi > 0 && formatRupiah(normalized.totalRealisasi)}
          </div>
        </div>
        <p className="text-center text-sm text-slate-500 mt-2">
          Total RAP: {formatRupiah(totalRap)} · Sisa RAP: {formatRupiah(Math.max(0, totalRap - normalized.totalRealisasi))}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <BudgetCard label="Bahan" icon={Package} iconBg="bg-rose-50" iconColor="text-rose-600"
          plan={p.budget.bahan.plan} actual={p.budget.bahan.actual} pct={bahanPct}
          sisa={p.budget.bahan.plan - p.budget.bahan.actual} barColor="bg-rose-500" onClick={() => setPopup('bahan')} />
        <BudgetCard label="Tukang" icon={HardHat} iconBg="bg-emerald-50" iconColor="text-emerald-600"
          plan={p.budget.tukang.plan} actual={p.budget.tukang.actual} pct={tukangPct}
          sisa={p.budget.tukang.plan - p.budget.tukang.actual} barColor="bg-emerald-500" onClick={() => setPopup('tukang')} />
        <button type="button" onClick={() => setPopup('piutang')}
          className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm text-left hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <FileCheck className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Piutang</span>
          </div>
          <div className="text-xl font-black text-slate-900 mb-2">{formatRupiah(p.budget.piutang)}</div>
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-rose-50 text-rose-600">
            Belum Ditagih
          </span>
        </button>
        <button type="button" onClick={() => setPopup('saldo')}
          className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm text-left hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${p.saldo < 0 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
              <Wallet className={`w-4 h-4 ${p.saldo < 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Cash / Kas</span>
          </div>
          <div className={`text-xl font-black mb-2 ${p.saldo < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {formatRupiah(p.saldo)}
          </div>
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
            p.saldo < 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
          }`}>
            {p.saldo < 0 ? 'Defisit' : 'Tersedia'}
          </span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <ListChecks className="w-5 h-5 text-slate-500" />
            Item Pekerjaan
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {normalized.checkedCount}/{normalized.totalWorkItems} terealisasi
            </span>
          </div>
          <div className="flex gap-1 relative">
            <button type="button" onClick={() => setFilterOpen(!filterOpen)} className="p-2 hover:bg-slate-100 rounded-lg" title="Filter">
              <Filter className="w-4 h-4 text-slate-500" />
            </button>
            <button type="button" onClick={() => setSortKey(k => k === 'name' ? 'qty' : k === 'qty' ? 'status' : 'name')} className="p-2 hover:bg-slate-100 rounded-lg" title="Sort">
              <ArrowUpDown className="w-4 h-4 text-slate-500" />
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-10 z-10 bg-white border rounded-xl shadow-lg p-2 text-xs space-y-1 min-w-[8rem]">
                {(['all', 'ok', 'over', 'pending'] as const).map(s => (
                  <button key={s} type="button" onClick={() => { setStatusFilter(s); setFilterOpen(false); }}
                    className={`block w-full text-left px-3 py-1.5 rounded-lg ${statusFilter === s ? 'bg-emerald-50 text-emerald-700 font-bold' : 'hover:bg-slate-50'}`}>
                    {s === 'all' ? 'Semua' : s === 'ok' ? 'OK' : s === 'over' ? 'Over' : 'Pending'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          {workItems.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">Belum ada item RAP.</p>
          ) : workItems.map(row => (
            <WorkItemRow
              key={`${row.kind}-${row.idx}`}
              item={row.item}
              onToggleCheck={
                canManage && row.item.plannerId && toggleBusy !== row.item.plannerId
                  ? () => void handleToggleRealization(row.item)
                  : undefined
              }
            />
          ))}
        </div>
      </div>

      <TransactionList
        transactions={normalized.allTransactions.slice(0, 8).map(tx => ({
          id: tx.id, type: tx.type, name: tx.name, amount: tx.amount, date: tx.date,
          time: 'time' in tx ? tx.time : undefined,
        }))}
        onViewAll={() => onSwitchTab?.('keuangan')}
      />

      <BottomActionBar
        actions={[
          { label: 'Edit Project', icon: <Pencil className="w-4 h-4" />, onClick: () => onEditProject?.() },
          { label: 'Tambah Transaksi', icon: <Plus className="w-4 h-4" />, onClick: () => setModal('income'), variant: 'primary' },
        ]}
      />

      {popupConfig && (
        <CardPopup open={popup !== null} onClose={() => setPopup(null)} title={popupConfig.title}
          cards={popupConfig.cards} list={popupConfig.list} detailLabel="Buka Detail"
          onOpenDetail={() => popupConfig.detailTab && onSwitchTab?.(popupConfig.detailTab)}
          actions={
            popup === 'pembayaran' && canManage
              ? [{ label: 'Tambah Pembayaran', variant: 'primary' as const, onClick: () => { setPopup(null); setModal('income'); } }]
                : popup === 'piutang' && canManage
                  ? [
                      { label: 'Tambah Piutang', variant: 'primary' as const, onClick: () => { setPopup(null); setModal('receivable'); } },
                      { label: 'Catat Pembayaran', onClick: () => { setPopup(null); setModal('receivable'); } },
                    ]
                  : popup === 'saldo' && canManage
                    ? [{ label: 'Tambah Dana Masuk', variant: 'primary' as const, onClick: () => { setPopup(null); setModal('income'); } }]
                    : undefined
          } />
      )}

      <ProjectTransactionModals open={modal !== null} kind={modal} onClose={() => setModal(null)}
        project={project} orgId={orgId} userId={userId} canManage={canManage} onUpdated={onRefresh} />
    </div>
  );
}

function BudgetCard({ label, icon: Icon, iconBg, iconColor, plan, actual, pct, sisa, barColor, onClick }: {
  label: string; icon: typeof Package; iconBg: string; iconColor: string;
  plan: number; actual: number; pct: number; sisa: number; barColor: string; onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm text-left hover:shadow-md transition-shadow w-full">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
      </div>
      <div className="text-base font-bold text-slate-900 mb-2">{formatRupiah(plan)}</div>
      <div className="h-5 bg-slate-100 rounded-md overflow-hidden">
        <div className={`h-full ${barColor} rounded-md flex items-center justify-center text-white text-[10px] font-bold min-w-[4rem]`}
          style={{ width: `${Math.max(pct, actual > 0 ? 20 : 0)}%` }}>
          {actual > 0 && formatRupiah(actual)}
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-1.5">Sisa: {formatRupiah(sisa)}</p>
    </button>
  );
}
