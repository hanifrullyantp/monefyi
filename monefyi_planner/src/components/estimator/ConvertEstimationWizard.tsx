import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, ChevronLeft, Loader2, Rocket, X,
} from 'lucide-react';
import {
  buildDefaultProjectInputFromEstimation,
  defaultSelectedEstimationItemIds,
  needsConvertWarning,
  type ConvertEstimationProjectInput,
} from '../../lib/estimationConvert';
import {
  getEstimationItemProductGroup,
  groupEstimationItemsByProduct,
} from '../../lib/estimatorProductGroup';
import { formatRupiahFull } from '../../lib/estimatorFormat';
import {
  assertEstimationConvertible,
  convertEstimationToProject,
} from '../../services/estimationConvertService';
import { assertCanCreateProjectByEntitlement } from '../../services/entitlementService';
import UpgradeModal from '../entitlement/UpgradeModal';
import { useAppStore } from '../../store/appStore';
import { analytics } from '../../lib/analytics/events';
import { useEntitlement } from '../../hooks/useEntitlement';
import type { Estimation, EstimationItem } from '../../types/estimator';

type WizardStep = 1 | 2 | 'success';

type Props = {
  open: boolean;
  estimation: Estimation;
  onClose: () => void;
  onConverted: (result: {
    projectId: string;
    projectName: string;
    rapItemCount: number;
    rapBudgetTotal: number;
  }) => void;
};

function itemLineTotal(item: EstimationItem): number {
  return Number(item.qty) * Number(item.hpp_per_unit);
}

function itemDisplayName(item: EstimationItem): string {
  const sep = ' — ';
  const idx = item.name.indexOf(sep);
  if (idx >= 0) return item.name.slice(0, idx).trim();
  return item.name;
}

export default function ConvertEstimationWizard({
  open,
  estimation,
  onClose,
  onConverted,
}: Props) {
  const navigate = useNavigate();
  const { tenant } = useAppStore();
  const { tier, currentActiveProjects } = useEntitlement();
  const [step, setStep] = useState<WizardStep>(1);
  const [projectInput, setProjectInput] = useState<ConvertEstimationProjectInput>(() =>
    buildDefaultProjectInputFromEstimation(estimation),
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() =>
    new Set(defaultSelectedEstimationItemIds(estimation.items || [])),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [successSummary, setSuccessSummary] = useState<{
    projectId: string;
    projectName: string;
    rapItemCount: number;
    rapBudgetTotal: number;
  } | null>(null);

  useEffect(() => {
    if (open) analytics.convertWizardOpened({ estimationId: estimation.id });
  }, [open, estimation.id]);

  const namedItems = useMemo(
    () => (estimation.items || []).filter(i => i.name.trim()),
    [estimation.items],
  );

  const draftItems = useMemo(
    () =>
      namedItems.map(item => ({
        id: item.id,
        name: item.name,
        product_group: getEstimationItemProductGroup({
          name: item.name,
          category: item.category || '',
          unit: item.unit,
          qty: Number(item.qty),
          hpp_per_unit: Number(item.hpp_per_unit),
          margin_pct: 0,
          selling_price_per_unit: 0,
          item_discount_pct: 0,
          item_discount_amount: 0,
          is_bonus: Boolean(item.is_bonus),
          included: item.included !== false,
          total_hpp: 0,
          total_selling: 0,
          total_profit: 0,
          sort_order: item.sort_order,
          notes: item.notes || '',
        }),
        qty: item.qty,
        unit: item.unit,
        hpp_per_unit: item.hpp_per_unit,
        included: item.included,
        is_bonus: item.is_bonus,
      })),
    [namedItems],
  );

  const productGroups = useMemo(() => groupEstimationItemsByProduct(draftItems), [draftItems]);

  const groupedIndices = useMemo(() => {
    const set = new Set<number>();
    for (const g of productGroups) {
      for (const idx of g.indices) set.add(idx);
    }
    return set;
  }, [productGroups]);

  const selectedBudget = useMemo(() => {
    return namedItems
      .filter(item => selectedIds.has(item.id))
      .reduce((sum, item) => sum + itemLineTotal(item), 0);
  }, [namedItems, selectedIds]);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setError('');
    setSuccessSummary(null);
    setProjectInput(buildDefaultProjectInputFromEstimation(estimation));
    setSelectedIds(new Set(defaultSelectedEstimationItemIds(estimation.items || [])));
  }, [open, estimation]);

  if (!open) return null;

  const showWarning = needsConvertWarning(estimation.status);
  const allSelected = namedItems.length > 0 && namedItems.every(item => selectedIds.has(item.id));

  const toggleItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(namedItems.map(i => i.id)) : new Set());
  };

  const toggleGroup = (indices: number[], checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const idx of indices) {
        const id = namedItems[idx]?.id;
        if (!id) continue;
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const handleContinueStep1 = () => {
    setError('');
    if (!projectInput.name.trim()) {
      setError('Nama proyek wajib diisi');
      return;
    }
    if (!projectInput.startDate || !projectInput.endDate) {
      setError('Tanggal mulai dan selesai wajib diisi');
      return;
    }
    if (projectInput.endDate < projectInput.startDate) {
      setError('Target selesai harus setelah tanggal mulai');
      return;
    }
    if (showWarning) {
      const ok = window.confirm(
        'Estimasi ini belum diterima klien. Yakin ingin membuatnya jadi proyek?',
      );
      if (!ok) return;
    }
    try {
      assertEstimationConvertible(estimation);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Estimasi tidak bisa dikonversi');
      return;
    }
    setStep(2);
  };

  const handleConvert = async () => {
    setError('');
    if (!selectedIds.size) {
      setError('Pilih minimal satu item untuk RAP');
      return;
    }
    setSubmitting(true);
    try {
      assertEstimationConvertible(estimation);
      if (tenant?.id) {
        await assertCanCreateProjectByEntitlement(tenant.id, tenant.plan);
      }
      const { projectId } = await convertEstimationToProject(
        estimation.id,
        projectInput,
        Array.from(selectedIds),
      );
      const summary = {
        projectId,
        projectName: projectInput.name.trim(),
        rapItemCount: selectedIds.size,
        rapBudgetTotal: selectedBudget,
      };
      setSuccessSummary(summary);
      setStep('success');
      analytics.convertWizardCompleted({
        estimationId: estimation.id,
        projectId,
        itemsSelected: selectedIds.size,
      });
      onConverted(summary);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal membuat proyek';
      if (msg.includes('Kuota') || msg.includes('Beli Estimator')) {
        analytics.projectLimitHit({ currentCount: currentActiveProjects, tier });
        setUpgradeOpen(true);
        analytics.upgradeModalShown('project_limit');
        setError('');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderItemRow = (item: EstimationItem, idx: number) => {
    const checked = selectedIds.has(item.id);
    return (
      <label
        key={item.id}
        className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border cursor-pointer ${
          checked ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-100 bg-white'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={() => toggleItem(item.id)}
          className="mt-1 rounded border-slate-300 text-emerald-600"
        />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-slate-800">
            {itemDisplayName(item)} — {item.qty} {item.unit}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            HPP: {formatRupiahFull(Number(item.hpp_per_unit))}/{item.unit}
          </div>
          <div className="text-xs font-semibold text-slate-700 mt-0.5">
            Total: {formatRupiahFull(itemLineTotal(item))}
          </div>
          {item.is_bonus && (
            <span className="inline-block mt-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
              Bonus
            </span>
          )}
          {!item.included && (
            <span className="inline-block mt-1 ml-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              Exclude total
            </span>
          )}
        </div>
      </label>
    );
  };

  return (
    <>
    <div className="fixed inset-0 z-[60] flex flex-col bg-white sm:bg-black/40">
      <div className="flex flex-col flex-1 sm:my-6 sm:mx-auto sm:max-w-2xl sm:w-full sm:max-h-[calc(100vh-3rem)] sm:rounded-2xl sm:shadow-2xl sm:border sm:border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="font-black text-slate-900 flex items-center gap-2">
              <Rocket className="w-5 h-5 text-emerald-600" />
              Jadikan Proyek
            </h2>
            {step !== 'success' && (
              <p className="text-xs text-slate-500 mt-0.5">
                Langkah {step} dari 2 · {estimation.code}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Tutup">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {step !== 'success' && (
          <div className="px-4 pt-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${step === 1 ? 'bg-emerald-500' : 'bg-emerald-300'}`} />
              <span className="h-0.5 flex-1 bg-slate-200">
                <span className={`block h-full bg-emerald-400 transition-all ${step >= 2 ? 'w-full' : 'w-0'}`} />
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${step === 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          {showWarning && step === 1 && (
            <div className="flex gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              Estimasi belum diterima klien. Anda tetap bisa lanjut, tapi pastikan sudah disetujui.
            </div>
          )}

          {step === 1 && (
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-slate-700">Detail Proyek</h3>
              <Field label="Nama Proyek *" hint="Pre-filled dari judul estimasi">
                <input
                  value={projectInput.name}
                  onChange={e => setProjectInput(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </Field>
              <Field label="Nama Klien">
                <input
                  value={projectInput.clientName}
                  onChange={e => setProjectInput(p => ({ ...p, clientName: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </Field>
              <Field label="Kontak Klien">
                <input
                  value={projectInput.clientPhone}
                  onChange={e => setProjectInput(p => ({ ...p, clientPhone: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Tanggal Mulai *">
                  <input
                    type="date"
                    value={projectInput.startDate}
                    onChange={e => setProjectInput(p => ({ ...p, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </Field>
                <Field label="Target Selesai *">
                  <input
                    type="date"
                    value={projectInput.endDate}
                    onChange={e => setProjectInput(p => ({ ...p, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </Field>
              </div>
              <Field label="Deskripsi" hint="Pre-filled dari catatan estimasi">
                <textarea
                  value={projectInput.description}
                  onChange={e => setProjectInput(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none"
                />
              </Field>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-700">Pilih Item untuk RAP</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Item mana yang masuk ke Rencana Anggaran Pelaksanaan?
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={e => toggleAll(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600"
                  />
                  Pilih Semua
                </label>
              </div>

              <div className="space-y-3">
                {productGroups.map(group => {
                  const groupItems = group.indices.map(i => namedItems[i]).filter(Boolean);
                  const groupChecked = group.indices.every(i => selectedIds.has(namedItems[i]?.id));
                  return (
                    <div key={group.key} className="border border-slate-200 rounded-2xl overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                        <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                          <input
                            type="checkbox"
                            checked={groupChecked}
                            onChange={e => toggleGroup(group.indices, e.target.checked)}
                            className="rounded border-slate-300 text-emerald-600"
                          />
                          {group.key} ({groupItems.length} item)
                        </label>
                      </div>
                      <div className="p-2 space-y-2">
                        {group.indices.map(idx => renderItemRow(namedItems[idx], idx))}
                      </div>
                    </div>
                  );
                })}

                {namedItems.map((item, idx) =>
                  groupedIndices.has(idx) ? null : renderItemRow(item, idx),
                )}
              </div>

              <div className="sticky bottom-0 bg-white/95 backdrop-blur border border-emerald-200 rounded-xl px-4 py-3">
                <div className="text-xs text-slate-500">Total budget RAP</div>
                <div className="text-lg font-black text-emerald-700 tabular-nums">
                  {formatRupiahFull(selectedBudget)}
                </div>
              </div>
            </section>
          )}

          {step === 'success' && successSummary && (
            <div className="py-8 text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
              <div>
                <h3 className="text-xl font-black text-slate-900">Proyek berhasil dibuat!</h3>
                <p className="text-sm text-slate-600 mt-1">{successSummary.projectName}</p>
              </div>
              <p className="text-sm text-slate-700">
                {successSummary.rapItemCount} item RAP dengan total budget{' '}
                <span className="font-bold tabular-nums">{formatRupiahFull(successSummary.rapBudgetTotal)}</span>
              </p>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex gap-2 justify-end shrink-0">
          {step === 1 && (
            <>
              <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm border border-slate-200 text-slate-600">
                Batal
              </button>
              <button
                type="button"
                onClick={handleContinueStep1}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Lanjut →
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={submitting}
                className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm border border-slate-200 text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" /> Kembali
              </button>
              <button
                type="button"
                onClick={handleConvert}
                disabled={submitting || selectedIds.size === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                Buat Proyek
              </button>
            </>
          )}
          {step === 'success' && successSummary && (
            <>
              <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm border border-slate-200 text-slate-600">
                Kembali ke Estimasi
              </button>
              <button
                type="button"
                onClick={() => navigate(`/app/projects/${successSummary.projectId}`)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Buka Proyek
              </button>
            </>
          )}
        </div>
      </div>
    </div>
    <UpgradeModal
      open={upgradeOpen}
      trigger="project_limit"
      onClose={() => setUpgradeOpen(false)}
      onManageProjects={() => navigate('/app?tab=projects')}
    />
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}
