import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileSignature, Calculator, Wallet, TrendingUp, AlertTriangle, CheckCircle2,
  Package, HardHat, Search, Filter, CheckSquare, Table2,
} from 'lucide-react';
import RapEditableTable from '../RapEditableTable';
import type { RapItem } from '../../../services/rapService';
import type { RapActualAgg } from '../../../services/costService';
import { setRapItemRealization } from '../../../services/costService';
import { loadMaterials } from '../../../services/rpp/materialService';
import { useAppStore } from '../../../store/appStore';
import { useUiStore } from '../../../store/uiStore';
import type { NormalizedProjectView } from '../../../lib/migration/project-normalize';
import type { MappedRapItem } from '../../../lib/migration/planner-mapper';
import { formatRupiah } from '../../../utils/projectUi';
import WorkItemRow from '../../sandbox-ui/WorkItemRow';
import StatCard from '../../sandbox-ui/StatCard';
type Props = {
  projectId: string;
  normalized: NormalizedProjectView;
  rapItems: RapItem[];
  rapActuals: Record<string, RapActualAgg>;
  onRefresh: () => Promise<void>;
  userId: string;
};

type RapViewMode = 'checklist' | 'excel';
type ColumnTab = 'semua' | 'material' | 'tenaga';
type StatusFilter = 'all' | 'pending' | 'ok' | 'over' | 'realized';

function filterItems(items: MappedRapItem[], search: string, status: StatusFilter): MappedRapItem[] {
  const q = search.trim().toLowerCase();
  return items.filter(item => {
    const isRealized = item.qtyActual > 0 || item.checked;
    if (status === 'pending' && isRealized) return false;
    if (status === 'ok' && item.status !== 'ok') return false;
    if (status === 'over' && item.status !== 'over') return false;
    if (status === 'realized' && !isRealized) return false;
    if (q && !item.name.toLowerCase().includes(q) && !item.vendor.toLowerCase().includes(q)) return false;
    return true;
  });
}

type ColumnPanelProps = {
  title: string;
  icon: typeof Package;
  items: MappedRapItem[];
  totalRap: number;
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
  onToggle: (item: MappedRapItem) => void;
  toggleBusy: string | null;
  canManage: boolean;
};

function RapColumnPanel({
  title, icon: Icon, items, totalRap, search, onSearchChange,
  statusFilter, onStatusFilterChange, onToggle, toggleBusy, canManage,
}: ColumnPanelProps) {
  const filtered = useMemo(() => filterItems(items, search, statusFilter), [items, search, statusFilter]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-0">
      <div className="px-4 py-3 border-b bg-slate-50/80">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Icon className="w-5 h-5 text-slate-500" />
            {title}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-xl border border-slate-100 px-3 py-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Total RAP</div>
            <div className="text-sm font-black text-slate-800">{formatRupiah(totalRap)}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 px-3 py-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Jumlah Item</div>
            <div className="text-sm font-black text-slate-800">{items.length} item</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b bg-white">
        <div className="relative flex-1 min-w-[120px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Cari item..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg"
          />
        </div>
        <div className="relative">
          <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={e => onStatusFilterChange(e.target.value as StatusFilter)}
            className="pl-8 pr-6 py-1.5 text-xs border border-slate-200 rounded-lg appearance-none bg-white"
          >
            <option value="all">Semua</option>
            <option value="pending">Belum realisasi</option>
            <option value="realized">Sudah realisasi</option>
            <option value="ok">OK</option>
            <option value="over">Over budget</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[min(55vh,480px)]">
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">Tidak ada item cocok filter.</p>
        ) : (
          filtered.map((item, idx) => (
            <WorkItemRow
              key={item.plannerId || `${title}-${idx}`}
              item={item}
              showMenu={false}
              onToggleCheck={canManage && item.plannerId && toggleBusy !== item.plannerId
                ? () => onToggle(item)
                : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function TabV2Rap({
  projectId, normalized, rapItems, rapActuals, onRefresh, userId,
}: Props) {
  const { tenant } = useAppStore();
  const showToast = useUiStore(s => s.showToast);
  const [materialSuggestions, setMaterialSuggestions] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<RapViewMode>('checklist');
  const [columnTab, setColumnTab] = useState<ColumnTab>('semua');
  const [materialSearch, setMaterialSearch] = useState('');
  const [tenagaSearch, setTenagaSearch] = useState('');
  const [materialFilter, setMaterialFilter] = useState<StatusFilter>('all');
  const [tenagaFilter, setTenagaFilter] = useState<StatusFilter>('all');
  const [toggleBusy, setToggleBusy] = useState<string | null>(null);

  const p = normalized.project;

  useEffect(() => {
    if (!tenant?.id) return;
    loadMaterials(tenant.id)
      .then(rows => setMaterialSuggestions(rows.map(r => r.name)))
      .catch(() => setMaterialSuggestions([]));
  }, [tenant?.id]);

  const rapByPlannerId = useMemo(() => {
    const m = new Map<string, RapItem>();
    for (const r of rapItems) m.set(r.id, r);
    return m;
  }, [rapItems]);

  const handleToggleRealization = useCallback(async (item: MappedRapItem) => {
    const rapId = item.plannerId;
    if (!rapId || !userId) return;
    const row = rapByPlannerId.get(rapId);
    if (!row) return;
    const isRealized = item.qtyActual > 0 || item.checked;
    setToggleBusy(rapId);
    try {
      await setRapItemRealization({
        projectId,
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
  }, [projectId, rapByPlannerId, userId, onRefresh, showToast]);

  const rapPct = p.contractValue > 0 ? ((p.rap.totalRAP / p.contractValue) * 100) : 0;
  const realisasiPct = p.contractValue > 0 ? ((p.rap.realisasi / p.contractValue) * 100) : 0;
  const overBudget = realisasiPct > rapPct;

  const materialTotal = p.rap.materials.reduce((s, i) => s + i.rapTotal, 0);
  const tenagaTotal = p.rap.workers.reduce((s, i) => s + i.rapTotal, 0);

  const showMaterial = columnTab === 'semua' || columnTab === 'material';
  const showTenaga = columnTab === 'semua' || columnTab === 'tenaga';

  const filteredRapItems = useMemo(() => {
    if (columnTab === 'material') return rapItems.filter(r => r.type === 'material');
    if (columnTab === 'tenaga') return rapItems.filter(r => r.type === 'labor');
    return rapItems;
  }, [rapItems, columnTab]);

  return (
    <div className="space-y-5 pb-20">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Nilai Kontrak" value={formatRupiah(p.contractValue)} icon={FileSignature}
          iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard label="Total RAP" value={formatRupiah(p.rap.totalRAP)} icon={Calculator}
          iconBg="bg-slate-50" iconColor="text-slate-600" />
        <StatCard label="Realisasi" value={formatRupiah(p.rap.realisasi)} icon={Wallet}
          iconBg="bg-rose-50" iconColor="text-rose-600" />
        <StatCard label="Est. Laba" value={formatRupiah(p.rap.estLaba)} icon={TrendingUp}
          iconBg="bg-emerald-50" iconColor="text-emerald-600" barVariant="success" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex justify-between text-xs font-bold mb-2">
          <span className="text-blue-600">RAP {rapPct.toFixed(0)}%</span>
          <span className="text-rose-600">Realisasi {realisasiPct.toFixed(0)}%</span>
        </div>
        <div className="relative h-5 bg-slate-100 rounded-full overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-blue-200 border-2 border-blue-500 rounded-full"
            style={{ width: `${Math.min(rapPct, 100)}%` }} />
          <div className="absolute inset-y-0 left-0 bg-rose-500 rounded-full"
            style={{ width: `${Math.min(realisasiPct, 100)}%` }} />
        </div>
        <div className={`flex items-center gap-2 mt-3 px-3 py-2 rounded-xl text-sm font-semibold ${
          overBudget ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
        }`}>
          {overBudget ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {overBudget
            ? `Realisasi melebihi RAP ${(realisasiPct - rapPct).toFixed(0)}%`
            : 'Realisasi masih dalam batas RAP'}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            title="Checklist realisasi"
            onClick={() => setViewMode('checklist')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold ${
              viewMode === 'checklist' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            <CheckSquare className="w-4 h-4" /> Checklist
          </button>
          <button
            type="button"
            title="Tabel spreadsheet"
            onClick={() => setViewMode('excel')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold ${
              viewMode === 'excel' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Table2 className="w-4 h-4" /> Excel
          </button>
        </div>

        <div className="flex bg-white border border-slate-200 p-1 rounded-xl">
          {([
            { id: 'semua' as const, label: 'Semua' },
            { id: 'material' as const, label: 'Material' },
            { id: 'tenaga' as const, label: 'Tenaga' },
          ]).map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setColumnTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                columnTab === t.id ? 'bg-emerald-600 text-white' : 'text-slate-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'checklist' ? (
        <div className={`grid gap-4 ${
          columnTab === 'semua' ? 'md:grid-cols-2' : 'grid-cols-1'
        }`}>
          {showMaterial && (
            <RapColumnPanel
              title="Material"
              icon={Package}
              items={p.rap.materials}
              totalRap={materialTotal}
              search={materialSearch}
              onSearchChange={setMaterialSearch}
              statusFilter={materialFilter}
              onStatusFilterChange={setMaterialFilter}
              onToggle={handleToggleRealization}
              toggleBusy={toggleBusy}
              canManage={Boolean(userId)}
            />
          )}
          {showTenaga && (
            <RapColumnPanel
              title="Tenaga Kerja"
              icon={HardHat}
              items={p.rap.workers}
              totalRap={tenagaTotal}
              search={tenagaSearch}
              onSearchChange={setTenagaSearch}
              statusFilter={tenagaFilter}
              onStatusFilterChange={setTenagaFilter}
              onToggle={handleToggleRealization}
              toggleBusy={toggleBusy}
              canManage={Boolean(userId)}
            />
          )}
        </div>
      ) : (
        <>
          {columnTab !== 'semua' && (
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <div className="bg-white rounded-xl border border-slate-100 px-4 py-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase">
                  Total {columnTab === 'material' ? 'Material' : 'Tenaga'}
                </div>
                <div className="text-lg font-black text-slate-800">
                  {formatRupiah(columnTab === 'material' ? materialTotal : tenagaTotal)}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 px-4 py-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Jumlah Item</div>
                <div className="text-lg font-black text-slate-800">
                  {filteredRapItems.length} item
                </div>
              </div>
            </div>
          )}
          <RapEditableTable
          projectId={projectId}
          items={filteredRapItems}
          rapActuals={rapActuals}
          mode="realisasi"
          canManage
          recordedBy={userId}
          onRefresh={onRefresh}
          materialSuggestions={materialSuggestions}
          showFloatingToolbar
        />
        </>
      )}
    </div>
  );
}
