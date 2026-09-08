import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BadgeCheck, FileText, Loader2, Plus, Receipt, Sparkles,
} from 'lucide-react';
import BottomSheet from '../../ui/BottomSheet';
import EstimationPaymentDashboard from './EstimationPaymentDashboard';
import { buildEstimationBillingSnapshot } from '../../../lib/estimationBillingSchedule';
import { formatRupiah, parseMoneyInput } from '../../../utils/projectUi';
import { todayStr } from '../../../lib/adapters';
import {
  loadEstimationProjectPayments,
  recordEstimationPayment,
  type IncomeCategory,
  type ProjectIncome,
} from '../../../services/estimationPaymentService';
import { showToast } from '../../../store/uiStore';
import type { EstimationFormDraft, EstimationSummary } from '../../../types/estimator';

export type DocumentType = 'penawaran' | 'kwitansi';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (type: DocumentType) => void;
  draft: EstimationFormDraft;
  summary: EstimationSummary;
  projectId?: string | null;
  projectName?: string;
  estimationId?: string;
  orgId?: string;
  userId?: string;
  isReadOnly?: boolean;
  onPaymentsChanged?: () => void;
};

const CATEGORY_LABELS: Record<IncomeCategory, string> = {
  dp: 'DP',
  termin: 'Termin',
  pelunasan: 'Pelunasan',
  retensi: 'Retensi',
  other: 'Lainnya',
};

export default function EstimationDocumentMenu({
  open,
  onClose,
  onSelect,
  draft,
  summary,
  projectId,
  projectName,
  estimationId,
  orgId,
  userId,
  isReadOnly,
  onPaymentsChanged,
}: Props) {
  const [payments, setPayments] = useState<ProjectIncome[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: 'dp' as IncomeCategory,
    date: todayStr(),
    amount: '',
    description: '',
    payment_method: '',
  });

  const reload = useCallback(async () => {
    if (!projectId) {
      setPayments([]);
      return;
    }
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
    if (!open) return;
    setShowForm(false);
    void reload();
  }, [open, reload]);

  const snapshot = useMemo(
    () => buildEstimationBillingSnapshot(summary.grandTotal, payments),
    [summary.grandTotal, payments],
  );

  const handleRecordPayment = async () => {
    if (!projectId || !estimationId || !orgId || !userId) return;
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
      showToast('Pembayaran tercatat', 'success');
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

  const handleSelect = (type: DocumentType) => {
    onSelect(type);
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Dokumen & Pembayaran" height="88vh">
      <div className="space-y-5 pb-8 -mt-1">
        {loading && projectId ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
          </div>
        ) : (
          <EstimationPaymentDashboard
            snapshot={snapshot}
            projectName={projectName}
            linkedToProject={Boolean(projectId)}
          />
        )}

        {projectId && !isReadOnly && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
            {!showForm ? (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Catat Pembayaran
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Catat pembayaran baru</p>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value as IncomeCategory }))}
                    className="col-span-2 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Nominal *"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                  />
                  <input
                    placeholder="Metode bayar"
                    value={form.payment_method}
                    onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                    className="col-span-2 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-2 rounded-xl text-sm border border-slate-200 bg-white"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleRecordPayment}
                    disabled={saving}
                    className="flex-1 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white disabled:opacity-50"
                  >
                    {saving ? 'Menyimpan…' : 'Simpan'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <div className="flex items-center gap-2 mb-3 px-0.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Dokumen</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DocumentTile
              title="Penawaran"
              subtitle="PDF penawaran resmi"
              gradient="from-slate-700 to-slate-900"
              shadow="shadow-slate-900/25"
              icon={<FileText className="w-6 h-6 text-white" />}
              onClick={() => handleSelect('penawaran')}
            />
            <DocumentTile
              title="Bukti Pembayaran"
              subtitle="Generate kwitansi / receipt"
              gradient="from-emerald-500 to-teal-700"
              shadow="shadow-emerald-600/30"
              icon={<Receipt className="w-6 h-6 text-white" />}
              badge="Pro"
              onClick={() => handleSelect('kwitansi')}
            />
          </div>
        </div>

        {payments.length > 0 && (
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Riwayat pembayaran</span>
            </div>
            <ul className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
              {payments.map(p => (
                <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">
                      {CATEGORY_LABELS[p.category] || p.category}
                    </p>
                    <p className="text-[10px] text-slate-500">{p.date}</p>
                  </div>
                  <span className="font-bold text-emerald-700 tabular-nums shrink-0">
                    {formatRupiah(p.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

function DocumentTile({
  title,
  subtitle,
  gradient,
  shadow,
  icon,
  badge,
  onClick,
}: {
  title: string;
  subtitle: string;
  gradient: string;
  shadow: string;
  icon: ReactNode;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 text-left shadow-sm hover:shadow-xl hover:border-emerald-200/80 transition-all duration-300 active:scale-[0.98]"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] to-teal-500/[0.06] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      {badge && (
        <span className="absolute top-2.5 right-2.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
          {badge}
        </span>
      )}
      <div className="relative">
        <div
          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg ${shadow} mb-3 group-hover:scale-105 transition-transform duration-300`}
        >
          {icon}
        </div>
        <p className="font-bold text-slate-900 text-sm leading-tight">{title}</p>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{subtitle}</p>
      </div>
    </button>
  );
}
