import { useEffect, useState } from 'react';
import { HelpCircle, Building2, CheckCircle2, PencilLine } from 'lucide-react';
import type { UnknownProjectGroup, ProjectResolution } from '../../lib/batchProjectDetector';
import type { Project } from '../../store/appStore';
import type { OpexCategory } from '../../types/financeV2';
import { loadOpexCategories } from '../../services/financeV2/opexService';
import OpexCategorySelect from '../ui/OpexCategorySelect';
import { formatRupiah } from '../../utils/projectUi';
import CreateProjectQuickForm from './CreateProjectQuickForm';

interface UnknownProjectCardProps {
  unknownProject: UnknownProjectGroup;
  resolution?: ProjectResolution;
  projects: Project[];
  orgId: string;
  userId: string;
  onResolve: (resolution: ProjectResolution) => void;
  onClearResolution: () => void;
  onProjectCreated: (project: Project, mentionedName: string) => void;
}

function resolutionSummary(resolution: ProjectResolution, mentionedName: string): string {
  switch (resolution.action) {
    case 'map_existing':
    case 'created_new':
    case 'assign_anyway':
      return `Dipetakan ke project: ${resolution.projectName || mentionedName}`;
    case 'org_operational':
    case 'mark_operational':
      return resolution.orgLabel || 'Biaya organisasi / operasional';
    case 'ignore':
      return 'Diabaikan — tidak dicatat';
    case 'not_project_keyword':
      return resolution.recontextText
        ? `Koreksi teks: "${resolution.recontextText}"`
        : 'Bukan nama project — koreksi teks diterapkan';
    default:
      return 'Sudah dikonfirmasi';
  }
}

export default function UnknownProjectCard({
  unknownProject,
  resolution,
  projects,
  orgId,
  userId,
  onResolve,
  onClearResolution,
  onProjectCreated,
}: UnknownProjectCardProps) {
  const [editing, setEditing] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [mappedProjectId, setMappedProjectId] = useState('');
  const [addAlias, setAddAlias] = useState(true);
  const [whatIsThis, setWhatIsThis] = useState('');
  const [recontextText, setRecontextText] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [opexCategories, setOpexCategories] = useState<OpexCategory[]>([]);
  const [opexCategoryId, setOpexCategoryId] = useState('');
  const [opexCategoryName, setOpexCategoryName] = useState('');

  const isResolved = Boolean(resolution) && !editing;

  useEffect(() => {
    if (!orgId) return;
    loadOpexCategories(orgId).then(cats => {
      setOpexCategories(cats);
      const ops = cats.find(c => /operasional|opex|umum/i.test(c.name));
      if (ops) {
        setOpexCategoryId(ops.id);
        setOpexCategoryName(ops.name);
      }
    }).catch(() => setOpexCategories([]));
  }, [orgId]);

  const resetFormState = () => {
    setSelectedOption(null);
    setMappedProjectId('');
    setAddAlias(true);
    setWhatIsThis('');
    setRecontextText('');
    setShowCreateForm(false);
  };

  const startEditing = () => {
    onClearResolution();
    setEditing(true);
    resetFormState();
  };

  const confirmMap = (projectId: string, projectName: string, rememberAlias = addAlias) => {
    setEditing(false);
    onResolve({
      action: 'map_existing',
      projectId,
      projectName,
      addAsAlias: rememberAlias,
      whatIsThis,
    });
  };

  const confirmOrgOperational = () => {
    setEditing(false);
    const catName = opexCategoryName || opexCategories.find(c => c.id === opexCategoryId)?.name;
    onResolve({
      action: 'org_operational',
      orgOpexCategoryId: opexCategoryId || undefined,
      orgLabel: `Organisasi · ${catName || unknownProject.mentionedName}`,
      projectName: `Organisasi · ${catName || 'Operasional'}`,
      whatIsThis,
    });
  };

  if (isResolved && resolution) {
    const isOrg = resolution.action === 'org_operational' || resolution.action === 'mark_operational';
    return (
      <div className={`rounded-2xl border p-4 space-y-2 ${isOrg ? 'border-blue-200 bg-blue-50/60' : 'border-emerald-200 bg-emerald-50/60'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${isOrg ? 'text-blue-600' : 'text-emerald-600'}`} />
            <div>
              <h4 className="font-bold text-slate-800">"{unknownProject.mentionedName}"</h4>
              <p className="text-xs text-slate-600 mt-0.5">{resolutionSummary(resolution, unknownProject.mentionedName)}</p>
              <p className="text-xs text-slate-500 mt-1">
                {unknownProject.items.length} item · {formatRupiah(unknownProject.totalAmount)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={startEditing}
            className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1"
          >
            <PencilLine className="w-3 h-3" /> Ubah
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
          <HelpCircle className="w-3 h-3" /> Tidak dikenal
        </span>
        <div>
          <h4 className="font-bold text-slate-800">"{unknownProject.mentionedName}"</h4>
          <p className="text-xs text-slate-500">
            {unknownProject.items.length} item · {formatRupiah(unknownProject.totalAmount)}
          </p>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700 mb-1">
          "{unknownProject.mentionedName}" ini apa?
        </p>
        <input
          value={whatIsThis}
          onChange={e => setWhatIsThis(e.target.value)}
          placeholder="Contoh: project renovasi / nama workshop kami"
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
        />
      </div>

      {unknownProject.similarProjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-slate-500">Mungkin maksud Anda:</span>
          {unknownProject.similarProjects.map(sim => (
            <button
              key={sim.id}
              type="button"
              onClick={() => confirmMap(sim.id, sim.name, true)}
              className="text-xs px-2.5 py-1 rounded-full border bg-white border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
            >
              {sim.name} ({Math.round(sim.similarity * 100)}%) — gunakan
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => { setShowCreateForm(true); setSelectedOption('create_new'); }}
          className={`p-2 rounded-xl border text-left text-xs ${selectedOption === 'create_new' ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'}`}
        >
          <span className="font-semibold block">Buat Project Baru</span>
          <span className="text-slate-500">"{unknownProject.mentionedName}"</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedOption('map_existing')}
          className={`p-2 rounded-xl border text-left text-xs ${selectedOption === 'map_existing' ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'}`}
        >
          <span className="font-semibold block">Petakan ke Project</span>
          <span className="text-slate-500">Pilih yang sudah ada</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedOption('org_operational')}
          className={`p-2 rounded-xl border text-left text-xs ${selectedOption === 'org_operational' ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'}`}
        >
          <span className="font-semibold block flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Biaya Organisasi
          </span>
          <span className="text-slate-500">Operasional bisnis, bukan project</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedOption('not_project_keyword')}
          className={`p-2 rounded-xl border text-left text-xs ${selectedOption === 'not_project_keyword' ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'}`}
        >
          <span className="font-semibold block">Bukan nama project</span>
          <span className="text-slate-500">Bagian kalimat lain</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            onResolve({ action: 'ignore', whatIsThis });
          }}
          className="p-2 rounded-xl border border-slate-200 bg-white text-left text-xs col-span-2"
        >
          <span className="font-semibold block">Abaikan</span>
          <span className="text-slate-500">Tidak dicatat</span>
        </button>
      </div>

      {selectedOption === 'map_existing' && (
        <div className="space-y-2 bg-white rounded-xl p-3 border border-emerald-200">
          <select
            value={mappedProjectId}
            onChange={e => setMappedProjectId(e.target.value)}
            className="w-full text-sm border rounded-lg px-2 py-1.5"
          >
            <option value="">Pilih project...</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={addAlias} onChange={e => setAddAlias(e.target.checked)} />
            Ingat: "{unknownProject.mentionedName}" = project ini
          </label>
          <button
            type="button"
            disabled={!mappedProjectId}
            onClick={() => {
              const p = projects.find(pr => pr.id === mappedProjectId);
              if (p) confirmMap(p.id, p.name);
            }}
            className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-emerald-700 transition-colors"
          >
            Konfirmasi Mapping
          </button>
        </div>
      )}

      {selectedOption === 'org_operational' && (
        <div className="space-y-2 bg-white rounded-xl p-3 border border-blue-200">
          <p className="text-xs text-slate-600">
            Biaya ini dicatat di level <strong>organisasi/bisnis</strong> (opex), tidak masuk realisasi project.
          </p>
          {opexCategories.length > 0 || orgId ? (
            <OpexCategorySelect
              orgId={orgId}
              value={opexCategoryId}
              onChange={(id, name) => {
                setOpexCategoryId(id);
                if (name) setOpexCategoryName(name);
              }}
              className="w-full text-sm border rounded-lg px-2 py-1.5"
              allowEmpty
              emptyLabel="Kategori opex..."
            />
          ) : null}
          <button
            type="button"
            onClick={confirmOrgOperational}
            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Catat sebagai Biaya Organisasi
          </button>
        </div>
      )}

      {selectedOption === 'not_project_keyword' && (
        <div className="space-y-2 bg-white rounded-xl p-3 border border-slate-200">
          <p className="text-xs text-slate-600">Jelaskan kalimat lengkap tanpa anggap "{unknownProject.mentionedName}" sebagai project:</p>
          <textarea
            value={recontextText}
            onChange={e => setRecontextText(e.target.value)}
            rows={2}
            className="w-full text-sm border rounded-lg px-2 py-1.5"
            placeholder="Contoh: mesin las workshop kerjaan aloevera"
          />
          <select
            value={mappedProjectId}
            onChange={e => setMappedProjectId(e.target.value)}
            className="w-full text-sm border rounded-lg px-2 py-1.5"
          >
            <option value="">Assign ke project (opsional)</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              const p = mappedProjectId ? projects.find(pr => pr.id === mappedProjectId) : undefined;
              onResolve({
                action: p ? 'assign_anyway' : 'not_project_keyword',
                projectId: p?.id,
                projectName: p?.name,
                recontextText,
                whatIsThis,
              });
            }}
            className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold"
          >
            Terapkan Koreksi Teks
          </button>
        </div>
      )}

      {showCreateForm && (
        <CreateProjectQuickForm
          suggestedName={unknownProject.mentionedName}
          orgId={orgId}
          userId={userId}
          onCreated={project => {
            setShowCreateForm(false);
            setEditing(false);
            onProjectCreated(project, unknownProject.mentionedName);
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <div className="flex flex-wrap gap-1">
        {unknownProject.items.slice(0, 4).map(item => (
          <span key={item.id} className="text-[10px] px-2 py-0.5 bg-white border rounded-full text-slate-600">
            {item.item.slice(0, 30)} · {formatRupiah(item.total)}
          </span>
        ))}
      </div>
    </div>
  );
}
