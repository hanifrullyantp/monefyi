import { useState } from 'react';
import { HelpCircle, CheckCircle } from 'lucide-react';
import type { UnknownProjectGroup, ProjectResolution } from '../../lib/batchProjectDetector';
import type { Project } from '../../store/appStore';
import { formatRupiah } from '../../utils/projectUi';
import CreateProjectQuickForm from './CreateProjectQuickForm';

interface UnknownProjectCardProps {
  unknownProject: UnknownProjectGroup;
  projects: Project[];
  orgId: string;
  userId: string;
  isResolved: boolean;
  resolvedValue?: ProjectResolution;
  onResolve: (resolution: ProjectResolution) => void;
  onProjectCreated: (project: Project, mentionedName: string) => void;
}

export default function UnknownProjectCard({
  unknownProject,
  projects,
  orgId,
  userId,
  isResolved,
  resolvedValue,
  onResolve,
  onProjectCreated,
}: UnknownProjectCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [mappedProjectId, setMappedProjectId] = useState('');
  const [addAlias, setAddAlias] = useState(true);
  const [whatIsThis, setWhatIsThis] = useState('');
  const [recontextText, setRecontextText] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (isResolved && resolvedValue) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
        <div className="text-sm">
          <span className="font-semibold text-slate-800">"{unknownProject.mentionedName}"</span>
          <span className="text-slate-600"> → {resolvedValue.projectName || resolvedValue.action}</span>
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
          placeholder="Contoh: project renovasi Pak Aloevera / nama workshop kami"
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
        />
        {whatIsThis && (
          <p className="text-[11px] text-slate-400 mt-1">Opsional — membantu sistem belajar</p>
        )}
      </div>

      {unknownProject.similarProjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-slate-500">Mungkin maksud Anda:</span>
          {unknownProject.similarProjects.map(sim => (
            <button
              key={sim.id}
              type="button"
              onClick={() => {
                setSelectedOption('map_existing');
                setMappedProjectId(sim.id);
              }}
              className={`text-xs px-2 py-1 rounded-full border ${mappedProjectId === sim.id ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-white border-slate-200'}`}
            >
              {sim.name} ({Math.round(sim.similarity * 100)}%)
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
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
          onClick={() => setSelectedOption('not_project_keyword')}
          className={`p-2 rounded-xl border text-left text-xs ${selectedOption === 'not_project_keyword' ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'}`}
        >
          <span className="font-semibold block">Bukan nama project</span>
          <span className="text-slate-500">Bagian kalimat lain</span>
        </button>
        <button
          type="button"
          onClick={() => onResolve({ action: 'ignore', whatIsThis })}
          className="p-2 rounded-xl border border-slate-200 bg-white text-left text-xs"
        >
          <span className="font-semibold block">Abaikan</span>
          <span className="text-slate-500">Tidak dicatat</span>
        </button>
      </div>

      {selectedOption === 'map_existing' && (
        <div className="space-y-2 bg-white rounded-xl p-3 border border-slate-200">
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
              if (p) {
                onResolve({
                  action: 'map_existing',
                  projectId: p.id,
                  projectName: p.name,
                  addAsAlias: addAlias,
                  whatIsThis,
                });
              }
            }}
            className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            Konfirmasi Mapping
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
            onProjectCreated(project, unknownProject.mentionedName);
            onResolve({
              action: 'created_new',
              projectId: project.id,
              projectName: project.name,
              addAsAlias: true,
              whatIsThis,
            });
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
        {unknownProject.items.length > 4 && (
          <span className="text-[10px] text-slate-400">+{unknownProject.items.length - 4} lainnya</span>
        )}
      </div>
    </div>
  );
}
