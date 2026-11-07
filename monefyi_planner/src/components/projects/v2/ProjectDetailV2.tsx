import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MoreVertical,
  LayoutGrid,
  Wallet,
  BarChart3,
  FileSpreadsheet,
  Brain,
  FileText,
  Pencil,
  Coins,
  Undo2,
  Redo2,
  Save,
  Paperclip,
  MapPin,
  Sparkles,
  X,
  ChevronDown,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Project } from '../../../store/appStore';
import { useAppStore } from '../../../store/appStore';
import { useShellStore } from '../../../store/shellStore';
import {
  getProject,
} from '../../../services/projectService';
import { showToast } from '../../../store/uiStore';
import { loadRapItems } from '../../../services/rapService';
import { loadWorkItems } from '../../../services/workItemService';
import { loadCostRealizations, aggregateCostByRapItem } from '../../../services/costService';
import { loadProjectIncomes } from '../../../services/incomeService';
import { loadReceivablesByProject } from '../../../services/financeV2/receivableService';
import { loadPayablesByProject } from '../../../services/financeV2/payableService';
import {
  loadSourceEstimationForProject,
  type SourceEstimationInfo,
} from '../../../services/estimationConvertService';
import { loadDailyLogs, createDailyLog, type DailyLog } from '../../../services/dailyLogService';
import { mapPlannerProject } from '../../../lib/migration/planner-mapper';
import { normalizeProjectView } from '../../../lib/migration/project-normalize';
import { validateProjectBalance } from '../../../lib/migration/balance-sheet';
import { computeProgressSummary } from '../../../lib/progressMetrics';
import BalanceDiagnosisModal from '../../finance-v2/BalanceDiagnosisModal';
import TabV2Overview from './TabV2Overview';
import TabV2Keuangan from './TabV2Keuangan';
import TabV2Progress from './TabV2Progress';
import TabV2Rap, { type RapDraftControls } from './TabV2Rap';
import TabV2Analisa from './TabV2Analisa';
import TabV2Laporan from './TabV2Laporan';
import TabV2Deviden from './TabV2Deviden';
import ProjectEditModal from '../ProjectEditModal';
import ProjectTransactionModals, { type ModalKind } from './ProjectTransactionModals';
import { HealthPill, StatusPill } from '../../common';
import { formatRupiah } from '../../../utils/projectUi';

type TabId = 'overview' | 'keuangan' | 'deviden' | 'progress' | 'rap' | 'analisa' | 'laporan';

const TABS: { id: TabId; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'keuangan', label: 'Keuangan', icon: Wallet },
  { id: 'deviden', label: 'Deviden', icon: Coins },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'rap', label: 'RAP', icon: FileSpreadsheet },
  { id: 'analisa', label: 'Analisa', icon: Brain },
  { id: 'laporan', label: 'Laporan', icon: FileText },
];

function formatCompact(num: number): string {
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(1)}jt`;
  if (abs >= 1_000) return `Rp ${(num / 1_000).toFixed(0)}rb`;
  return formatRupiah(num);
}

type Props = {
  project: Project;
  onClose: () => void;
};

export default function ProjectDetailV2({ project: initialProject, onClose }: Props) {
  const navigate = useNavigate();
  const { user, tenant, updateProject, deleteProject } = useAppStore();
  const { setShellMeta, clearShellMeta } = useShellStore();
  const [project, setProject] = useState(initialProject);
  const [tab, setTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [mapped, setMapped] = useState<ReturnType<typeof mapPlannerProject> | null>(null);
  const [rapItems, setRapItems] = useState<Awaited<ReturnType<typeof loadRapItems>>>([]);
  const [workItems, setWorkItems] = useState<Awaited<ReturnType<typeof loadWorkItems>>>([]);
  const [projectLogs, setProjectLogs] = useState<DailyLog[]>([]);
  const [heroExpanded, setHeroExpanded] = useState(false);
  const [rapActuals, setRapActuals] = useState<Record<string, { qty: number; amount: number }>>({});
  const [rapDraft, setRapDraft] = useState<RapDraftControls | null>(null);
  const [sourceEstimation, setSourceEstimation] = useState<SourceEstimationInfo | null>(null);

  // Modals for mobile bottom actions
  const [txModal, setTxModal] = useState<{
    open: boolean;
    kind: ModalKind;
  }>({ open: false, kind: null });
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logText, setLogText] = useState('');

  const loadedOnceRef = useRef(false);
  const projectRef = useRef(project);
  projectRef.current = project;

  const reload = useCallback(async () => {
    if (!loadedOnceRef.current) setLoading(true);
    try {
      const fresh = await getProject(project.id, tenant?.currency);
      const proj = fresh || projectRef.current;
      if (fresh) setProject(fresh);

      const orgId = tenant?.id;
      const [rap, costs, incomes, wi, recs, pays, sourceEst, logs] = await Promise.all([
        loadRapItems(proj.id),
        loadCostRealizations(proj.id),
        loadProjectIncomes(proj.id),
        loadWorkItems(proj.id),
        orgId ? loadReceivablesByProject(orgId, proj.id).catch(() => []) : Promise.resolve([]),
        orgId ? loadPayablesByProject(orgId, proj.id).catch(() => []) : Promise.resolve([]),
        loadSourceEstimationForProject(proj.id).catch(() => null),
        loadDailyLogs(proj.id).catch(() => []),
      ]);
      setRapItems(rap);
      setSourceEstimation(sourceEst);
      setWorkItems(wi);
      setProjectLogs(logs);
      setRapActuals(await aggregateCostByRapItem(proj.id));
      const view = mapPlannerProject({
        project: {
          id: proj.id,
          org_id: proj.tenant_id,
          name: proj.name,
          client_name: proj.client_name,
          planned_start: proj.start_date,
          planned_end: proj.end_date,
          status: proj.status,
          progress_pct: proj.progress_percentage,
          total_budget: proj.total_budget_planned,
          total_spent: proj.spent_amount,
          total_received: proj.total_received,
          settings: {
            type: proj.type,
            contract_value: proj.contract_value ?? proj.total_budget_planned ?? 0,
          },
        },
        rapItems: rap.map(r => ({
          id: r.id,
          project_id: r.project_id,
          type: r.type,
          name: r.name,
          unit: r.unit,
          quantity: r.quantity,
          unit_price: r.unit_price,
          supplier: r.supplier,
        })),
        costs: costs.map(c => ({
          id: c.id,
          project_id: c.project_id,
          rap_item_id: c.rap_item_id,
          date: c.date,
          description: c.description,
          quantity: c.quantity,
          unit_price: c.unit_price,
          total_amount: c.total_amount,
          supplier: c.supplier,
        })),
        incomes: incomes.map(i => ({
          id: i.id,
          project_id: i.project_id,
          date: i.date,
          amount: i.amount,
          category: i.category,
          description: i.description,
          status: i.status,
        })),
        workItems: wi.map(w => ({
          id: w.id,
          project_id: w.project_id,
          name: w.name,
          planned_start: w.planned_start,
          planned_end: w.planned_end,
          progress_pct: w.progress_pct,
          weight: w.weight,
          status: w.status,
        })),
        payables: pays.length > 0
          ? pays.map(p => ({
              id: p.id,
              creditor_name: p.creditor_name,
              amount: p.amount,
              paid_amount: p.paid_amount,
              due_date: p.due_date,
              status: p.status,
            }))
          : undefined,
        receivables: recs.length > 0
          ? recs.map(r => ({
              id: r.id,
              debtor_name: r.debtor_name,
              amount: r.amount,
              paid_amount: r.paid_amount,
              due_date: r.due_date,
              status: r.status,
            }))
          : undefined,
      });
      setMapped(view);
      loadedOnceRef.current = true;
    } catch (e) {
      console.error('ProjectDetail reload error:', e);
      showToast(e instanceof Error ? e.message : 'Gagal memuat detail proyek', 'error');
    } finally {
      setLoading(false);
    }
  }, [project.id, tenant?.currency, tenant?.id, showToast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    setShellMeta({
      breadcrumb: [{ label: 'Proyek' }, { label: project.name }],
      projectId: project.id,
      onOpenRap: () => trySetTab('rap'),
      onOpenProgress: () => trySetTab('progress'),
    });
    return () => clearShellMeta();
  }, [project.id, project.name, setShellMeta, clearShellMeta]);

  const normalized = useMemo(() => {
    if (!mapped) return null;
    return normalizeProjectView(mapped);
  }, [mapped]);

  const balanceCheck = useMemo(() => {
    if (!mapped) return null;
    return validateProjectBalance(mapped);
  }, [mapped]);

  const progressSummary = useMemo(
    () => computeProgressSummary(project, workItems),
    [project, workItems],
  );

  const budgetPlanned = project.total_budget_planned || project.contract_value || 0;
  const budgetSpent = project.spent_amount || (normalized ? normalized.totalRealisasi : 0);
  const budgetPct = budgetPlanned > 0 ? Math.round((budgetSpent / budgetPlanned) * 100) : 0;

  const openEdit = () => setEditOpen(true);

  const handleSavedEdit = (updated: Project) => {
    setProject(updated);
    updateProject(updated.id, updated);
    void reload();
  };

  const handleDeleted = () => {
    deleteProject(project.id);
    onClose();
  };

  const confirmDiscardRapDraft = (): boolean => {
    if (tab !== 'rap' || !rapDraft?.hasChanges) return true;
    const ok = window.confirm(
      'Ada perubahan RAP belum disimpan. Pindah halaman akan membuang perubahan. Lanjutkan?',
    );
    if (ok) rapDraft.discard();
    return ok;
  };

  const trySetTab = (next: TabId) => {
    if (next === tab) return;
    if (!confirmDiscardRapDraft()) return;
    setTab(next);
  };

  const tryClose = () => {
    if (!confirmDiscardRapDraft()) return;
    onClose();
  };

  const handleSaveDailyLog = async () => {
    if (!logText.trim() || !user || !tenant) return;
    try {
      await createDailyLog({
        org_id: tenant.id,
        project_id: project.id,
        user_id: user.id,
        date: new Date().toISOString().slice(0, 10),
        description: logText.trim(),
        work_category: 'general',
      });
      setLogText('');
      setLogModalOpen(false);
      showToast('Log harian berhasil disimpan', 'success');
      const freshLogs = await loadDailyLogs(project.id);
      setProjectLogs(freshLogs);
    } catch (e) {
      console.error(e);
      showToast('Gagal menyimpan log harian', 'error');
    }
  };

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (tab === 'rap' && rapDraft?.hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [tab, rapDraft?.hasChanges]);

  return (
    <div className="flex flex-col min-h-0 pb-28 md:pb-10">
      {/* ─── MOBILE HEADER (Design Redesign Mobile) ─── */}
      <header className="md:hidden shrink-0 h-14 flex items-center justify-between px-2 bg-white border-b border-[#E5EAE8] sticky top-0 z-20">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={tryClose}
            aria-label="Kembali ke daftar proyek"
            className="w-11 h-11 border-0 bg-transparent flex items-center justify-center p-0 text-slate-700 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.4]" />
          </button>
          <div className="text-xs font-bold text-[#047857] bg-[#ECFDF5] px-2.5 py-1 rounded-[7px] truncate max-w-[12rem]">
            {project.code || 'PRJ'}
          </div>
        </div>
        <button
          type="button"
          onClick={openEdit}
          aria-label="Menu proyek"
          className="w-11 h-11 border-0 bg-transparent flex items-center justify-center p-0 text-slate-700 active:scale-95 transition-transform"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </header>

      {/* ─── DESKTOP HEADER (Preserve full desktop UI) ─── */}
      <header className="hidden md:flex surface-panel px-4 py-3 items-center justify-between shrink-0 sticky top-0 z-10 mx-2 mt-2 rounded-2xl">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={tryClose}
            className="p-2 hover:bg-slate-100 rounded-xl shrink-0"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="min-w-0">
            <h2 className="font-black text-slate-900 truncate">{project.name}</h2>
            <p className="text-xs text-slate-500 truncate">
              {project.client_name || '—'} · {mapped?.type || 'Proyek'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {balanceCheck && (
            <button
              type="button"
              onClick={() => setBalanceOpen(true)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                balanceCheck.isBalanced
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {balanceCheck.isBalanced ? 'Balance' : 'Tidak Balance'}
            </button>
          )}
          <button
            type="button"
            onClick={() => trySetTab('progress')}
            className={`hidden sm:inline-flex text-xs font-bold px-3 py-1.5 rounded-full ${
              progressSummary.deviation >= 0
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}
            title="Buka tab Progress"
          >
            Progress {progressSummary.actual}% / {progressSummary.plan}%
          </button>
          {tab === 'rap' && rapDraft && rapDraft.hasChanges && (
            <>
              <span className="text-xs font-bold text-amber-600 hidden sm:inline">
                {rapDraft.changeCount} perubahan
              </span>
              <button
                type="button"
                onClick={rapDraft.undo}
                disabled={!rapDraft.canUndo}
                className="p-2 hover:bg-slate-100 rounded-xl disabled:opacity-40"
                title="Undo"
                aria-label="Undo"
              >
                <Undo2 className="w-5 h-5 text-slate-500" />
              </button>
              <button
                type="button"
                onClick={rapDraft.redo}
                disabled={!rapDraft.canRedo}
                className="p-2 hover:bg-slate-100 rounded-xl disabled:opacity-40"
                title="Redo"
                aria-label="Redo"
              >
                <Redo2 className="w-5 h-5 text-slate-500" />
              </button>
              <button
                type="button"
                onClick={() => void rapDraft.save()}
                disabled={rapDraft.saving}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-60"
                title="Simpan"
              >
                <Save className="w-4 h-4" />
                {rapDraft.saving ? '…' : 'Simpan'}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={openEdit}
            className="p-2 hover:bg-slate-100 rounded-xl"
            aria-label="Edit proyek"
            title="Edit proyek"
          >
            <Pencil className="w-5 h-5 text-slate-500" />
          </button>
          <button
            type="button"
            onClick={openEdit}
            className="p-2 hover:bg-slate-100 rounded-xl"
            aria-label="Pengaturan Proyek"
            title="Pengaturan & Arsip Proyek"
          >
            <MoreVertical className="w-5 h-5 text-slate-500" />
          </button>
        </div>
      </header>

      {sourceEstimation && (
        <button
          type="button"
          onClick={() => navigate(`/app/estimator/${sourceEstimation.id}`)}
          className="mx-3.5 sm:mx-4 mt-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-left text-xs sm:text-sm text-emerald-800 hover:bg-emerald-100 transition-colors flex items-center gap-2"
        >
          <Paperclip className="w-4 h-4 shrink-0" />
          Dibuat dari Estimasi {sourceEstimation.code} →
        </button>
      )}

      {/* ─── MOBILE HERO GREEN CARD ─── */}
      <div className="md:hidden px-4 pt-3.5 space-y-3 max-w-[420px] mx-auto w-full">
        <div className="relative overflow-hidden rounded-[20px] p-4 text-white bg-gradient-to-br from-[#064E3B] via-[#065F46] to-[#047857] shadow-[0_14px_28px_-14px_rgba(4,120,87,0.7)]">
          <div
            aria-hidden="true"
            className="absolute -right-10 -top-14 w-40 h-40 rounded-full bg-white/10 pointer-events-none"
          />
          <div className="relative flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HealthPill status={project.health_status} />
              <StatusPill status={project.status} />
            </div>
            <button
              type="button"
              onClick={() => setHeroExpanded(v => !v)}
              aria-label={heroExpanded ? 'Sembunyikan progres & budget' : 'Tampilkan progres & budget'}
              className="min-h-11 min-w-11 -mr-2 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${heroExpanded ? 'rotate-180' : ''}`} />
              </div>
            </button>
          </div>

          <h2 className="relative text-2xl font-extrabold tracking-tight mt-2 text-white">
            {project.name}
          </h2>

          <div className="relative text-[13px] text-[#ECFDF5] mt-1 flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{project.location || project.client_name || '—'}</span>
            </div>
            {!heroExpanded && (
              <span className="text-xs font-bold text-[#A7F3D0] shrink-0">
                {Math.round(progressSummary.actual)}% · {budgetPct}% budget
              </span>
            )}
          </div>

          {/* Expandable Progress & Budget */}
          {heroExpanded && (
            <div className="relative pt-3 mt-3 border-t border-white/15 space-y-3">
              {/* Progress */}
              <div>
                <div className="flex justify-between text-xs font-bold text-[#D1FAE5]">
                  <span>Progress</span>
                  <span className="text-white">{Math.round(progressSummary.actual)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/25 mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round(progressSummary.actual))}%` }}
                  />
                </div>
              </div>

              {/* Budget Terpakai */}
              <div>
                <div className="flex justify-between text-xs font-bold text-[#D1FAE5]">
                  <span>Budget terpakai</span>
                  <span className="text-white">{budgetPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/25 mt-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, budgetPct)}%`,
                      backgroundColor: budgetPct > 100 ? '#EF4444' : budgetPct > 90 ? '#FCD34D' : '#10B981',
                    }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-xs text-[#D1FAE5] tabular-nums">
                  <span>{formatCompact(budgetSpent)}</span>
                  <span>{formatCompact(budgetPlanned)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── TAB NAVIGATION (Horizontal Scroll Pills) ─── */}
      <nav
        aria-label="Tab Detail Proyek"
        className="flex gap-1.5 overflow-x-auto px-4 py-2 mt-2 scrollbar-none sticky top-14 md:top-[4.5rem] bg-[#F4F7F5] z-10"
      >
        {TABS.map(t => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => trySetTab(t.id)}
              className={`shrink-0 h-10 px-3.5 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap ${
                isActive
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'bg-white border border-[#E5EAE8] text-[#5B6B7A] hover:text-[#0F172A]'
              }`}
            >
              <t.icon className="w-3.5 h-3.5 shrink-0" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 overflow-y-auto px-4 py-2 md:p-5">
        {loading || !normalized ? (
          <div className="text-center py-16 text-slate-500">Memuat...</div>
        ) : (
          <div>
            {tab === 'overview' && (
              <TabV2Overview
                normalized={normalized}
                project={project}
                orgId={tenant?.id || ''}
                userId={user?.id || ''}
                rapItems={rapItems}
                workItems={workItems}
                onRefresh={reload}
                onSwitchTab={tabId => trySetTab(tabId)}
                onEditProject={openEdit}
              />
            )}
              {tab === 'keuangan' && (
                <TabV2Keuangan
                  normalized={normalized}
                  balanceCheck={balanceCheck!}
                  onOpenDiagnosis={() => setBalanceOpen(true)}
                  project={project}
                  orgId={tenant?.id || ''}
                  userId={user?.id || ''}
                  canManage
                  onRefresh={reload}
                  onEditProject={openEdit}
                />
              )}
              {tab === 'deviden' && (
                <TabV2Deviden
                  project={project}
                  normalized={normalized}
                  orgId={tenant?.id || ''}
                  userId={user?.id || ''}
                  canManage
                  onRefresh={reload}
                />
              )}
              {tab === 'progress' && (
                <TabV2Progress
                  normalized={normalized}
                  project={project}
                  workItems={workItems}
                  userId={user?.id || ''}
                  canManage
                  onRefresh={reload}
                />
              )}
              {tab === 'rap' && (
                <TabV2Rap
                  projectId={project.id}
                  normalized={normalized}
                  rapItems={rapItems}
                  rapActuals={rapActuals}
                  onRefresh={reload}
                  userId={user?.id || ''}
                  onDraftChange={setRapDraft}
                />
              )}
              {tab === 'analisa' && (
                <TabV2Analisa projectId={project.id} normalized={normalized} />
              )}
              {tab === 'laporan' && (
                <TabV2Laporan project={project} normalized={normalized} rapItems={rapItems} />
              )}
          </div>
        )}
      </main>

      {/* ─── MOBILE BOTTOM ACTION BAR ─── */}
      <div className="md:hidden fixed bottom-[84px] inset-x-3 z-30 rounded-[18px] p-2 bg-white/95 backdrop-blur-md border border-[#E5EAE8] shadow-[0_4px_20px_rgba(15,23,42,0.12)] flex gap-2">
        <button
          type="button"
          onClick={() => setTxModal({ open: true, kind: 'cost' })}
          className="flex-1 h-11 rounded-xl bg-[#059669] text-white font-bold text-xs flex items-center justify-center active:scale-95 transition-transform"
        >
          + Catat biaya
        </button>
        <button
          type="button"
          onClick={() => setLogModalOpen(true)}
          className="flex-1 h-11 rounded-xl border border-[#D5DDDA] bg-white text-[#0F172A] font-bold text-xs flex items-center justify-center active:scale-95 transition-transform"
        >
          Log harian
        </button>
      </div>

      <BalanceDiagnosisModal
        open={balanceOpen}
        onClose={() => setBalanceOpen(false)}
        check={balanceCheck}
      />

      {editOpen && (
        <ProjectEditModal
          project={project}
          onClose={() => setEditOpen(false)}
          onSaved={handleSavedEdit}
          onDeleted={handleDeleted}
        />
      )}

      {/* Quick Cost Realization Modal from Bottom Bar */}
      {txModal.open && tenant?.id && user?.id && (
        <ProjectTransactionModals
          open={txModal.open}
          kind={txModal.kind}
          onClose={() => setTxModal({ open: false, kind: null })}
          project={project}
          orgId={tenant.id}
          userId={user.id}
          canManage={true}
          onUpdated={() => {
            setTxModal({ open: false, kind: null });
            void reload();
          }}
        />
      )}

      {/* Quick Daily Log Modal from Bottom Bar */}
      {logModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#0F172A]">Log Harian: {project.name}</h3>
              <button
                type="button"
                onClick={() => setLogModalOpen(false)}
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
                onClick={() => setLogModalOpen(false)}
                className="flex-1 h-11 rounded-xl border border-[#D5DDDA] font-semibold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveDailyLog}
                disabled={!logText.trim()}
                className="flex-1 h-11 rounded-xl bg-[#059669] text-white font-bold text-xs disabled:opacity-50"
              >
                Simpan Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
