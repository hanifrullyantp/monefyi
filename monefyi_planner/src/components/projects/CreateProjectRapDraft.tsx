import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, CheckSquare, Square } from 'lucide-react';
import { generateRapDraft, type ProjectDraft } from '../../lib/migration/suggestion-engine';
import { loadRppMaster } from '../../services/rpp/masterLoader';
import { useAppStore } from '../../store/appStore';
import type { JobTemplate } from '../../types/rpp';
import { formatRupiah } from '../../utils/projectUi';

type Props = {
  orgId: string;
  selections: Array<{ templateId: number; volume: number }>;
  onDraftChange?: (draft: ProjectDraft) => void;
};

export default function CreateProjectRapDraft({ orgId, selections, onDraftChange }: Props) {
  const isDemoMode = useAppStore(s => s.isDemoMode);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  const onDraftChangeRef = useRef(onDraftChange);
  onDraftChangeRef.current = onDraftChange;

  const selectionKey = useMemo(() => JSON.stringify(selections), [selections]);

  useEffect(() => {
    let cancelled = false;
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
  }, [orgId, selectionKey, isDemoMode]);

  const selectedTemplates = useMemo(
    () => selections.map(s => templates.find(t => t.id === s.templateId)).filter(Boolean) as JobTemplate[],
    [selections, templates],
  );

  const toggleMaterial = (key: string) => {
    if (!draft) return;
    const next = {
      ...draft,
      materials: draft.materials.map(m => (m.key === key ? { ...m, enabled: !m.enabled } : m)),
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

  return (
    <div className="space-y-4 text-left">
      <div className="text-sm text-slate-600">
        {selectedTemplates.map(t => t.name).join(', ')} — estimasi jual{' '}
        <strong className="text-emerald-700">{formatRupiah(draft.totalSell)}</strong>
        {' '}· biaya <strong>{formatRupiah(draft.totalCost)}</strong>
      </div>

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

      <div>
        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Timeline ({draft.timeline.length} tahap)</h4>
        <div className="flex flex-wrap gap-1">
          {draft.timeline.map(t => (
            <span key={t.name} className="text-xs bg-slate-100 px-2 py-1 rounded-full">{t.name} ({t.weight}%)</span>
          ))}
        </div>
      </div>
    </div>
  );
}
