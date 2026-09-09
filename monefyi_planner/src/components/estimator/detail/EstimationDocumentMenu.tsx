import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BadgeCheck, FileText, Loader2, Plus, Receipt, Sparkles,
} from 'lucide-react';
import BottomSheet from '../../ui/BottomSheet';
import EstimationPaymentDashboard from './EstimationPaymentDashboard';
import EstimationBillingScheduleEditor from './EstimationBillingScheduleEditor';
import { buildEstimationBillingSnapshot, type BillingMilestone } from '../../../lib/estimationBillingSchedule';
import { newLocalPayment } from '../../../lib/estimationBillingConfig';
import { formatRupiah, parseMoneyInput } from '../../../utils/projectUi';
import { todayStr } from '../../../lib/adapters';
import {
  loadEstimationProjectPayments,
  recordEstimationPayment,
  type IncomeCategory,
  type ProjectIncome,
} from '../../../services/estimationPaymentService';
import { showToast } from '../../../store/uiStore';
import type { BillingMilestoneKey, EstimationBillingConfig, EstimationFormDraft, EstimationSummary } from '../../../types/estimator';

export type DocumentType = 'penawaran' | 'invoice' | 'kwitansi';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (type: DocumentType) => void;
  draft: EstimationFormDraft;
  summary: EstimationSummary;
  billingConfig: EstimationBillingConfig;
  onBillingConfigChange: (config: EstimationBillingConfig) => void;
  onTagihMilestone: (milestone: BillingMilestone) => void;
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

function milestoneToCategory(key: BillingMilestoneKey): IncomeCategory {
  if (key === 'dp') return 'dp';
  if (key === 'pelunasan') return 'pelunasan';
  return 'termin';
}

export default function EstimationDocumentMenu({
  open,
  onClose,
  onSelect,
  draft,
  summary,
  billingConfig,
  onBillingConfigChange,
  onTagihMilestone,
  projectId,
  projectName,
  estimationId,
  orgId,
  userId,
  isReadOnly,
  onPaymentsChanged,
}: Props) {
  const [projectPayments, setProjectPayments] = useState<ProjectIncome[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payMilestone, setPayMilestone] = useState<BillingMilestoneKey>('dp');
  const [form, setForm] = useState({
    date: todayStr(),
    amount: '',
    payment_method: '',
    note: '',
  });

  const reload = useCallback(async () => {
    if (!projectId) {
      setProjectPayments([]);
      return;
    }
    setLoading(true);
    try {
      setProjectPayments(await loadEstimationProjectPayments(projectId));
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
    () => buildEstimationBillingSnapshot(summary.grandTotal, billingConfig, projectPayments),
    [summary.grandTotal, billingConfig, projectPayments],
  );

  const allPayments = useMemo(() => {
    const local = billingConfig.payments.map(p => ({
      id: p.id,
      label: snapshot.milestones.find(m => m.id === p.milestone_key)?.label || p.milestone_key,
      date: p.date,
      amount: p.amount,
      source: 'local' as const,
    }));
    const proj = projectPayments
      .filter(p => p.status === 'received')
      .map(p => ({
        id: p.id,
        label: CATEGORY_LABELS[p.category] || p.category,
        date: p.date,
        amount: p.amount,
        source: 'project' as const,
      }));
    return [...local, ...proj].sort((a, b) => b.date.localeCompare(a.date));
  }, [billingConfig.payments, projectPayments, snapshot.milestones]);

  const handleRecordPayment = async () => {
    const amount = parseMoneyInput(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Nominal harus lebih dari 0', 'error');
      return;
    }

    setSaving(true);
    try {
      if (projectId && estimationId && orgId && userId) {
        const category = milestoneToCategory(payMilestone);
        const label = snapshot.milestones.find(m => m.id === payMilestone)?.label || category;
        await recordEstimationPayment({
          projectId,
          estimationId,
          orgId,
          userId,
          date: form.date,
          amount,
          category,
          description: form.note.trim() || `Pembayaran ${label} — ${draft.title || draft.code}`,
          payment_method: form.payment_method.trim() || null,
        });
        await reload();
        onPaymentsChanged?.();
      } else {
        onBillingConfigChange({
          ...billingConfig,
          payments: [
            ...billingConfig.payments,
            {
              ...newLocalPayment(payMilestone, amount, form.date),
              payment_method: form.payment_method.trim() || null,
              note: form.note.trim() || undefined,
            },
          ],
        });
      }
      showToast('Pembayaran tercatat', 'success');
      setForm({ date: todayStr(), amount: '', payment_method: '', note: '' });
      setShowForm(false);
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

  const handleTagih = (m: BillingMilestone) => {
    onTagihMilestone(m);
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Dokumen & Pembayaran" height="92vh">
      <div className="space-y-4 pb-8 -mt-1">
        {loading && projectId ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
          </div>
        ) : (
          <EstimationPaymentDashboard
            snapshot={snapshot}
            projectName={projectName}
            linkedToProject={Boolean(projectId)}
            onMilestoneClick={handleTagih}
          />
        )}

        {!isReadOnly && (
          <EstimationBillingScheduleEditor
            config={billingConfig}
            onChange={onBillingConfigChange}
          />
        )}

        {!isReadOnly && (
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
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Catat pembayaran</p>
                <select
                  value={payMilestone}
                  onChange={e => setPayMilestone(e.target.value as BillingMilestoneKey)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                >
                  {snapshot.milestones.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
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
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-xl text-sm border border-slate-200 bg-white">
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
              title="Invoice"
              subtitle="Tagihan & status pembayaran"
              gradient="from-indigo-500 to-violet-700"
              shadow="shadow-indigo-600/30"
              icon={<FileText className="w-6 h-6 text-white" />}
              onClick={() => handleSelect('invoice')}
            />
            <DocumentTile
              title="Kwitansi"
              subtitle="Bukti 1 pembayaran masuk"
              gradient="from-emerald-500 to-teal-700"
              shadow="shadow-emerald-600/30"
              icon={<Receipt className="w-6 h-6 text-white" />}
              badge="Pro"
              onClick={() => handleSelect('kwitansi')}
            />
          </div>
        </div>

        {allPayments.length > 0 && (
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Riwayat pembayaran</span>
            </div>
            <ul className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
              {allPayments.map(p => (
                <li key={`${p.source}-${p.id}`} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{p.label}</p>
                    <p className="text-[10px] text-slate-500">{p.date}{p.source === 'project' ? ' · proyek' : ''}</p>
                  </div>
                  <span className="font-bold text-emerald-700 tabular-nums shrink-0">{formatRupiah(p.amount)}</span>
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
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg ${shadow} mb-3 group-hover:scale-105 transition-transform duration-300`}>
          {icon}
        </div>
        <p className="font-bold text-slate-900 text-sm leading-tight">{title}</p>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{subtitle}</p>
      </div>
    </button>
  );
}
