import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Grid, List, ChevronRight, MapPin,
  FolderOpen, X, CheckCircle, Info, ArrowUpDown,
  TrendingUp, AlertTriangle, Sparkles, Columns3, Calendar, GanttChart,
} from 'lucide-react';
import { useAppStore, Project } from '../store/appStore';
import { createProject, updateProject as updateProjectApi } from '../services/projectService';
import ProjectDetail from '../components/projects/ProjectDetail';
import ProjectDetailV2 from '../components/projects/v2/ProjectDetailV2';
import CreateProjectRapDraft from '../components/projects/CreateProjectRapDraft';
import { createProjectWithRap } from '../lib/migration/create-project';
import { loadRppMaster } from '../services/rpp/masterLoader';
import type { ProjectDraft } from '../lib/migration/suggestion-engine';
import type { JobTemplate } from '../types/rpp';
import ProjectTypeSelect from '../components/projects/ProjectTypeSelect';
import KanbanView from '../components/projects/views/KanbanView';
import GanttPlannerView from '../components/projects/gantt/GanttPlannerView';
import CalendarView from '../components/projects/views/CalendarView';
import { useGanttStore } from '../store/ganttStore';
import { useUiStore } from '../store/uiStore';
import {
  formatRupiah, HEALTH_CONFIG, STATUS_LABEL, sortProjects, type ProjectSort,
  groupProjectsByStatusSection,
} from '../utils/projectUi';

type ProjectView = 'list' | 'kanban' | 'timeline' | 'calendar';
const VIEW_STORAGE_KEY = 'monefyi_projects_view';

function readStoredView(): ProjectView {
  try {
    const v = localStorage.getItem(VIEW_STORAGE_KEY);
    if (v === 'list' || v === 'kanban' || v === 'timeline' || v === 'calendar') return v;
  } catch { /* ignore */ }
  return 'timeline';
}

function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const { user, tenant, addProject, migrationFlags } = useAppStore();
  const showToast = useUiStore(s => s.showToast);
  const smartCreate = migrationFlags.create_project_smart;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [volume, setVolume] = useState(3);
  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  const [form, setForm] = useState({
    name: '',
    client_name: '',
    location: '',
    type: 'construction',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    description: '',
    total_budget: 0,
  });

  useEffect(() => {
    if (!smartCreate || !tenant?.id || step !== 2) return;
    loadRppMaster(tenant.id).then(m => {
      setTemplates(m.templates);
      if (m.templates[0]) setSelectedTemplateId(m.templates[0].id);
    }).catch(() => {});
  }, [smartCreate, tenant?.id, step]);

  const handleCreate = async () => {
    if (!user || !tenant) return;
    if (!form.name.trim()) {
      setError('Nama proyek wajib diisi');
      return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      setError('Tanggal selesai harus setelah tanggal mulai');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (smartCreate && draft && selectedTemplateId) {
        const project = await createProjectWithRap({
          orgId: tenant.id,
          userId: user.id,
          currency: tenant.currency,
          plan: tenant.plan,
          draft,
          meta: {
            name: form.name.trim(),
            client: form.client_name.trim(),
            startDate: form.start_date,
            endDate: form.end_date,
            contractValue: form.total_budget || draft.totalSell,
            notes: form.description.trim(),
            type: form.type,
            location: form.location.trim(),
          },
        });
        addProject(project);
      } else {
        const project = await createProject(
        {
          name: form.name.trim(),
          description: form.description.trim(),
          client_name: form.client_name.trim(),
          location: form.location.trim(),
          start_date: form.start_date,
          end_date: form.end_date,
          status: 'planning',
          type: form.type,
          org_id: tenant.id,
          created_by: user.id,
          total_budget: form.total_budget,
        },
        tenant.currency,
        tenant.plan,
      );
        addProject(project);
      }
      showToast('Proyek berhasil dibuat', 'success');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat proyek');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-900">Buat Proyek Baru</h3>
            <p className="text-xs text-slate-600">Langkah {step} dari 3</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Tutup"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {step === 1 && (
            <>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama proyek *" className="w-full px-4 py-3 rounded-xl border text-sm" />
              <input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} placeholder="Nama klien" className="w-full px-4 py-3 rounded-xl border text-sm" />
              <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Lokasi" className="w-full px-4 py-3 rounded-xl border text-sm" />
              <ProjectTypeSelect
                orgId={tenant?.id || ''}
                value={form.type}
                onChange={type => setForm({ ...form, type })}
                className="w-full px-4 py-3 rounded-xl border text-sm"
              />
            </>
          )}
          {step === 2 && smartCreate && (
            <>
              <label className="text-xs text-slate-500 mb-1 block">Template Job</label>
              <select
                value={selectedTemplateId ?? ''}
                onChange={e => setSelectedTemplateId(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border text-sm mb-3"
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.baseUnit})</option>
                ))}
              </select>
              <label className="text-xs text-slate-500 mb-1 block">Volume ({templates.find(t => t.id === selectedTemplateId)?.baseUnit || 'unit'})</label>
              <input type="number" min={0.1} step={0.1} value={volume} onChange={e => setVolume(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border text-sm mb-3" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Mulai</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full px-4 py-3 rounded-xl border text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Selesai</label>
                  <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="w-full px-4 py-3 rounded-xl border text-sm" />
                </div>
              </div>
            </>
          )}
          {step === 2 && !smartCreate && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Mulai</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full px-4 py-3 rounded-xl border text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Selesai</label>
                  <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="w-full px-4 py-3 rounded-xl border text-sm" />
                </div>
              </div>
              <input type="number" min={0} value={form.total_budget || ''} onChange={e => setForm({ ...form, total_budget: Number(e.target.value) })} placeholder="Estimasi budget (Rp)" className="w-full px-4 py-3 rounded-xl border text-sm" />
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi singkat (opsional)" rows={2} className="w-full px-4 py-3 rounded-xl border text-sm" />
              <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-700 flex gap-2"><Info className="w-4 h-4 shrink-0" /> Budget menjadi acuan EVM & analisa AI.</div>
            </>
          )}
          {step === 3 && smartCreate && selectedTemplateId && tenant && (
            <CreateProjectRapDraft
              orgId={tenant.id}
              selections={[{ templateId: selectedTemplateId, volume }]}
              onDraftChange={setDraft}
            />
          )}
          {step === 3 && !smartCreate && (
            <div className="text-center py-4 space-y-2">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="font-bold text-lg">{form.name || 'Proyek baru'}</h4>
              <p className="text-sm text-slate-500">{form.client_name || 'Tanpa klien'} · {tenant?.name}</p>
              {form.total_budget > 0 && <p className="text-sm font-semibold text-emerald-600">Budget: {formatRupiah(form.total_budget)}</p>}
            </div>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
        <div className="p-6 border-t flex gap-3">
          {step > 1 && <button type="button" onClick={() => setStep(step - 1)} className="px-6 py-3 border rounded-xl text-sm font-bold">Kembali</button>}
          <button type="button" onClick={() => step < 3 ? setStep(step + 1) : handleCreate()} disabled={loading} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-black disabled:opacity-60">
            {step === 3 ? (loading ? 'Menyimpan...' : 'Buat Proyek') : 'Lanjut'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface ProjectsProps {
  initialProjectId?: string;
  onOpenProject?: (id: string) => void;
  onCloseProject?: () => void;
}

export default function Projects({ initialProjectId, onOpenProject, onCloseProject }: ProjectsProps) {
  const { projects, projectsListFilter, setProjectsListFilter, setSelectedProjectId, user, updateProject, tenant, migrationFlags } = useAppStore();
  const [projectView, setProjectView] = useState<ProjectView>(readStoredView);
  const [listLayout, setListLayout] = useState<'card' | 'compact'>('card');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(projectsListFilter || 'all');
  const [sort, setSort] = useState<ProjectSort>('recent');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [useV2View, setUseV2View] = useState(false);
  const [ganttFocusId, setGanttFocusId] = useState<string | null>(null);
  const ganttExpanded = useGanttStore(s => s.expandedView);
  const fullscreenGantt = projectView === 'timeline' && ganttExpanded;

  const canCreate = user?.role === 'owner' || user?.role === 'manager' || user?.role === 'admin';
  const showToast = useUiStore(s => s.showToast);

  useEffect(() => {
    setUseV2View(migrationFlags.project_view_v2);
  }, [migrationFlags.project_view_v2]);

  useEffect(() => {
    if (!initialProjectId) {
      setSelectedProject(null);
      return;
    }
    const p = projects.find(x => x.id === initialProjectId);
    if (!p) return;
    // Jangan ganti referensi proyek dari store saat detail sudah terbuka — cegah re-render loop.
    setSelectedProject(prev => (!prev || prev.id !== p.id ? p : prev));
  }, [initialProjectId, projects]);

  useEffect(() => {
    if (projectsListFilter && projectsListFilter !== 'all') setFilter(projectsListFilter);
  }, [projectsListFilter]);

  const openProject = (p: Project) => {
    if (projectView === 'timeline') {
      useGanttStore.getState().selectTask(p.id);
      useGanttStore.getState().setScrollToTaskId(p.id);
      return;
    }
    setSelectedProject(p);
    setSelectedProjectId(p.id);
    onOpenProject?.(p.id);
  };

  const openProjectDetail = (p: Project) => {
    setSelectedProject(p);
    setSelectedProjectId(p.id);
    onOpenProject?.(p.id);
  };

  const setView = (v: ProjectView) => {
    if (v !== 'timeline') {
      useGanttStore.getState().setExpandedView(false);
    }
    if (v === 'timeline' && projectView !== 'timeline') {
      setGanttFocusId(null);
    }
    setProjectView(v);
    try { localStorage.setItem(VIEW_STORAGE_KEY, v); } catch { /* ignore */ }
  };

  const handleStatusChange = async (id: string, status: Project['status']) => {
    try {
      const updated = await updateProjectApi(id, { status }, tenant?.currency);
      updateProject(id, updated);
      showToast('Status proyek diperbarui', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal update status', 'error');
    }
  };

  const closeProject = () => {
    setSelectedProject(null);
    setSelectedProjectId(null);
    onCloseProject?.();
  };

  const stats = useMemo(() => {
    const avgProgress = projects.length
      ? projects.reduce((s, p) => s + p.progress_percentage, 0) / projects.length
      : 0;
    return {
      total: projects.length,
      active: projects.filter(p => p.status === 'active').length,
      atRisk: projects.filter(p => p.health_status === 'at_risk' || p.health_status === 'behind').length,
      totalBudget: projects.reduce((s, p) => s + p.total_budget_planned, 0),
      avgProgress,
    };
  }, [projects]);

  const filters = [
    { id: 'all', label: 'Semua', count: projects.length },
    { id: 'active', label: 'Aktif', count: projects.filter(p => p.status === 'active' || p.status === 'on_hold').length },
    { id: 'planning', label: 'Planning', count: projects.filter(p => p.status === 'planning' || p.status === 'draft').length },
    { id: 'on_track', label: 'On Track', count: projects.filter(p => p.health_status === 'on_track').length },
    { id: 'at_risk', label: 'At Risk', count: projects.filter(p => p.health_status === 'at_risk').length },
    { id: 'behind', label: 'Behind', count: projects.filter(p => p.health_status === 'behind').length },
    { id: 'completed', label: 'Selesai', count: projects.filter(p => p.status === 'completed' || p.status === 'archived').length },
  ];

  const filtered = useMemo(() => {
    const list = projects.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.client_name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
      let matchFilter = true;
      if (filter === 'active' || filter === 'planning' || filter === 'completed') {
        matchFilter = p.status === filter
          || (filter === 'active' && p.status === 'on_hold')
          || (filter === 'planning' && p.status === 'draft')
          || (filter === 'completed' && p.status === 'archived');
      } else if (filter !== 'all') {
        matchFilter = p.health_status === filter;
      }
      return matchSearch && matchFilter;
    });
    return sortProjects(list, sort);
  }, [projects, search, filter, sort]);

  const groupedByStatus = useMemo(
    () => (filter === 'all' ? groupProjectsByStatusSection(filtered) : []),
    [filtered, filter],
  );

  const renderProjectCard = (proj: Project, i: number) => {
    const budgetPct = proj.total_budget_planned ? Math.min(100, (proj.spent_amount / proj.total_budget_planned) * 100) : 0;
    const health = HEALTH_CONFIG[proj.health_status] || HEALTH_CONFIG.on_track;

    if (listLayout === 'compact') {
      return (
        <motion.div key={proj.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => openProject(proj)} className="bg-white border rounded-2xl p-4 flex items-center gap-4 hover:shadow-lg cursor-pointer group">
          <div className={`w-1.5 h-14 rounded-full ${health.dot}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono text-slate-600">{proj.code}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${health.bg} ${health.color}`}>{health.label}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{STATUS_LABEL[proj.status]}</span>
            </div>
            <h3 className="font-black text-slate-800 truncate group-hover:text-emerald-600">{proj.name}</h3>
            <div className="text-xs text-slate-500">{proj.client_name || '—'}</div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-lg font-black">{proj.progress_percentage.toFixed(0)}%</div>
            <div className="text-[10px] text-slate-600">{formatRupiah(proj.spent_amount)}</div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-500" />
        </motion.div>
      );
    }

    return (
      <motion.div key={proj.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => openProject(proj)} className="bg-white border rounded-3xl p-5 hover:shadow-xl hover:border-emerald-100 cursor-pointer group transition-all">
        <div className="flex justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-mono text-slate-600">{proj.code}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${health.bg} ${health.color}`}>{health.label}</span>
            </div>
            <h3 className="font-black text-slate-900 truncate group-hover:text-emerald-600">{proj.name}</h3>
            <p className="text-xs text-slate-600 flex items-center gap-1 mt-1 truncate">
              <MapPin className="w-3 h-3 shrink-0" /> {proj.location || proj.client_name || '—'}
            </p>
          </div>
          <FolderOpen className="w-8 h-8 text-emerald-300 group-hover:text-emerald-500 shrink-0" />
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">Progress</span><span className="font-bold">{proj.progress_percentage.toFixed(0)}%</span></div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${health.dot} rounded-full`} style={{ width: `${Math.min(proj.progress_percentage, 100)}%` }} /></div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">Budget terpakai</span><span className="font-bold">{Math.round(budgetPct)}%</span></div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${budgetPct}%` }} /></div>
            <div className="flex justify-between text-[10px] text-slate-600 mt-1">
              <span>{formatRupiah(proj.spent_amount)}</span>
              <span>{formatRupiah(proj.total_budget_planned)}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t flex justify-between items-center">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">{STATUS_LABEL[proj.status]}</span>
          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">Kelola <ChevronRight className="w-3 h-3" /></span>
        </div>
      </motion.div>
    );
  };

  return (
    <div className={
      fullscreenGantt
        ? 'fixed inset-0 z-40 bg-slate-50 p-2 md:p-3 overflow-hidden flex flex-col'
        : `p-4 md:p-6 mx-auto space-y-6 ${projectView === 'timeline' ? 'max-w-[100%]' : 'max-w-7xl'}`
    }>
      {!fullscreenGantt && (
        <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Manajemen Proyek</h1>
          <p className="text-sm text-slate-500">Monitoring, perencanaan, dan kontrol seluruh proyek.</p>
        </div>
        {canCreate && (
          <button type="button" onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-3 rounded-2xl shadow-xl shadow-emerald-100">
            <Plus className="w-5 h-5" /> Buat Proyek Baru
          </button>
        )}
      </div>

      {projects.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total Proyek', value: String(stats.total), icon: FolderOpen, color: 'text-emerald-600', progress: null as number | null },
            { label: 'Aktif', value: String(stats.active), icon: TrendingUp, color: 'text-emerald-600', progress: null },
            { label: 'Perlu Perhatian', value: String(stats.atRisk), icon: AlertTriangle, color: 'text-amber-600', progress: null },
            { label: 'Total Budget', value: formatRupiah(stats.totalBudget), icon: Sparkles, color: 'text-emerald-600', progress: null },
            { label: 'Progres Rata-rata', value: `${Math.round(stats.avgProgress)}%`, icon: GanttChart, color: 'text-emerald-600', progress: stats.avgProgress },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs text-slate-500 font-medium">{s.label}</span>
              </div>
              <div className="text-lg font-black text-slate-900 truncate">{s.value}</div>
              {s.progress !== null && (
                <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(s.progress, 100)}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
        </>
      )}

      {projectView !== 'timeline' && (
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama, klien, atau kode..." className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm" />
            </div>
            <div className="flex gap-2 shrink-0">
              <div className="relative">
                <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                <select value={sort} onChange={e => setSort(e.target.value as ProjectSort)} className="pl-9 pr-4 py-3 rounded-xl border text-sm appearance-none bg-white min-w-[140px]">
                  <option value="recent">Terbaru</option>
                  <option value="name">Nama A–Z</option>
                  <option value="progress">Progress</option>
                  <option value="budget">Budget</option>
                  <option value="end_date">Deadline</option>
                </select>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl flex-wrap">
                {([
                  { id: 'list' as const, icon: List, label: 'List' },
                  { id: 'kanban' as const, icon: Columns3, label: 'Kanban' },
                  { id: 'timeline' as const, icon: GanttChart, label: 'Gantt' },
                  { id: 'calendar' as const, icon: Calendar, label: 'Kalender' },
                ]).map(v => (
                  <button key={v.id} type="button" onClick={() => setView(v.id)} title={v.label}
                    className={`p-2 rounded-lg ${projectView === v.id ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`} aria-label={v.label}>
                    <v.icon className="w-4 h-4" />
                  </button>
                ))}
                {projectView === 'list' && (
                  <>
                    <button type="button" onClick={() => setListLayout('card')} className={`p-2 rounded-lg ${listLayout === 'card' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`} aria-label="Kartu"><Grid className="w-4 h-4" /></button>
                    <button type="button" onClick={() => setListLayout('compact')} className={`p-2 rounded-lg ${listLayout === 'compact' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`} aria-label="Baris"><List className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filters.map(f => (
              <button key={f.id} type="button" onClick={() => { setFilter(f.id); setProjectsListFilter(f.id); }} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border-2 transition-colors ${filter === f.id ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}>
                {f.label} <span className={`px-2 py-0.5 rounded-full text-[10px] ${filter === f.id ? 'bg-white/20' : 'bg-slate-100'}`}>{f.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {projectView === 'timeline' && (
        <div className={fullscreenGantt ? 'flex-1 min-h-0 flex flex-col' : undefined}>
          <GanttPlannerView
            projects={filtered}
            projectView={projectView}
            onSetView={setView}
            focusProjectId={ganttFocusId}
            onOpenProject={openProject}
            onOpenProjectDetail={openProjectDetail}
          />
        </div>
      )}
      {projectView === 'kanban' && (
        <KanbanView projects={filtered} onOpenProject={openProject} onStatusChange={handleStatusChange} />
      )}

      {projectView === 'calendar' && (
        <CalendarView projects={filtered} onOpenProject={openProject} />
      )}

      {projectView === 'list' && (
        filter === 'all' && groupedByStatus.length > 0 ? (
          <div className="space-y-8">
            {groupedByStatus.map(({ section, projects: sectionProjects }) => (
              <section key={section.id}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg font-black text-slate-900">{section.label}</h2>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    {sectionProjects.length}
                  </span>
                </div>
                <div className={listLayout === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5' : 'space-y-3'}>
                  {sectionProjects.map((proj, i) => renderProjectCard(proj, i))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className={listLayout === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5' : 'space-y-3'}>
            {filtered.map((proj, i) => renderProjectCard(proj, i))}
          </div>
        )
      )}

      {projectView === 'list' && projects.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
          <FolderOpen className="w-14 h-14 text-emerald-200 mx-auto mb-4" />
          <p className="font-black text-slate-800 text-lg">Belum ada proyek</p>
          <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">Buat proyek pertama untuk mulai RAP, jadwal, biaya, dan analisa EVM.</p>
          {canCreate && (
            <button type="button" onClick={() => setShowCreate(true)} className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold">
              <Plus className="w-4 h-4" /> Buat proyek pertama
            </button>
          )}
        </div>
      )}

      {projects.length > 0 && filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border">
          <Search className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="font-bold text-slate-700">Proyek tidak ditemukan</p>
          <button type="button" onClick={() => { setSearch(''); setFilter('all'); setProjectsListFilter('all'); }} className="mt-4 text-emerald-600 text-sm font-bold">Reset filter</button>
        </div>
      )}

      <AnimatePresence>
        {selectedProject && useV2View && (
          <ProjectDetailV2
            key={selectedProject.id}
            project={selectedProject}
            onClose={closeProject}
            onSwitchClassic={() => setUseV2View(false)}
          />
        )}
        {selectedProject && !useV2View && (
          <ProjectDetail key={selectedProject.id} project={selectedProject} onClose={closeProject} />
        )}
        {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </div>
  );
}
