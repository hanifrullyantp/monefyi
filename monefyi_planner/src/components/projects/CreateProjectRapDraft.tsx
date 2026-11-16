import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, CheckSquare, Square } from 'lucide-react';
import { generateRapDraft, type ProjectDraft } from '../../lib/migration/suggestion-engine';
import {
  recalculateDraftTotals,
  starterTemplateToProjectDraft,
  type ProjectStarterTemplate,
} from '../../lib/migration/starter-templates';
import { loadRppMaster } from '../../services/rpp/masterLoader';
import { useAppStore } from '../../store/appStore';
import type { JobTemplate } from '../../types/rpp';
import { formatRupiah } from '../../utils/projectUi';

type Props = {
  orgId: string;
  selections: Array<{ templateId: number; volume: number }>;
  starterTemplate?: ProjectStarterTemplate | null;
  starterScale?: number;
  onDraftChange?: (draft: ProjectDraft) => void;
};

export default function CreateProjectRapDraft({
  orgId,
  selections,
  starterTemplate = null,
  starterScale = 1,
  onDraftChange,
}: Props) {
  const isDemoMode = useAppStore(s => s.isDemoMode);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  const onDraftChangeRef = useRef(onDraftChange);
  onDraftChangeRef.current = onDraftChange;
  const starterTemplateRef = useRef(starterTemplate);
  starterTemplateRef.current = starterTemplate;

  const selectionKey = useMemo(() => JSON.stringify(selections), [selections]);
  const starterId = starterTemplate?.id ?? '';

  useEffect(() => {
    let cancelled = false;
    const activeStarterTemplate = starterTemplateRef.current;

    if (activeStarterTemplate) {
      const nextStarterDraft = starterTemplateToProjectDraft(activeStarterTemplate, starterScale);
      setTemplates([]);
      setDraft(nextStarterDraft);
      onDraftChangeRef.current?.(nextStarterDraft);
      setLoading(false);
      return () => { cancelled = true; };
    }

    const parsedSelections = JSON.parse(selectionKey) as Props['selections'];

    if (!orgId || isDemoMode || orgId === 'demo') {
      const emptyDraft = generateRapDraft({
        selections: parsedSelections,
        templates: [],
        materials: [],
      });
      setTemplates([]);
      setDraft(emptyDraft);
      onDraftChangeRef.current?.(emptyDraft);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const master = await loadRppMaster(orgId);
        if (cancelled) return;
        setTemplates(master.templates);
        const next = generateRapDraft({
          selections: parsedSelections,
          templates: master.templates,
          materials: master.materials,
        });
        setDraft(next);
        onDraftChangeRef.current?.(next);
      } catch {
        if (cancelled) return;
        const fallback = generateRapDraft({
          selections: parsedSelections,
          templates: [],
          materials: [],
        });
        setTemplates([]);
        setDraft(fallback);
        onDraftChangeRef.current?.(fallback);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orgId, selectionKey, isDemoMode, starterId, starterScale]);

  const selectedTemplates = useMemo(
    () => selections.map(s => templates.find(t => t.id === s.templateId)).filter(Boolean) as JobTemplate[],
    [selections, templates],
  );

  const toggleMaterial = (key: string) => {
    if (!draft) return;
    const materials = draft.materials.map(m => (m.key === key ? { ...m, enabled: !m.enabled } : m));
    const next = starterTemplate
      ? recalculateDraftTotals({ ...draft, materials }, starterTemplate.defaultMarginPct)
      : { ...draft, materials };
    setDraft(next);
    onDraftChangeRef.current?.(next);
  };

  const toggleWorker = (key: string) => {
    if (!draft) return;
    const workers = draft.workers.map(w => (w.key === key ? { ...w, enabled: !w.enabled } : w));
    const next = starterTemplate
      ? recalculateDraftTotals({ ...draft, workers }, starterTemplate.defaultMarginPct)
      : { ...draft, workers };
    setDraft(next);
    onDraftChangeRef.current?.(next);
  };

  const toggleTimelineStep = (name: string) => {
    if (!draft) return;
    const next: ProjectDraft = {
      ...draft,
      timeline: draft.timeline.map(t => (t.name === name ? { ...t, enabled: !t.enabled } : t)),
    };
    setDraft(next);
    onDraftChangeRef.current?.(next);
  };

  if (loading || !draft) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  const headerTitle = starterTemplate
    ? `${starterTemplate.name} (${starterTemplate.categoryLabel})`
    : selectedTemplates.map(t => t.name).join(', ');

  return (
    <div className="space-y-4 text-left">
      <div className="text-sm text-slate-600">
        {headerTitle ? `${headerTitle} — ` : ''}estimasi jual{' '}
        <strong className="text-emerald-700">{formatRupiah(draft.totalSell)}</strong>
        {' '}· biaya <strong>{formatRupiah(draft.totalCost)}</strong>
      </div>

      {starterTemplate ? (
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">
            Pos Anggaran &amp; Tim ({draft.workers.length + draft.materials.length})
          </h4>
          <div className="max-h-44 overflow-y-auto space-y-1">
            {draft.workers.map(w => (
              <button
                key={w.key}
                type="button"
                onClick={() => toggleWorker(w.key)}
                className="w-full flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg hover:bg-slate-50"
              >
                {w.enabled ? <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" /> : <Square className="w-4 h-4 text-slate-300 shrink-0" />}
                <span className="flex-1 text-left truncate">{w.name}</span>
                <span className="text-xs text-slate-500 shrink-0">{w.qtyPlan} {w.unit}</span>
                <span className="text-xs font-semibold shrink-0">{formatRupiah(w.qtyPlan * w.unitPrice)}</span>
              </button>
            ))}
            {draft.materials.map(m => (
              <button
                key={m.key}
                type="button"
                onClick={() => toggleMaterial(m.key)}
                className="w-full flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg hover:bg-slate-50"
              >
                {m.enabled ? <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" /> : <Square className="w-4 h-4 text-slate-300 shrink-0" />}
                <span className="flex-1 text-left truncate">{m.name}</span>
                <span className="text-xs text-slate-500 shrink-0">{m.qtyPlan} {m.unit}</span>
                <span className="text-xs font-semibold shrink-0">{formatRupiah(m.qtyPlan * m.unitPrice)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Material RAP ({draft.materials.length})</h4>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {draft.materials.map(m => (
              <button
                key={m.key}
                type="button"
                onClick={() => toggleMaterial(m.key)}
                className="w-full flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg hover:bg-slate-50"
              >
                {m.enabled ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                <span className="flex-1 text-left">{m.name}</span>
                <span className="text-xs text-slate-500">{m.qtyPlan} {m.unit}</span>
                <span className="text-xs font-semibold">{formatRupiah(m.qtyPlan * m.unitPrice)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">
          Timeline ({draft.timeline.filter(t => t.enabled).length}/{draft.timeline.length} tahap)
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {draft.timeline.map(t => (
            <button
              key={t.name}
              type="button"
              onClick={() => toggleTimelineStep(t.name)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                t.enabled
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium'
                  : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
              }`}
            >
              {t.name} ({t.weight}%)
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
