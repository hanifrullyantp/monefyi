import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import EstimationDetailHeaderCard from '../../components/estimator/detail/EstimationDetailHeaderCard';
import EstimationDetailBottomBar from '../../components/estimator/detail/EstimationDetailBottomBar';
import EstimationWhatsAppPickerModal from '../../components/estimator/detail/EstimationWhatsAppPickerModal';
import EstimationDocumentMenu from '../../components/estimator/detail/EstimationDocumentMenu';
import EstimationDocumentPreviewModal from '../../components/estimator/detail/EstimationDocumentPreviewModal';
import type { DocumentType } from '../../components/estimator/detail/EstimationDocumentMenu';
import type { KwitansiPreviewChoice } from '../../lib/kwitansiPreviewChoice';
import type { WhatsAppEstimationPreset } from '../../lib/whatsappEstimationPresets';
import type { BillingMilestone } from '../../lib/estimationBillingSchedule';
import EstimationDetailProjectCard from '../../components/estimator/detail/EstimationDetailProjectCard';
import Intero3DLaunchModal from '../../components/estimator/Intero3DLaunchModal';
import EstimationStatusHistory from '../../components/estimator/EstimationStatusHistory';
import { useShellStore } from '../../store/shellStore';
import ConvertEstimationWizard from '../../components/estimator/ConvertEstimationWizard';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useEstimationSummary } from '../../hooks/useEstimationSummary';
import { useEstimationDraftHistory } from '../../hooks/useEstimationDraftHistory';
import { useAppStore } from '../../store/appStore';
import { useUiStore } from '../../store/uiStore';
import EstimationItemsTable from '../../components/estimator/EstimationItemsTable';
import RupiahInput from '../../components/estimator/RupiahInput';
import EstimationAdjustmentsPanel from '../../components/estimator/EstimationAdjustmentsPanel';
import EstimationImageSlots from '../../components/estimator/EstimationImageSlots';
import PdfDesignCustomizer from '../../components/estimator/PdfDesignCustomizer';
import KwitansiModal from '../../components/estimator/KwitansiModal';
import ContractModal from '../../components/estimator/ContractModal';
import EstimationPaymentPanel from '../../components/estimator/EstimationPaymentPanel';
import MarkAsSentPrompt from '../../components/estimator/MarkAsSentPrompt';
import UpgradeModal from '../../components/entitlement/UpgradeModal';
import MilestoneUpsellModal from '../../components/entitlement/MilestoneUpsellModal';
import { useEntitlement } from '../../hooks/useEntitlement';
import { analytics } from '../../lib/analytics/events';
import { shouldShowMilestone5Upsell } from '../../lib/analytics/milestones';
import {
  canCreateEstimation,
  canGenerateContract,
  canGenerateKwitansi,
  FREE_ESTIMATION_LIMIT,
} from '../../lib/entitlement';
import { pdfPlanPolicyFromEntitlement } from '../../lib/pdf/pdfPlanPolicy';
import {
  loadWhatsAppTemplate,
  defaultWhatsAppTemplateConfig,
} from '../../services/quotationTemplateService';
import type { WhatsAppTemplateConfig } from '../../lib/whatsappQuotationMessage';
import { uploadPendingImages } from '../../services/estimationImageService';
import { downloadQuotationPdf } from '../../lib/pdf/generateQuotationPdf';
import { loadPdfSettings } from '../../services/pdfSettingsService';
import { displayOptionsFromDraft, type PdfSettings } from '../../types/pdfSettings';
import {
  createEstimation,
  countEstimationsInLast30Days,
  countLifetimeEstimations,
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
import type { UpgradeModalTrigger } from '../../types/entitlement';
import { ESTIMATION_STATUS_LABEL } from '../../lib/estimatorFormat';
import { isSuperAdminHanif } from '../../lib/estimatorLaunchPromo';
import type { EstimationImageDraft, EstimationStatus, Estimation } from '../../types/estimator';
import { calcEstimationSummary, countedEstimationItems, summaryOptsFromDraft } from '../../lib/estimatorCalc';
import type { EstimationFormDraft } from '../../types/estimator';
import {
  clearEstimationDraft,
  draftHasContent,
  estimationDraftKey,
  readEstimationDraft,
  writeEstimationDraft,
} from '../../lib/estimationDraftStore';
import { resolveEstimationProjectId } from '../../lib/estimationProjectLink';
import type { ProjectIncome } from '../../services/incomeService';

export default function EstimatorForm() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { tenant, user, projects, addProject, platformRole } = useAppStore();
  const setShellMeta = useShellStore(s => s.setShellMeta);
  const showToast = useUiStore(s => s.showToast);
  const navSidebarCollapsed = useAppStore(s => s.navSidebarCollapsed);
  const isHanif = isSuperAdminHanif(user?.email, platformRole);
  const [interoModalOpen, setInteroModalOpen] = useState(false);

  const [draft, setDraft] = useState<EstimationFormDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const draftStorageKey = tenant?.id && user?.id
    ? estimationDraftKey(tenant.id, user.id, id || 'new')
    : null;
  const [saving, setSaving] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const draftRef = useRef<EstimationFormDraft | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const addItemRef = useRef<(() => void) | null>(null);
  const registerAddItem = useCallback((fn: () => void) => {
    addItemRef.current = fn;
  }, []);
  const [pdfDesignOpen, setPdfDesignOpen] = useState(false);
  const [documentMenuOpen, setDocumentMenuOpen] = useState(false);
  const [documentPreviewOpen, setDocumentPreviewOpen] = useState(false);
  const [documentPreviewType, setDocumentPreviewType] = useState<DocumentType>('penawaran');
  const [kwitansiPreviewChoice, setKwitansiPreviewChoice] = useState<KwitansiPreviewChoice | null>(null);
  const [waPickerOpen, setWaPickerOpen] = useState(false);
  const [waInitialPreset, setWaInitialPreset] = useState<WhatsAppEstimationPreset>('follow_up');
  const [waAttachDocument, setWaAttachDocument] = useState<DocumentType | null>(null);
  const [waTagihMilestone, setWaTagihMilestone] = useState<BillingMilestone | null>(null);
  const [kwitansiOpen, setKwitansiOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [kwitansiLinkedIncome, setKwitansiLinkedIncome] = useState<ProjectIncome | null>(null);
  const [paymentsRefreshKey, setPaymentsRefreshKey] = useState(0);
  const [pdfSettings, setPdfSettings] = useState<PdfSettings | null>(null);
  const [waTemplate, setWaTemplate] = useState<WhatsAppTemplateConfig>(defaultWhatsAppTemplateConfig());
  const [pdfLoading, setPdfLoading] = useState(false);
  const [statusMeta, setStatusMeta] = useState<EstimationStatusTimestamps | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [sentPromptOpen, setSentPromptOpen] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertEstimation, setConvertEstimation] = useState<Estimation | null>(null);
  const [convertedProjectId, setConvertedProjectId] = useState<string | null>(null);
  const [convertedProjectName, setConvertedProjectName] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeTrigger, setUpgradeTrigger] = useState<UpgradeModalTrigger>('estimation_accepted');
  const [upgradeFeatureName, setUpgradeFeatureName] = useState<string | undefined>();
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [milestoneTotal, setMilestoneTotal] = useState(0);
  const entitlement = useEntitlement();
  const {
    canCreateProject,
    isEstimator,
    remainingProjectSlots,
    tier,
    currentActiveProjects,
    isEstimatorPro,
  } = entitlement;

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

  const {
    setSavedSnapshot,
    getSavedNamedItemCount,
    isDirty,
  } = draftHistory;

  const persistDraft = useCallback(async (payload: EstimationFormDraft) => {
    if (!tenant?.id || !user?.id || isNew || !id || payload.status === 'converted') return;
    const namedCount = payload.items.filter(i => i.name.trim()).length;
    const savedNamedCount = getSavedNamedItemCount();
    if (namedCount === 0 && savedNamedCount > 0) {
      console.error('Auto-save blocked: refusing to wipe estimation items', { id, savedNamedCount });
      return;
    }
    let images = payload.images;
    const hadPendingUploads = images.some(img => img.pendingFile);
    if (hadPendingUploads) {
      images = await uploadPendingImages(tenant.id, id, images);
    }
    const saved = { ...payload, images };
    await updateEstimation(id, saved);
    if (draftStorageKey) clearEstimationDraft(draftStorageKey);
    setSavedSnapshot(saved);
    if (hadPendingUploads) {
      patch({ images }, { skipHistory: true });
    }
  }, [tenant?.id, user?.id, isNew, id, patch, getSavedNamedItemCount, setSavedSnapshot, draftStorageKey]);

  const saveHandlerRef = useRef<() => Promise<boolean>>(async () => false);

  const autoSave = useAutoSave<EstimationFormDraft>({
    debounceMs: 1200,
    onSave: persistDraft,
    onError: () => showToast('Auto-save gagal', 'error'),
  });

  const { schedule: scheduleAutoSave, discard: discardAutoSave } = autoSave;

  useEffect(() => {
    if (!draftStorageKey || !draft || loading || draft.status === 'converted') return;
    if (!isDirty(draft) || (isNew && !draftHasContent(draft))) return;
    try {
      writeEstimationDraft(draftStorageKey, draft, false);
    } catch (error) {
      console.error('Draft lokal gagal disimpan:', error);
    }
  }, [draftStorageKey, draft, loading, isDirty, isNew]);

  useEffect(() => {
    if (!draftStorageKey) return;
    const persistOnExit = () => {
      const latest = draftRef.current;
      if (!latest || latest.status === 'converted' || !isDirty(latest)) return;
      if (isNew && !draftHasContent(latest)) return;
      try {
        writeEstimationDraft(draftStorageKey, latest, true);
      } catch (error) {
        console.error('Draft lokal gagal disimpan saat keluar:', error);
      }
      if (!isNew && id) {
        void updateEstimation(id, latest).catch(error => {
          console.error('Simpan otomatis saat keluar gagal:', error);
        });
      }
    };
    window.addEventListener('pagehide', persistOnExit);
    return () => window.removeEventListener('pagehide', persistOnExit);
  }, [draftStorageKey, isDirty, isNew, id]);

  const handleBeforeLeaveList = useCallback(() => {
    discardAutoSave();
  }, [discardAutoSave]);

  const goBackToList = useCallback(() => {
    if (!draftRef.current || !isDirty(draftRef.current)) {
      handleBeforeLeaveList();
      navigate('/app/estimator', { replace: true });
      return;
    }
    const shouldSave = window.confirm('Ada perubahan belum disimpan. OK = simpan sebelum kembali; Batal = buang perubahan dan kembali.');
    if (shouldSave) {
      void saveHandlerRef.current().then(saved => {
        if (!saved) return;
        if (draftStorageKey) clearEstimationDraft(draftStorageKey);
        navigate('/app/estimator', { replace: true });
      });
    } else {
      discardAutoSave();
      if (draftStorageKey) clearEstimationDraft(draftStorageKey);
      navigate('/app/estimator', { replace: true });
    }
  }, [handleBeforeLeaveList, isDirty, navigate, discardAutoSave, draftStorageKey]);

  useEffect(() => {
    setShellMeta({
      estimatorCode: draft?.code || null,
      onEstimatorBack: goBackToList,
    });
    return () => setShellMeta({ estimatorCode: null, onEstimatorBack: null });
  }, [draft?.code, goBackToList, setShellMeta]);

  useEffect(() => {
    if (!draft || isNew || isReadOnly || loading) return;
    if (!isDirty(draft)) return;
    scheduleAutoSave(draft);
  }, [draft, isNew, isReadOnly, loading, scheduleAutoSave, isDirty]);

  useEffect(() => {
    if (!tenant?.id) return;

    let cancelled = false;
    discardAutoSave();

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
          const freshDraft = {
            ...newEstimationDraft(code, Number(settings.default_dp_pct) || 50, settings.default_billing_milestones),
            pdf_template: settings.default_pdf_template,
            pdf_invoice_template: settings.default_invoice_template || settings.default_pdf_template,
            pdf_primary_color: settings.primary_color,
            pdf_secondary_color: settings.secondary_color,
          };
          const stored = draftStorageKey ? readEstimationDraft(draftStorageKey) : null;
          if (stored && draftHasContent(stored.draft)) {
            if (stored.promoteOnReturn && stored.draft.title.trim() && user?.id) {
              try {
                const created = await createEstimation(tenant.id, user.id, stored.draft);
                if (draftStorageKey) clearEstimationDraft(draftStorageKey);
                if (!cancelled) navigate(`/app/estimator/${created.id}`, { replace: true });
                return;
              } catch (error) {
                console.error('Promosi draft baru gagal:', error);
                showToast('Draft tersimpan, tetapi belum bisa dijadikan estimasi', 'error');
              }
            }
            setDraft(stored.draft);
          } else {
            setDraft(freshDraft);
          }
        } else {
          const est = await loadEstimation(id);
          if (!est) {
            showToast('Estimasi tidak ditemukan', 'error');
            navigate('/app/estimator');
            return;
          }
          const formDraft = await estimationToFormDraft(est);
          if (cancelled) return;
          const loadedDraft = {
            ...formDraft,
            pdf_primary_color: est.pdf_primary_color || settings.primary_color,
            pdf_secondary_color: est.pdf_secondary_color || settings.secondary_color,
            pdf_template: est.pdf_template || settings.default_pdf_template,
            pdf_invoice_template: est.pdf_invoice_template || settings.default_invoice_template || settings.default_pdf_template,
          };
          const stored = draftStorageKey ? readEstimationDraft(draftStorageKey) : null;
          const serverUpdatedAt = new Date(est.updated_at || 0).getTime();
          const shouldPromote = Boolean(
            stored
            && stored.promoteOnReturn
            && stored.savedAt > serverUpdatedAt
            && draftHasContent(stored.draft),
          );
          if (shouldPromote && stored) {
            try {
              await updateEstimation(id, stored.draft);
              if (draftStorageKey) clearEstimationDraft(draftStorageKey);
              setDraft(stored.draft);
              draftHistory.resetHistory();
              draftHistory.setSavedSnapshot(stored.draft);
              showToast('Perubahan terakhir disimpan otomatis', 'success');
            } catch (error) {
              console.error('Promosi draft gagal:', error);
              setDraft(stored.draft);
              draftHistory.resetHistory();
              draftHistory.setSavedSnapshot(loadedDraft);
              showToast('Draft lokal dipulihkan. Simpan manual untuk mengunci perubahan.', 'error');
            }
          } else {
            if (stored && stored.savedAt <= serverUpdatedAt && draftStorageKey) {
              clearEstimationDraft(draftStorageKey);
            }
            setDraft(stored && stored.savedAt > serverUpdatedAt ? stored.draft : loadedDraft);
            draftHistory.resetHistory();
            draftHistory.setSavedSnapshot(loadedDraft);
          }
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
          setUpdatedAt(est.updated_at ?? null);
          setConvertedProjectId(est.converted_project_id ?? null);
          if (est.converted_project_id) {
            const linked = useAppStore.getState().projects.find(p => p.id === est.converted_project_id);
            if (linked) {
              setConvertedProjectName(linked.name || est.title);
            } else {
              // Jika proyek terkait sudah dihapus atau tidak ditemukan di daftar proyek aktif:
              setConvertedProjectName(null);
              // Otomatis bebaskan status converted pada draft jika proyek sudah tidak ada
              if (loadedDraft.status === 'converted') {
                loadedDraft.status = 'selesai';
              }
            }
          } else {
            setConvertedProjectName(null);
          }
          setDetailOpen(false);
        }
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Gagal memuat', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void init();
    return () => {
      cancelled = true;
      discardAutoSave();
    };
  }, [tenant?.id, user?.id, id, isNew, navigate, showToast, discardAutoSave, draftStorageKey]);

  const estimationProjectName = useMemo(() => {
    if (!draft) return '';
    const linkedId = resolveEstimationProjectId({
      project_id: draft.project_id,
      converted_project_id: convertedProjectId,
    });
    return (linkedId && projects.find(p => p.id === linkedId)?.name) || draft.title;
  }, [draft, projects, convertedProjectId]);

  const linkedProjectId = useMemo(() => {
    if (!draft) return null;
    return resolveEstimationProjectId({
      project_id: draft.project_id,
      converted_project_id: convertedProjectId,
    });
  }, [draft, convertedProjectId]);

  const linkedProjectName = useMemo(() => {
    if (!linkedProjectId) return undefined;
    return projects.find(p => p.id === linkedProjectId)?.name;
  }, [linkedProjectId, projects]);

  const { summary, countedItemCount } = useEstimationSummary(draft);
  const summaryTotal = summary.grandTotal;

  const showSaveActions = !isReadOnly && (
    isNew
    || (draft ? isDirty(draft) : false)
    || draftHistory.canUndo
    || draftHistory.canRedo
    || autoSave.status === 'pending'
    || autoSave.status === 'error'
  );

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
    if (draftStorageKey) clearEstimationDraft(draftStorageKey);
    showToast('Perubahan dibatalkan', 'success');
  };

  const handleSave = async (): Promise<boolean> => {
    if (!draft || !tenant?.id || !user?.id) return false;
    if (isReadOnly) {
      showToast('Estimasi sudah menjadi proyek dan tidak bisa diedit', 'error');
      return false;
    }
    if (!draft.title.trim()) {
      showToast('Judul estimasi wajib diisi', 'error');
      return false;
    }

    setSaving(true);
    try {
      let images: EstimationImageDraft[] = draft.images;

      if (isNew) {
        const lifetimeCount = await countLifetimeEstimations(tenant.id);
        if (!canCreateEstimation(entitlement, lifetimeCount)) {
          showToast(
            `Kuota gratis ${FREE_ESTIMATION_LIMIT} estimasi habis. Upgrade untuk lanjut.`,
            'error',
          );
          setUpgradeTrigger('estimator_paywall');
          setUpgradeFeatureName(`Kuota gratis ${FREE_ESTIMATION_LIMIT} estimasi habis`);
          setUpgradeOpen(true);
          return false;
        }
        const created = await createEstimation(tenant.id, user.id, draft);
        const itemCount = draft.items.filter(i => i.name.trim()).length;
        const totalAmount = calcEstimationSummary(
          countedEstimationItems(draft.items),
          draft.overhead_pct,
          draft.discount_pct,
          draft.tax_pct,
          summaryOptsFromDraft(draft),
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
        if (draftStorageKey) clearEstimationDraft(draftStorageKey);
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
        if (draftStorageKey) clearEstimationDraft(draftStorageKey);
        showToast('Perubahan disimpan', 'success');
      }
      return true;
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };
  saveHandlerRef.current = handleSave;

  const requireSaved = (): boolean => {
    if (isNew) {
      showToast('Simpan draft terlebih dahulu sebelum generate PDF', 'error');
      return false;
    }
    if (!draft?.title.trim()) {
      showToast('Judul estimasi wajib diisi', 'error');
      return false;
    }
    return true;
  };

  const scheduleSentPrompt = useCallback(() => {
    if (draft?.status !== 'wa') return;
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
        displayOptionsFromDraft(draft),
        estimationProjectName,
        pdfPlanPolicyFromEntitlement(entitlement),
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

  const handleShareWhatsApp = (preset: WhatsAppEstimationPreset = 'follow_up') => {
    if (!requireSaved()) return;
    setWaAttachDocument(null);
    setWaTagihMilestone(null);
    setWaInitialPreset(preset);
    setWaPickerOpen(true);
  };

  const handleTagihMilestone = (milestone: BillingMilestone) => {
    if (!requireSaved()) return;
    setWaAttachDocument(null);
    setWaTagihMilestone(milestone);
    setWaInitialPreset('penagihan');
    setWaPickerOpen(true);
  };

  const handleOpenDocumentMenu = () => {
    if (!requireSaved()) return;
    setDocumentMenuOpen(true);
  };

  const handleSelectDocument = (type: DocumentType, kwitansi?: KwitansiPreviewChoice) => {
    setDocumentPreviewType(type);
    setKwitansiPreviewChoice(type === 'kwitansi' ? (kwitansi ?? null) : null);
    setDocumentPreviewOpen(true);
  };

  const handleDocumentPreviewBack = () => {
    setDocumentPreviewOpen(false);
    setKwitansiPreviewChoice(null);
    setDocumentMenuOpen(true);
  };

  const handleDocumentEdit = (type: DocumentType) => {
    setDocumentPreviewOpen(false);
    if (type === 'kwitansi') {
      void handleOpenKwitansi();
      return;
    }
    setPdfDesignOpen(true);
    setDetailOpen(true);
  };

  const handleDocumentWhatsApp = (type: DocumentType) => {
    setDocumentPreviewOpen(false);
    if (!requireSaved()) return;
    if (type === 'kwitansi' && !canGenerateKwitansi(entitlement)) {
      setUpgradeFeatureName('Generator Kwitansi Pro');
      setUpgradeTrigger('estimator_pro_feature');
      setUpgradeOpen(true);
      return;
    }
    setWaAttachDocument(type);
    setWaTagihMilestone(null);
    setWaInitialPreset(type === 'penawaran' ? 'penawaran' : 'penagihan');
    setWaPickerOpen(true);
  };

  const handleOpenKwitansi = async (linkedIncome?: ProjectIncome) => {
    if (!requireSaved() || !tenant?.id) return;
    if (!canGenerateKwitansi(entitlement)) {
      setUpgradeFeatureName('Generator Kwitansi Pro');
      setUpgradeTrigger('estimator_pro_feature');
      setUpgradeOpen(true);
      return;
    }
    setPdfLoading(true);
    try {
      const settings = pdfSettings ?? await loadPdfSettings(tenant.id, tenant.name);
      if (!pdfSettings) setPdfSettings(settings);
      setKwitansiLinkedIncome(linkedIncome ?? null);
      setKwitansiOpen(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat pengaturan PDF', 'error');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleOpenContract = async () => {
    if (!requireSaved() || !tenant?.id) return;
    if (!canGenerateContract(entitlement)) {
      setUpgradeFeatureName('Generator Surat Perjanjian Pro');
      setUpgradeTrigger('estimator_pro_feature');
      setUpgradeOpen(true);
      return;
    }
    setPdfLoading(true);
    try {
      const settings = pdfSettings ?? await loadPdfSettings(tenant.id, tenant.name);
      if (!pdfSettings) setPdfSettings(settings);
      setContractOpen(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat pengaturan PDF', 'error');
    } finally {
      setPdfLoading(false);
    }
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
      assertEstimationConvertible(est, projects);
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
      const lifetimeCount = await countLifetimeEstimations(tenant.id);
      if (!canCreateEstimation(entitlement, lifetimeCount)) {
        showToast(`Kuota gratis ${FREE_ESTIMATION_LIMIT} estimasi habis. Upgrade untuk lanjut.`, 'error');
        setUpgradeTrigger('estimator_paywall');
        setUpgradeFeatureName(`Kuota gratis ${FREE_ESTIMATION_LIMIT} estimasi habis`);
        setUpgradeOpen(true);
        return;
      }
      const copy = await duplicateEstimation(id, tenant.id, user.id);
      showToast('Estimasi diduplikasi', 'success');
      navigate(`/app/estimator/${copy.id}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menduplikasi', 'error');
    }
  };

  const handleDelete = async () => {
    if (isNew || !id || !draft) return;
    if (!window.confirm(`Hapus estimasi "${draft.title}"?\nEstimasi akan dipindahkan ke arsip selama 30 hari sebelum dihapus permanen.`)) return;
    try {
      await deleteEstimation(id, user?.id);
      showToast('Estimasi dipindahkan ke arsip (dihapus setelah 30 hari)', 'success');
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
    <div className="w-full max-w-[100rem] mx-auto px-3 sm:px-5 py-4 pb-52 lg:pb-32 overflow-x-hidden bg-[#F4F7F5] min-h-full">
      {isReadOnly && convertedProjectId && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/80 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-xs shadow-xs">
              🚀
            </span>
            <div>
              <p className="text-xs font-bold text-teal-900">
                Terhubung dengan Proyek: &ldquo;{convertedProjectName || linkedProjectName || draft.title}&rdquo;
              </p>
              <p className="text-[11px] text-teal-700">
                Data estimasi ini terhubung aktif dengan timeline &amp; RAP proyek.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/app/projects/${convertedProjectId}`)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 shrink-0"
          >
            Buka Proyek →
          </button>
        </div>
      )}
      {isReadOnly && !convertedProjectId && (
        <div className="mb-4 px-4 py-3 bg-teal-50 border border-teal-200 rounded-xl text-sm text-teal-800">
          Estimasi ini sudah menjadi proyek — mode arsip/baca.
        </div>
      )}

      {draft && (
        <EstimationDetailHeaderCard
          draft={draft}
          summary={summary}
          countedItemCount={countedItemCount}
          isNew={isNew}
          isReadOnly={isReadOnly}
          statusChanging={statusChanging}
          onTitleChange={title => patch({ title })}
          onClientNameChange={name => patch({ customer_name: name })}
          onStatusTransition={next => { void applyStatusTransition(next, { skipConfirm: true }); }}
          onConvert={handleOpenConvert}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          convertedProjectId={convertedProjectId}
          linkedProjectId={linkedProjectId}
          linkedProjectName={linkedProjectName}
          sentAt={statusMeta?.sent_at}
          updatedAt={updatedAt}
          waAt={statusMeta?.wa_at}
          userId={user?.id}
          autoSaveStatus={autoSave.status}
          onRetryAutoSave={() => draftRef.current && autoSave.flush()}
          onLaunchIntero3D={() => setInteroModalOpen(true)}
          isSuperAdmin={isHanif}
        />
      )}

      {draft && (
        <div className="mt-3 mb-4" id="estimation-client-tab">
          <EstimationDetailProjectCard
            open={detailOpen}
            onToggle={() => setDetailOpen(v => !v)}
            draft={draft}
            updatedAt={updatedAt}
            isReadOnly={isReadOnly}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
          </EstimationDetailProjectCard>
        </div>
      )}

      {!isNew && linkedProjectId && tenant?.id && user?.id && draft && (
        <div className="mb-4">
          <EstimationPaymentPanel
            key={paymentsRefreshKey}
            projectId={linkedProjectId}
            projectName={linkedProjectName}
            estimationId={id!}
            orgId={tenant.id}
            userId={user.id}
            draft={draft}
            isReadOnly={isReadOnly}
            onOpenKwitansi={handleOpenKwitansi}
            onPaymentsChanged={() => setPaymentsRefreshKey(k => k + 1)}
          />
        </div>
      )}

      {/* Tabel item */}
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
        billingDiscountAmount={draft.billing_config.billing_discount_amount}
        billingBonusNote={draft.billing_config.billing_bonus_note}
        onChange={items => patch({ items })}
        readOnly={isReadOnly}
        onRegisterAddItem={registerAddItem}
      />

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

      <EstimationDetailBottomBar
        draft={draft}
        summary={summary}
        navSidebarCollapsed={navSidebarCollapsed}
        isNew={isNew}
        isReadOnly={isReadOnly}
        saving={saving}
        showSaveActions={showSaveActions}
        canUndo={draftHistory.canUndo}
        canRedo={draftHistory.canRedo}
        canDiscard={draftHistory.canDiscard && isDirty(draft)}
        breakdownOpen={breakdownOpen}
        onToggleBreakdown={() => setBreakdownOpen(v => !v)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onDiscardChanges={handleDiscardChanges}
        onSave={handleSave}
        onWhatsApp={() => handleShareWhatsApp('follow_up')}
        onDocument={handleOpenDocumentMenu}
      />

      <EstimationDocumentMenu
        open={documentMenuOpen}
        onClose={() => setDocumentMenuOpen(false)}
        onSelect={handleSelectDocument}
        draft={draft}
        summary={summary}
        billingConfig={draft.billing_config}
        onBillingConfigChange={config => patch({ billing_config: config })}
        onTagihMilestone={handleTagihMilestone}
        projectId={linkedProjectId}
        projectName={linkedProjectName}
        estimationId={id}
        orgId={tenant?.id}
        userId={user?.id}
        isReadOnly={isReadOnly}
        onPaymentsChanged={() => setPaymentsRefreshKey(k => k + 1)}
        onOpenContract={handleOpenContract}
      />

      {contractOpen && pdfSettings && (
        <ContractModal
          open={contractOpen}
          draft={draft}
          settings={pdfSettings}
          onClose={() => setContractOpen(false)}
          onToast={(msg, type) => showToast(msg, type)}
        />
      )}

      {documentPreviewOpen && pdfSettings && (
        <EstimationDocumentPreviewModal
          open={documentPreviewOpen}
          type={documentPreviewType}
          draft={draft}
          settings={pdfSettings}
          projectName={estimationProjectName}
          projectId={linkedProjectId}
          kwitansiChoice={kwitansiPreviewChoice}
          onClose={() => {
            setDocumentPreviewOpen(false);
            setKwitansiPreviewChoice(null);
          }}
          onBack={handleDocumentPreviewBack}
          onEdit={handleDocumentEdit}
          onSendWhatsApp={handleDocumentWhatsApp}
        />
      )}

      {waPickerOpen && pdfSettings && (
        <EstimationWhatsAppPickerModal
          open={waPickerOpen}
          onClose={() => {
            setWaPickerOpen(false);
            setWaTagihMilestone(null);
            setWaAttachDocument(null);
          }}
          draft={draft}
          settings={pdfSettings}
          projectName={estimationProjectName}
          estimationId={id}
          templateConfig={waTemplate}
          initialPreset={waInitialPreset}
          tagihMilestone={waTagihMilestone}
          attachDocument={waAttachDocument}
          projectId={linkedProjectId}
          onToast={(msg, type) => showToast(msg, type)}
          onShared={scheduleSentPrompt}
        />
      )}

      {kwitansiOpen && pdfSettings && draft && (
        <KwitansiModal
          open={kwitansiOpen}
          draft={draft}
          settings={pdfSettings}
          onClose={() => {
            setKwitansiOpen(false);
            setKwitansiLinkedIncome(null);
          }}
          onToast={(msg, type) => showToast(msg, type)}
          projectId={linkedProjectId}
          estimationId={id ?? undefined}
          userId={user?.id}
          orgId={tenant?.id}
          linkedIncome={kwitansiLinkedIncome}
          onPaymentSynced={() => setPaymentsRefreshKey(k => k + 1)}
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
        featureName={upgradeFeatureName}
        onClose={() => setUpgradeOpen(false)}
        onManageProjects={() => navigate('/app?tab=projects')}
        onConvertProject={handleOpenConvert}
      />

      <MilestoneUpsellModal
        open={milestoneOpen}
        totalAmount={milestoneTotal}
        onClose={() => setMilestoneOpen(false)}
      />

      {draft && isHanif && (
        <Intero3DLaunchModal
          open={interoModalOpen}
          onClose={() => setInteroModalOpen(false)}
          draft={draft}
          items={draft.items}
        />
      )}
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
