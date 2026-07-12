import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, MoreVertical, LayoutGrid, Wallet, BarChart3, FileSpreadsheet, Brain, FileText, Pencil,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Project } from '../../../store/appStore';
import { useAppStore } from '../../../store/appStore';
import { useShellStore } from '../../../store/shellStore';
import { updateProject as updateProjectApi } from '../../../services/projectService';
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
import TabV2Rap from './TabV2Rap';
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

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [rap, costs, incomes, wi] = await Promise.all([
        loadRapItems(project.id),
        loadCostRealizations(project.id),
        loadProjectIncomes(project.id),
        loadWorkItems(project.id),
      ]);
      setRapItems(rap);
      setWorkItems(wi);
      setRapActuals(await aggregateCostByRapItem(project.id));
      const view = mapPlannerProject({
        project: {
          id: project.id,
          org_id: project.tenant_id,
          name: project.name,
          client_name: project.client_name,
          planned_start: project.start_date,
          planned_end: project.end_date,
          status: project.status,
          progress_pct: project.progress_percentage,
          total_budget: project.total_budget_planned,
          total_spent: project.spent_amount,
          total_received: project.total_received,
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
      setLoading(false);
    }
  }, [project]);

  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    setShellMeta({
      breadcrumb: [{ label: 'Proyek' }, { label: project.name }],
      projectId: project.id,
      onOpenRap: () => setTab('rap'),
      onOpenProgress: () => setTab('progress'),
    });
    return () => clearShellMeta();
  }, [project.id, project.name, setShellMeta, clearShellMeta]);

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

  return (
    <div className="flex flex-col min-h-0">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
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
          <button type="button" onClick={openEdit} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Edit proyek" title="Edit proyek">
            <Pencil className="w-5 h-5 text-slate-500" />
          </button>
          <button type="button" className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Menu">
            <MoreVertical className="w-5 h-5 text-slate-500" />
          </button>
        </div>
      </header>

      <nav className="bg-white border-b px-2 flex gap-1 overflow-x-auto shrink-0 sticky top-[57px] z-10">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 ${
              tab === t.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
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

      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
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
                onRefresh={reload}
                onSwitchTab={tabId => setTab(tabId)}
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
