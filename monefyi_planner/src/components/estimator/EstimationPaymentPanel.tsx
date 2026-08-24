import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, Plus, Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { EstimationFormDraft } from '../../types/estimator';
import { calcEstimationSummary, countedEstimationItems } from '../../lib/estimatorCalc';
import { formatRupiah, parseMoneyInput } from '../../utils/projectUi';
import { todayStr } from '../../lib/adapters';
import {
  loadEstimationProjectPayments,
  recordEstimationPayment,
  type IncomeCategory,
  type ProjectIncome,
} from '../../services/estimationPaymentService';
import { showToast } from '../../store/uiStore';
import { KWITANSI_CATEGORY_LABELS } from '../../lib/pdf/kwitansiPdfContext';

const CATEGORY_LABELS: Record<IncomeCategory, string> = {
  dp: 'DP',
  termin: 'Termin',
  pelunasan: 'Pelunasan',
  retensi: 'Retensi',
  other: 'Lainnya',
};

type Props = {
  projectId: string;
  projectName?: string;
  estimationId: string;
  orgId: string;
  userId: string;
  draft: EstimationFormDraft;
  isReadOnly?: boolean;
  onOpenKwitansi: (income?: ProjectIncome) => void;
  onPaymentsChanged?: () => void;
};

export default function EstimationPaymentPanel({
  projectId,
  projectName,
  estimationId,
  orgId,
  userId,
  draft,
  isReadOnly,
  onOpenKwitansi,
  onPaymentsChanged,
}: Props) {
  const [payments, setPayments] = useState<ProjectIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: 'dp' as IncomeCategory,
    date: todayStr(),
    amount: '',
    description: '',
    payment_method: '',
  });

  const contractValue = useMemo(() => {
    const items = countedEstimationItems(draft.items);
    return calcEstimationSummary(
      items,
      draft.overhead_pct,
      draft.discount_pct,
      draft.tax_pct,
      { discountAmount: draft.discount_amount, adjustments: draft.adjustments },
    ).grandTotal;
  }, [draft]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setPayments(await loadEstimationProjectPayments(projectId));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat pembayaran', 'error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const totalReceived = payments
    .filter(p => p.status === 'received')
    .reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, contractValue - totalReceived);

  const handleSubmit = async () => {
    const amount = parseMoneyInput(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Nominal harus lebih dari 0', 'error');
      return;
    }
    const description = form.description.trim()
      || `Pembayaran ${CATEGORY_LABELS[form.category]} — ${draft.title || draft.code}`;

    setSaving(true);
    try {
      await recordEstimationPayment({
        projectId,
        estimationId,
        orgId,
        userId,
        date: form.date,
        amount,
        category: form.category,
        description,
        payment_method: form.payment_method.trim() || null,
      });
      showToast('Pembayaran tercatat di proyek', 'success');
      setForm({
        category: 'dp',
        date: todayStr(),
        amount: '',
        description: '',
        payment_method: '',
      });
      setShowForm(false);
      await reload();
      onPaymentsChanged?.();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan pembayaran', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase">Pembayaran Proyek</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tercatat otomatis di halaman proyek
            {projectName ? ` · ${projectName}` : ''}
          </p>
        </div>
        <Link
          to={`/app/projects/${projectId}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
        >
          Buka Proyek
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <div className="text-[10px] font-bold text-emerald-700 uppercase">Kontrak</div>
          <div className="text-sm font-black text-emerald-800">{formatRupiah(contractValue)}</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <div className="text-[10px] font-bold text-emerald-700 uppercase">Diterima</div>
          <div className="text-sm font-black text-emerald-800">{formatRupiah(totalReceived)}</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <div className="text-[10px] font-bold text-amber-700 uppercase">Sisa</div>
          <div className="text-sm font-black text-amber-800">{formatRupiah(remaining)}</div>
        </div>
      </div>

      {!isReadOnly && (
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={() => setShowForm(v => !v)}
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"
          >
            <Plus className="w-3.5 h-3.5" />
            Catat Pembayaran
          </button>
          <button
            type="button"
            onClick={() => onOpenKwitansi()}
            className="inline-flex items-center gap-1 text-xs font-bold text-teal-700"
          >
            <Receipt className="w-3.5 h-3.5" />
            Kwitansi Baru
          </button>
        </div>
      )}

      {showForm && !isReadOnly && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <select
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value as IncomeCategory }))}
            className="border rounded-lg px-2 py-2 sm:col-span-2"
          >
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="border rounded-lg px-2 py-2"
          />
          <input
            type="text"
            inputMode="numeric"
            placeholder="Nominal *"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            className="border rounded-lg px-2 py-2"
          />
          <input
            placeholder="Keterangan"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="border rounded-lg px-2 py-2 sm:col-span-2"
          />
          <input
            placeholder="Metode bayar"
            value={form.payment_method}
            onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
            className="border rounded-lg px-2 py-2 sm:col-span-2"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="sm:col-span-2 py-2.5 bg-emerald-600 text-white rounded-lg font-bold text-xs disabled:opacity-50"
          >
            {saving ? 'Menyimpan…' : 'Simpan ke Proyek'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase">
              <tr>
                <th className="text-left p-2.5">Tanggal</th>
                <th className="text-left p-2.5">Jenis</th>
                <th className="text-right p-2.5">Nominal</th>
                <th className="text-right p-2.5">Kwitansi</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-500 text-xs">
                    Belum ada pembayaran tercatat
                  </td>
                </tr>
              ) : (
                payments.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2.5 text-slate-600">{p.date}</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                        {KWITANSI_CATEGORY_LABELS[p.category as keyof typeof KWITANSI_CATEGORY_LABELS]
                          || CATEGORY_LABELS[p.category]}
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-bold text-emerald-700 tabular-nums">
                      {formatRupiah(p.amount)}
                    </td>
                    <td className="p-2.5 text-right">
                      {p.invoice_ref ? (
                        <span className="text-[10px] font-mono text-slate-500">{p.invoice_ref}</span>
                      ) : !isReadOnly ? (
                        <button
                          type="button"
                          onClick={() => onOpenKwitansi(p)}
                          className="text-[10px] font-bold text-teal-700 hover:underline"
                        >
                          Generate
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
