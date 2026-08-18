import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Save, Upload } from 'lucide-react';
import PricelistCsvImport from '../../components/estimator/PricelistCsvImport';
import PricelistTableView from '../../components/estimator/PricelistTableView';
import PricelistCardView from '../../components/estimator/PricelistCardView';
import UnsavedChangesDialog from '../../components/ui/UnsavedChangesDialog';
import { useAppStore } from '../../store/appStore';
import { useUiStore } from '../../store/uiStore';
import {
  applyPricelistPricePatch,
  createPricelistItem,
  deletePricelistItem,
  loadPricelistItems,
  PRICELIST_CATEGORIES,
  updatePricelistItem,
} from '../../services/pricelistService';
import type { PricelistCategory, PricelistItem } from '../../types/estimator';

type EditableFields = Pick<
  PricelistItem,
  'name' | 'product' | 'category' | 'unit' | 'base_cost' | 'default_margin_pct' | 'selling_price' | 'is_active'
>;

function rowSnapshot(row: PricelistItem): string {
  const pick: EditableFields = {
    name: row.name,
    product: row.product,
    category: row.category,
    unit: row.unit,
    base_cost: Number(row.base_cost),
    default_margin_pct: Number(row.default_margin_pct),
    selling_price: Number(row.selling_price),
    is_active: row.is_active,
  };
  return JSON.stringify(pick);
}

type PricelistPageProps = { embedded?: boolean };

export default function PricelistPage({ embedded = false }: PricelistPageProps) {
  const navigate = useNavigate();
  const { tenant, user } = useAppStore();
  const showToast = useUiStore(s => s.showToast);
  const [rows, setRows] = useState<PricelistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'' | PricelistCategory>('');
  const [csvOpen, setCsvOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  const savedSnapshots = useRef<Map<string, string>>(new Map());
  const leaveResolveRef = useRef<((proceed: boolean) => void) | null>(null);

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const data = await loadPricelistItems(tenant.id, false);
      setRows(data);
      const snaps = new Map<string, string>();
      data.forEach(r => snaps.set(r.id, rowSnapshot(r)));
      savedSnapshots.current = snaps;
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat pricelist', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, showToast]);

  useEffect(() => { load(); }, [load]);

  const isRowDirty = useCallback((row: PricelistItem) => {
    const saved = savedSnapshots.current.get(row.id);
    return saved !== undefined && saved !== rowSnapshot(row);
  }, []);

  const dirtyIds = useMemo(() => rows.filter(isRowDirty).map(r => r.id), [rows, isRowDirty]);
  const hasUnsaved = dirtyIds.length > 0;

  const promptLeave = useCallback((): Promise<boolean> => {
    if (!hasUnsaved) return Promise.resolve(true);
    return new Promise(resolve => {
      leaveResolveRef.current = resolve;
      setLeaveDialogOpen(true);
    });
  }, [hasUnsaved]);

  useEffect(() => {
    if (!hasUnsaved) {
      useUiStore.getState().setNavigationGuard(null);
      return;
    }
    useUiStore.getState().setNavigationGuard({ promptLeave });
    return () => useUiStore.getState().setNavigationGuard(null);
  }, [hasUnsaved, promptLeave]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUnsaved) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsaved]);

  const patchRow = useCallback((id: string, patch: Partial<PricelistItem>) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const handlePriceUpdate = (
    id: string,
    field: 'base_cost' | 'default_margin_pct' | 'selling_price',
    value: number,
  ) => {
    setRows(prev => {
      const current = prev.find(r => r.id === id);
      if (!current) return prev;
      const patch = applyPricelistPricePatch(current, field, value);
      return prev.map(r => (r.id === id ? { ...r, ...patch } : r));
    });
  };

  const saveDirtyRows = useCallback(async (): Promise<boolean> => {
    if (!hasUnsaved) return true;
    setSaving(true);
    try {
      const toSave = rows.filter(r => dirtyIds.includes(r.id));
      for (const row of toSave) {
        const patch: Partial<PricelistItem> = {
          name: row.name.trim() || 'Item baru',
          product: row.product,
          category: row.category,
          unit: row.unit,
          base_cost: Number(row.base_cost),
          default_margin_pct: Number(row.default_margin_pct),
          selling_price: Number(row.selling_price),
          is_active: row.is_active,
        };
        const saved = await updatePricelistItem(row.id, patch);
        savedSnapshots.current.set(row.id, rowSnapshot(saved));
        setRows(prev => prev.map(r => (r.id === row.id ? { ...r, ...saved } : r)));
      }
      showToast(`${toSave.length} item disimpan`, 'success');
      return true;
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  }, [hasUnsaved, rows, dirtyIds, showToast]);

  const discardChanges = useCallback(() => {
    setRows(prev =>
      prev.map(r => {
        const snap = savedSnapshots.current.get(r.id);
        if (!snap || snap === rowSnapshot(r)) return r;
        const saved = JSON.parse(snap) as EditableFields;
        return { ...r, ...saved };
      }),
    );
  }, []);

  const finishLeavePrompt = (proceed: boolean) => {
    setLeaveDialogOpen(false);
    leaveResolveRef.current?.(proceed);
    leaveResolveRef.current = null;
  };

  const closeLeaveDialog = () => finishLeavePrompt(false);

  const handleLeaveSave = async () => {
    const ok = await saveDirtyRows();
    if (!ok) return;
    finishLeavePrompt(true);
  };

  const handleLeaveDiscard = () => {
    discardChanges();
    finishLeavePrompt(true);
  };

  const handleBack = async () => {
    const canLeave = await promptLeave();
    if (!canLeave) return;
    navigate(embedded ? '/app?tab=settings&st=organisasi' : '/app/estimator');
  };

  const filtered = rows.filter(r => {
    if (isRowDirty(r)) return true;
    const q = search.toLowerCase().trim();
    const matchSearch = !q
      || r.name.toLowerCase().includes(q)
      || (r.product || '').toLowerCase().includes(q);
    const matchCat = !categoryFilter || r.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const handleAdd = async () => {
    if (!tenant?.id || !user?.id) return;
    if (hasUnsaved) {
      showToast('Simpan perubahan terlebih dahulu sebelum menambah item', 'error');
      return;
    }
    try {
      const created = await createPricelistItem({
        org_id: tenant.id,
        name: 'Item baru',
        product: null,
        category: 'material',
        unit: 'pcs',
        base_cost: 0,
        default_margin_pct: 20,
        selling_price: 0,
        notes: null,
        is_active: true,
        created_by: user.id,
      });
      savedSnapshots.current.set(created.id, rowSnapshot(created));
      setRows(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      showToast('Item ditambahkan — edit lalu klik Simpan', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menambah', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Hapus "${name}" dari pricelist?`)) return;
    try {
      await deletePricelistItem(id);
      savedSnapshots.current.delete(id);
      setRows(prev => prev.filter(r => r.id !== id));
      showToast('Item dihapus', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menghapus', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-24">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-start gap-3">
          {!embedded && (
            <button
              type="button"
              onClick={handleBack}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 shrink-0 mt-0.5"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Pricelist</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Edit harga jual & margin — klik Simpan untuk menyimpan</p>
          </div>
          {hasUnsaved && (
            <span className="shrink-0 text-[10px] sm:text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
              {dirtyIds.length}
              <span className="hidden sm:inline"> belum disimpan</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={saveDirtyRows}
            disabled={!hasUnsaved || saving}
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-40 min-w-[2.75rem]"
            title="Simpan perubahan"
            aria-label="Simpan perubahan pricelist"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="hidden sm:inline">Simpan</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (hasUnsaved) {
                showToast('Simpan atau buang perubahan sebelum import CSV', 'error');
                return;
              }
              setCsvOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 min-w-[2.75rem]"
            title="Import CSV"
            aria-label="Import pricelist dari CSV"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import CSV</span>
          </button>
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-50 min-w-[2.75rem]"
            title="Tambah item"
            aria-label="Tambah item pricelist"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tambah</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari item atau produk..."
          className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
        />
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as '' | PricelistCategory)}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
        >
          <option value="">Semua kategori</option>
          {PRICELIST_CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-500">Belum ada item pricelist</p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <button type="button" onClick={handleAdd} className="inline-flex items-center gap-1.5 px-4 py-2 text-emerald-600 text-sm font-bold border border-emerald-200 rounded-xl hover:bg-emerald-50">
              <Plus className="w-4 h-4" /> Tambah item
            </button>
            <button
              type="button"
              onClick={() => setCsvOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-slate-600 text-sm font-semibold border border-slate-200 rounded-xl hover:bg-white"
            >
              <Upload className="w-4 h-4" /> Import CSV
            </button>
          </div>
        </div>
      ) : (
        <>
          <PricelistCardView
            rows={filtered}
            isRowDirty={isRowDirty}
            onPatch={patchRow}
            onPriceUpdate={handlePriceUpdate}
            onDelete={handleDelete}
          />
          <PricelistTableView
            rows={filtered}
            isRowDirty={isRowDirty}
            onPatch={patchRow}
            onPriceUpdate={handlePriceUpdate}
            onDelete={handleDelete}
          />
        </>
      )}

      {hasUnsaved && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur border-t border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3 safe-bottom">
          <span className="text-xs font-semibold text-amber-700">{dirtyIds.length} belum disimpan</span>
          <button
            type="button"
            onClick={saveDirtyRows}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Simpan
          </button>
        </div>
      )}

      {csvOpen && tenant?.id && user?.id && (
        <PricelistCsvImport
          orgId={tenant.id}
          userId={user.id}
          onClose={() => setCsvOpen(false)}
          onImported={() => {
            showToast('Pricelist diimport', 'success');
            load();
          }}
        />
      )}

      <UnsavedChangesDialog
        open={leaveDialogOpen}
        saving={saving}
        message="Ada perubahan pricelist yang belum disimpan. Simpan sebelum keluar dari halaman ini?"
        onSave={handleLeaveSave}
        onDiscard={handleLeaveDiscard}
        onCancel={closeLeaveDialog}
      />
    </div>
  );
}
