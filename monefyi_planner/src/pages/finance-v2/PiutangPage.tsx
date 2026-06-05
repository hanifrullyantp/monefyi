import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, RefreshCw, Banknote } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { showToast } from '../../store/uiStore';
import { formatFinanceRupiah } from '../../lib/financeV2Calc';
import { loadKasAccounts } from '../../services/financeV2/kasService';
import {
  createReceivable,
  loadReceivables,
  recordReceivablePayment,
  deleteReceivable,
} from '../../services/financeV2/receivableService';
import type { DebtorType, Receivable } from '../../types/financeV2';
import { RECEIVABLE_STATUS_LABEL as STATUS_LABEL } from '../../types/financeV2';

const statusClass: Record<string, string> = {
  open: 'bg-slate-100 text-slate-700',
  partial: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-800',
  overdue: 'bg-rose-100 text-rose-800',
};

export default function PiutangPage() {
  const { tenant, user, projects } = useAppStore();
  const [rows, setRows] = useState<Receivable[]>([]);
  const [kasAccounts, setKasAccounts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [payId, setPayId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payKasId, setPayKasId] = useState('');

  const [debtorName, setDebtorName] = useState('');
  const [debtorType, setDebtorType] = useState<DebtorType>('company');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState('');

  const projectMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p.name])), [projects]);
  const totalOutstanding = rows.reduce((s, r) => s + (r.amount - r.paid_amount), 0);

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const [recs, kas] = await Promise.all([
        loadReceivables(tenant.id),
        loadKasAccounts(tenant.id),
      ]);
      setRows(recs);
      setKasAccounts(kas.map(k => ({ id: k.id, name: k.name })));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat piutang', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!tenant?.id || !debtorName.trim() || !amount) return;
    const num = parseFloat(amount);
    if (num <= 0) return;
    try {
      await createReceivable({
        orgId: tenant.id,
        debtorType,
        debtorName: debtorName.trim(),
        debtorProjectId: projectId || undefined,
        amount: num,
        dueDate: dueDate || undefined,
        createdBy: user?.id,
      });
      showToast('Piutang dicatat', 'success');
      setFormOpen(false);
      setDebtorName('');
      setAmount('');
      setDueDate('');
      setProjectId('');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal mencatat piutang', 'error');
    }
  };

  const handlePay = async (rec: Receivable) => {
    const num = parseFloat(payAmount);
    if (!tenant?.id || !num || num <= 0) return;
    try {
      await recordReceivablePayment({
        orgId: tenant.id,
        receivableId: rec.id,
        amount: num,
        kasAccountId: payKasId || undefined,
        createdBy: user?.id,
      });
      showToast('Pembayaran dicatat', 'success');
      setPayId(null);
      setPayAmount('');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal mencatat pembayaran', 'error');
    }
  };

  const handleDelete = async (rec: Receivable) => {
    if (!window.confirm(`Hapus piutang ${rec.debtor_name}?`)) return;
    try {
      await deleteReceivable(rec.id);
      showToast('Piutang dihapus', 'success');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menghapus', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Total outstanding: <span className="font-bold text-emerald-700">{formatFinanceRupiah(totalOutstanding)}</span></p>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button type="button" onClick={() => setFormOpen(true)} className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm">
            <Plus className="w-4 h-4" /> Catat Piutang
          </button>
        </div>
      </div>

      {formOpen && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
          <h3 className="font-bold text-slate-800">Piutang Baru</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={debtorName} onChange={e => setDebtorName(e.target.value)} placeholder="Nama debitur" className="px-3 py-2 rounded-xl border border-slate-200 text-sm" />
            <select value={debtorType} onChange={e => setDebtorType(e.target.value as DebtorType)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm">
              <option value="company">Perusahaan</option>
              <option value="person">Perorangan</option>
              <option value="project">Proyek</option>
            </select>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Nominal" className="px-3 py-2 rounded-xl border border-slate-200 text-sm" />
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm" />
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm sm:col-span-2">
              <option value="">Tanpa proyek</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold">Batal</button>
            <button type="button" onClick={handleCreate} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold">Simpan</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400 text-sm">Belum ada piutang.</div>
      ) : (
        <div className="space-y-3">
          {rows.map(rec => {
            const outstanding = rec.amount - rec.paid_amount;
            return (
              <div key={rec.id} className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">{rec.debtor_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {rec.debtor_project_id ? projectMap[rec.debtor_project_id] : rec.debtor_type}
                      {rec.due_date && ` · Jatuh tempo ${rec.due_date}`}
                    </div>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusClass[rec.status]}`}>
                      {STATUS_LABEL[rec.status]}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-slate-900">{formatFinanceRupiah(rec.amount)}</div>
                    <div className="text-xs text-slate-500">Sisa: {formatFinanceRupiah(outstanding)}</div>
                  </div>
                </div>
                {outstanding > 0 && (
                  payId === rec.id ? (
                    <div className="mt-3 flex flex-wrap gap-2 items-end border-t border-slate-50 pt-3">
                      <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="Nominal bayar" className="px-3 py-2 rounded-xl border border-slate-200 text-sm w-32" />
                      <select value={payKasId} onChange={e => setPayKasId(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm">
                        <option value="">Kas default</option>
                        {kasAccounts.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                      </select>
                      <button type="button" onClick={() => handlePay(rec)} className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold">Bayar</button>
                      <button type="button" onClick={() => setPayId(null)} className="px-3 py-2 text-slate-500 text-sm">Batal</button>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2 border-t border-slate-50 pt-3">
                      <button type="button" onClick={() => { setPayId(rec.id); setPayAmount(String(outstanding)); }} className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg">
                        <Banknote className="w-3.5 h-3.5" /> Terima Pembayaran
                      </button>
                      {rec.paid_amount === 0 && (
                        <button type="button" onClick={() => handleDelete(rec)} className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg">Hapus</button>
                      )}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
