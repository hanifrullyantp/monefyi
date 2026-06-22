import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, RefreshCw, Banknote } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { showToast } from '../../store/uiStore';
import { formatFinanceRupiah } from '../../lib/financeV2Calc';
import { parseMoneyInput } from '../../utils/projectUi';
import { loadKasAccounts } from '../../services/financeV2/kasService';
import {
  createPayable,
  loadPayables,
  recordPayablePayment,
  deletePayable,
} from '../../services/financeV2/payableService';
import type { Payable, PayableCategory } from '../../types/financeV2';
import { PAYABLE_STATUS_LABEL } from '../../types/financeV2';

const statusClass: Record<string, string> = {
  open: 'bg-slate-100 text-slate-700',
  partial: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-800',
  overdue: 'bg-rose-100 text-rose-800',
};

export default function HutangPage() {
  const { tenant, user, projects } = useAppStore();
  const [rows, setRows] = useState<Payable[]>([]);
  const [kasAccounts, setKasAccounts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [payId, setPayId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payKasId, setPayKasId] = useState('');

  const [creditorName, setCreditorName] = useState('');
  const [category, setCategory] = useState<PayableCategory>('dagang');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState('');

  const projectMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p.name])), [projects]);
  const totalOutstanding = rows.reduce((s, r) => s + (r.amount - r.paid_amount), 0);

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const [pays, kas] = await Promise.all([
        loadPayables(tenant.id),
        loadKasAccounts(tenant.id),
      ]);
      setRows(pays);
      setKasAccounts(kas.map(k => ({ id: k.id, name: k.name })));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat hutang', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!tenant?.id || !creditorName.trim() || !amount) return;
    const num = parseMoneyInput(amount);
    if (!Number.isFinite(num) || num <= 0) return;
    try {
      await createPayable({
        orgId: tenant.id,
        creditorType: 'vendor',
        creditorName: creditorName.trim(),
        creditorProjectId: projectId || undefined,
        category,
        amount: num,
        dueDate: dueDate || undefined,
        createdBy: user?.id,
      });
      showToast('Hutang dicatat', 'success');
      setFormOpen(false);
      setCreditorName('');
      setAmount('');
      setDueDate('');
      setProjectId('');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal mencatat hutang', 'error');
    }
  };

  const handlePay = async (pay: Payable) => {
    const num = parseMoneyInput(payAmount);
    if (!tenant?.id || !Number.isFinite(num) || num <= 0) return;
    try {
      await recordPayablePayment({
        orgId: tenant.id,
        payableId: pay.id,
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

  const handleDelete = async (pay: Payable) => {
    if (!window.confirm(`Hapus hutang ${pay.creditor_name}?`)) return;
    try {
      await deletePayable(pay.id);
      showToast('Hutang dihapus', 'success');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menghapus', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Total outstanding: <span className="font-bold text-rose-700">{formatFinanceRupiah(totalOutstanding)}</span></p>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button type="button" onClick={() => setFormOpen(true)} className="flex items-center gap-2 bg-rose-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm">
            <Plus className="w-4 h-4" /> Catat Hutang
          </button>
        </div>
      </div>

      {formOpen && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
          <h3 className="font-bold text-slate-800">Hutang Baru</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={creditorName} onChange={e => setCreditorName(e.target.value)} placeholder="Nama kreditur" className="px-3 py-2 rounded-xl border border-slate-200 text-sm" />
            <select value={category} onChange={e => setCategory(e.target.value as PayableCategory)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm">
              <option value="dagang">Hutang Dagang</option>
              <option value="pajak">Hutang Pajak</option>
              <option value="lain">Hutang Lain</option>
            </select>
            <input type="text" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Nominal (6.680.000)" className="px-3 py-2 rounded-xl border border-slate-200 text-sm" />
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm" />
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm sm:col-span-2">
              <option value="">Tanpa proyek</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold">Batal</button>
            <button type="button" onClick={handleCreate} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold">Simpan</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-600 text-sm">Belum ada hutang.</div>
      ) : (
        <div className="space-y-3">
          {rows.map(pay => {
            const outstanding = pay.amount - pay.paid_amount;
            return (
              <div key={pay.id} className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">{pay.creditor_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {pay.category || 'dagang'}
                      {pay.creditor_project_id && ` · ${projectMap[pay.creditor_project_id]}`}
                      {pay.due_date && ` · Jatuh tempo ${pay.due_date}`}
                    </div>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusClass[pay.status]}`}>
                      {PAYABLE_STATUS_LABEL[pay.status]}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-slate-900">{formatFinanceRupiah(pay.amount)}</div>
                    <div className="text-xs text-slate-500">Sisa: {formatFinanceRupiah(outstanding)}</div>
                  </div>
                </div>
                {outstanding > 0 && (
                  payId === pay.id ? (
                    <div className="mt-3 flex flex-wrap gap-2 items-end border-t border-slate-50 pt-3">
                      <input type="text" inputMode="numeric" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="Nominal bayar" className="px-3 py-2 rounded-xl border border-slate-200 text-sm w-32" />
                      <select value={payKasId} onChange={e => setPayKasId(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm">
                        <option value="">Kas default</option>
                        {kasAccounts.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                      </select>
                      <button type="button" onClick={() => handlePay(pay)} className="px-3 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold">Bayar</button>
                      <button type="button" onClick={() => setPayId(null)} className="px-3 py-2 text-slate-500 text-sm">Batal</button>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2 border-t border-slate-50 pt-3">
                      <button type="button" onClick={() => { setPayId(pay.id); setPayAmount(outstanding.toLocaleString('id-ID')); }} className="flex items-center gap-1 text-xs font-bold text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg">
                        <Banknote className="w-3.5 h-3.5" /> Bayar Hutang
                      </button>
                      {pay.paid_amount === 0 && (
                        <button type="button" onClick={() => handleDelete(pay)} className="text-xs font-bold text-slate-500 hover:bg-slate-50 px-2 py-1 rounded-lg">Hapus</button>
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
