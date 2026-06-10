import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, RefreshCw, Play } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { showToast } from '../../store/uiStore';
import { formatFinanceRupiah } from '../../lib/financeV2Calc';
import { calcDailyAmortization } from '../../lib/financeV2AdvancedCalc';
import {
  amortizePrepaidItem,
  createPrepaidItem,
  deletePrepaidItem,
  loadPrepaidItems,
} from '../../services/financeV2/prepaidService';
import type { PrepaidItem } from '../../types/financeV2';

export default function PraBayarPage() {
  const { tenant, user } = useAppStore();
  const [rows, setRows] = useState<PrepaidItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      setRows(await loadPrepaidItems(tenant.id));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat pra bayar', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  useEffect(() => { load(); }, [load]);

  const totalRemaining = rows.reduce((s, r) => s + r.remaining_value, 0);

  const handleCreate = async () => {
    if (!tenant?.id || !name.trim() || !amount || !startDate || !endDate) return;
    try {
      await createPrepaidItem({
        orgId: tenant.id,
        name: name.trim(),
        totalAmount: parseFloat(amount),
        startDate,
        endDate,
        createdBy: user?.id,
      });
      showToast('Pra bayar dicatat', 'success');
      setFormOpen(false);
      setName('');
      setAmount('');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    }
  };

  const handleAmortizeOne = async (item: PrepaidItem) => {
    if (!tenant?.id) return;
    try {
      await amortizePrepaidItem({ orgId: tenant.id, itemId: item.id, createdBy: user?.id });
      showToast(`Amortisasi ${item.name} berhasil`, 'success');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal amortisasi', 'error');
    }
  };

  const handleAmortizeAll = async () => {
    if (!tenant?.id) return;
    setRunning(true);
    let count = 0;
    try {
      for (const item of rows) {
        if (item.remaining_value <= 0) continue;
        const daily = calcDailyAmortization(item.remaining_value, item.start_date, item.end_date, item.last_amortized_date);
        if (daily <= 0) continue;
        try {
          await amortizePrepaidItem({ orgId: tenant.id, itemId: item.id, createdBy: user?.id });
          count++;
        } catch { /* skip already done today */ }
      }
      showToast(count > 0 ? `${count} item diamortisasi` : 'Tidak ada amortisasi hari ini', 'success');
      load();
    } finally {
      setRunning(false);
    }
  };

  const handleDelete = async (item: PrepaidItem) => {
    if (!window.confirm(`Hapus "${item.name}"?`)) return;
    try {
      await deletePrepaidItem(item.id);
      showToast('Item dihapus', 'success');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menghapus', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Sisa nilai: <span className="font-bold text-sky-700">{formatFinanceRupiah(totalRemaining)}</span></p>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button type="button" onClick={handleAmortizeAll} disabled={running} className="flex items-center gap-2 border border-emerald-200 text-emerald-700 font-bold px-4 py-2.5 rounded-xl text-sm">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Amortisasi Hari Ini
          </button>
          <button type="button" onClick={() => setFormOpen(true)} className="flex items-center gap-2 bg-sky-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </div>

      {formOpen && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
          <h3 className="font-bold text-slate-800">Biaya Dibayar Dimuka</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nama (mis. Sewa 12 bulan)" className="px-3 py-2 rounded-xl border text-sm sm:col-span-2" />
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Total nominal" className="px-3 py-2 rounded-xl border text-sm" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 rounded-xl border text-sm" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 rounded-xl border text-sm sm:col-span-2" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-xl border text-sm font-semibold">Batal</button>
            <button type="button" onClick={handleCreate} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold">Simpan</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border p-10 text-center text-slate-400 text-sm">Belum ada item pra bayar.</div>
      ) : (
        <div className="space-y-3">
          {rows.map(item => {
            const daily = calcDailyAmortization(item.remaining_value, item.start_date, item.end_date, item.last_amortized_date);
            const pct = item.total_amount > 0 ? ((item.total_amount - item.remaining_value) / item.total_amount) * 100 : 0;
            return (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.start_date} → {item.end_date}</div>
                    <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden w-40">
                      <div className="h-full bg-sky-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black">{formatFinanceRupiah(item.remaining_value)}</div>
                    <div className="text-xs text-slate-400">dari {formatFinanceRupiah(item.total_amount)}</div>
                    <div className="text-xs text-slate-500 mt-1">~{formatFinanceRupiah(daily)}/hari</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 border-t border-slate-50 pt-3">
                  {item.remaining_value > 0 && (
                    <button type="button" onClick={() => handleAmortizeOne(item)} className="text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-lg">Amortisasi</button>
                  )}
                  <button type="button" onClick={() => handleDelete(item)} className="text-xs font-bold text-slate-400 hover:bg-slate-50 px-2 py-1 rounded-lg">Hapus</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
