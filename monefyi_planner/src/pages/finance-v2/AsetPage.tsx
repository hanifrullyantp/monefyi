import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, RefreshCw, TrendingDown } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { showToast } from '../../store/uiStore';
import { formatFinanceRupiah } from '../../lib/financeV2Calc';
import { calcMonthlyDepreciation } from '../../lib/financeV2AdvancedCalc';
import {
  createFixedAsset,
  deleteFixedAsset,
  loadFixedAssets,
  runDepreciation,
} from '../../services/financeV2/fixedAssetService';
import type { FixedAsset } from '../../types/financeV2';

export default function AsetPage() {
  const { tenant, user } = useAppStore();
  const [rows, setRows] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [depreciatingId, setDepreciatingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [purchaseValue, setPurchaseValue] = useState('');
  const [usefulLife, setUsefulLife] = useState('12');
  const [purchaseDate, setPurchaseDate] = useState('');

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      setRows(await loadFixedAssets(tenant.id));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat aset', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  useEffect(() => { load(); }, [load]);

  const totalNBV = rows.reduce((s, r) => s + r.current_value, 0);

  const handleCreate = async () => {
    if (!tenant?.id || !name.trim() || !purchaseValue) return;
    try {
      await createFixedAsset({
        orgId: tenant.id,
        name: name.trim(),
        category: category.trim() || undefined,
        purchaseDate: purchaseDate || undefined,
        purchaseValue: parseFloat(purchaseValue),
        usefulLifeMonths: parseInt(usefulLife, 10) || 12,
        createdBy: user?.id,
      });
      showToast('Aset tetap dicatat', 'success');
      setFormOpen(false);
      setName('');
      setPurchaseValue('');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    }
  };

  const handleDepreciate = async (asset: FixedAsset) => {
    if (!tenant?.id) return;
    setDepreciatingId(asset.id);
    try {
      await runDepreciation({ orgId: tenant.id, assetId: asset.id, createdBy: user?.id });
      showToast(`Depresiasi ${asset.name} berhasil`, 'success');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal depresiasi', 'error');
    } finally {
      setDepreciatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Nilai buku bersih: <span className="font-bold text-violet-700">{formatFinanceRupiah(totalNBV)}</span></p>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button type="button" onClick={() => setFormOpen(true)} className="flex items-center gap-2 bg-violet-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm">
            <Plus className="w-4 h-4" /> Tambah Aset
          </button>
        </div>
      </div>

      {formOpen && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
          <h3 className="font-bold text-slate-800">Aset Tetap Baru</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nama aset" className="px-3 py-2 rounded-xl border text-sm" />
            <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Kategori" className="px-3 py-2 rounded-xl border text-sm" />
            <input type="number" value={purchaseValue} onChange={e => setPurchaseValue(e.target.value)} placeholder="Nilai perolehan" className="px-3 py-2 rounded-xl border text-sm" />
            <input type="number" value={usefulLife} onChange={e => setUsefulLife(e.target.value)} placeholder="Umur (bulan)" className="px-3 py-2 rounded-xl border text-sm" />
            <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="px-3 py-2 rounded-xl border text-sm sm:col-span-2" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-xl border text-sm font-semibold">Batal</button>
            <button type="button" onClick={handleCreate} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold">Simpan</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border p-10 text-center text-slate-400 text-sm">Belum ada aset tetap.</div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left p-3">Aset</th>
                <th className="text-right p-3 hidden sm:table-cell">Perolehan</th>
                <th className="text-right p-3">Nilai Buku</th>
                <th className="text-right p-3 hidden md:table-cell">Dep/bulan</th>
                <th className="text-right p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(asset => {
                const monthly = asset.useful_life_months
                  ? calcMonthlyDepreciation(asset.purchase_value, asset.useful_life_months, asset.current_value)
                  : 0;
                return (
                  <tr key={asset.id} className="border-t border-slate-50">
                    <td className="p-3">
                      <div className="font-semibold">{asset.name}</div>
                      <div className="text-xs text-slate-400">{asset.category || '—'}{asset.last_depreciation_month && ` · Dep ${asset.last_depreciation_month}`}</div>
                    </td>
                    <td className="p-3 text-right hidden sm:table-cell">{formatFinanceRupiah(asset.purchase_value)}</td>
                    <td className="p-3 text-right font-bold">{formatFinanceRupiah(asset.current_value)}</td>
                    <td className="p-3 text-right hidden md:table-cell text-slate-500">{formatFinanceRupiah(monthly)}</td>
                    <td className="p-3 text-right">
                      {asset.current_value > 0 && asset.depreciation_method === 'straight' && (
                        <button
                          type="button"
                          disabled={depreciatingId === asset.id}
                          onClick={() => handleDepreciate(asset)}
                          className="text-xs font-bold text-violet-700 hover:bg-violet-50 px-2 py-1 rounded-lg inline-flex items-center gap-1"
                        >
                          {depreciatingId === asset.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingDown className="w-3 h-3" />}
                          Depresiasi
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm(`Hapus "${asset.name}"?`)) return;
                          try {
                            await deleteFixedAsset(asset.id);
                            showToast('Aset dihapus', 'success');
                            load();
                          } catch (e) {
                            showToast(e instanceof Error ? e.message : 'Gagal menghapus', 'error');
                          }
                        }}
                        className="text-xs font-bold text-slate-400 ml-2 px-2 py-1 rounded-lg"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
