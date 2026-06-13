import { useCallback, useEffect, useState } from 'react';
import { ArrowDownLeft, Banknote, Loader2, Plus } from 'lucide-react';
import {
  createReceivable,
  loadReceivablesByProject,
  recordReceivablePayment,
  deleteReceivable,
} from '../../services/financeV2/receivableService';
import { loadKasAccounts } from '../../services/financeV2/kasService';
import { formatRupiah } from '../../utils/projectUi';
import { showToast } from '../../store/uiStore';
import type { DebtorType, Receivable } from '../../types/financeV2';
import { RECEIVABLE_STATUS_LABEL } from '../../types/financeV2';

const statusClass: Record<string, string> = {
  open: 'bg-slate-100 text-slate-700',
  partial: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-800',
  overdue: 'bg-rose-100 text-rose-800',
};

interface Props {
  projectId: string;
  projectName: string;
  orgId: string;
  userId: string;
  canManage: boolean;
  onUpdated?: () => void;
}

export default function ProjectReceivablePanel({
  projectId,
  projectName,
  orgId,
  userId,
  canManage,
  onUpdated,
}: Props) {
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

  const totalOutstanding = rows.reduce((s, r) => s + (r.amount - r.paid_amount), 0);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [recs, kas] = await Promise.all([
        loadReceivablesByProject(orgId, projectId),
        loadKasAccounts(orgId),
      ]);
      setRows(recs);
      setKasAccounts(kas.map(k => ({ id: k.id, name: k.name })));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat piutang', 'error');
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId]);

  useEffect(() => { reload(); }, [reload]);

  const handleCreate = async () => {
    const num = parseFloat(amount);
    if (!debtorName.trim() || !num || num <= 0) {
      showToast('Isi nama debitur dan nominal', 'error');
      return;
    }
    try {
      await createReceivable({
        orgId,
        debtorType,
        debtorName: debtorName.trim(),
        debtorProjectId: projectId,
        amount: num,
        dueDate: dueDate || undefined,
        createdBy: userId,
      });
      showToast('Piutang proyek dicatat', 'success');
      setFormOpen(false);
      setDebtorName('');
      setAmount('');
      setDueDate('');
      await reload();
      onUpdated?.();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal mencatat piutang', 'error');
    }
  };

  const handlePay = async (rec: Receivable) => {
    const num = parseFloat(payAmount);
    if (!num || num <= 0) {
      showToast('Nominal tidak valid', 'error');
      return;
    }
    try {
      await recordReceivablePayment({
        orgId,
        receivableId: rec.id,
        amount: num,
        kasAccountId: payKasId || undefined,
        createdBy: userId,
      });
      showToast('Pembayaran piutang dicatat', 'success');
      setPayId(null);
      setPayAmount('');
      await reload();
      onUpdated?.();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal mencatat pembayaran', 'error');
    }
  };

  const handleDelete = async (rec: Receivable) => {
    if (!window.confirm(`Hapus piutang ${rec.debtor_name}?`)) return;
    try {
      await deleteReceivable(rec.id);
      showToast('Piutang dihapus', 'success');
      await reload();
      onUpdated?.();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menghapus', 'error');
    }
  };

  if (loading && !rows.length) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <div className="text-xs font-bold text-emerald-700 uppercase mb-1">Total Piutang Proyek</div>
        <div className="text-2xl font-black text-emerald-900">{formatRupiah(totalOutstanding)}</div>
        <div className="text-xs text-emerald-600 mt-1">
          Tagihan ke pihak lain untuk proyek {projectName}
        </div>
      </div>

      {canManage && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFormOpen(v => !v)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" /> Catat Piutang
          </button>
        </div>
      )}

      {formOpen && canManage && (
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <h4 className="font-bold text-sm text-slate-800">Piutang Baru</h4>
          <div className="grid sm:grid-cols-2 gap-2">
            <input
              value={debtorName}
              onChange={e => setDebtorName(e.target.value)}
              placeholder="Nama debitur *"
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={debtorType}
              onChange={e => setDebtorType(e.target.value as DebtorType)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="company">Perusahaan</option>
              <option value="person">Perorangan</option>
              <option value="project">Proyek lain</option>
            </select>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Nominal piutang *"
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setFormOpen(false)} className="flex-1 py-2 border rounded-lg text-sm">Batal</button>
            <button type="button" onClick={handleCreate} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold">Simpan</button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">Belum ada piutang untuk proyek ini.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(rec => {
            const outstanding = rec.amount - rec.paid_amount;
            return (
              <div key={rec.id} className="bg-white border rounded-xl p-4">
                <div className="flex justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">{rec.debtor_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {rec.debtor_type}
                      {rec.due_date && ` · Jatuh tempo ${rec.due_date}`}
                    </div>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusClass[rec.status]}`}>
                      {RECEIVABLE_STATUS_LABEL[rec.status]}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black text-slate-900">{formatRupiah(rec.amount)}</div>
                    <div className="text-xs text-slate-500">Sisa: {formatRupiah(outstanding)}</div>
                  </div>
                </div>

                {outstanding > 0 && canManage && (
                  payId === rec.id ? (
                    <div className="mt-3 flex flex-wrap gap-2 items-end border-t border-slate-50 pt-3">
                      <div className="flex-1 min-w-[8rem]">
                        <label className="text-[10px] text-slate-500 block mb-0.5">Nominal terima</label>
                        <input
                          type="number"
                          value={payAmount}
                          onChange={e => setPayAmount(e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <select
                        value={payKasId}
                        onChange={e => setPayKasId(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">Kas default</option>
                        {kasAccounts.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                      </select>
                      <button type="button" onClick={() => handlePay(rec)} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold">
                        Simpan
                      </button>
                      <button type="button" onClick={() => setPayId(null)} className="px-3 py-2 text-slate-500 text-sm">
                        Batal
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2 border-t border-slate-50 pt-3">
                      <button
                        type="button"
                        onClick={() => { setPayId(rec.id); setPayAmount(String(outstanding)); }}
                        className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg"
                      >
                        <Banknote className="w-3.5 h-3.5" /> Terima Pembayaran
                      </button>
                      {rec.paid_amount === 0 && (
                        <button type="button" onClick={() => handleDelete(rec)} className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg">
                          Hapus
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-slate-400 flex items-center gap-1">
        <ArrowDownLeft className="w-3 h-3" />
        Piutang tercatat di keuangan bisnis dan terhubung ke proyek ini.
      </p>
    </div>
  );
}
