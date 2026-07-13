import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, MoreVertical, LayoutGrid, Wallet, BarChart3, FileSpreadsheet, Brain, FileText, Pencil,
  Undo2, Redo2, Save,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Project } from '../../../store/appStore';
import { useAppStore } from '../../../store/appStore';
import { useShellStore } from '../../../store/shellStore';
import { updateProject as updateProjectApi, getProject } from '../../../services/projectService';
import { showToast } from '../../../store/uiStore';
import { loadRapItems } from '../../../services/rapService';
import { loadWorkItems } from '../../../services/workItemService';
import { loadCostRealizations, aggregateCostByRapItem } from '../../../services/costService';
import { loadProjectIncomes } from '../../../services/incomeService';
import { mapPlannerProject } from '../../../lib/migration/planner-mapper';
import { normalizeProjectView } from '../../../lib/migration/project-normalize';
import { validateProjectBalance } from '../../../lib/migration/balance-sheet';
import BalanceDiagnosisModal from '../../finance-v2/BalanceDiagnosisModal';
import TabV2Overview from './TabV2Overview';
import TabV2Keuangan from './TabV2Keuangan';
import TabV2Progress from './TabV2Progress';
import TabV2Rap, { type RapDraftControls } from './TabV2Rap';
import TabV2Analisa from './TabV2Analisa';
import TabV2Laporan from './TabV2Laporan';
import ProjectEditModal from '../ProjectEditModal';

type TabId = 'overview' | 'keuangan' | 'progress' | 'rap' | 'analisa' | 'laporan';

const TABS: { id: TabId; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'keuangan', label: 'Keuangan', icon: Wallet },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'rap', label: 'RAP', icon: FileSpreadsheet },
  { id: 'analisa', label: 'Analisa', icon: Brain },
  { id: 'laporan', label: 'Laporan', icon: FileText },
];

type Props = {
  project: Project;
  onClose: () => void;
};

export default function ProjectDetailV2({ project: initialProject, onClose }: Props) {
  const { user, tenant, updateProject } = useAppStore();
  const { setShellMeta, clearShellMeta } = useShellStore();
  const [project, setProject] = useState(initialProject);
  const [tab, setTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [mapped, setMapped] = useState<ReturnType<typeof mapPlannerProject> | null>(null);
  const [rapItems, setRapItems] = useState<Awaited<ReturnType<typeof loadRapItems>>>([]);
  const [workItems, setWorkItems] = useState<Awaited<ReturnType<typeof loadWorkItems>>>([]);
  const [rapActuals, setRapActuals] = useState<Record<string, { qty: number; amount: number }>>({});
  const [rapDraft, setRapDraft] = useState<RapDraftControls | null>(null);
  const loadedOnceRef = useRef(false);
  const projectRef = useRef(project);
  projectRef.current = project;

  const reload = useCallback(async () => {
    if (!loadedOnceRef.current) setLoading(true);
    try {
      const fresh = await getProject(project.id, tenant?.currency);
      const proj = fresh || projectRef.current;
      if (fresh) setProject(fresh);

      const [rap, costs, incomes, wi] = await Promise.all([
        loadRapItems(proj.id),
        loadCostRealizations(proj.id),
        loadProjectIncomes(proj.id),
        loadWorkItems(proj.id),
      ]);
      setRapItems(rap);
      setWorkItems(wi);
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
            ...(proj.contract_value ? { contract_value: proj.contract_value } : {}),
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
      });
      setMapped(view);
    } finally {
      loadedOnceRef.current = true;
      setLoading(false);
    }
  }, [project.id, tenant?.currency]);

  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    setShellMeta({
      breadcrumb: [{ label: 'Proyek' }, { label: project.name }],
      projectId: project.id,
      hideRightPanel: tab === 'rap',
      onOpenRap: () => trySetTab('rap'),
      onOpenProgress: () => trySetTab('progress'),
    });
    return () => clearShellMeta();
  }, [project.id, project.name, tab, setShellMeta, clearShellMeta]);

  const normalized = mapped ? normalizeProjectView(mapped) : null;
  const balanceCheck = mapped ? validateProjectBalance(mapped) : null;
  const keuanganBadge = rapItems.length > 0 ? rapItems.length : undefined;

  const handleSaveProject = async (patch: Partial<Project>) => {
    const updated = await updateProjectApi(project.id, patch, tenant?.currency);
    setProject(updated);
    updateProject(project.id, updated);
    showToast('Detail proyek disimpan', 'success');
    await reload();
  };

  const openEdit = () => setEditOpen(true);

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
    <div className="flex flex-col min-h-0">
      <header className="surface-panel px-4 py-3 flex items-center justify-between shrink-0 sticky top-0 z-10 mx-2 mt-2 rounded-2xl">
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
                balanceCheck.isBalanced ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {balanceCheck.isBalanced ? 'Balance' : 'Tidak Balance'}
            </button>
          )}
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
          <button type="button" onClick={openEdit} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Edit proyek" title="Edit proyek">
            <Pencil className="w-5 h-5 text-slate-500" />
          </button>
          <button type="button" className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Menu">
            <MoreVertical className="w-5 h-5 text-slate-500" />
          </button>
        </div>
      </header>

      <nav className="tab-pills mx-4 mt-3 mb-1 overflow-x-auto shrink-0 sticky top-[4.5rem] z-10">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => trySetTab(t.id)}
            className={`tab-pill flex items-center gap-1.5 whitespace-nowrap ${
              tab === t.id ? 'tab-pill-active' : ''
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
            {t.id === 'keuangan' && keuanganBadge != null && keuanganBadge > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600">
                {keuanganBadge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-y-auto p-4 md:p-5">
        {loading || !normalized ? (
          <div className="text-center py-16 text-slate-500">Memuat...</div>
        ) : (
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {tab === 'overview' && (
              <TabV2Overview
                normalized={normalized}
                project={project}
                orgId={tenant?.id || ''}
                userId={user?.id || ''}
                rapItems={rapItems}
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
            {tab === 'progress' && (
              <TabV2Progress
                normalized={normalized}
                workItems={workItems}
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
          </motion.div>
        )}
      </main>

      <BalanceDiagnosisModal
        open={balanceOpen}
        onClose={() => setBalanceOpen(false)}
        check={balanceCheck}
      />

      {editOpen && (
        <ProjectEditModal
          project={project}
          canArchive={false}
          onClose={() => setEditOpen(false)}
          onSave={handleSaveProject}
          onArchive={async () => {}}
        />
      )}
    </div>
  );
}
