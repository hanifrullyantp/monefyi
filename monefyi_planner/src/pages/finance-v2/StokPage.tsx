import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, RefreshCw, PackagePlus, PackageMinus } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { showToast } from '../../store/uiStore';
import { formatFinanceRupiah } from '../../lib/financeV2Calc';
import {
  adjustStock,
  createInventoryItem,
  deleteInventoryItem,
  loadInventoryItems,
} from '../../services/financeV2/inventoryService';
import type { InventoryItem } from '../../types/financeV2';

export default function StokPage() {
  const { tenant, user } = useAppStore();
  const [rows, setRows] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('pcs');
  const [newCost, setNewCost] = useState('');

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      setRows(await loadInventoryItems(tenant.id));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat stok', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  useEffect(() => { load(); }, [load]);

  const totalValue = rows.reduce((s, r) => s + r.total_value, 0);

  const handleAdd = async () => {
    if (!tenant?.id || !newName.trim()) return;
    try {
      await createInventoryItem({
        orgId: tenant.id,
        name: newName.trim(),
        unit: newUnit,
        unitCost: parseFloat(newCost) || 0,
      });
      showToast('Item stok ditambahkan', 'success');
      setNewName('');
      setNewCost('');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menambah item', 'error');
    }
  };

  const handleAdjust = async (item: InventoryItem, direction: 1 | -1) => {
    const qty = parseFloat(adjustQty);
    if (!tenant?.id || !qty || qty <= 0) return;
    try {
      await adjustStock({
        orgId: tenant.id,
        itemId: item.id,
        qtyDelta: qty * direction,
        reason: adjustReason.trim() || undefined,
        createdBy: user?.id,
      });
      showToast(direction > 0 ? 'Stok masuk dicatat' : 'Stok keluar dicatat', 'success');
      setAdjustId(null);
      setAdjustQty('');
      setAdjustReason('');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyesuaikan stok', 'error');
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    if (!window.confirm(`Hapus "${item.name}"?`)) return;
    try {
      await deleteInventoryItem(item.id);
      showToast('Item dihapus', 'success');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menghapus', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Total nilai stok: <span className="font-bold text-emerald-700">{formatFinanceRupiah(totalValue)}</span></p>
        <button type="button" onClick={load} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 self-start">
          <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
        <h3 className="font-bold text-slate-800">Item Baru</h3>
        <div className="grid sm:grid-cols-4 gap-2">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nama barang" className="px-3 py-2 rounded-xl border border-slate-200 text-sm sm:col-span-2" />
          <input value={newUnit} onChange={e => setNewUnit(e.target.value)} placeholder="Satuan" className="px-3 py-2 rounded-xl border border-slate-200 text-sm" />
          <input type="number" value={newCost} onChange={e => setNewCost(e.target.value)} placeholder="HPP/satuan" className="px-3 py-2 rounded-xl border border-slate-200 text-sm" />
        </div>
        <button type="button" onClick={handleAdd} className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-sm">
          <Plus className="w-4 h-4" /> Tambah Item
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400 text-sm">Belum ada item stok.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left p-3">Item</th>
                <th className="text-right p-3">Qty</th>
                <th className="text-right p-3 hidden sm:table-cell">HPP</th>
                <th className="text-right p-3">Nilai</th>
                <th className="text-right p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(item => (
                <tr key={item.id} className="border-t border-slate-50">
                  <td className="p-3">
                    <div className="font-semibold text-slate-800">{item.name}</div>
                    <div className="text-xs text-slate-400">{item.unit}{item.location && ` · ${item.location}`}</div>
                    {item.qty <= item.min_stock && item.min_stock > 0 && (
                      <span className="text-[10px] font-bold text-amber-600">Stok rendah</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-bold">{item.qty}</td>
                  <td className="p-3 text-right hidden sm:table-cell">{formatFinanceRupiah(item.unit_cost)}</td>
                  <td className="p-3 text-right font-bold">{formatFinanceRupiah(item.total_value)}</td>
                  <td className="p-3 text-right">
                    {adjustId === item.id ? (
                      <div className="flex flex-col gap-1 items-end">
                        <input type="number" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder="Qty" className="w-20 px-2 py-1 rounded-lg border text-xs" />
                        <input value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="Alasan" className="w-28 px-2 py-1 rounded-lg border text-xs" />
                        <div className="flex gap-1">
                          <button type="button" onClick={() => handleAdjust(item, 1)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Masuk"><PackagePlus className="w-4 h-4" /></button>
                          <button type="button" onClick={() => handleAdjust(item, -1)} className="p-1 text-rose-600 hover:bg-rose-50 rounded" title="Keluar"><PackageMinus className="w-4 h-4" /></button>
                          <button type="button" onClick={() => setAdjustId(null)} className="text-xs text-slate-400 px-1">×</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => setAdjustId(item.id)} className="text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-lg">Gerak</button>
                        <button type="button" onClick={() => handleDelete(item)} className="text-xs font-bold text-slate-400 hover:bg-slate-50 px-2 py-1 rounded-lg">Hapus</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
