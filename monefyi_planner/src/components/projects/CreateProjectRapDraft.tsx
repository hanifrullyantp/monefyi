import { useEffect, useMemo, useState } from 'react';
import { Loader2, CheckSquare, Square } from 'lucide-react';
import { generateRapDraft, type ProjectDraft } from '../../lib/migration/suggestion-engine';
import { loadRppMaster } from '../../services/rpp/masterLoader';
import type { JobTemplate } from '../../types/rpp';
import { formatRupiah } from '../../utils/projectUi';

type Props = {
  orgId: string;
  selections: Array<{ templateId: number; volume: number }>;
  onDraftChange?: (draft: ProjectDraft) => void;
};

export default function CreateProjectRapDraft({ orgId, selections, onDraftChange }: Props) {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [draft, setDraft] = useState<ProjectDraft | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const master = await loadRppMaster(orgId);
        if (cancelled) return;
        setTemplates(master.templates);
        const next = generateRapDraft({
          selections,
          templates: master.templates,
          materials: master.materials,
        });
        setDraft(next);
        onDraftChange?.(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orgId, selections, onDraftChange]);

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
    onDraftChange?.(next);
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
