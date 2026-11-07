import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Grid,
  List,
  ChevronRight,
  MapPin,
  FolderOpen,
  X,
  CheckCircle,
  Info,
  ArrowUpDown,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Columns3,
  Calendar,
  GanttChart,
  Tag,
  Trash2,
  Archive,
  RotateCcw,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { useAppStore, type Project } from '../store/appStore';
import {
  createProject,
  updateProject as updateProjectApi,
  archiveProject,
  loadArchivedProjects,
  restoreArchivedProject,
  type ArchivedProjectRow,
} from '../services/projectService';
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
  formatRupiah,
  HEALTH_CONFIG,
  STATUS_LABEL,
  sortProjects,
  type ProjectSort,
  groupProjectsByStatusSection,
} from '../utils/projectUi';
import { useEntitlement } from '../hooks/useEntitlement';
import { isAdminFullAccess, isEstimatorOnlyPlan } from '../lib/entitlement';
import {
  ToolRow,
  ListCard,
  HealthPill,
  StatusPill,
} from '../components/common';
import ProjectTransactionModals, { type ModalKind } from '../components/projects/v2/ProjectTransactionModals';
import { PROJECT_THRESHOLDS } from '../lib/projectThresholds';

type ProjectView = 'list' | 'kanban' | 'timeline' | 'calendar' | 'grid';
const VIEW_STORAGE_KEY = 'monefyi_projects_view';

function readStoredView(estimatorOnlyDefaultList: boolean): ProjectView {
  try {
    const v = localStorage.getItem(VIEW_STORAGE_KEY);
    if (v === 'list' || v === 'kanban' || v === 'timeline' || v === 'calendar' || v === 'grid') {
      return v as ProjectView;
    }
  } catch {
    /* ignore */
  }
  return estimatorOnlyDefaultList ? 'list' : 'timeline';
}

function formatCompact(num: number): string {
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(1)}jt`;
  if (abs >= 1_000) return `Rp ${(num / 1_000).toFixed(0)}rb`;
  return formatRupiah(num);
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
    loadRppMaster(tenant.id)
      .then(m => {
        setTemplates(m.templates);
        if (m.templates[0]) setSelectedTemplateId(m.templates[0].id);
      })
      .catch(() => { });
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-900">Buat Proyek Baru</h3>
            <p className="text-xs text-slate-600">Langkah {step} dari 3</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {step === 1 && (
            <>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Nama proyek *"
                className="w-full px-4 py-3 rounded-xl border text-sm"
              />
              <input
                value={form.client_name}
                onChange={e => setForm({ ...form, client_name: e.target.value })}
                placeholder="Nama klien"
                className="w-full px-4 py-3 rounded-xl border text-sm"
              />
              <input
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                placeholder="Lokasi"
                className="w-full px-4 py-3 rounded-xl border text-sm"
              />
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
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.baseUnit})
                  </option>
                ))}
              </select>
              <label className="text-xs text-slate-500 mb-1 block">
                Volume ({templates.find(t => t.id === selectedTemplateId)?.baseUnit || 'unit'})
              </label>
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={volume}
                onChange={e => setVolume(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border text-sm mb-3"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Mulai</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Selesai</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border text-sm"
                  />
                </div>
              </div>
            </>
          )}
          {step === 2 && !smartCreate && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Mulai</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Selesai</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border text-sm"
                  />
                </div>
              </div>
              <input
                type="number"
                min={0}
                value={form.total_budget || ''}
                onChange={e => setForm({ ...form, total_budget: Number(e.target.value) })}
                placeholder="Estimasi budget (Rp)"
                className="w-full px-4 py-3 rounded-xl border text-sm"
              />
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Deskripsi singkat (opsional)"
                rows={2}
                className="w-full px-4 py-3 rounded-xl border text-sm"
              />
              <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-700 flex gap-2">
                <Info className="w-4 h-4 shrink-0" /> Budget menjadi acuan EVM & analisa AI.
              </div>
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
              <p className="text-sm text-slate-500">
                {form.client_name || 'Tanpa klien'} · {tenant?.name}
              </p>
              {form.total_budget > 0 && (
                <p className="text-sm font-semibold text-emerald-600">
                  Budget: {formatRupiah(form.total_budget)}
                </p>
              )}
            </div>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
        <div className="p-6 border-t border-[#E5EAE8] flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-6 min-h-11 border border-[#E5EAE8] rounded-xl text-sm font-bold text-[#5B6B7A] hover:bg-[#F4F7F5]"
            >
              Kembali
            </button>
          )}
          <button
            type="button"
            onClick={() => (step < 3 ? setStep(step + 1) : handleCreate())}
            disabled={loading}
            className="flex-1 min-h-11 bg-[#059669] text-white rounded-xl text-sm font-bold disabled:opacity-60 hover:bg-[#047857]"
          >
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

export default function Projects({
  initialProjectId,
  onOpenProject,
  onCloseProject,
}: ProjectsProps) {
  const {
    projects,
    projectsListFilter,
    setProjectsListFilter,
    setSelectedProjectId,
    user,
    updateProject,
    removeProject,
    refreshData,
    tenant,
    platformRole,
    entitlementPreviewMode,
  } = useAppStore();
  const entitlement = useEntitlement();
  const adminFullAccess = isAdminFullAccess(platformRole, user?.email, entitlementPreviewMode);
  const viewInitRef = useRef(false);

  const [projectView, setProjectView] = useState<ProjectView>(() => readStoredView(false));
  const [listLayout, setListLayout] = useState<'card' | 'compact'>('card');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [filter, setFilter] = useState(projectsListFilter || 'all');
  const [sort, setSort] = useState<ProjectSort>('recent');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [viewPickerOpen, setViewPickerOpen] = useState(false);
  const [listSectionOpen, setListSectionOpen] = useState(true);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Status modal state
  const [statusModalProject, setStatusModalProject] = useState<Project | null>(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState<Project['status']>('active');
  const [statusSaving, setStatusSaving] = useState(false);

  // Delete project multi-layered safety modal state
  const [deleteModalProject, setDeleteModalProject] = useState<Project | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Archived projects list state
  const [archivedProjects, setArchivedProjects] = useState<ArchivedProjectRow[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedSectionOpen, setArchivedSectionOpen] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Group collapses for mobile
  const [planningOpen, setPlanningOpen] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);

  // Transaction & log modals
  const [txModal, setTxModal] = useState<{
    open: boolean;
    kind: ModalKind;
    project: Project | null;
  }>({ open: false, kind: null, project: null });
  const [logModalProj, setLogModalProj] = useState<Project | null>(null);
  const [logText, setLogText] = useState('');

  const [ganttFocusId, setGanttFocusId] = useState<string | null>(null);
  const ganttExpanded = useGanttStore(s => s.expandedView);
  const fullscreenGantt = projectView === 'timeline' && ganttExpanded;

  const canCreate = user?.role === 'owner' || user?.role === 'manager' || user?.role === 'admin';
  const showToast = useUiStore(s => s.showToast);

  const handleConfirmStatusChange = async () => {
    if (!statusModalProject) return;
    setStatusSaving(true);
    try {
      await handleStatusChange(statusModalProject.id, selectedNewStatus);
      setStatusModalProject(null);
    } catch (e) {
      console.error(e);
    } finally {
      setStatusSaving(false);
    }
  };

  const handleConfirmDeleteProject = async () => {
    if (!deleteModalProject) return;
    const isMatch = deleteConfirmText.trim().toLowerCase() === deleteModalProject.name.trim().toLowerCase();
    if (!isMatch || !deleteAcknowledged) {
      showToast('Konfirmasi keamanan belum lengkap', 'error');
      return;
    }
    setDeleting(true);
    try {
      await archiveProject(deleteModalProject.id, user?.id || '');
      removeProject(deleteModalProject.id);
      showToast(`Proyek "${deleteModalProject.name}" berhasil diarsipkan`, 'success');
      setDeleteModalProject(null);
      setDeleteConfirmText('');
      setDeleteAcknowledged(false);
      void fetchArchivedList();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus proyek', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const fetchArchivedList = async () => {
    if (!tenant?.id) return;
    setArchivedLoading(true);
    try {
      const data = await loadArchivedProjects(tenant.id);
      setArchivedProjects(data);
    } catch (err) {
      console.warn('Gagal memuat arsip proyek:', err);
    } finally {
      setArchivedLoading(false);
    }
  };

  useEffect(() => {
    if (tenant?.id) {
      void fetchArchivedList();
    }
  }, [tenant?.id]);

  const handleRestoreProject = async (row: ArchivedProjectRow) => {
    setRestoringId(row.id);
    try {
      await restoreArchivedProject(row.id);
      showToast(`Proyek "${row.name}" berhasil dipulihkan`, 'success');
      setArchivedProjects(prev => prev.filter(p => p.id !== row.id));
      await refreshData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memulihkan proyek', 'error');
    } finally {
      setRestoringId(null);
    }
  };

  useEffect(() => {
    if (!initialProjectId) {
      setSelectedProject(null);
      return;
    }
    const p = projects.find(x => x.id === initialProjectId);
    if (!p) return;
    setSelectedProject(prev => (!prev || prev.id !== p.id ? p : prev));
  }, [initialProjectId, projects]);

  useEffect(() => {
    if (projectsListFilter && projectsListFilter !== 'all') setFilter(projectsListFilter);
  }, [projectsListFilter]);

  useEffect(() => {
    if (entitlement.isLoading || viewInitRef.current) return;
    viewInitRef.current = true;
    const estOnly = !adminFullAccess && isEstimatorOnlyPlan(entitlement);
    setProjectView(readStoredView(estOnly));
  }, [adminFullAccess, entitlement, entitlement.isLoading]);

  const openProject = (p: Project) => {
    if (projectView === 'timeline') {
      useGanttStore.getState().selectTask(p.id);
      useGanttStore.getState().setScrollToTaskId(p.id);
      return;
    }
    openProjectDetail(p);
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
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, v);
    } catch {
      /* ignore */
    }
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
      atRisk: projects.filter(p => p.health_status === 'at_risk' || p.health_status === 'behind')
        .length,
      totalBudget: projects.reduce((s, p) => s + (p.total_budget_planned || 0), 0),
      avgProgress,
    };
  }, [projects]);

  const activeProjects = useMemo(
    () => projects.filter(p => p.status === 'active' || p.status === 'on_hold'),
    [projects],
  );
  const planningProjects = useMemo(
    () => projects.filter(p => p.status === 'planning' || p.status === 'draft'),
    [projects],
  );
  const otherProjects = useMemo(
    () =>
      projects.filter(
        p => p.status !== 'active' && p.status !== 'on_hold' && p.status !== 'planning' && p.status !== 'draft',
      ),
    [projects],
  );

  const filters = [
    { id: 'all', label: 'Semua', count: projects.length },
    { id: 'active', label: 'Aktif', count: activeProjects.length },
    { id: 'planning', label: 'Planning', count: planningProjects.length },
    { id: 'other', label: 'Lainnya', count: otherProjects.length },
  ];

  const filtered = useMemo(() => {
    const list = projects.filter(p => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.client_name?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q);
      let matchFilter = true;
      if (filter === 'active') {
        matchFilter = p.status === 'active' || p.status === 'on_hold';
      } else if (filter === 'planning') {
        matchFilter = p.status === 'planning' || p.status === 'draft';
      } else if (filter === 'other') {
        matchFilter =
          p.status !== 'active' && p.status !== 'on_hold' && p.status !== 'planning' && p.status !== 'draft';
      } else if (filter === 'at_risk') {
        matchFilter = p.health_status === 'at_risk' || p.health_status === 'behind';
      }
      return matchSearch && matchFilter;
    });
    return sortProjects(list, sort);
  }, [projects, search, filter, sort]);

  const groupedByStatus = useMemo(
    () => (filter === 'all' ? groupProjectsByStatusSection(filtered) : []),
    [filtered, filter],
  );

  const handleSaveQuickLog = async () => {
    if (!logModalProj || !logText.trim() || !user || !tenant) return;
    try {
      const { createDailyLog } = await import('../services/dailyLogService');
      await createDailyLog({
        org_id: tenant.id,
        project_id: logModalProj.id,
        user_id: user.id,
        date: new Date().toISOString().slice(0, 10),
        description: logText.trim(),
        work_category: 'general',
      });
      setLogModalProj(null);
      setLogText('');
      showToast('Log harian berhasil disimpan', 'success');
    } catch (e) {
      console.error(e);
      showToast('Gagal menyimpan log', 'error');
    }
  };

  if (selectedProject) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-4rem)]">
        <ProjectDetailV2
          key={selectedProject.id}
          project={selectedProject}
          onClose={closeProject}
        />
      </div>
    );
  }

  return (
    <div
      className={
        fullscreenGantt
          ? 'h-full flex flex-col p-0'
          : 'p-3.5 sm:p-4 md:p-6 mx-auto space-y-4 sm:space-y-6 max-w-7xl pb-28 md:pb-20'
      }
    >
      {/* ─── MOBILE VIEW (Design Redesign Mobile) ─── */}
      <div className="md:hidden space-y-3 max-w-[420px] mx-auto">
        {/* Title & subtitle */}
        <div>
          <h1 className="text-[22px] font-extrabold text-[#0F172A] tracking-tight">
            Manajemen Proyek
          </h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            Monitoring, perencanaan, dan kontrol seluruh proyek.
          </p>
        </div>

        {/* Hero Green Card */}
        <div className="relative overflow-hidden rounded-[20px] p-4 text-white bg-gradient-to-br from-[#064E3B] via-[#047857] to-[#059669] shadow-[0_14px_28px_-14px_rgba(4,120,87,0.7)]">
          <div
            aria-hidden="true"
            className="absolute -right-9 -top-12 w-36 h-36 rounded-full bg-white/10 pointer-events-none"
          />
          <div className="relative flex items-start justify-between gap-2.5">
            <div>
              <div className="text-[11px] font-bold text-[#D1FAE5] tracking-[0.06em] uppercase">
                TOTAL BUDGET
              </div>
              <div className="text-[32px] font-extrabold tracking-tight leading-none mt-1 tabular-nums">
                {formatCompact(stats.totalBudget)}
              </div>
              <div className="text-xs text-[#D1FAE5] mt-1">
                dari {projects.length} proyek
              </div>
            </div>
            {canCreate && (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="shrink-0 h-11 px-3.5 rounded-xl bg-white text-[#047857] font-extrabold text-xs flex items-center gap-1.5 active:scale-95 transition-transform shadow-xs"
              >
                <Plus className="w-4 h-4 stroke-[2.8]" />
                <span>Buat Proyek Baru</span>
              </button>
            )}
          </div>
          <div className="relative flex justify-between text-xs font-bold text-[#D1FAE5] mt-3.5">
            <span>Progres rata-rata</span>
            <span className="text-white">{Math.round(stats.avgProgress)}%</span>
          </div>
          <div className="relative h-1.5 rounded-full bg-white/25 mt-1.5 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.round(stats.avgProgress))}%` }}
            />
          </div>
        </div>

        {/* 3 Summary Cards */}
        <div className="grid grid-cols-3 gap-2">
          {/* Total Proyek */}
          <button
            type="button"
            onClick={() => {
              setFilter('all');
              setProjectsListFilter('all');
            }}
            aria-label={`Total proyek: ${stats.total}`}
            className={`rounded-2xl p-2.5 sm:p-3 text-left border transition-all active:scale-95 ${filter === 'all'
                ? 'bg-slate-50 border-[#0F172A]'
                : 'bg-white border-[#E5EAE8]'
              }`}
          >
            <div className="text-[10px] font-bold text-[#5B6B7A] tracking-[0.05em] uppercase">
              TOTAL
            </div>
            <div className="text-xl font-extrabold text-[#0F172A] mt-1 tabular-nums">
              {stats.total}
            </div>
            <div className="text-[11px] text-[#5B6B7A] mt-0.5">total</div>
          </button>

          {/* Aktif */}
          <button
            type="button"
            onClick={() => {
              setFilter('active');
              setProjectsListFilter('active');
            }}
            aria-label={`Proyek aktif: ${stats.active}`}
            className={`rounded-2xl p-2.5 sm:p-3 text-left border transition-all active:scale-95 ${filter === 'active'
                ? 'bg-emerald-50 border-[#059669]'
                : 'bg-white border-[#E5EAE8]'
              }`}
          >
            <div className="text-[10px] font-bold text-[#047857] tracking-[0.05em] uppercase">
              AKTIF
            </div>
            <div className="text-xl font-extrabold text-[#047857] mt-1 tabular-nums">
              {stats.active}
            </div>
            <div className="text-[11px] text-[#047857] mt-0.5">berjalan</div>
          </button>

          {/* Perhatian */}
          <button
            type="button"
            onClick={() => {
              setFilter('at_risk');
              setProjectsListFilter('at_risk');
            }}
            aria-label={`Proyek perlu perhatian: ${stats.atRisk}`}
            className={`rounded-2xl p-2.5 sm:p-3 text-left border transition-all active:scale-95 ${filter === 'at_risk'
                ? 'bg-amber-50 border-[#D97706]'
                : 'bg-white border-[#E5EAE8]'
              }`}
          >
            <div className="text-[10px] font-bold text-[#B45309] tracking-[0.05em] uppercase">
              PERHATIAN
            </div>
            <div className="text-xl font-extrabold text-[#B45309] mt-1 tabular-nums">
              {stats.atRisk}
            </div>
            <div className="text-[11px] text-[#B45309] mt-0.5">perlu update</div>
          </button>
        </div>

        {/* Tool Row matching Gambar 2 (Estimator Toolbar) */}
        <ToolRow
          title={
            filter === 'all'
              ? 'Semua Proyek'
              : filter === 'active'
                ? 'Aktif'
                : filter === 'planning'
                  ? 'Planning'
                  : 'Proyek'
          }
          count={filtered.length}
          listSectionOpen={listSectionOpen}
          onToggleListSection={() => setListSectionOpen(v => !v)}
          search={search}
          searchOpen={searchOpen}
          onSearchOpen={() => setSearchOpen(true)}
          onSearchClose={() => {
            setSearchOpen(false);
            setSearch('');
          }}
          onSearchChange={setSearch}
          searchPlaceholder="Cari nama, klien, atau kode..."
          showResetFilter={filter !== 'all' || search.length > 0}
          onResetFilter={() => {
            setFilter('all');
            setProjectsListFilter('all');
            setSearch('');
          }}
          onOpenFilter={() => setFilterSheetOpen(v => !v)}
          filterActive={filter !== 'all'}
          sortLabel={sort === 'recent' ? 'Terbaru' : sort}
          onOpenSort={() => {
            setSort(prev => (prev === 'recent' ? 'name' : prev === 'name' ? 'progress' : 'recent'));
          }}
          viewActive={viewPickerOpen}
          onToggleView={() => setViewPickerOpen(prev => !prev)}
          viewContent={
            <div className="flex gap-1.5 bg-[#E9EFEC] p-1 rounded-xl">
              {[
                { id: 'list' as const, label: 'Daftar' },
                { id: 'kanban' as const, label: 'Kanban' },
                { id: 'timeline' as const, label: 'Gantt' },
                { id: 'calendar' as const, label: 'Kalender' },
                { id: 'grid' as const, label: 'Grid' },
              ].map(v => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setView(v.id);
                    setViewPickerOpen(false);
                  }}
                  className={`flex-1 h-9 rounded-lg font-bold text-xs transition-all ${projectView === v.id
                      ? 'bg-white text-[#059669] shadow-xs'
                      : 'text-[#5B6B7A] hover:text-[#0F172A]'
                    }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          }
        />

        {/* Filter Chips: Appears when Filter button is pressed */}
        {filterSheetOpen && (
          <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none animate-fadeIn">
            {filters.map(f => {
              const isActive = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setFilter(f.id);
                    setProjectsListFilter(f.id);
                  }}
                  className={`h-10 px-3.5 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all active:scale-95 shrink-0 ${isActive
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'bg-white border border-[#E5EAE8] text-[#334155] hover:bg-slate-50'
                    }`}
                >
                  <span>{f.label}</span>
                  <span className={`text-[11px] ${isActive ? 'text-white/80' : 'text-[#8A99A6]'}`}>
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* List Section Collapsible via green ChevronDown */}
        {listSectionOpen && (
          <>
            {/* View content switch for mobile */}
            {projectView === 'kanban' && (
              <div className="overflow-x-auto py-2">
                <KanbanView
                  projects={filtered}
                  onOpenProject={openProject}
                  onStatusChange={handleStatusChange}
                />
              </div>
            )}

            {projectView === 'timeline' && (
              <div className="overflow-x-auto py-2">
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

            {projectView === 'calendar' && (
              <div className="py-2">
                <CalendarView projects={filtered} onOpenProject={openProject} />
              </div>
            )}

            {projectView === 'grid' && (
              <div className="grid grid-cols-1 gap-2.5">
                {filtered.map((proj) => {
                  const budgetPlanned = proj.total_budget_planned || 0;
                  const budgetSpent = proj.spent_amount || 0;
                  return (
                    <div
                      key={proj.id}
                      onClick={() => openProject(proj)}
                      className="bg-white border border-[#E5EAE8] rounded-2xl p-4 space-y-2 cursor-pointer active:scale-[0.99] transition-transform"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-[#047857] bg-[#ECFDF5] px-2 py-0.5 rounded">
                          {proj.code}
                        </span>
                        <HealthPill status={proj.health_status} />
                      </div>
                      <h3 className="font-bold text-sm text-[#0F172A] truncate">{proj.name}</h3>
                      <div className="text-xs text-[#5B6B7A]">{proj.client_name || '—'}</div>
                      <div className="flex justify-between text-xs font-semibold pt-1">
                        <span>{formatCompact(budgetPlanned)}</span>
                        <span className="text-[#059669]">{Math.round(proj.progress_percentage)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Default 'list' view: "Aktif · n" with ListCard, Planning & Lainnya expandable */}
            {projectView === 'list' && (
              <div className="space-y-3">
                {/* If 'all' filter is selected, show group "Aktif · n" + collapsible Planning & Lainnya */}
                {filter === 'all' ? (
                  <>
                    {/* Aktif Group */}
                    <div className="space-y-2">
                      <div className="text-xs font-extrabold text-[#334155] uppercase tracking-wide">
                        Aktif · {activeProjects.length}
                      </div>
                      {activeProjects.map(proj => renderProjectListCard(proj))}
                    </div>

                    {/* Planning Group Collapsible */}
                    {planningProjects.length > 0 && (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setPlanningOpen(prev => !prev)}
                          className="w-full h-13 rounded-2xl border border-[#E5EAE8] bg-white flex items-center justify-between px-4 font-extrabold text-sm text-[#0F172A] active:scale-95 transition-transform"
                        >
                          <span>Planning · {planningProjects.length}</span>
                          <ChevronRight
                            className={`w-5 h-5 text-[#8A99A6] transition-transform ${planningOpen ? 'rotate-90' : ''
                              }`}
                          />
                        </button>
                        {planningOpen && (
                          <div className="space-y-2 pt-1">
                            {planningProjects.map(proj => renderProjectListCard(proj))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Lainnya Group Collapsible */}
                    {otherProjects.length > 0 && (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setOtherOpen(prev => !prev)}
                          className="w-full h-13 rounded-2xl border border-[#E5EAE8] bg-white flex items-center justify-between px-4 font-extrabold text-sm text-[#0F172A] active:scale-95 transition-transform"
                        >
                          <span>Lainnya · {otherProjects.length}</span>
                          <ChevronRight
                            className={`w-5 h-5 text-[#8A99A6] transition-transform ${otherOpen ? 'rotate-90' : ''
                              }`}
                          />
                        </button>
                        {otherOpen && (
                          <div className="space-y-2 pt-1">
                            {otherProjects.map(proj => renderProjectListCard(proj))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  /* Specific Filter selected: show matching projects */
                  <div className="space-y-2">
                    {filtered.map(proj => renderProjectListCard(proj))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── DESKTOP VIEW (Preserve full desktop UI) ─── */}
      <div className="hidden md:block space-y-6">
        {!fullscreenGantt && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-[#0F172A]">
                  Manajemen Proyek
                </h1>
                <p className="text-sm text-[#5B6B7A] mt-0.5">
                  Monitoring, perencanaan, dan kontrol seluruh proyek.
                </p>
              </div>
              {canCreate && (
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 bg-[#059669] hover:bg-[#047857] text-white font-bold h-11 px-5 rounded-xl shadow-sm transition-colors"
                >
                  <Plus className="w-5 h-5" /> Buat Proyek Baru
                </button>
              )}
            </div>

            {projects.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                {[
                  {
                    label: 'Total Proyek',
                    value: String(stats.total),
                    icon: FolderOpen,
                    color: 'text-[#059669]',
                    progress: null as number | null,
                  },
                  {
                    label: 'Aktif',
                    value: String(stats.active),
                    icon: TrendingUp,
                    color: 'text-[#059669]',
                    progress: null,
                  },
                  {
                    label: 'Perlu Perhatian',
                    value: String(stats.atRisk),
                    icon: AlertTriangle,
                    color: 'text-[#D97706]',
                    progress: null,
                  },
                  {
                    label: 'Total Budget',
                    value: formatRupiah(stats.totalBudget),
                    icon: Sparkles,
                    color: 'text-[#059669]',
                    progress: null,
                  },
                  {
                    label: 'Progres Rata-rata',
                    value: `${Math.round(stats.avgProgress)}%`,
                    icon: GanttChart,
                    color: 'text-[#059669]',
                    progress: stats.avgProgress,
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl p-4 border border-[#E5EAE8] shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                      <span className="text-xs text-[#5B6B7A] font-bold uppercase tracking-wider">{s.label}</span>
                    </div>
                    <div className="text-xl font-black text-[#0F172A] truncate mt-1">{s.value}</div>
                    {s.progress !== null && (
                      <div className="mt-2.5 h-1.5 bg-[#F4F7F5] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#059669] rounded-full transition-all"
                          style={{ width: `${Math.min(s.progress, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {projectView !== 'timeline' && (
          <div className="bg-white rounded-2xl p-4 border border-[#E5EAE8] shadow-sm space-y-3.5">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B6B7A]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cari nama, klien, atau kode..."
                  className="w-full pl-10 pr-4 h-11 rounded-xl border border-[#E5EAE8] text-sm text-[#0F172A] focus:outline-none focus:border-[#059669]"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <div className="relative">
                  <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B6B7A] pointer-events-none" />
                  <select
                    value={sort}
                    onChange={e => setSort(e.target.value as ProjectSort)}
                    className="pl-9 pr-4 h-11 rounded-xl border border-[#E5EAE8] text-sm text-[#0F172A] appearance-none bg-white min-w-[140px] focus:outline-none focus:border-[#059669]"
                  >
                    <option value="recent">Terbaru</option>
                    <option value="name">Nama A–Z</option>
                    <option value="progress">Progress</option>
                    <option value="budget">Budget</option>
                    <option value="end_date">Deadline</option>
                  </select>
                </div>
                <div className="flex bg-[#F4F7F5] border border-[#E5EAE8] p-1 rounded-xl flex-wrap">
                  {[
                    { id: 'list' as const, icon: List, label: 'List' },
                    { id: 'kanban' as const, icon: Columns3, label: 'Kanban' },
                    { id: 'timeline' as const, icon: GanttChart, label: 'Gantt' },
                    { id: 'calendar' as const, icon: Calendar, label: 'Kalender' },
                  ].map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setView(v.id)}
                      title={v.label}
                      className={`p-2 min-h-9 min-w-9 rounded-lg transition-colors flex items-center justify-center ${projectView === v.id
                          ? 'bg-white text-[#059669] shadow-xs'
                          : 'text-[#5B6B7A] hover:text-[#0F172A]'
                        }`}
                      aria-label={v.label}
                    >
                      <v.icon className="w-4 h-4" />
                    </button>
                  ))}
                  {projectView === 'list' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setListLayout('card')}
                        className={`p-2 min-h-9 min-w-9 rounded-lg transition-colors flex items-center justify-center ${listLayout === 'card'
                            ? 'bg-white text-[#059669] shadow-xs'
                            : 'text-[#5B6B7A] hover:text-[#0F172A]'
                          }`}
                        aria-label="Kartu"
                      >
                        <Grid className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setListLayout('compact')}
                        className={`p-2 min-h-9 min-w-9 rounded-lg transition-colors flex items-center justify-center ${listLayout === 'compact'
                            ? 'bg-white text-[#059669] shadow-xs'
                            : 'text-[#5B6B7A] hover:text-[#0F172A]'
                          }`}
                        aria-label="Baris"
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {filters.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setFilter(f.id);
                    setProjectsListFilter(f.id);
                  }}
                  className={`flex items-center gap-2 h-10 px-4 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${filter === f.id
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'bg-white border border-[#E5EAE8] text-[#5B6B7A] hover:bg-slate-50'
                    }`}
                >
                  <span>{f.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] ${filter === f.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#5B6B7A]'
                      }`}
                  >
                    {f.count}
                  </span>
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
          <KanbanView
            projects={filtered}
            onOpenProject={openProject}
            onStatusChange={handleStatusChange}
          />
        )}
        {projectView === 'calendar' && (
          <CalendarView projects={filtered} onOpenProject={openProject} />
        )}

        {projectView === 'list' && (
          <div className="space-y-4">
            {groupedByStatus.map(({ section, projects: sectionProjects }) => (
              <section key={section.id}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg font-black text-slate-900">{section.label}</h2>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    {sectionProjects.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sectionProjects.map((p, idx) => renderProjectCard(p, idx))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* ─── ARSIP PROYEK (SOFT DELETE 30 HARI) ─── */}
        <section className="mt-8 pt-6 border-t border-[#E5EAE8]">
          <button
            type="button"
            onClick={() => {
              const next = !archivedSectionOpen;
              setArchivedSectionOpen(next);
              if (next) void fetchArchivedList();
            }}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 border border-[#E5EAE8] rounded-2xl shadow-xs transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#0F172A]">Proyek Diarsipkan</span>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {archivedProjects.length}
                  </span>
                </div>
                <p className="text-xs text-[#5B6B7A] mt-0.5">
                  Proyek yang dihapus tersimpan di sini selama 30 hari sebelum dihapus permanen
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${archivedSectionOpen ? 'rotate-180' : ''
                  }`}
              />
            </div>
          </button>

          {archivedSectionOpen && (
            <div className="mt-3 bg-white border border-[#E5EAE8] rounded-2xl divide-y divide-[#E5EAE8] shadow-xs overflow-hidden">
              {archivedLoading ? (
                <div className="p-8 flex items-center justify-center gap-2 text-xs text-[#5B6B7A]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#059669]" />
                  <span>Memuat arsip...</span>
                </div>
              ) : archivedProjects.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#5B6B7A]">
                  Tidak ada proyek di arsip. Proyek yang dihapus akan disimpan di sini selama 30 hari.
                </div>
              ) : (
                archivedProjects.map(row => {
                  const purgeDate = row.archive_purge_at ? new Date(row.archive_purge_at) : null;
                  const daysLeft = purgeDate
                    ? Math.max(0, Math.ceil((purgeDate.getTime() - Date.now()) / 86400000))
                    : null;
                  return (
                    <div
                      key={row.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-[#0F172A] truncate">
                          {row.name}
                        </div>
                        <div className="text-xs text-[#5B6B7A] flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1">
                          <span>Diarsipkan: {new Date(row.deleted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          {daysLeft != null && (
                            <span
                              className={`font-semibold ${daysLeft <= 7 ? 'text-rose-600 font-bold' : 'text-amber-700'
                                }`}
                            >
                              · {daysLeft} hari tersisa sebelum dihapus permanen
                            </span>
                          )}
                        </div>
                      </div>

                      {canCreate && (
                        <button
                          type="button"
                          disabled={restoringId === row.id}
                          onClick={() => handleRestoreProject(row)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-[#047857] hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition-all disabled:opacity-50 shrink-0 self-start sm:self-auto"
                        >
                          {restoringId === row.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                          Pulihkan
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>
      </div>

      {/* Create Project Modal */}
      <AnimatePresence>
        {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>

      {/* Transaction Modal from ListCard */}
      {txModal.open && txModal.project && tenant?.id && user?.id && (
        <ProjectTransactionModals
          open={txModal.open}
          kind={txModal.kind}
          onClose={() => setTxModal({ open: false, kind: null, project: null })}
          project={txModal.project}
          orgId={tenant.id}
          userId={user.id}
          canManage={canCreate}
          onUpdated={() => {
            setTxModal({ open: false, kind: null, project: null });
          }}
        />
      )}

      {/* Daily Log Modal from ListCard */}
      {logModalProj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#0F172A]">Log Harian: {logModalProj.name}</h3>
              <button
                type="button"
                onClick={() => setLogModalProj(null)}
                aria-label="Tutup"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={logText}
              onChange={e => setLogText(e.target.value)}
              placeholder="Catat aktivitas atau progres hari ini..."
              rows={3}
              className="w-full p-3 rounded-xl border border-[#E5EAE8] text-sm outline-none focus:border-[#059669]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLogModalProj(null)}
                className="flex-1 h-11 rounded-xl border border-[#D5DDDA] font-semibold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveQuickLog}
                disabled={!logText.trim()}
                className="flex-1 h-11 rounded-xl bg-[#059669] text-white font-bold text-xs disabled:opacity-50"
              >
                Simpan Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ubah Status Modal */}
      {statusModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl border border-[#E5EAE8] animate-fadeIn">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-base text-[#0F172A]">Ubah Status Proyek</h3>
                <p className="text-xs text-[#5B6B7A] mt-0.5 truncate max-w-[240px]">
                  {statusModalProject.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStatusModalProject(null)}
                aria-label="Tutup"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-[#F4F7F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {(
                [
                  { id: 'planning', label: 'Planning', desc: 'Tahap perencanaan / tender' },
                  { id: 'active', label: 'Aktif', desc: 'Pekerjaan sedang berlangsung' },
                  { id: 'on_hold', label: 'On Hold', desc: 'Tertunda sementara' },
                  { id: 'completed', label: 'Selesai', desc: 'Pekerjaan fisik telah selesai' },
                  { id: 'cancelled', label: 'Dibatalkan', desc: 'Proyek tidak dilanjutkan' },
                ] as const
              ).map(opt => {
                const isSelected = selectedNewStatus === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedNewStatus(opt.id)}
                    className={`w-full p-3 text-left rounded-xl border transition-all flex items-center justify-between ${isSelected
                        ? 'border-[#059669] bg-emerald-50/60 text-[#0F172A]'
                        : 'border-[#E5EAE8] bg-white text-[#5B6B7A] hover:bg-slate-50'
                      }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{opt.label}</div>
                      <div className="text-[10px] text-[#5B6B7A]">{opt.desc}</div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#059669] text-white flex items-center justify-center text-xs">
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStatusModalProject(null)}
                className="flex-1 h-11 border border-[#E5EAE8] rounded-xl text-xs font-bold text-[#5B6B7A] hover:bg-[#F4F7F5]"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={statusSaving}
                onClick={handleConfirmStatusChange}
                className="flex-1 h-11 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {statusSaving ? 'Menyimpan...' : 'Simpan Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hapus / Arsip Proyek (Pengaman Berlapis) */}
      {deleteModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl border border-rose-200 animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-[#0F172A]">Hapus / Arsipkan Proyek</h3>
                <p className="text-xs text-[#5B6B7A] mt-0.5">
                  Pengaman ganda untuk mencegah kehilangan data secara tidak sengaja.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteModalProject(null);
                  setDeleteConfirmText('');
                  setDeleteAcknowledged(false);
                }}
                aria-label="Tutup"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-[#F4F7F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900 space-y-1">
              <p className="font-semibold">Perhatian:</p>
              <p>
                Proyek ini akan dipindahkan ke arsip selama <strong>30 hari</strong>. Setelah itu, proyek dapat dihapus permanen oleh Super Admin.
              </p>
            </div>

            {/* Pengaman Layer 1: Ketik nama proyek persis */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0F172A] block">
                1. Ketik ulang nama proyek di bawah ini untuk konfirmasi:
              </label>
              <div className="px-3 py-1.5 bg-[#F4F7F5] border border-[#E5EAE8] rounded-lg text-xs font-mono font-bold text-[#0F172A] select-all">
                {deleteModalProject.name}
              </div>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="Ketik nama proyek persis..."
                className="w-full h-11 px-3.5 rounded-xl border border-[#E5EAE8] text-sm text-[#0F172A] focus:outline-none focus:border-rose-500"
                autoComplete="off"
              />
              {deleteConfirmText.length > 0 && deleteConfirmText.trim().toLowerCase() !== deleteModalProject.name.trim().toLowerCase() && (
                <p className="text-[11px] text-rose-600 font-medium">Teks belum cocok dengan nama proyek</p>
              )}
            </div>

            {/* Pengaman Layer 2: Checkbox acknowledgement */}
            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={deleteAcknowledged}
                onChange={e => setDeleteAcknowledged(e.target.checked)}
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
              />
              <span className="text-xs text-[#5B6B7A] leading-snug">
                2. Saya mengerti bahwa proyek ini akan dihapus dari daftar aktif dan dipindahkan ke arsip sistem.
              </span>
            </label>

            {/* Tombol aksi */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalProject(null);
                  setDeleteConfirmText('');
                  setDeleteAcknowledged(false);
                }}
                className="flex-1 h-11 border border-[#E5EAE8] rounded-xl text-xs font-bold text-[#5B6B7A] hover:bg-[#F4F7F5]"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={
                  deleting ||
                  deleteConfirmText.trim().toLowerCase() !== deleteModalProject.name.trim().toLowerCase() ||
                  !deleteAcknowledged
                }
                onClick={handleConfirmDeleteProject}
                className="flex-1 h-11 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Menghapus...' : 'Hapus Proyek'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderProjectListCard(proj: Project) {
    const budgetPlanned = proj.total_budget_planned || 0;
    const budgetSpent = proj.spent_amount || 0;
    const budgetPct = budgetPlanned > 0 ? (budgetSpent / budgetPlanned) * 100 : 0;
    const isOver = budgetPct > PROJECT_THRESHOLDS.budgetOverPercent;
    const isNear = budgetPct > PROJECT_THRESHOLDS.budgetWarningPercent;

    const stripColor =
      proj.health_status === 'behind'
        ? '#EF4444'
        : proj.health_status === 'at_risk'
          ? '#F59E0B'
          : '#10B981';

    const barColor = isOver ? '#EF4444' : isNear ? '#F59E0B' : '#059669';

    return (
      <ListCard
        key={proj.id}
        id={proj.id}
        indicatorColor={stripColor}
        title={proj.name}
        subtitle={`${proj.client_name || 'Klien'} · ${proj.location || 'Lokasi'}`}
        pill={<HealthPill status={proj.health_status} />}
        valueText={formatCompact(budgetPlanned)}
        progressText={`${Math.round(proj.progress_percentage)}%`}
        onClick={() => openProjectDetail(proj)}
        metrics={[
          {
            label: 'PROGRESS',
            value: `${Math.round(proj.progress_percentage)}%`,
          },
          {
            label: 'REALISASI',
            value: formatCompact(budgetSpent),
          },
          {
            label: 'STATUS',
            value: STATUS_LABEL[proj.status] || proj.status,
          },
        ]}
        progressPercent={budgetPct}
        progressBarColor={barColor}
        progressLabel="Budget terpakai"
        progressDetailText={`${Math.round(budgetPct)}%`}
        alertNote={
          proj.health_status === 'at_risk' || proj.health_status === 'behind'
            ? `Perlu update progres atau review biaya (${PROJECT_THRESHOLDS.freshDays} hari tanpa update)`
            : undefined
        }
        actions={
          <div className="w-full space-y-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  openProjectDetail(proj);
                }}
                className="flex-1 h-11 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs flex items-center justify-center active:scale-95 transition-transform"
              >
                Buka proyek
              </button>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setTxModal({ open: true, kind: 'cost', project: proj });
                }}
                className="flex-1 h-11 rounded-xl border border-[#E5EAE8] bg-white text-[#0F172A] font-semibold text-xs flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-transform"
              >
                Catat biaya
              </button>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setLogModalProj(proj);
                }}
                className="flex-1 h-11 rounded-xl border border-[#E5EAE8] bg-white text-[#0F172A] font-semibold text-xs flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-transform"
              >
                Log harian
              </button>
            </div>
            <div className="flex gap-2 pt-1.5 border-t border-[#E5EAE8]">
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setSelectedNewStatus(proj.status);
                  setStatusModalProject(proj);
                }}
                className="flex-1 h-11 rounded-xl border border-[#E5EAE8] bg-[#F4F7F5] hover:bg-slate-100 text-[#0F172A] font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <Tag className="w-3.5 h-3.5 text-[#059669]" />
                Ubah Status
              </button>
              {canCreate && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setDeleteConfirmText('');
                    setDeleteAcknowledged(false);
                    setDeleteModalProject(proj);
                  }}
                  className="flex-1 h-11 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  Hapus Proyek
                </button>
              )}
            </div>
          </div>
        }
      />
    );
  }

  function renderProjectCard(proj: Project, i: number) {
    const budgetPct = proj.total_budget_planned
      ? Math.min(100, (proj.spent_amount / proj.total_budget_planned) * 100)
      : 0;
    const health = HEALTH_CONFIG[proj.health_status] || HEALTH_CONFIG.on_track;

    if (listLayout === 'compact') {
      return (
        <motion.div
          key={proj.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => openProject(proj)}
          onDoubleClick={() => openProjectDetail(proj)}
          className="bg-white border border-[#E5EAE8] rounded-2xl p-4 flex items-center gap-4 hover:shadow-md cursor-pointer group shadow-sm transition-all"
        >
          <div className={`w-1.5 h-14 rounded-full ${health.dot}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono text-[#5B6B7A]">{proj.code}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${health.bg} ${health.color}`}
              >
                {health.label}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F4F7F5] border border-[#E5EAE8] text-[#5B6B7A] font-semibold">
                {STATUS_LABEL[proj.status]}
              </span>
            </div>
            <h3 className="font-bold text-[#0F172A] truncate group-hover:text-[#059669] text-sm mt-0.5">
              {proj.name}
            </h3>
            <div className="text-xs text-[#5B6B7A] truncate">{proj.client_name || '—'}</div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-base font-black text-[#0F172A] tabular-nums">{proj.progress_percentage.toFixed(0)}%</div>
            <div className="text-[11px] text-[#5B6B7A]">{formatRupiah(proj.spent_amount)}</div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#5B6B7A] group-hover:text-[#059669] transition-colors" />
        </motion.div>
      );
    }

    return (
      <motion.div
        key={proj.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.03 }}
        onClick={() => openProject(proj)}
        onDoubleClick={() => openProjectDetail(proj)}
        className="bg-white border border-[#E5EAE8] rounded-2xl p-5 hover:shadow-md hover:border-[#059669]/40 cursor-pointer group transition-all shadow-sm"
      >
        <div className="flex justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-mono text-[#5B6B7A]">{proj.code}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${health.bg} ${health.color}`}
              >
                {health.label}
              </span>
            </div>
            <h3 className="font-bold text-[#0F172A] truncate group-hover:text-[#059669] text-base">
              {proj.name}
            </h3>
            <p className="text-xs text-[#5B6B7A] flex items-center gap-1 mt-1 truncate">
              <MapPin className="w-3.5 h-3.5 shrink-0" /> {proj.location || proj.client_name || '—'}
            </p>
          </div>
          <FolderOpen className="w-8 h-8 text-emerald-200 group-hover:text-[#059669] shrink-0 transition-colors" />
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#5B6B7A] font-medium">Progress</span>
              <span className="font-bold text-[#0F172A] tabular-nums">{proj.progress_percentage.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-[#F4F7F5] rounded-full overflow-hidden">
              <div
                className={`h-full ${health.dot} rounded-full`}
                style={{ width: `${Math.min(proj.progress_percentage, 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#5B6B7A] font-medium">Budget terpakai</span>
              <span className="font-bold text-[#0F172A] tabular-nums">{Math.round(budgetPct)}%</span>
            </div>
            <div className="h-2 bg-[#F4F7F5] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#059669] rounded-full"
                style={{ width: `${budgetPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-[#5B6B7A] mt-1">
              <span>{formatRupiah(proj.spent_amount)}</span>
              <span>{formatRupiah(proj.total_budget_planned)}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-[#E5EAE8] flex justify-between items-center">
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#F4F7F5] border border-[#E5EAE8] text-[#5B6B7A] font-semibold">
            {STATUS_LABEL[proj.status]}
          </span>
          <span className="text-xs text-[#059669] font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            Kelola <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </motion.div>
    );
  }
}
