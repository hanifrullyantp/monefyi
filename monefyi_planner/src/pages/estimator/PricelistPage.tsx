import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Save, Trash2, Upload } from 'lucide-react';
import PricelistCsvImport from '../../components/estimator/PricelistCsvImport';
import UnsavedChangesDialog from '../../components/ui/UnsavedChangesDialog';
import { useAppStore } from '../../store/appStore';
import { useUiStore } from '../../store/uiStore';
import {
  applyPricelistPricePatch,
  COMMON_UNITS,
  createPricelistItem,
  deletePricelistItem,
  loadPricelistItems,
  PRICELIST_CATEGORIES,
  updatePricelistItem,
} from '../../services/pricelistService';
import { formatRupiahFull } from '../../lib/estimatorFormat';
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

export default function PricelistPage() {
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
  const [pendingNavigate, setPendingNavigate] = useState<(() => void) | null>(null);

  const savedSnapshots = useRef<Map<string, string>>(new Map());

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

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsaved && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setLeaveDialogOpen(true);
    }
  }, [blocker.state]);

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

  const closeLeaveDialog = () => {
    setLeaveDialogOpen(false);
    setPendingNavigate(null);
    if (blocker.state === 'blocked') blocker.reset();
  };

  const handleLeaveSave = async () => {
    const ok = await saveDirtyRows();
    if (!ok) return;
    setLeaveDialogOpen(false);
    if (blocker.state === 'blocked') {
      blocker.proceed();
    } else if (pendingNavigate) {
      pendingNavigate();
      setPendingNavigate(null);
    }
  };

  const handleLeaveDiscard = () => {
    discardChanges();
    setLeaveDialogOpen(false);
    if (blocker.state === 'blocked') {
      blocker.proceed();
    } else if (pendingNavigate) {
      pendingNavigate();
      setPendingNavigate(null);
    }
  };

  const handleBack = () => {
    if (hasUnsaved) {
      setPendingNavigate(() => () => navigate('/app/estimator'));
      setLeaveDialogOpen(true);
      return;
    }
    navigate('/app/estimator');
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
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={handleBack}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-black text-slate-900">Pricelist</h1>
          <p className="text-sm text-slate-500">Edit harga jual & margin — klik Simpan untuk menyimpan</p>
        </div>
        {hasUnsaved && (
          <span className="hidden sm:inline text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            {dirtyIds.length} belum disimpan
          </span>
        )}
        <button
          type="button"
          onClick={saveDirtyRows}
          disabled={!hasUnsaved || saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-40"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan
        </button>
        <button
          type="button"
          onClick={() => setCsvOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <Upload className="w-4 h-4" /> Import CSV
        </button>
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-50"
        >
          <Plus className="w-4 h-4" /> Tambah
        </button>
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
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-500">Belum ada item pricelist</p>
          <button type="button" onClick={handleAdd} className="mt-3 text-emerald-600 text-sm font-bold">
            + Tambah item pertama
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                <th className="p-3 min-w-[140px]">Item</th>
                <th className="p-3 min-w-[120px]">Produk</th>
                <th className="p-3 w-24">Kategori</th>
                <th className="p-3 w-16">Satuan</th>
                <th className="p-3 w-32">Harga Jual/Satuan</th>
                <th className="p-3 w-20">Margin%</th>
                <th className="p-3 w-28">Est. HPP</th>
                <th className="p-3 w-16">Aktif</th>
                <th className="p-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => {
                const dirty = isRowDirty(row);
                return (
                  <tr
                    key={row.id}
                    className={`border-t border-slate-100 ${dirty ? 'bg-amber-50/40' : ''}`}
                  >
                    <td className="p-2">
                      <input
                        value={row.name}
                        onChange={e => patchRow(row.id, { name: e.target.value })}
                        className="w-full px-2 py-1 border border-transparent hover:border-slate-200 focus:border-emerald-300 rounded outline-none bg-transparent"
                        placeholder="Nama pekerjaan/item"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        value={row.product || ''}
                        onChange={e => patchRow(row.id, { product: e.target.value || null })}
                        className="w-full px-2 py-1 border border-transparent hover:border-slate-200 focus:border-emerald-300 rounded outline-none bg-transparent"
                        placeholder="Merk / spesifikasi"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={row.category || 'material'}
                        onChange={e => patchRow(row.id, { category: e.target.value as PricelistCategory })}
                        className="w-full px-1 py-1 text-xs border border-slate-200 rounded"
                      >
                        {PRICELIST_CATEGORIES.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <select
                        value={row.unit}
                        onChange={e => patchRow(row.id, { unit: e.target.value })}
                        className="w-full px-1 py-1 text-xs border border-slate-200 rounded"
                      >
                        {COMMON_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={0}
                        value={Math.round(Number(row.selling_price))}
                        onChange={e => handlePriceUpdate(row.id, 'selling_price', Number(e.target.value))}
                        className="w-full px-2 py-1 border border-emerald-200 bg-emerald-50/40 rounded text-right font-semibold"
                      />
                      <div className="text-[10px] text-emerald-600 text-right font-medium">
                        {formatRupiahFull(Number(row.selling_price))}
                      </div>
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={0}
                        value={Math.round(Number(row.default_margin_pct) * 10) / 10}
                        onChange={e => handlePriceUpdate(row.id, 'default_margin_pct', Number(e.target.value))}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-right"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={0}
                        value={Math.round(Number(row.base_cost))}
                        onChange={e => handlePriceUpdate(row.id, 'base_cost', Number(e.target.value))}
                        className="w-full px-2 py-1 border border-slate-200 bg-slate-50 rounded text-right text-slate-600"
                        title="Estimasi HPP dari harga jual & margin"
                      />
                      <div className="text-[10px] text-slate-400 text-right">{formatRupiahFull(Number(row.base_cost))}</div>
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={row.is_active}
                        onChange={e => patchRow(row.id, { is_active: e.target.checked })}
                      />
                    </td>
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id, row.name)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
