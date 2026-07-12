import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import type { JobTemplate } from '../../types/rpp';
import { formatRupiah } from '../../utils/projectUi';

type Props = {
  template: JobTemplate;
  onClose: () => void;
};

export default function GenerateRapFromTemplateModal({ template, onClose }: Props) {
  const navigate = useNavigate();
  const { projects } = useAppStore();
  const [projectId, setProjectId] = useState(projects[0]?.id || '');

  const handleUse = () => {
    if (!projectId) return;
    onClose();
    navigate(`/app/projects/${projectId}`);
    showToastLater();
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
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border text-sm"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-500">
            Buka detail proyek → tab RAP untuk menerapkan item dari template ini (wizard smart create juga memakai template yang sama).
          </p>
          <button
            type="button"
            onClick={handleUse}
            disabled={!projectId}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-50"
          >
            Buka Proyek & RAP
          </button>
        </div>
      </div>
    </div>
  );
}

function showToastLater() {
  import('../../store/uiStore').then(({ showToast }) => {
    showToast('Buka tab RAP untuk menambahkan item dari template', 'success');
  });
}
