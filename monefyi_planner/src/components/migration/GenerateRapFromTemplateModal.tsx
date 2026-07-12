import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import type { JobTemplate } from '../../types/rpp';
import { formatRupiah } from '../../utils/projectUi';
import { generateRapDraft } from '../../lib/migration/suggestion-engine';
import { createRapItem, syncProjectBudgetFromRap } from '../../services/rapService';
import { loadRppMaster } from '../../services/rpp/masterLoader';
import { showToast } from '../../store/uiStore';

type Props = {
  template: JobTemplate;
  onClose: () => void;
};

export default function GenerateRapFromTemplateModal({ template, onClose }: Props) {
  const navigate = useNavigate();
  const { projects, tenant } = useAppStore();
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [volume, setVolume] = useState(3);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!projectId || !tenant?.id) return;
    setLoading(true);
    try {
      const master = await loadRppMaster(tenant.id);
      const draft = generateRapDraft({
        selections: [{ templateId: template.id, volume }],
        templates: master.templates,
        materials: master.materials,
        projects,
      });

      let sortOrder = 0;
      for (const m of draft.materials.filter(x => x.enabled)) {
        await createRapItem({
          project_id: projectId,
          type: 'material',
          name: m.name,
          unit: m.unit,
          quantity: m.qtyPlan,
          unit_price: m.unitPrice,
          sort_order: sortOrder++,
        });
      }
      for (const w of draft.workers.filter(x => x.enabled)) {
        await createRapItem({
          project_id: projectId,
          type: 'labor',
          name: w.name,
          unit: w.unit,
          quantity: w.qtyPlan,
          unit_price: w.unitPrice,
          sort_order: sortOrder++,
        });
      }
      await syncProjectBudgetFromRap(projectId);
      showToast(`${sortOrder} item RAP ditambahkan dari template`, 'success');
      onClose();
      navigate(`/app/projects/${projectId}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal generate RAP', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2 font-bold">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Generate RAP dari Template
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <div className="font-black text-slate-900">{template.name}</div>
            <div className="text-sm text-slate-500">{template.category} · per {template.baseUnit}</div>
            <div className="text-xs text-slate-500 mt-1">
              {template.materials.length} bahan · {template.workers.length} tenaga · Est. {formatRupiah(template.estCostPerUnit || 0)}/unit
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Pilih Proyek</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border text-sm">
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Volume ({template.baseUnit})</label>
            <input type="number" min={0.1} step={0.1} value={volume}
              onChange={e => setVolume(Number(e.target.value) || 1)}
              className="mt-1 w-full px-3 py-2 rounded-xl border text-sm" />
          </div>
          <button type="button" onClick={handleGenerate} disabled={!projectId || loading}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : 'Generate & Simpan ke RAP'}
          </button>
        </div>
      </div>
    </div>
  );
}
