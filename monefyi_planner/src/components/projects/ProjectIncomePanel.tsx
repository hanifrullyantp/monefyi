import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, Trash2 } from 'lucide-react';
import {
  loadProjectIncomes,
  createProjectIncome,
  deleteProjectIncome,
  type IncomeCategory,
  type ProjectIncome,
} from '../../services/incomeService';
import { formatRupiah } from '../../utils/projectUi';
import { todayStr } from '../../lib/adapters';
import { useUndoableAction } from '../../hooks/useUndoableAction';
import { showToast } from '../../store/uiStore';

const CATEGORY_LABELS: Record<IncomeCategory, string> = {
  dp: 'DP',
  termin: 'Termin',
  pelunasan: 'Pelunasan',
  retensi: 'Retensi',
  other: 'Lainnya',
};

interface Props {
  projectId: string;
  orgId: string;
  userId: string;
  budget: number;
  canManage: boolean;
  onUpdated?: () => void;
}

export default function ProjectIncomePanel({
  projectId,
  orgId,
  userId,
  budget,
  canManage,
  onUpdated,
}: Props) {
  const { notifyUndoable } = useUndoableAction();
  const [incomes, setIncomes] = useState<ProjectIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    category: 'dp' as IncomeCategory,
    date: todayStr(),
    amount: '',
    description: '',
    payment_method: '',
  });

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setIncomes(await loadProjectIncomes(projectId));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat uang masuk', 'error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { reload(); }, [reload]);

  const totalReceived = incomes.filter(i => i.status === 'received').reduce((s, i) => s + i.amount, 0);
  const remainingBill = Math.max(0, budget - totalReceived);

  const handleSubmit = async () => {
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      showToast('Nominal harus lebih dari 0', 'error');
      return;
    }
    if (!form.description.trim()) {
      showToast('Keterangan wajib diisi', 'error');
      return;
    }
    try {
      const { income, undoActionId } = await createProjectIncome({
        project_id: projectId,
        date: form.date,
        amount,
        category: form.category,
        description: form.description.trim(),
        payment_method: form.payment_method.trim() || null,
        status: 'received',
        recorded_by: userId,
      }, canManage ? { orgId, actorId: userId } : undefined);

      showToast('Uang masuk tercatat', 'success');
      notifyUndoable('Uang masuk tercatat', undoActionId);
      setForm({ category: 'dp', date: todayStr(), amount: '', description: '', payment_method: '' });
      setShowForm(false);
      await reload();
      onUpdated?.();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pencatatan uang masuk ini?')) return;
    try {
      await deleteProjectIncome(id, projectId);
      showToast('Uang masuk dihapus', 'success');
      await reload();
      onUpdated?.();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal hapus', 'error');
    }
  };

  if (loading && !incomes.length) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <div className="text-[10px] font-bold text-emerald-700 uppercase">Diterima</div>
          <div className="text-sm font-black text-emerald-800">{formatRupiah(totalReceived)}</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <div className="text-[10px] font-bold text-emerald-700 uppercase">Kontrak</div>
          <div className="text-sm font-black text-emerald-800">{formatRupiah(budget)}</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <div className="text-[10px] font-bold text-amber-700 uppercase">Sisa Tagihan</div>
          <div className="text-sm font-black text-amber-800">{formatRupiah(remainingBill)}</div>
        </div>
      </div>

      {canManage && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1 text-xs font-bold text-emerald-600"
          >
            <Plus className="w-3.5 h-3.5" /> Catat Uang Masuk
          </button>
        </div>
      )}

      {showForm && canManage && (
        <div className="bg-white border rounded-xl p-4 grid grid-cols-2 gap-2 text-sm">
          <select
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value as IncomeCategory }))}
            className="border rounded-lg px-2 py-1.5 col-span-2"
          >
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="border rounded-lg px-2 py-1.5" />
          <input type="number" placeholder="Nominal *" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="border rounded-lg px-2 py-1.5" />
          <input placeholder="Keterangan *" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="border rounded-lg px-2 py-1.5 col-span-2" />
          <input placeholder="Metode bayar" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} className="border rounded-lg px-2 py-1.5 col-span-2" />
          <button type="button" onClick={handleSubmit} className="col-span-2 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs">Simpan</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="text-left p-3">Tanggal</th>
              <th className="text-left p-3">Kategori</th>
              <th className="text-left p-3">Keterangan</th>
              <th className="text-right p-3">Nominal</th>
              {canManage && <th className="p-3 w-10" />}
            </tr>
          </thead>
          <tbody>
            {incomes.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="p-8 text-center text-slate-400">
                  Belum ada uang masuk tercatat
                </td>
              </tr>
            ) : incomes.map(i => (
              <tr key={i.id} className="border-t">
                <td className="p-3 text-slate-600">{i.date}</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-bold">{CATEGORY_LABELS[i.category]}</span></td>
                <td className="p-3">{i.description}{i.payment_method ? <span className="text-slate-400 text-xs"> · {i.payment_method}</span> : null}</td>
                <td className="p-3 text-right font-bold text-emerald-600">{formatRupiah(i.amount)}</td>
                {canManage && (
                  <td className="p-3">
                    <button type="button" onClick={() => handleDelete(i.id)} className="text-rose-500 hover:text-rose-700" aria-label="Hapus">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
