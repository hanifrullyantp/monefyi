import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileSignature, Calculator, Wallet, TrendingUp,
  Package, HardHat, Search, Filter, CheckSquare, Table2, Plus,
} from 'lucide-react';
import RapEditableTable from '../RapEditableTable';
import type { RapItem } from '../../../services/rapService';
import type { RapActualAgg } from '../../../services/costService';
import { loadMaterials, upsertMaterialFromRapLine } from '../../../services/rpp/materialService';
import { loadWorkers, upsertWorkerFromRapLine } from '../../../services/rpp/workerService';
import { useAppStore } from '../../../store/appStore';
import { useUiStore } from '../../../store/uiStore';
import type { NormalizedProjectView } from '../../../lib/migration/project-normalize';
import type { MappedRapItem } from '../../../lib/migration/planner-mapper';
import { formatRupiah } from '../../../utils/projectUi';
import {
  groupRapItemsByKeyword, groupRapTotal, applyAllRapDrafts, type RapFieldPatch,
} from '../../../lib/rapItemGrouping';
import { useRapChecklistDraft } from '../../../hooks/useRapChecklistDraft';
import WorkItemRow from '../../sandbox-ui/WorkItemRow';
import StatCard from '../../sandbox-ui/StatCard';
import RapAddItemsModal from './RapAddItemsModal';
import LaborTenagaWizardModal from './labor/wizard/LaborTenagaWizardModal';
import RapItemDetailModal from './RapItemDetailModal';

export type RapDraftControls = {
  changeCount: number;
  hasChanges: boolean;
  saving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  save: () => Promise<void>;
  discard: () => void;
};

type Props = {
  projectId: string;
  normalized: NormalizedProjectView;
  rapItems: RapItem[];
  rapActuals: Record<string, RapActualAgg>;
  onRefresh: () => Promise<void>;
  userId: string;
  onDraftChange?: (controls: RapDraftControls | null) => void;
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
  kind: 'material' | 'labor';
  items: MappedRapItem[];
  totalRap: number;
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
  onToggle: (item: MappedRapItem) => void;
  onFieldEdit: (rapId: string, patch: RapFieldPatch) => void;
  onSaveToDatabase: (item: MappedRapItem) => void;
  isInDatabase: (name: string) => boolean;
  onAddClick: () => void;
  onItemDetail: (item: MappedRapItem) => void;
  onOpenLaborSchedule?: (item: MappedRapItem) => void;
  canManage: boolean;
};

function RapColumnPanel({
  title, icon: Icon, kind, items, totalRap, search, onSearchChange,
  statusFilter, onStatusFilterChange, onToggle, onFieldEdit, onSaveToDatabase,
  isInDatabase, onAddClick, onItemDetail, onOpenLaborSchedule, canManage,
}: ColumnPanelProps) {
  const filtered = useMemo(() => filterItems(items, search, statusFilter), [items, search, statusFilter]);
  const groups = useMemo(() => groupRapItemsByKeyword(filtered), [filtered]);

  return (
    <div className="surface-card flex flex-col min-h-0 max-h-[min(70vh,560px)]">
      <div className="sticky top-0 z-10 shrink-0 rounded-t-[var(--radius-card)] shadow-sm">
        <div className="px-4 py-3 bg-gradient-to-b from-emerald-50/50 to-white/80">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Icon className="w-5 h-5 text-slate-500" />
              {title}
            </div>
            {canManage && (
              <button
                type="button"
                onClick={onAddClick}
                title={`Tambah ${title.toLowerCase()}`}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="surface-inset px-3 py-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Total RAP</div>
              <div className="text-sm font-black text-slate-800">{formatRupiah(totalRap)}</div>
            </div>
            <div className="surface-inset px-3 py-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Jumlah Item</div>
              <div className="text-sm font-black text-slate-800">{items.length} item</div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-4 py-2">
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
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">Tidak ada item cocok filter.</p>
        ) : (
          groups.map(group => (
            <div key={group.key}>
              {group.label && (
                <div className="sticky top-0 z-[5] flex items-center justify-between gap-2 px-4 py-2 bg-emerald-50/70 backdrop-blur rounded-lg mx-2 mt-1 mb-0.5 text-xs font-black text-slate-600 uppercase tracking-wide">
                  <span>
                    {group.label}
                    <span className="ml-2 font-semibold text-slate-400 normal-case">
                      ({group.items.length})
                    </span>
                  </span>
                  <span className="text-slate-700 font-black normal-case shrink-0">
                    {formatRupiah(groupRapTotal(group.items))}
                  </span>
                </div>
              )}
              {group.items.map((item, idx) => (
                <WorkItemRow
                  key={item.plannerId || `${group.key}-${idx}`}
                  item={item}
                  canEdit={canManage}
                  savedToDatabase={isInDatabase(item.name)}
                  onSaveToDatabase={canManage ? () => onSaveToDatabase(item) : undefined}
                  onDoubleClick={() => onItemDetail(item)}
                  onOpenLaborSchedule={kind === 'labor' ? () => onOpenLaborSchedule?.(item) : undefined}
                  onFieldEdit={patch => item.plannerId && onFieldEdit(item.plannerId, patch)}
                  onToggleCheck={canManage && item.plannerId ? () => onToggle(item) : undefined}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function TabV2Rap({
  projectId, normalized, rapItems, rapActuals, onRefresh, userId, onDraftChange,
}: Props) {
  const { tenant, user } = useAppStore();
  const showToast = useUiStore(s => s.showToast);
  const [materialSuggestions, setMaterialSuggestions] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<RapViewMode>('checklist');
  const [columnTab, setColumnTab] = useState<ColumnTab>('semua');
  const [materialSearch, setMaterialSearch] = useState('');
  const [tenagaSearch, setTenagaSearch] = useState('');
  const [materialFilter, setMaterialFilter] = useState<StatusFilter>('all');
  const [tenagaFilter, setTenagaFilter] = useState<StatusFilter>('all');
  const [excelChangeCount, setExcelChangeCount] = useState(0);
  const [excelControls, setExcelControls] = useState<RapDraftControls | null>(null);
  const [dbMaterialNames, setDbMaterialNames] = useState<Set<string>>(new Set());
  const [dbWorkerNames, setDbWorkerNames] = useState<Set<string>>(new Set());
  const [addModal, setAddModal] = useState<'material' | null>(null);
  const [laborModalOpen, setLaborModalOpen] = useState(false);
  const [laborEditItem, setLaborEditItem] = useState<MappedRapItem | null>(null);
  const [detailItem, setDetailItem] = useState<MappedRapItem | null>(null);

  const openLaborModal = useCallback((item?: MappedRapItem | null) => {
    setLaborEditItem(item ?? null);
    setLaborModalOpen(true);
  }, []);

  const p = normalized.project;

  const reloadDbNames = useCallback(async () => {
    if (!tenant?.id) return;
    try {
      const [mats, workers] = await Promise.all([
        loadMaterials(tenant.id),
        loadWorkers(tenant.id),
      ]);
      setMaterialSuggestions(mats.map(r => r.name));
      setDbMaterialNames(new Set(mats.map(r => r.name.trim().toLowerCase())));
      setDbWorkerNames(new Set(workers.map(r => r.name.trim().toLowerCase())));
    } catch {
      setMaterialSuggestions([]);
    }
  }, [tenant?.id]);

  useEffect(() => { void reloadDbNames(); }, [reloadDbNames]);

  const rapByPlannerId = useMemo(() => {
    const m = new Map<string, RapItem>();
    for (const r of rapItems) m.set(r.id, r);
    return m;
  }, [rapItems]);

  const checklistDraft = useRapChecklistDraft({
    projectId,
    userId,
    rapByPlannerId,
    onRefresh,
    onError: msg => showToast(msg, 'error'),
    onSaved: () => showToast('Perubahan RAP disimpan', 'success'),
  });

  const applyDrafts = useCallback((items: MappedRapItem[]) => (
    applyAllRapDrafts(items, checklistDraft.draft, checklistDraft.fieldDraft)
  ), [checklistDraft.draft, checklistDraft.fieldDraft]);

  const materialsWithDraft = useMemo(
    () => applyDrafts(p.rap.materials),
    [p.rap.materials, applyDrafts],
  );
  const workersWithDraft = useMemo(
    () => applyDrafts(p.rap.workers),
    [p.rap.workers, applyDrafts],
  );

  const isMaterialInDb = useCallback(
    (name: string) => dbMaterialNames.has(name.trim().toLowerCase()),
    [dbMaterialNames],
  );
  const isWorkerInDb = useCallback(
    (name: string) => dbWorkerNames.has(name.trim().toLowerCase()),
    [dbWorkerNames],
  );

  const handleSaveToDatabase = useCallback(async (item: MappedRapItem, kind: 'material' | 'labor') => {
    if (!tenant?.id) return;
    try {
      if (kind === 'material') {
        await upsertMaterialFromRapLine(tenant.id, {
          name: item.name,
          unit: item.unit,
          unitPrice: item.unitPrice,
          vendor: item.vendor,
        });
      } else {
        await upsertWorkerFromRapLine(tenant.id, {
          name: item.name,
          unitPrice: item.unitPrice,
        });
      }
      await reloadDbNames();
      showToast(`${item.name} disimpan ke Database Master`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal simpan ke database', 'error');
    }
  }, [tenant?.id, reloadDbNames, showToast]);

  const handleFieldEdit = useCallback((rapId: string, patch: RapFieldPatch) => {
    checklistDraft.patchField(rapId, patch);
  }, [checklistDraft]);

  const notifyDraft = useCallback(() => {
    if (viewMode === 'excel' && excelControls) {
      onDraftChange?.({
        ...excelControls,
        canUndo: true,
        canRedo: true,
      });
      return;
    }
    if (viewMode !== 'checklist') {
      onDraftChange?.(null);
      return;
    }
    onDraftChange?.({
      changeCount: checklistDraft.changeCount,
      hasChanges: checklistDraft.hasChanges,
      saving: checklistDraft.saving,
      canUndo: checklistDraft.canUndo,
      canRedo: checklistDraft.canRedo,
      undo: checklistDraft.undo,
      redo: checklistDraft.redo,
      save: checklistDraft.save,
      discard: checklistDraft.discard,
    });
  }, [viewMode, onDraftChange, checklistDraft, excelControls]);

  useEffect(() => { notifyDraft(); }, [notifyDraft]);

  useEffect(() => () => onDraftChange?.(null), [onDraftChange]);

  const handleToggle = useCallback((item: MappedRapItem) => {
    checklistDraft.toggle(item);
  }, [checklistDraft]);

  const materialTotal = p.rap.materials.reduce((s, i) => s + i.rapTotal, 0);
  const tenagaTotal = p.rap.workers.reduce((s, i) => s + i.rapTotal, 0);

  const showMaterial = columnTab === 'semua' || columnTab === 'material';
  const showTenaga = columnTab === 'semua' || columnTab === 'tenaga';

  const filteredRapItems = useMemo(() => {
    if (columnTab === 'material') return rapItems.filter(r => r.type === 'material');
    if (columnTab === 'tenaga') return rapItems.filter(r => r.type === 'labor');
    return rapItems;
  }, [rapItems, columnTab]);

  const trySwitchView = (next: RapViewMode) => {
    if (viewMode === 'checklist' && checklistDraft.hasChanges) {
      if (!window.confirm('Ada perubahan belum disimpan. Buang perubahan?')) return;
      checklistDraft.discard();
    }
    if (viewMode === 'excel' && excelChangeCount > 0) {
      if (!window.confirm('Ada perubahan Excel belum disimpan. Buang perubahan?')) return;
      excelControls?.discard();
    }
    setViewMode(next);
  };

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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex bg-slate-100/80 p-1 rounded-xl">
          <button
            type="button"
            title="Checklist realisasi"
            onClick={() => trySwitchView('checklist')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold ${
              viewMode === 'checklist' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            <CheckSquare className="w-4 h-4" /> Checklist
          </button>
          <button
            type="button"
            title="Tabel spreadsheet"
            onClick={() => trySwitchView('excel')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold ${
              viewMode === 'excel' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Table2 className="w-4 h-4" /> Excel
          </button>
        </div>

        <div className="flex surface-inset p-1 rounded-xl">
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
              kind="material"
              items={materialsWithDraft}
              totalRap={materialTotal}
              search={materialSearch}
              onSearchChange={setMaterialSearch}
              statusFilter={materialFilter}
              onStatusFilterChange={setMaterialFilter}
              onToggle={handleToggle}
              onFieldEdit={handleFieldEdit}
              onSaveToDatabase={item => void handleSaveToDatabase(item, 'material')}
              isInDatabase={isMaterialInDb}
              onAddClick={() => setAddModal('material')}
              onItemDetail={setDetailItem}
              canManage={Boolean(userId)}
            />
          )}
          {showTenaga && (
            <RapColumnPanel
              title="Tenaga Kerja"
              icon={HardHat}
              kind="labor"
              items={workersWithDraft}
              totalRap={tenagaTotal}
              search={tenagaSearch}
              onSearchChange={setTenagaSearch}
              statusFilter={tenagaFilter}
              onStatusFilterChange={setTenagaFilter}
              onToggle={handleToggle}
              onFieldEdit={handleFieldEdit}
              onSaveToDatabase={item => void handleSaveToDatabase(item, 'labor')}
              isInDatabase={isWorkerInDb}
              onAddClick={() => openLaborModal()}
              onItemDetail={setDetailItem}
              onOpenLaborSchedule={item => openLaborModal(item)}
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
            manualSave
            onPendingChangeCount={setExcelChangeCount}
            onManualControls={ctrl => setExcelControls(ctrl ? {
              changeCount: ctrl.changeCount,
              hasChanges: ctrl.hasChanges,
              saving: ctrl.saving,
              canUndo: true,
              canRedo: true,
              undo: ctrl.undo,
              redo: ctrl.redo,
              save: ctrl.save,
              discard: ctrl.discard,
            } : null)}
          />
        </>
      )}

      {addModal === 'material' && userId && (
        <RapAddItemsModal
          open
          itemType="material"
          projectId={projectId}
          sortOffset={rapItems.length}
          userId={userId}
          onClose={() => setAddModal(null)}
          onAdded={onRefresh}
        />
      )}

      {laborModalOpen && tenant?.id && userId && (
        <LaborTenagaWizardModal
          open
          projectId={projectId}
          orgId={tenant.id}
          orgSlug={tenant.slug}
          userId={userId}
          userRole={user?.role}
          sortOffset={rapItems.length}
          editItem={laborEditItem}
          onClose={() => { setLaborModalOpen(false); setLaborEditItem(null); }}
          onSaved={onRefresh}
        />
      )}

      <RapItemDetailModal
        open={detailItem !== null}
        item={detailItem}
        onClose={() => setDetailItem(null)}
        canManage={Boolean(userId)}
        isLabor={detailItem ? workersWithDraft.some(w => w.plannerId === detailItem.plannerId) : false}
        onOpenLaborSchedule={detailItem ? () => openLaborModal(detailItem) : undefined}
        onSave={patch => {
          if (detailItem?.plannerId) handleFieldEdit(detailItem.plannerId, patch);
        }}
      />
    </div>
  );
}
