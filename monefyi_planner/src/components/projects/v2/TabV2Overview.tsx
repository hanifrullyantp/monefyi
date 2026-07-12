import { useMemo, useState } from 'react';
import {
  Calendar, Wallet, Package, HardHat, FileCheck, ListChecks,
  Filter, ArrowUpDown, Plus, Pencil,
} from 'lucide-react';
import type { NormalizedProjectView } from '../../../lib/migration/project-normalize';
import { formatRupiah, formatDateId } from '../../../utils/projectUi';
import CardPopup, { type PopupCard, type PopupListItem } from '../../migration/CardPopup';
import WorkItemRow from '../../sandbox-ui/WorkItemRow';
import TransactionList from '../../sandbox-ui/TransactionList';
import BottomActionBar from '../../sandbox-ui/BottomActionBar';
import ProjectTransactionModals, { type ModalKind } from './ProjectTransactionModals';
import type { Project } from '../../../store/appStore';

type PopupKind = 'bahan' | 'tukang' | 'piutang' | null;
type SortKey = 'name' | 'status' | 'qty';

type Props = {
  normalized: NormalizedProjectView;
  project: Project;
  orgId: string;
  userId: string;
  canManage?: boolean;
  onRefresh: () => void | Promise<void>;
  onSwitchTab?: (tab: 'keuangan' | 'rap') => void;
};

export default function TabV2Overview({
  normalized, project, orgId, userId, canManage = true, onRefresh, onSwitchTab,
}: Props) {
  const [popup, setPopup] = useState<PopupKind>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'over' | 'pending'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [modal, setModal] = useState<ModalKind>(null);

  const p = normalized.project;
  const realisasiPct = Math.min(
    p.contractValue > 0 ? (normalized.totalRealisasi / p.contractValue) * 100 : 0,
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

  const popupConfig = buildPopupConfig(popup, normalized, p);

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
        <div className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4">
          {formatRupiah(p.contractValue)}
        </div>
        <div className="h-7 bg-slate-100 rounded-lg overflow-hidden relative">
          <div
            className="h-full bg-rose-500 rounded-lg flex items-center justify-center text-white text-xs font-bold min-w-[5rem] transition-all"
            style={{ width: `${Math.max(realisasiPct, realisasiPct > 0 ? 18 : 0)}%` }}
          >
            {normalized.totalRealisasi > 0 && formatRupiah(normalized.totalRealisasi)}
          </div>
        </div>
        <p className="text-center text-sm text-slate-500 mt-2">
          Sisa: {formatRupiah(normalized.sisaKontrak)}
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
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
              item={{ ...row.item, checked: checked[row.idx] ?? row.item.checked }}
              onToggleCheck={() => setChecked(c => ({ ...c, [row.idx]: !c[row.idx] }))}
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
          { label: 'Edit Project', icon: <Pencil className="w-4 h-4" />, onClick: () => onSwitchTab?.('rap') },
          { label: 'Tambah Transaksi', icon: <Plus className="w-4 h-4" />, onClick: () => setModal('income'), variant: 'primary' },
        ]}
      />

      {popupConfig && (
        <CardPopup open={popup !== null} onClose={() => setPopup(null)} title={popupConfig.title}
          cards={popupConfig.cards} list={popupConfig.list} detailLabel="Buka Detail"
          onOpenDetail={() => onSwitchTab?.(popupConfig.detailTab)} />
      )}

      <ProjectTransactionModals open={modal !== null} kind={modal} onClose={() => setModal(null)}
        project={project} orgId={orgId} userId={userId} canManage={canManage} onUpdated={onRefresh} />
    </div>
  );
}

function buildPopupConfig(
  kind: PopupKind, _normalized: NormalizedProjectView, p: NormalizedProjectView['project'],
): { title: string; cards: PopupCard[]; list: PopupListItem[]; detailTab: 'rap' | 'keuangan' } | null {
  if (!kind) return null;
  if (kind === 'bahan') {
    const mats = p.rap.materials;
    return {
      title: 'Material / Bahan', detailTab: 'rap',
      cards: [
        { value: `${mats.length} item`, label: 'Jumlah Item' },
        { value: formatRupiah(p.budget.bahan.actual), label: 'Total Nominal' },
        { value: `${new Set(mats.map(m => m.vendor).filter(Boolean)).size} vendor`, label: 'Vendor' },
      ],
      list: mats.map(m => ({
        title: m.name, meta: `${m.qtyActual} ${m.unit} × ${formatRupiah(m.unitPrice)}`,
        value: formatRupiah(m.total), valueColor: m.status === 'over' ? '#e11d48' : undefined,
      })),
    };
  }
  if (kind === 'tukang') {
    const workers = p.rap.workers;
    return {
      title: 'Tenaga Kerja', detailTab: 'rap',
      cards: [
        { value: `${workers.length} tukang`, label: 'Jumlah Tenaga' },
        { value: formatRupiah(p.budget.tukang.actual), label: 'Total Upah' },
        { value: `${workers.reduce((s, w) => s + w.qtyActual, 0)} hari`, label: 'Total Hari' },
      ],
      list: workers.map(w => ({
        title: w.name, meta: `${w.qtyActual} hari × ${formatRupiah(w.unitPrice)}`, value: formatRupiah(w.total),
      })),
    };
  }
  const piutangItems = p.hutangPiutang.filter(h => h.type === 'piutang');
  return {
    title: 'Piutang Project', detailTab: 'keuangan',
    cards: [
      { value: `${piutangItems.length} item`, label: 'Jumlah Piutang' },
      { value: formatRupiah(p.budget.piutang), label: 'Total Piutang' },
      { value: 'Belum Ditagih', label: 'Status' },
    ],
    list: piutangItems.map(item => ({
      title: item.name, meta: `Jatuh tempo: ${formatDateId(item.due)}`,
      value: formatRupiah(item.amount), valueColor: '#059669',
    })),
  };
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
