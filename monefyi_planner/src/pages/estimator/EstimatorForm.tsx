import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ClipboardList, Loader2, Plus,
  User,
} from 'lucide-react';
import EstimatorActionBar from '../../components/estimator/EstimatorActionBar';
import EstimatorBreadcrumb from '../../components/estimator/EstimatorBreadcrumb';
import StatusBadgeDropdown from '../../components/estimator/StatusBadgeDropdown';
import EstimationStatusHistory from '../../components/estimator/EstimationStatusHistory';
import EstimatorActionsMenu from '../../components/estimator/EstimatorActionsMenu';
import ConvertEstimationWizard from '../../components/estimator/ConvertEstimationWizard';
import AutoSaveIndicator from '../../components/estimator/AutoSaveIndicator';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useEstimationDraftHistory } from '../../hooks/useEstimationDraftHistory';
import { useAppStore } from '../../store/appStore';
import { useUiStore } from '../../store/uiStore';
import EstimationItemsTable from '../../components/estimator/EstimationItemsTable';
import EstimationAdjustmentsPanel from '../../components/estimator/EstimationAdjustmentsPanel';
import EstimationImageSlots from '../../components/estimator/EstimationImageSlots';
import EstimationSummaryPanel from '../../components/estimator/EstimationSummaryPanel';
import PdfDesignCustomizer from '../../components/estimator/PdfDesignCustomizer';
import PdfPreviewModal from '../../components/estimator/PdfPreviewModal';
import ShareWhatsAppModal from '../../components/estimator/ShareWhatsAppModal';
import MarkAsSentPrompt from '../../components/estimator/MarkAsSentPrompt';
import UpgradeModal from '../../components/entitlement/UpgradeModal';
import MilestoneUpsellModal from '../../components/entitlement/MilestoneUpsellModal';
import { useEntitlement } from '../../hooks/useEntitlement';
import { analytics } from '../../lib/analytics/events';
import { shouldShowMilestone5Upsell } from '../../lib/analytics/milestones';
import {
  loadWhatsAppTemplate,
  defaultWhatsAppTemplateConfig,
} from '../../services/quotationTemplateService';
import type { WhatsAppTemplateConfig } from '../../lib/whatsappQuotationMessage';
import { uploadPendingImages } from '../../services/estimationImageService';
import { downloadQuotationPdf } from '../../lib/pdf/generateQuotationPdf';
import { loadPdfSettings } from '../../services/pdfSettingsService';
import type { PdfSettings } from '../../types/pdfSettings';
import {
  createEstimation,
  countEstimationsInLast30Days,
  deleteEstimation,
  duplicateEstimation,
  estimationToFormDraft,
  generateEstimationCode,
  loadEstimation,
  newEstimationDraft,
  updateEstimation,
  updateEstimationStatus,
} from '../../services/estimatorService';
import { assertEstimationConvertible } from '../../services/estimationConvertService';
import { assertCanCreateProjectByEntitlement } from '../../services/entitlementService';
import { getProject } from '../../services/projectService';
import type { EstimationStatusTimestamps } from '../../lib/estimationStatus';
import { ESTIMATION_STATUS_LABEL } from '../../lib/estimatorFormat';
import type { EstimationImageDraft, EstimationStatus, Estimation } from '../../types/estimator';
import { formatRupiahFull } from '../../lib/estimatorFormat';
import { calcEstimationSummary, countedEstimationItems } from '../../lib/estimatorCalc';
import type { EstimationFormDraft } from '../../types/estimator';

export default function EstimatorForm() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { tenant, user, projects, addProject } = useAppStore();
  const showToast = useUiStore(s => s.showToast);
  const navSidebarCollapsed = useAppStore(s => s.navSidebarCollapsed);

  const [draft, setDraft] = useState<EstimationFormDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const draftRef = useRef<EstimationFormDraft | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const addItemRef = useRef<(() => void) | null>(null);
  const registerAddItem = useCallback((fn: () => void) => {
    addItemRef.current = fn;
  }, []);
  const [pdfDesignOpen, setPdfDesignOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [waShareOpen, setWaShareOpen] = useState(false);
  const [pdfSettings, setPdfSettings] = useState<PdfSettings | null>(null);
  const [waTemplate, setWaTemplate] = useState<WhatsAppTemplateConfig>(defaultWhatsAppTemplateConfig());
  const [pdfLoading, setPdfLoading] = useState(false);
  const [statusMeta, setStatusMeta] = useState<EstimationStatusTimestamps | null>(null);
  const [sentPromptOpen, setSentPromptOpen] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertEstimation, setConvertEstimation] = useState<Estimation | null>(null);
  const [convertedProjectId, setConvertedProjectId] = useState<string | null>(null);
  const [convertedProjectName, setConvertedProjectName] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeTrigger, setUpgradeTrigger] = useState<'estimation_accepted' | 'project_limit'>('estimation_accepted');
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [milestoneTotal, setMilestoneTotal] = useState(0);
  const {
    canCreateProject,
    isEstimator,
    remainingProjectSlots,
    tier,
    currentActiveProjects,
  } = useEntitlement();

  const draftHistory = useEstimationDraftHistory();

  const isReadOnly = draft?.status === 'converted';

  const patch = useCallback((p: Partial<EstimationFormDraft>, opts?: { skipHistory?: boolean }) => {
    if (isReadOnly) return;
    setDraft(prev => {
      if (!prev) return prev;
      if (!opts?.skipHistory) draftHistory.recordBeforeChange(prev);
      return { ...prev, ...p };
    });
  }, [isReadOnly, draftHistory]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const persistDraft = useCallback(async (payload: EstimationFormDraft) => {
    if (!tenant?.id || !user?.id || isNew || !id || payload.status === 'converted') return;
    let images = payload.images;
    if (images.some(img => img.pendingFile)) {
      images = await uploadPendingImages(tenant.id, id, images);
    }
    await updateEstimation(id, { ...payload, images });
    patch({ images }, { skipHistory: true });
    draftHistory.setSavedSnapshot({ ...payload, images });
  }, [tenant?.id, user?.id, isNew, id, patch, draftHistory]);

  const autoSave = useAutoSave<EstimationFormDraft>({
    debounceMs: 1200,
    onSave: persistDraft,
    onError: () => showToast('Auto-save gagal', 'error'),
  });

  useEffect(() => {
    if (!draft || isNew || isReadOnly) return;
    autoSave.schedule(draft);
  }, [draft, isNew, isReadOnly, autoSave]);

  const estimationProjectName = useMemo(() => {
    if (!draft) return '';
    return (draft.project_id && projects.find(p => p.id === draft.project_id)?.name) || draft.title;
  }, [draft, projects]);

  const summaryTotal = useMemo(() => {
    if (!draft) return 0;
    return calcEstimationSummary(
      countedEstimationItems(draft.items),
      draft.overhead_pct,
      draft.discount_pct,
      draft.tax_pct,
      { discountAmount: draft.discount_amount, adjustments: draft.adjustments },
    ).grandTotal;
  }, [draft]);

  useEffect(() => {
    if (!tenant?.id) return;

    const init = async () => {
      setLoading(true);
      try {
        const [settings, wa] = await Promise.all([
          loadPdfSettings(tenant.id, tenant.name),
          loadWhatsAppTemplate(tenant.id),
        ]);
        setPdfSettings(settings);
        setWaTemplate(wa);

        if (isNew) {
          const code = await generateEstimationCode(tenant.id);
          setDraft({
            ...newEstimationDraft(code),
            pdf_template: settings.default_pdf_template,
            pdf_primary_color: settings.primary_color,
            pdf_secondary_color: settings.secondary_color,
          });
        } else {
          const est = await loadEstimation(id);
          if (!est) {
            showToast('Estimasi tidak ditemukan', 'error');
            navigate('/app/estimator');
            return;
          }
          const formDraft = await estimationToFormDraft(est);
          setDraft({
            ...formDraft,
            pdf_primary_color: est.pdf_primary_color || settings.primary_color,
            pdf_secondary_color: est.pdf_secondary_color || settings.secondary_color,
            pdf_template: est.pdf_template || settings.default_pdf_template,
          });
          draftHistory.resetHistory();
          draftHistory.setSavedSnapshot(formDraft);
          setStatusMeta({
            created_at: est.created_at,
            wa_at: est.wa_at ?? null,
            survei_at: est.survei_at ?? null,
            sent_at: est.sent_at ?? null,
            accepted_at: est.accepted_at ?? null,
            proses_at: est.proses_at ?? null,
            finishing_at: est.finishing_at ?? null,
            selesai_at: est.selesai_at ?? null,
            rejected_at: est.rejected_at ?? null,
            converted_at: est.converted_at ?? null,
          });
          setConvertedProjectId(est.converted_project_id ?? null);
          if (est.converted_project_id) {
            const linked = projects.find(p => p.id === est.converted_project_id);
            setConvertedProjectName(linked?.name || est.title);
          } else {
            setConvertedProjectName(null);
          }
          if (formDraft.customer_name || formDraft.customer_phone) {
            setDetailOpen(false);
          } else {
            setDetailOpen(true);
          }
        }
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Gagal memuat', 'error');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [tenant?.id, id, isNew, navigate, showToast]);

  const handleUndo = () => {
    setDraft(prev => draftHistory.undo(prev) ?? prev);
    autoSave.discard();
  };

  const handleRedo = () => {
    setDraft(prev => draftHistory.redo(prev) ?? prev);
    autoSave.discard();
  };

  const handleDiscardChanges = () => {
    const restored = draftHistory.revertToSaved();
    if (!restored) return;
    setDraft(restored);
    autoSave.discard();
    showToast('Perubahan dibatalkan', 'success');
  };

  const handleSave = async () => {
    if (!draft || !tenant?.id || !user?.id) return;
    if (isReadOnly) {
      showToast('Estimasi sudah menjadi proyek dan tidak bisa diedit', 'error');
      return;
    }
    if (!draft.title.trim()) {
      showToast('Judul estimasi wajib diisi', 'error');
      return;
    }

    setSaving(true);
    try {
      let images: EstimationImageDraft[] = draft.images;

      if (isNew) {
        const created = await createEstimation(tenant.id, user.id, draft);
        const itemCount = draft.items.filter(i => i.name.trim()).length;
        const totalAmount = calcEstimationSummary(
          countedEstimationItems(draft.items),
          draft.overhead_pct,
          draft.discount_pct,
          draft.tax_pct,
          { discountAmount: draft.discount_amount, adjustments: draft.adjustments },
        ).grandTotal;
        analytics.estimationCreated({
          estimationId: created.id,
          itemCount,
          totalAmount,
        });
        if (images.some(img => img.pendingFile)) {
          images = await uploadPendingImages(tenant.id, created.id, images);
          await updateEstimation(created.id, { ...draft, images });
        }
        showToast('Estimasi disimpan', 'success');
        navigate(`/app/estimator/${created.id}`, { replace: true });

        if (isEstimator) {
          try {
            const stats = await countEstimationsInLast30Days(tenant.id);
            if (shouldShowMilestone5Upsell({
              estimationCountLast30Days: stats.count,
              isEstimator,
            })) {
              window.setTimeout(() => {
                setMilestoneTotal(stats.totalAmount);
                setMilestoneOpen(true);
                analytics.upgradeModalShown('milestone_5_estimations');
              }, 1500);
            }
          } catch {
            /* non-blocking */
          }
        }
      } else {
        if (images.some(img => img.pendingFile)) {
          images = await uploadPendingImages(tenant.id, id, images);
        }
        await updateEstimation(id, { ...draft, images });
        const saved = { ...draft, images };
        patch({ images }, { skipHistory: true });
        draftHistory.setSavedSnapshot(saved);
        autoSave.discard();
        showToast('Perubahan disimpan', 'success');
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const requireSaved = (): boolean => {
    if (isNew) {
      showToast('Simpan draft terlebih dahulu sebelum generate PDF', 'error');
      return false;
    }
    if (!draft.title.trim()) {
      showToast('Judul estimasi wajib diisi', 'error');
      return false;
    }
    return true;
  };

  const scheduleSentPrompt = useCallback(() => {
    if (draft?.status !== 'wa' && draft?.status !== 'draft') return;
    window.setTimeout(() => setSentPromptOpen(true), 500);
  }, [draft?.status]);

  const applyStatusTransition = async (next: EstimationStatus, opts?: { skipConfirm?: boolean }) => {
    if (!draft || isNew || !id) return;
    const currentLabel = ESTIMATION_STATUS_LABEL[draft.status] || draft.status;
    const nextLabel = ESTIMATION_STATUS_LABEL[next] || next;
    if (
      !opts?.skipConfirm &&
      !window.confirm(`Ubah status ke ${nextLabel}? Status sekarang: ${currentLabel}`)
    ) {
      return;
    }

    setStatusChanging(true);
    try {
      const prevStatus = draft.status;
      const updated = await updateEstimationStatus(id, next);
      patch({ status: updated.status });
      setStatusMeta({
        created_at: updated.created_at,
        wa_at: updated.wa_at ?? null,
        survei_at: updated.survei_at ?? null,
        sent_at: updated.sent_at ?? null,
        accepted_at: updated.accepted_at ?? null,
        proses_at: updated.proses_at ?? null,
        finishing_at: updated.finishing_at ?? null,
        selesai_at: updated.selesai_at ?? null,
        rejected_at: updated.rejected_at ?? null,
        converted_at: updated.converted_at ?? null,
      });
      analytics.estimationStatusChanged({
        estimationId: id,
        from: prevStatus,
        to: next,
      });
      showToast(`Status diubah ke ${nextLabel}`, 'success');

      if (next === 'closing') {
        const daysFromCreated = statusMeta?.created_at
          ? Math.max(0, Math.floor((Date.now() - new Date(statusMeta.created_at).getTime()) / 86_400_000))
          : 0;
        analytics.estimationAccepted({
          estimationId: id,
          total: summaryTotal,
          profit: Number(updated.total_profit || 0),
          daysFromCreated,
        });
        if (isEstimator && !convertedProjectId) {
          window.setTimeout(() => {
            const trigger = remainingProjectSlots > 0 ? 'estimation_accepted' : 'project_limit';
            setUpgradeTrigger(trigger);
            setUpgradeOpen(true);
            analytics.upgradeModalShown(trigger);
          }, 1000);
        }
      }

      if (next === 'rejected') {
        const daysFromSent = statusMeta?.sent_at
          ? Math.max(0, Math.floor((Date.now() - new Date(statusMeta.sent_at).getTime()) / 86_400_000))
          : null;
        analytics.estimationRejected({ estimationId: id, daysFromSent });
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal mengubah status', 'error');
    } finally {
      setStatusChanging(false);
    }
  };

  const handleMarkAsSent = async () => {
    setSentPromptOpen(false);
    await applyStatusTransition('penawaran', { skipConfirm: true });
  };

  const handleDownloadPdf = async () => {
    if (!draft || !pdfSettings || !requireSaved()) return;
    setPdfLoading(true);
    try {
      await downloadQuotationPdf(
        draft,
        pdfSettings,
        {
          showImages: draft.pdf_show_images,
          showBank: draft.pdf_show_bank,
          showSignature: draft.pdf_show_signature,
        },
        estimationProjectName,
      );
      analytics.estimationPdfDownloaded({
        estimationId: id,
        template: draft.pdf_template,
      });
      showToast('PDF diunduh', 'success');
      scheduleSentPrompt();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal membuat PDF', 'error');
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePreviewPdf = () => {
    if (!requireSaved()) return;
    analytics.estimationPdfPreviewed({ estimationId: id });
    setPdfPreviewOpen(true);
  };

  const handleShareWhatsApp = () => {
    if (!requireSaved()) return;
    setWaShareOpen(true);
  };

  const handleOpenConvert = async () => {
    if (isNew || !id) {
      showToast('Simpan estimasi terlebih dahulu', 'error');
      return;
    }
    if (convertedProjectId) {
      navigate(`/app/projects/${convertedProjectId}`);
      return;
    }
    try {
      if (draftRef.current && !draftRef.current.title.trim()) {
        showToast('Judul estimasi wajib diisi', 'error');
        return;
      }
      if (!canCreateProject && tenant?.id) {
        try {
          await assertCanCreateProjectByEntitlement(tenant.id, tenant.plan);
        } catch {
          analytics.projectLimitHit({ currentCount: currentActiveProjects, tier });
          setUpgradeTrigger('project_limit');
          setUpgradeOpen(true);
          analytics.upgradeModalShown('project_limit');
          return;
        }
      }
      const est = await loadEstimation(id);
      if (!est) throw new Error('Estimasi tidak ditemukan');
      assertEstimationConvertible(est);
      setConvertEstimation(est);
      setConvertOpen(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Tidak bisa dijadikan proyek', 'error');
    }
  };

  const handleConverted = async (summary: {
    projectId: string;
    projectName: string;
  }) => {
    setConvertedProjectId(summary.projectId);
    setConvertedProjectName(summary.projectName);
    patch({ status: 'converted' });
    setStatusMeta(prev => ({
      ...(prev || {}),
      converted_at: new Date().toISOString(),
    }));
    try {
      const project = await getProject(summary.projectId, tenant?.currency);
      if (project) addProject(project);
    } catch {
      /* non-blocking */
    }
    showToast('Proyek berhasil dibuat', 'success');
  };

  const handleDuplicate = async () => {
    if (!tenant?.id || !user?.id || isNew || !id) return;
    try {
      const copy = await duplicateEstimation(id, tenant.id, user.id);
      showToast('Estimasi diduplikasi', 'success');
      navigate(`/app/estimator/${copy.id}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menduplikasi', 'error');
    }
  };

  const handleDelete = async () => {
    if (isNew || !id || !draft) return;
    if (!window.confirm(`Hapus estimasi "${draft.title}"?`)) return;
    try {
      await deleteEstimation(id);
      showToast('Estimasi dihapus', 'success');
      navigate('/app/estimator');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menghapus', 'error');
    }
  };

  if (loading || !draft) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[100rem] mx-auto px-3 sm:px-5 py-4 pb-[9.5rem] lg:pb-28 overflow-x-hidden">
      <EstimatorBreadcrumb items={[{ label: isNew ? 'Baru' : draft.code }]} />

      {isReadOnly && convertedProjectId && (
        <button
          type="button"
          onClick={() => navigate(`/app/projects/${convertedProjectId}`)}
          className="mb-4 w-full text-left px-4 py-3 bg-teal-50 border border-teal-200 rounded-xl text-sm text-teal-800 hover:bg-teal-100 transition-colors"
        >
          ✅ Estimasi ini sudah menjadi proyek &quot;{convertedProjectName || draft.title}&quot; →
        </button>
      )}
      {isReadOnly && !convertedProjectId && (
        <div className="mb-4 px-4 py-3 bg-teal-50 border border-teal-200 rounded-xl text-sm text-teal-800">
          Estimasi ini sudah menjadi proyek — mode baca saja.
        </div>
      )}

      {/* Header card */}
      <div className="rounded-2xl overflow-hidden mb-4 shadow-xl shadow-emerald-900/20 border border-emerald-700/25">
        <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-800 px-4 pt-4 pb-3 text-white overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.14),transparent_55%)] pointer-events-none" />
          <div className="relative flex items-start gap-2">
            <button
              type="button"
              onClick={() => navigate('/app/estimator')}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white shrink-0 backdrop-blur-sm"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-[11px] font-bold text-emerald-100/90 tracking-wide">{draft.code}</span>
                {isNew ? (
                  <span className="inline-flex text-[10px] px-2 py-0.5 rounded-full font-semibold bg-white/20 text-white backdrop-blur-sm">
                    Draft
                  </span>
                ) : (
                  <div className="[&_button]:bg-white/15 [&_button]:text-white [&_button]:border-white/20">
                    <StatusBadgeDropdown
                      status={draft.status}
                      onTransition={applyStatusTransition}
                      disabled={statusChanging}
                    />
                  </div>
                )}
                {!isNew && (
                  <div className="ml-auto hidden sm:block">
                    <AutoSaveIndicator
                      status={autoSave.status}
                      onRetry={() => draftRef.current && autoSave.flush()}
                      variant="light"
                    />
                  </div>
                )}
              </div>
              <input
                value={draft.title}
                onChange={e => patch({ title: e.target.value })}
                placeholder="Judul estimasi *"
                disabled={isReadOnly}
                className="w-full text-xl sm:text-2xl font-black bg-transparent border-0 border-b border-transparent hover:border-white/30 focus:border-white outline-none py-0.5 placeholder:text-emerald-100/60 disabled:opacity-70 text-white"
              />
              <div className="mt-2 flex items-end justify-end gap-3">
                <div className="text-lg sm:text-xl font-black tabular-nums shrink-0">
                  {formatRupiahFull(summaryTotal)}
                </div>
              </div>
            </div>
            {!isNew && (
              <EstimatorActionsMenu
                status={draft.status}
                convertedProjectId={convertedProjectId}
                onConvert={handleOpenConvert}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            )}
          </div>

          <div className="relative flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/15">
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => addItemRef.current?.()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white text-emerald-700 hover:bg-emerald-50 shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Tambah Rincian
              </button>
            )}
            <button
              type="button"
              onClick={() => setDetailOpen(v => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border backdrop-blur-sm transition-colors ${
                detailOpen
                  ? 'bg-white/25 border-white/40 text-white'
                  : 'bg-white/10 border-white/20 text-emerald-50 hover:bg-white/15'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Klien
            </button>
            <button
              type="button"
              onClick={() => setSummaryOpen(v => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border backdrop-blur-sm transition-colors ${
                summaryOpen
                  ? 'bg-white/25 border-white/40 text-white'
                  : 'bg-white/10 border-white/20 text-emerald-50 hover:bg-white/15'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Ringkasan
            </button>
            {!isNew && (
              <div className="sm:hidden ml-auto">
                <AutoSaveIndicator
                  status={autoSave.status}
                  onRetry={() => draftRef.current && autoSave.flush()}
                  variant="light"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel detail — collapsible, di atas tabel tapi tidak di samping */}
      {detailOpen && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <section className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 md:col-span-2 xl:col-span-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase">Informasi Customer & Proyek</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Kode">
                <input
                  value={draft.code}
                  onChange={e => patch({ code: e.target.value })}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono disabled:bg-slate-50"
                />
              </Field>
              <Field label="Proyek (opsional)">
                <select
                  value={draft.project_id || ''}
                  onChange={e => patch({ project_id: e.target.value || null })}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm disabled:bg-slate-50"
                >
                  <option value="">— Tidak terhubung —</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Customer">
                <input
                  value={draft.customer_name}
                  onChange={e => patch({ customer_name: e.target.value })}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm disabled:bg-slate-50"
                />
              </Field>
              <Field label="Telepon">
                <input
                  value={draft.customer_phone}
                  onChange={e => patch({ customer_phone: e.target.value })}
                  placeholder="+62..."
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm disabled:bg-slate-50"
                />
              </Field>
            </div>
            <Field label="Alamat">
              <textarea
                value={draft.customer_address}
                onChange={e => patch({ customer_address: e.target.value })}
                rows={2}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none disabled:bg-slate-50"
              />
            </Field>
            <Field label={`Masa berlaku (${draft.validity_days} hari)`}>
              <input
                type="range"
                min={7}
                max={30}
                step={7}
                value={draft.validity_days}
                onChange={e => patch({ validity_days: Number(e.target.value) })}
                disabled={isReadOnly}
                className="w-full disabled:opacity-60"
              />
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>7 hari</span>
                <span>14 hari</span>
                <span>21 hari</span>
                <span>30 hari</span>
              </div>
            </Field>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setAdvancedOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-700"
            >
              Overhead, Diskon & PPN
              <span className="text-slate-600">{advancedOpen ? '▲' : '▼'}</span>
            </button>
            {advancedOpen && (
              <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-3">
                <Field label={`Overhead (${draft.overhead_pct}%)`}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.overhead_pct}
                    onChange={e => patch({ overhead_pct: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </Field>
                <Field label={`Diskon total (${draft.discount_pct}%)`}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.discount_pct}
                    onChange={e => patch({ discount_pct: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </Field>
                <Field label="Diskon total (nominal Rp)">
                  <RupiahInput
                    value={draft.discount_amount}
                    onChange={v => patch({ discount_amount: v })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </Field>
                <EstimationAdjustmentsPanel
                  adjustments={draft.adjustments}
                  onChange={adjustments => patch({ adjustments })}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">PPN 11%</span>
                  <button
                    type="button"
                    onClick={() => patch({ tax_pct: draft.tax_pct > 0 ? 0 : 11 })}
                    className={`w-10 h-6 rounded-full transition-colors ${draft.tax_pct > 0 ? 'bg-emerald-600' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${draft.tax_pct > 0 ? 'translate-x-4' : ''}`} />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Fokus utama: tabel lebar + ringkasan samping */}
      <div className="flex flex-col xl:flex-row gap-4 items-start">
        <div className="flex-1 min-w-0 w-full">
          <EstimationItemsTable
            orgId={tenant!.id}
            userId={user?.id || ''}
            items={draft.items}
            defaultMargin={draft.margin_pct}
            overheadPct={draft.overhead_pct}
            discountPct={draft.discount_pct}
            discountAmount={draft.discount_amount}
            adjustments={draft.adjustments}
            taxPct={draft.tax_pct}
            onChange={items => patch({ items })}
            readOnly={isReadOnly}
            onRegisterAddItem={registerAddItem}
          />
        </div>
        {summaryOpen && (
          <div className="w-full xl:w-72 shrink-0 xl:sticky xl:top-20">
            <EstimationSummaryPanel draft={draft} />
          </div>
        )}
      </div>

      {/* Pengaturan sekunder — di bawah tabel */}
      {detailOpen && (
        <div className="mt-4 space-y-4">
          <EstimationImageSlots
            orgId={tenant!.id}
            estimationId={isNew ? null : id ?? null}
            images={draft.images}
            onChange={images => patch({ images })}
            onToast={(msg, type) => showToast(msg, type)}
          />
          <PdfDesignCustomizer
            draft={draft}
            onChange={patch}
            open={pdfDesignOpen}
            onToggle={() => setPdfDesignOpen(v => !v)}
          />
          <section className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase">Catatan & Syarat</h3>
            <textarea
              value={draft.notes}
              onChange={e => patch({ notes: e.target.value })}
              placeholder="Catatan untuk customer..."
              rows={3}
              disabled={isReadOnly}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none disabled:bg-slate-50"
            />
            <textarea
              value={draft.terms_conditions}
              onChange={e => patch({ terms_conditions: e.target.value })}
              placeholder="Syarat & ketentuan..."
              rows={3}
              disabled={isReadOnly}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none disabled:bg-slate-50"
            />
          </section>
        </div>
      )}

      {!isNew && statusMeta && (
        <EstimationStatusHistory meta={statusMeta} className="mt-6" />
      )}

      <EstimatorActionBar
        navSidebarCollapsed={navSidebarCollapsed}
        isNew={isNew}
        saving={saving}
        pdfLoading={pdfLoading}
        isReadOnly={isReadOnly}
        autoSaveStatus={autoSave.status}
        canUndo={draftHistory.canUndo}
        canRedo={draftHistory.canRedo}
        canDiscard={draftHistory.canDiscard && !isNew}
        onCancel={() => navigate('/app/estimator')}
        onSave={handleSave}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onDiscardChanges={handleDiscardChanges}
        onRetryAutoSave={() => draftRef.current && autoSave.flush()}
        onWhatsApp={handleShareWhatsApp}
        onPreviewPdf={handlePreviewPdf}
        onDownloadPdf={handleDownloadPdf}
      />

      {pdfPreviewOpen && pdfSettings && (
        <PdfPreviewModal
          draft={draft}
          settings={pdfSettings}
          projectName={estimationProjectName}
          onClose={() => setPdfPreviewOpen(false)}
        />
      )}
      {waShareOpen && pdfSettings && (
        <ShareWhatsAppModal
          open={waShareOpen}
          onClose={() => setWaShareOpen(false)}
          draft={draft}
          settings={pdfSettings}
          projectName={estimationProjectName}
          estimationId={id}
          templateConfig={waTemplate}
          onToast={(msg, type) => showToast(msg, type)}
          onShared={scheduleSentPrompt}
        />
      )}

      <MarkAsSentPrompt
        open={sentPromptOpen}
        onMarkSent={handleMarkAsSent}
        onDismiss={() => setSentPromptOpen(false)}
      />

      {convertOpen && convertEstimation && (
        <ConvertEstimationWizard
          open={convertOpen}
          estimation={convertEstimation}
          onClose={() => {
            setConvertOpen(false);
            setConvertEstimation(null);
          }}
          onConverted={summary => {
            void handleConverted(summary);
          }}
        />
      )}

      <UpgradeModal
        open={upgradeOpen}
        trigger={upgradeTrigger}
        onClose={() => setUpgradeOpen(false)}
        onManageProjects={() => navigate('/app?tab=projects')}
        onConvertProject={handleOpenConvert}
      />

      <MilestoneUpsellModal
        open={milestoneOpen}
        totalAmount={milestoneTotal}
        onClose={() => setMilestoneOpen(false)}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
