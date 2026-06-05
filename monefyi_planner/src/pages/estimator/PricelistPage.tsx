import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import PricelistCsvImport from '../../components/estimator/PricelistCsvImport';
import { useAppStore } from '../../store/appStore';
import { useUiStore } from '../../store/uiStore';
import {
  COMMON_UNITS,
  createPricelistItem,
  deletePricelistItem,
  loadPricelistItems,
  PRICELIST_CATEGORIES,
  updatePricelistItem,
} from '../../services/pricelistService';
import { formatRupiahFull } from '../../lib/estimatorFormat';
import type { PricelistCategory, PricelistItem } from '../../types/estimator';

export default function PricelistPage() {
  const navigate = useNavigate();
  const { tenant, user } = useAppStore();
  const showToast = useUiStore(s => s.showToast);
  const [rows, setRows] = useState<PricelistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'' | PricelistCategory>('');
  const [csvOpen, setCsvOpen] = useState(false);

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const data = await loadPricelistItems(tenant.id, false);
      setRows(data);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat pricelist', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, showToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q || r.name.toLowerCase().includes(q);
    const matchCat = !categoryFilter || r.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const handleAdd = async () => {
    if (!tenant?.id || !user?.id) return;
    try {
      await createPricelistItem({
        org_id: tenant.id,
        name: 'Item baru',
        category: 'material',
        unit: 'pcs',
        base_cost: 0,
        default_margin_pct: 20,
        notes: null,
        is_active: true,
        created_by: user.id,
      });
      showToast('Item ditambahkan', 'success');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menambah', 'error');
    }
  };

  const handleUpdate = async (id: string, patch: Partial<PricelistItem>) => {
    try {
      await updatePricelistItem(id, patch);
      setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal update', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Hapus "${name}" dari pricelist?`)) return;
    try {
      await deletePricelistItem(id);
      showToast('Item dihapus', 'success');
      setRows(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menghapus', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate('/app/estimator')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-slate-900">Pricelist</h1>
          <p className="text-sm text-slate-500">Master harga HPP & margin default</p>
        </div>
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
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold"
        >
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari item..."
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
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-500">Belum ada item pricelist</p>
          <button type="button" onClick={handleAdd} className="mt-3 text-indigo-600 text-sm font-bold">
            + Tambah item pertama
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                <th className="p-3">Nama</th>
                <th className="p-3 w-24">Kategori</th>
                <th className="p-3 w-16">Satuan</th>
                <th className="p-3 w-28">HPP</th>
                <th className="p-3 w-20">Margin%</th>
                <th className="p-3 w-16">Aktif</th>
                <th className="p-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="p-2">
                    <input
                      value={row.name}
                      onChange={e => handleUpdate(row.id, { name: e.target.value })}
                      className="w-full px-2 py-1 border border-transparent hover:border-slate-200 rounded"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      value={row.category || 'material'}
                      onChange={e => handleUpdate(row.id, { category: e.target.value as PricelistCategory })}
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
                      onChange={e => handleUpdate(row.id, { unit: e.target.value })}
                      className="w-full px-1 py-1 text-xs border border-slate-200 rounded"
                    >
                      {COMMON_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      min={0}
                      value={row.base_cost}
                      onChange={e => handleUpdate(row.id, { base_cost: Number(e.target.value) })}
                      className="w-full px-2 py-1 border border-slate-200 rounded text-right"
                    />
                    <div className="text-[10px] text-slate-400 text-right">{formatRupiahFull(Number(row.base_cost))}</div>
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      min={0}
                      value={row.default_margin_pct}
                      onChange={e => handleUpdate(row.id, { default_margin_pct: Number(e.target.value) })}
                      className="w-full px-2 py-1 border border-slate-200 rounded text-right"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.is_active}
                      onChange={e => handleUpdate(row.id, { is_active: e.target.checked })}
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
              ))}
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
    </div>
  );
}
