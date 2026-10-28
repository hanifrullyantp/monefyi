import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import EstimationDetailHeaderCard from '../../components/estimator/detail/EstimationDetailHeaderCard';
import EstimationDetailBottomBar from '../../components/estimator/detail/EstimationDetailBottomBar';
import EstimationWhatsAppPickerModal from '../../components/estimator/detail/EstimationWhatsAppPickerModal';
import EstimationDocumentMenu from '../../components/estimator/detail/EstimationDocumentMenu';
import EstimationDocumentPreviewModal from '../../components/estimator/detail/EstimationDocumentPreviewModal';
import type { DocumentType } from '../../components/estimator/detail/EstimationDocumentMenu';
import type { WhatsAppEstimationPreset } from '../../lib/whatsappEstimationPresets';
import EstimationItemsTable from '../../components/estimator/EstimationItemsTable';
import EstimationAdjustmentsPanel from '../../components/estimator/EstimationAdjustmentsPanel';
import RupiahInput from '../../components/estimator/RupiahInput';
import { useEstimationSummary } from '../../hooks/useEstimationSummary';
import { useEstimationDraftHistory } from '../../hooks/useEstimationDraftHistory';
import { useUiStore } from '../../store/uiStore';
import { DEMO_ORG_ID, DEMO_USER_ID } from '../../lib/demo/demoMode';
import { createDemoEstimationDraft, createDemoPdfSettings } from '../../lib/demo/demoSeed';
import { trackDemoEvent } from '../../lib/demo/demoAnalytics';
import { defaultWhatsAppTemplateConfig } from '../../services/quotationTemplateService';
import type { EstimationFormDraft, EstimationStatus } from '../../types/estimator';
import type { PdfSettings } from '../../types/pdfSettings';
import { normalizeEstimationStatus } from '../../lib/estimationStatus';

const RESET_MS = 3 * 60 * 1000;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

export default function DemoEmbedPage() {
  const showToast = useUiStore(s => s.showToast);
  const pdfSettings = useMemoPdfSettings();
  const [draft, setDraft] = useState<EstimationFormDraft>(() => createDemoEstimationDraft());
  const [detailOpen, setDetailOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [documentMenuOpen, setDocumentMenuOpen] = useState(false);
  const [documentPreviewOpen, setDocumentPreviewOpen] = useState(false);
  const [documentPreviewType, setDocumentPreviewType] = useState<DocumentType>('penawaran');
  const [waPickerOpen, setWaPickerOpen] = useState(false);
  const [waInitialPreset, setWaInitialPreset] = useState<WhatsAppEstimationPreset>('follow_up');
  const addItemRef = useRef<(() => void) | null>(null);
  const firstInteractionSent = useRef(false);
  const draftHistory = useEstimationDraftHistory();
  const { summary, countedItemCount } = useEstimationSummary(draft);
  const waTemplate = defaultWhatsAppTemplateConfig();

  const registerAddItem = useCallback((fn: () => void) => {
    addItemRef.current = fn;
  }, []);

  const resetDemo = useCallback(() => {
    const fresh = createDemoEstimationDraft();
    setDraft(fresh);
    draftHistory.setSavedSnapshot(fresh);
    draftHistory.resetHistory();
    setDetailOpen(false);
    setBreakdownOpen(false);
    trackDemoEvent('demo_reset');
  }, [draftHistory]);

  useEffect(() => {
    const initial = createDemoEstimationDraft();
    draftHistory.setSavedSnapshot(initial);
    draftHistory.resetHistory();
    trackDemoEvent('demo_loaded');
    document.documentElement.classList.add('demo-embed-active');
    return () => document.documentElement.classList.remove('demo-embed-active');
  }, [draftHistory]);

  const [autoResetKey, setAutoResetKey] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => {
      resetDemo();
      setAutoResetKey(k => k + 1);
    }, RESET_MS);
    return () => window.clearTimeout(t);
  }, [autoResetKey, resetDemo]);

  const handleManualReset = () => {
    resetDemo();
    setAutoResetKey(k => k + 1);
  };

  const markInteraction = useCallback((event?: Parameters<typeof trackDemoEvent>[0]) => {
    if (!firstInteractionSent.current) {
      firstInteractionSent.current = true;
      trackDemoEvent('demo_first_interaction');
    }
    if (event) trackDemoEvent(event);
  }, []);

  const patch = useCallback((p: Partial<EstimationFormDraft>, opts?: { skipHistory?: boolean; track?: Parameters<typeof trackDemoEvent>[0] }) => {
    markInteraction(opts?.track);
    setDraft(prev => {
      if (!prev) return prev;
      if (!opts?.skipHistory) draftHistory.recordBeforeChange(prev);
      return { ...prev, ...p };
    });
  }, [draftHistory, markInteraction]);

  const applyStatusTransition = useCallback((next: EstimationStatus) => {
    markInteraction();
    patch({ status: normalizeEstimationStatus(next) });
  }, [markInteraction, patch]);

  const handleUndo = () => {
    const prev = draftHistory.undo(draft);
    if (prev) setDraft(prev);
  };

  const handleRedo = () => {
    const next = draftHistory.redo(draft);
    if (next) setDraft(next);
  };

  const handleDiscardChanges = () => {
    const saved = draftHistory.revertToSaved();
    if (saved) setDraft(saved);
  };

  const handleShareWhatsApp = (preset: WhatsAppEstimationPreset = 'follow_up') => {
    markInteraction('demo_wa_click');
    setWaInitialPreset(preset);
    setWaPickerOpen(true);
  };

  const handleSelectDocument = (type: DocumentType) => {
    markInteraction('demo_pdf_view');
    setDocumentPreviewType(type);
    setDocumentPreviewOpen(true);
  };

  const demoToast = () => showToast('Daftar gratis untuk fitur penuh', 'info');

  return (
    <div className="min-h-[100dvh] bg-[#f4f6f5] pb-28 max-w-[390px] mx-auto">
      <div className="sticky top-0 z-30 flex items-center justify-between gap-2 px-3 py-2 bg-emerald-900/95 text-white text-xs backdrop-blur-md border-b border-white/10">
        <span className="font-semibold truncate">Demo interaktif — data fiktif</span>
        <button
          type="button"
          onClick={handleManualReset}
          className="inline-flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 font-bold"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Mulai ulang
        </button>
      </div>

      <div className="px-3 pt-3 space-y-3">
        <EstimationDetailHeaderCard
          draft={draft}
          summary={summary}
          countedItemCount={countedItemCount}
          isNew={false}
          isReadOnly={false}
          statusChanging={false}
          onTitleChange={title => patch({ title }, { track: 'demo_item_edited' })}
          onClientNameChange={name => patch({ customer_name: name }, { track: 'demo_item_edited' })}
          onStatusTransition={applyStatusTransition}
          onAddItem={() => {
            markInteraction('demo_item_added');
            addItemRef.current?.();
          }}
          onConvert={demoToast}
          onDuplicate={demoToast}
          onDelete={demoToast}
          convertedProjectId={null}
          linkedProjectId={null}
          userId={DEMO_USER_ID}
          autoSaveStatus="saved"
        />

        <button
          type="button"
          onClick={() => {
            markInteraction('demo_detail_opened');
            setDetailOpen(v => !v);
          }}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${detailOpen ? 'rotate-180' : ''}`} />
          Detail Project
        </button>

        {detailOpen && (
          <div className="grid grid-cols-1 gap-3">
            <section className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase">Informasi Customer</h3>
              <div className="grid grid-cols-1 gap-3">
                <Field label="Customer">
                  <input
                    value={draft.customer_name}
                    onChange={e => patch({ customer_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </Field>
                <Field label="Telepon">
                  <input
                    value={draft.customer_phone}
                    onChange={e => patch({ customer_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </Field>
              </div>
            </section>
            <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setAdvancedOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-700"
              >
                Overhead, Diskon & PPN
                <span>{advancedOpen ? '▲' : '▼'}</span>
              </button>
              {advancedOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
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
                  <Field label="Diskon total (nominal Rp)">
                    <RupiahInput
                      value={draft.discount_amount}
                      onChange={v => patch({ discount_amount: v })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    />
                  </Field>
                </div>
              )}
            </section>
          </div>
        )}

        <EstimationItemsTable
          orgId={DEMO_ORG_ID}
          userId={DEMO_USER_ID}
          items={draft.items}
          defaultMargin={draft.margin_pct}
          overheadPct={draft.overhead_pct}
          discountPct={draft.discount_pct}
          discountAmount={draft.discount_amount}
          adjustments={draft.adjustments}
          taxPct={draft.tax_pct}
          billingDiscountAmount={draft.billing_config.billing_discount_amount}
          billingBonusNote={draft.billing_config.billing_bonus_note}
          onChange={items => patch({ items }, { track: 'demo_item_edited' })}
          onRegisterAddItem={registerAddItem}
        />
      </div>

      <EstimationDetailBottomBar
        draft={draft}
        summary={summary}
        navSidebarCollapsed
        embedMode
        isNew={false}
        isReadOnly={false}
        saving={false}
        showSaveActions={false}
        canUndo={draftHistory.canUndo}
        canRedo={draftHistory.canRedo}
        canDiscard={draftHistory.canDiscard && draftHistory.isDirty(draft)}
        breakdownOpen={breakdownOpen}
        onToggleBreakdown={() => setBreakdownOpen(v => !v)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onDiscardChanges={handleDiscardChanges}
        onSave={demoToast}
        onWhatsApp={() => handleShareWhatsApp('penawaran')}
        onDocument={() => {
          markInteraction();
          setDocumentMenuOpen(true);
        }}
      />

      <EstimationDocumentMenu
        open={documentMenuOpen}
        onClose={() => setDocumentMenuOpen(false)}
        onSelect={handleSelectDocument}
        draft={draft}
        summary={summary}
        billingConfig={draft.billing_config}
        onBillingConfigChange={config => patch({ billing_config: config })}
        onTagihMilestone={() => handleShareWhatsApp('penagihan')}
        isReadOnly={false}
      />

      {documentPreviewOpen && (
        <EstimationDocumentPreviewModal
          open={documentPreviewOpen}
          type={documentPreviewType}
          draft={draft}
          settings={pdfSettings}
          onClose={() => setDocumentPreviewOpen(false)}
          onEdit={() => {
            setDocumentPreviewOpen(false);
            demoToast();
          }}
          onSendWhatsApp={() => {
            setDocumentPreviewOpen(false);
            handleShareWhatsApp('penawaran');
          }}
        />
      )}

      {waPickerOpen && (
        <EstimationWhatsAppPickerModal
          open={waPickerOpen}
          onClose={() => setWaPickerOpen(false)}
          draft={draft}
          settings={pdfSettings}
          templateConfig={waTemplate}
          initialPreset={waInitialPreset}
          onToast={(msg, type) => showToast(msg, type)}
        />
      )}
    </div>
  );
}

function useMemoPdfSettings(): PdfSettings {
  const ref = useRef<PdfSettings | null>(null);
  if (!ref.current) ref.current = createDemoPdfSettings();
  return ref.current;
}
