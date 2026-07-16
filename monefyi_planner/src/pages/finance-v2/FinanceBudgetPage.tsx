import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { showToast } from '../../store/uiStore';
import type {
  BudgetAnalysis,
  BudgetExternalData,
  BudgetInsight,
  BudgetScenarioKey,
  BudgetTemplate,
  BudgetUsahaDocument,
  BudgetViewMode,
} from '../../types/budgetUsaha';
import { documentFromTemplate } from '../../types/budgetUsaha';
import { recalculateDocument } from '../../lib/financeV2/budget/budgetCalculator';
import { generateBudgetInsights } from '../../lib/financeV2/budget/generateBudgetInsights';
import { pullExternalData } from '../../services/financeV2/budget/costAggregator';
import {
  autoSave,
  createBudgetFromTemplate,
  getOrCreateBudget,
  loadBudgetTemplates,
  saveAsTemplate,
  syncOpexFromBudget,
} from '../../services/financeV2/budget/budgetService';
import BottomActionBar from '../../components/sandbox-ui/BottomActionBar';
import BudgetHeader from '../../components/finance-v2/budget/BudgetHeader';
import BudgetBuilder from '../../components/finance-v2/budget/BudgetBuilder';
import BudgetAnalysisDivider from '../../components/finance-v2/budget/BudgetAnalysisDivider';
import BudgetAnalysis from '../../components/finance-v2/budget/BudgetAnalysis';
import BudgetInsights from '../../components/finance-v2/budget/BudgetInsights';
import BudgetScenarioSelector from '../../components/finance-v2/budget/BudgetScenarioSelector';
import BudgetTemplateModal from '../../components/finance-v2/budget/BudgetTemplateModal';

function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

export default function FinanceBudgetPage() {
  const navigate = useNavigate();
  const { tenant, projects } = useAppStore();
  const year = new Date().getFullYear();

  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [saved, setSaved] = useState(true);
  const [doc, setDoc] = useState<BudgetUsahaDocument | null>(null);
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
  const [external, setExternal] = useState<BudgetExternalData | null>(null);
  const [templates, setTemplates] = useState<BudgetTemplate[]>([]);
  const [templateModal, setTemplateModal] = useState(false);
  const [saveTemplateModal, setSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [insights, setInsights] = useState<BudgetInsight[]>([]);
  const [step, setStep] = useState(1);
  const [prevHrTotal, setPrevHrTotal] = useState<number | null>(null);
  const [prevRapTotal, setPrevRapTotal] = useState<number | null>(null);

  const externalRef = useRef<BudgetExternalData | null>(null);
  const docRef = useRef<BudgetUsahaDocument | null>(null);

  const viewMode: BudgetViewMode = doc?.period.viewMode ?? 'monthly';
  const activeTemplate = templates.find(t => t.id === doc?.templateId) ?? null;

  const runRecalc = useCallback(
    async (nextDoc: BudgetUsahaDocument, ext: BudgetExternalData) => {
      setRecalculating(true);
      try {
        const { doc: updated, analysis: nextAnalysis } = recalculateDocument(nextDoc, ext);
        setDoc(updated);
        setAnalysis(nextAnalysis);
        setInsights(generateBudgetInsights(updated, nextAnalysis));
        docRef.current = updated;

        if (tenant?.id) {
          setSaved(false);
          await autoSave(tenant.id, updated, nextAnalysis);
          setSaved(true);
        }
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Gagal menghitung analisa', 'error');
      } finally {
        setRecalculating(false);
      }
    },
    [tenant?.id],
  );

  const debouncedRecalc = useMemo(
    () =>
      debounce((nextDoc: BudgetUsahaDocument) => {
        const ext = externalRef.current;
        if (!ext) return;
        void runRecalc(nextDoc, ext);
      }, 300),
    [runRecalc],
  );

  const handleDocChange = useCallback(
    (nextDoc: BudgetUsahaDocument) => {
      setDoc(nextDoc);
      docRef.current = nextDoc;
      setSaved(false);
      debouncedRecalc(nextDoc);
    },
    [debouncedRecalc],
  );

  const refreshExternal = useCallback(async () => {
    if (!tenant?.id) return;
    const ext = await pullExternalData(tenant.id, projects, year);
    externalRef.current = ext;
    setExternal(ext);

    const hrTotal = ext.hrPayroll.totalMonthly;
    const rapTotal = ext.rapCosts.materialMonthly + ext.rapCosts.laborMonthly;
    if (prevHrTotal != null && Math.abs(hrTotal - prevHrTotal) > 500_000) {
      showToast('Budget update: data gaji HR berubah', 'info');
    }
    if (prevRapTotal != null && Math.abs(rapTotal - prevRapTotal) > 500_000) {
      showToast('Budget update: data RAP/proyek berubah', 'info');
    }
    setPrevHrTotal(hrTotal);
    setPrevRapTotal(rapTotal);

    if (docRef.current) {
      await runRecalc(docRef.current, ext);
    }
  }, [tenant?.id, projects, year, prevHrTotal, prevRapTotal, runRecalc]);

  useEffect(() => {
    if (!tenant?.id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [loadedDoc, tpls, ext] = await Promise.all([
          getOrCreateBudget(tenant.id, year),
          loadBudgetTemplates(tenant.id),
          pullExternalData(tenant.id, projects, year),
        ]);
        if (cancelled) return;
        setTemplates(tpls);
        setDoc(loadedDoc);
        docRef.current = loadedDoc;
        externalRef.current = ext;
        setExternal(ext);
        setPrevHrTotal(ext.hrPayroll.totalMonthly);
        setPrevRapTotal(ext.rapCosts.materialMonthly + ext.rapCosts.laborMonthly);

        const { doc: updated, analysis: a } = recalculateDocument(loadedDoc, ext);
        setDoc(updated);
        setAnalysis(a);
        setInsights(generateBudgetInsights(updated, a));
        docRef.current = updated;
      } catch (e) {
        if (!cancelled) {
          showToast(e instanceof Error ? e.message : 'Gagal memuat budget', 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [tenant?.id, year, projects]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void refreshExternal();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refreshExternal]);

  const handleTemplateSelect = async (template: BudgetTemplate) => {
    if (!tenant?.id) return;
    if (
      doc?.categories.length &&
      !window.confirm('Ganti template akan mengganti kategori. Lanjutkan?')
    ) {
      return;
    }
    try {
      const next =
        doc && doc.categories.length === 0
          ? documentFromTemplate(tenant.id, year, template)
          : await createBudgetFromTemplate(tenant.id, year, template.id);
      setTemplateModal(false);
      handleDocChange(next);
      showToast(`Template "${template.name}" diterapkan`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menerapkan template', 'error');
    }
  };

  const handleScenario = (key: BudgetScenarioKey) => {
    if (!doc) return;
    handleDocChange({
      ...doc,
      scenarios: { ...doc.scenarios, active: key },
    });
  };

  const handleViewMode = (mode: BudgetViewMode) => {
    if (!doc) return;
    handleDocChange({ ...doc, period: { ...doc.period, viewMode: mode } });
  };

  const handleInsightAction = (insight: BudgetInsight) => {
    if (!doc || !insight.action) return;
    if (insight.action.kind === 'simulate' && insight.action.payload?.scenario === 'aggressive') {
      handleScenario('aggressive');
      return;
    }
    if (insight.action.kind === 'apply_suggestion') {
      const targetRatio = Number(insight.action.payload?.targetRatio) || 0.08;
      const revenue = analysis?.revenue.monthlyAverage ?? 0;
      const target = Math.round(revenue * targetRatio);
      const categories = doc.categories.map(cat => {
        if (cat.name !== 'MARKETING') return cat;
        const items = [...cat.items];
        if (items.length) {
          items[0] = { ...items[0], amount: target, manualOverride: target };
        } else {
          items.push({
            id: crypto.randomUUID(),
            name: 'Marketing (saran)',
            icon: 'megaphone',
            amount: target,
            frequency: 'monthly',
            isAutoLinked: false,
          });
        }
        return { ...cat, items };
      });
      handleDocChange({ ...doc, categories });
      showToast('Saran marketing diterapkan', 'success');
    }
  };

  const handleMenuAction = async (action: 'save-template' | 'sync-opex') => {
    if (!tenant?.id || !doc) return;
    if (action === 'save-template') {
      setSaveTemplateModal(true);
      return;
    }
    try {
      const n = await syncOpexFromBudget(tenant.id, doc);
      showToast(`Sinkron ${n} entri ke Operasional`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal sinkron opex', 'error');
    }
  };

  const confirmSaveTemplate = async () => {
    if (!tenant?.id || !doc || !templateName.trim()) return;
    try {
      await saveAsTemplate(tenant.id, doc, templateName, 'Custom dari budget aktif');
      const tpls = await loadBudgetTemplates(tenant.id);
      setTemplates(tpls);
      setSaveTemplateModal(false);
      setTemplateName('');
      showToast('Template tersimpan', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan template', 'error');
    }
  };

  if (loading || !doc) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        Memuat Budget Usaha…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-[#F9FAFB] -m-4 md:-m-6 p-4 md:p-6 min-h-[60vh]">
      <BudgetHeader
        name={doc.name}
        step={step}
        saved={saved && !recalculating}
        onNameChange={name => handleDocChange({ ...doc, name })}
        onBack={() => navigate('/app/finance-v2/perencanaan')}
        onMenuAction={handleMenuAction}
      />

      <div className="mt-4 space-y-6">
        <BudgetBuilder
          doc={doc}
          template={activeTemplate}
          external={external}
          onDocChange={handleDocChange}
          onOpenTemplateModal={() => setTemplateModal(true)}
        />

        <BudgetAnalysisDivider />

        <BudgetAnalysis
          analysis={analysis}
          viewMode={viewMode}
          lastUpdated={doc.metadata.lastCalculatedAt}
          loading={recalculating}
          onViewModeChange={handleViewMode}
        />

        <BudgetInsights insights={insights} onAction={handleInsightAction} />

        <BudgetScenarioSelector scenarios={doc.scenarios} onSelect={handleScenario} />
      </div>

      <BottomActionBar
        actions={[
          {
            label: 'Kembali',
            icon: <ArrowLeft className="w-4 h-4" />,
            onClick: () => navigate('/app/finance-v2/perencanaan'),
          },
          {
            label: step < 3 ? 'Lanjut' : 'Review',
            icon: <ArrowRight className="w-4 h-4" />,
            variant: 'primary',
            onClick: () => setStep(s => Math.min(3, s + 1)),
          },
        ]}
      />

      <BudgetTemplateModal
        open={templateModal}
        templates={templates}
        currentId={doc.templateId}
        onClose={() => setTemplateModal(false)}
        onSelect={handleTemplateSelect}
      />

      {saveTemplateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setSaveTemplateModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-bold text-slate-900 mb-3">Simpan sebagai Template</h3>
            <input
              autoFocus
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder="Nama template"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setSaveTemplateModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void confirmSaveTemplate()}
                className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
