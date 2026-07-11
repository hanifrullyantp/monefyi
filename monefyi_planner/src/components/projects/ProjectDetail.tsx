import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Loader2, FileSpreadsheet, Download, Upload, Table2, List, CheckSquare, Trash2,
} from 'lucide-react';
import { useAppStore, Project } from '../../store/appStore';
import { useUiStore } from '../../store/uiStore';
import { archiveProject, updateProject as updateProjectApi } from '../../services/projectService';
import { loadRapItems, rapSummary, rapActualsFromCosts, createRapItem, removeRapItemWithCleanup, updateRapItem } from '../../services/rapService';
import { findRapItemDuplicate } from '../../lib/rapDuplicateDetect';
import { loadWorkItems, createWorkItem, deleteWorkItem, updateWorkItem, updateProjectProgressFromWorkItems } from '../../services/workItemService';
import { loadCostRealizations, deleteCostRealization, aggregateCostByRapItem, repairImportCosts, setRapItemRealization, type RapActualAgg } from '../../services/costService';
import { loadDailyLogs, createDailyLog } from '../../services/dailyLogService';
import { analyzeProject, type AnalyzeResult } from '../../services/analyzeService';
import ConfirmDialog from '../ConfirmDialog';
import RapRealizationDialog from './RapRealizationDialog';
import RapImportWizard from './RapImportWizard';
import ProjectCommandHeader from './command-center/ProjectCommandHeader';
import ProjectCommandTabs from './command-center/ProjectCommandTabs';
import TabOverview from './command-center/TabOverview';
import TabBahanTukang from './command-center/TabBahanTukang';
import TabDokumenLaporan from './command-center/TabDokumenLaporan';
import type { CommandTabId } from './command-center/types';
import { COMMAND_TABS } from './command-center/types';
import { computeTabBadges } from '../../lib/projectCommandUtils';
import ProjectEditModal from './ProjectEditModal';
import ProjectJsonPanel from './ProjectJsonPanel';
import ProjectIncomePanel from './ProjectIncomePanel';
import ProjectTransferPanel from './ProjectTransferPanel';
import ProjectReceivablePanel from './ProjectReceivablePanel';
import RapItemList from './RapItemList';
import RapChecklistView from './RapChecklistView';
import RapEditableTable from './RapEditableTable';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { getProjectCashSummary } from '../../services/projectTransferService';
import { loadReceivablesByProject } from '../../services/financeV2/receivableService';
import { exportRapWorkbook } from '../../services/rapExcelService';
import { todayStr } from '../../lib/adapters';
import {
  formatRupiah, HEALTH_CONFIG, STATUS_LABEL, daysUntil, formatDateId,
} from '../../utils/projectUi';

interface ProjectDetailProps {
  project: Project;
  onClose: () => void;
}

export default function ProjectDetail({ project: initialProject, onClose }: ProjectDetailProps) {
  const { setCommandModalOpen, setSelectedProjectId, updateProject, removeProject, refreshData, tenant, user, projects } = useAppStore();
  const showToast = useUiStore(s => s.showToast);
  const [project, setProject] = useState(initialProject);
  const [activeTab, setActiveTab] = useState<CommandTabId>('overview');
  const [activeSubTab, setActiveSubTab] = useState('rap');
  const [loading, setLoading] = useState(true);
  const [costs, setCosts] = useState<Awaited<ReturnType<typeof loadCostRealizations>>>([]);
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof loadDailyLogs>>>([]);
  const [workItems, setWorkItems] = useState<Awaited<ReturnType<typeof loadWorkItems>>>([]);
  const [rapItems, setRapItems] = useState<Awaited<ReturnType<typeof loadRapItems>>>([]);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmCostId, setConfirmCostId] = useState<string | null>(null);
  const [confirmRapId, setConfirmRapId] = useState<string | null>(null);
  const [showRapForm, setShowRapForm] = useState(false);
  const [showWiForm, setShowWiForm] = useState(false);
  const [editingRapId, setEditingRapId] = useState<string | null>(null);
  const [rapForm, setRapForm] = useState({ type: 'material', name: '', unit: 'unit', quantity: 1, unit_price: 0 });
  const [wiForm, setWiForm] = useState({ name: '', planned_start: project.start_date, planned_end: project.end_date, progress_pct: 0 });
  const [rapActuals, setRapActuals] = useState<Record<string, RapActualAgg>>({});
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});
  const [realizationDialog, setRealizationDialog] = useState<{ rapItem: typeof rapItems[0]; quantity: number } | null>(null);
  const [showRapImport, setShowRapImport] = useState(false);
  const [progressDrafts, setProgressDrafts] = useState<Record<string, string>>({});
  const [logDraft, setLogDraft] = useState({ description: '', progress: '' });
  const [cashSummary, setCashSummary] = useState<{
    received: number;
    surplus: number;
    spent: number;
    debtOwed: number;
    debtReceivable: number;
  }>({ received: 0, surplus: 0, spent: 0, debtOwed: 0, debtReceivable: 0 });
  const [piutangSummary, setPiutangSummary] = useState({ outstanding: 0, total: 0, count: 0 });
  const [costSearch, setCostSearch] = useState('');
  const [repairingImport, setRepairingImport] = useState(false);
  const importRepairAttempted = useRef<string | null>(null);
  const projectRef = useRef(project);
  projectRef.current = project;
  const reloadRef = useRef<() => Promise<void>>(async () => {});
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();
  const [rapView, setRapView] = useState<'spreadsheet' | 'list' | 'checklist'>('checklist');
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [toggleRealizationBusy, setToggleRealizationBusy] = useState<string | null>(null);

  const canManage = user?.role === 'owner' || user?.role === 'manager' || user?.role === 'admin';
  const canArchive = user?.role === 'owner';
  const health = HEALTH_CONFIG[project.health_status] || HEALTH_CONFIG.on_track;
  const daysLeft = daysUntil(project.end_date);

  const reload = useCallback(async () => {
    const current = projectRef.current;
    setLoading(true);
    try {
      const [c, l, w, r, rapAgg] = await Promise.all([
        loadCostRealizations(current.id),
        loadDailyLogs(current.id),
        loadWorkItems(current.id),
        loadRapItems(current.id),
        aggregateCostByRapItem(current.id),
      ]);
      setCosts(c);
      setLogs(l);
      setWorkItems(w);
      setRapItems(r);
      setRapActuals(rapAgg);
      const costsSumLocal = c.reduce((s, row) => s + (Number(row.total_amount) || 0), 0);
      const a = await analyzeProject(current.id);
      setAnalysis(a);
      if (tenant?.id) {
        const [cash, recs] = await Promise.all([
          getProjectCashSummary(current.id, tenant.id, current.name, costsSumLocal),
          loadReceivablesByProject(tenant.id, current.id),
        ]);
        setCashSummary({
          received: cash.received,
          surplus: cash.surplus,
          spent: cash.spent,
          debtOwed: cash.owedTo.reduce((s, d) => s + d.amount, 0),
          debtReceivable: cash.owedFrom.reduce((s, d) => s + d.amount, 0),
        });
        setPiutangSummary({
          outstanding: recs.reduce((s, row) => s + (row.amount - row.paid_amount), 0),
          total: recs.reduce((s, row) => s + row.amount, 0),
          count: recs.length,
        });
        setProject(p => ({
          ...p,
          total_received: cash.received,
          spent_amount: costsSumLocal,
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  reloadRef.current = reload;

  const refreshProjectData = useCallback(async () => {
    await refreshData();
    const fresh = useAppStore.getState().projects.find(p => p.id === projectRef.current.id);
    if (fresh) setProject(fresh);
    await reloadRef.current();
  }, [refreshData]);

  useEffect(() => {
    setSelectedProjectId(initialProject.id);
    void reloadRef.current();
    return () => setSelectedProjectId(null);
    // reload via ref â€” hindari loop saat callback identity berubah (React #185)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProject.id, setSelectedProjectId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const num = parseInt(e.key, 10);
        const tab = COMMAND_TABS.find(t => t.shortcut === num);
        if (tab) {
          e.preventDefault();
          setActiveTab(tab.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (activeTab === 'planning') setActiveSubTab('rap');
    if (activeTab === 'realisasi') setActiveSubTab('biaya');
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'planning') {
      setRapView(isDesktop ? 'spreadsheet' : 'list');
    } else if (activeTab === 'realisasi') {
      setRapView('checklist');
    }
  }, [isDesktop, project.id, activeTab]);

  const rapTotal = rapItems.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
  const costsSum = costs.reduce((s, c) => s + (Number(c.total_amount) || 0), 0);
  const hasImportCosts = costs.some(c => String(c.description || '').startsWith('Import:'));
  const importCostSpike = rapTotal > 0 && costsSum > rapTotal * 1.5 && hasImportCosts;

  const handleRepairImportCosts = async () => {
    if (!user?.id) return;
    importRepairAttempted.current = project.id;
    setRepairingImport(true);
    try {
      const result = await repairImportCosts(project.id, user.id);
      await reload();
      await refreshData();
      showToast(
        `Biaya import diperbaiki: ${result.removed} baris digabung â†’ ${result.fixed} baris (${formatRupiah(result.totalSpent)})`,
        'success',
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memperbaiki biaya', 'error');
    } finally {
      setRepairingImport(false);
    }
  };

  const handleExportRap = () => {
    exportRapWorkbook(project, rapItems, costs, rapActuals);
    showToast('Excel RAP diekspor', 'success');
  };

  const evm = analysis?.evm;
  const budgetPct = project.total_budget_planned ? (project.spent_amount / project.total_budget_planned) * 100 : 0;
  const cpi = evm?.cpi ?? 1;
  const spi = evm?.spi ?? 1;
  const cv = evm ? evm.ev - evm.ac : 0;
  const sv = evm ? evm.ev - evm.pv : 0;
  const opi = ((cpi + spi) / 2).toFixed(2);

  const tabBadges = computeTabBadges(
    workItems,
    rapItems.filter(r => r.type === 'material').length,
    piutangSummary.outstanding,
    cashSummary.debtOwed,
  );

  const navigateTab = (tab: CommandTabId) => setActiveTab(tab);

  const evmPanel = (
    <div className="bg-white border rounded-2xl p-5 flex flex-col items-center justify-center text-center">
      <div className="text-4xl font-black text-slate-900">{opi}</div>
      <div className="text-sm text-slate-500 mt-1">Overall Performance Index</div>
      <div className={`mt-3 px-3 py-1 rounded-full text-xs font-bold ${Number(opi) >= 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
        {Number(opi) >= 1 ? 'Performa baik' : 'Perlu perhatian'}
      </div>
      <p className="text-xs text-slate-600 mt-3">CPI {cpi.toFixed(2)} · SPI {spi.toFixed(2)}</p>
    </div>
  );

  const handleSaveProject = async (patch: Partial<Project>) => {
    const updated = await updateProjectApi(project.id, patch, tenant?.currency);
    setProject(updated);
    updateProject(project.id, updated);
    showToast('Detail proyek disimpan', 'success');
  };

  const handleArchiveProject = async () => {
    if (!user?.id) return;
    await archiveProject(project.id, user.id);
    removeProject(project.id);
    showToast('Proyek diarsipkan (dapat dipulihkan Super Admin dalam 30 hari)', 'success');
    onClose();
  };

  const handleDeleteCost = async (costId: string) => {
    try {
      await deleteCostRealization(costId, project.id);
      await reload();
      await refreshData();
      showToast('Biaya dihapus', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal', 'error');
    }
    setConfirmCostId(null);
  };

  const handleAddRap = async () => {
    if (!rapForm.name.trim()) return;
    if (!editingRapId) {
      const dup = findRapItemDuplicate(rapItems, {
        name: rapForm.name,
        type: rapForm.type,
        unit: rapForm.unit,
      });
      if (dup && !window.confirm(`Item "${dup.name}" mirip data yang sudah ada. Tetap tambah?`)) {
        return;
      }
    }
    try {
      if (editingRapId) {
        await updateRapItem(editingRapId, rapForm);
        setEditingRapId(null);
      } else {
        await createRapItem({
          project_id: project.id,
          type: rapForm.type,
          name: rapForm.name,
          unit: rapForm.unit,
          quantity: rapForm.quantity,
          unit_price: rapForm.unit_price,
          sort_order: rapItems.length,
        });
      }
      setRapForm({ type: 'material', name: '', unit: 'unit', quantity: 1, unit_price: 0 });
      setShowRapForm(false);
      await reload();
      showToast(editingRapId ? 'RAP diperbarui' : 'Item RAP ditambahkan', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal', 'error');
    }
  };

  const startEditRap = (row: typeof rapItems[0]) => {
    setRapForm({
      type: row.type,
      name: row.name,
      unit: row.unit,
      quantity: Number(row.quantity),
      unit_price: Number(row.unit_price),
    });
    setEditingRapId(row.id);
    setShowRapForm(true);
    setActiveSubTab('rap');
  };

  const handleAddWorkItem = async () => {
    if (!wiForm.name.trim()) return;
    try {
      await createWorkItem({
        project_id: project.id,
        name: wiForm.name,
        planned_start: wiForm.planned_start,
        planned_end: wiForm.planned_end,
        progress_pct: wiForm.progress_pct,
        sort_order: workItems.length,
        status: 'pending',
      });
      setWiForm({ name: '', planned_start: project.start_date, planned_end: project.end_date, progress_pct: 0 });
      setShowWiForm(false);
      await reload();
      showToast('Pekerjaan ditambahkan', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal', 'error');
    }
  };

  const rapActualByType = rapActualsFromCosts(rapItems, rapActuals);
  const rapChartData = rapSummary(rapItems, rapActualByType);

  const openRealizationDialog = (row: typeof rapItems[0], qty?: number) => {
    const parsed = qty ?? Number(qtyDrafts[row.id]);
    setRealizationDialog({
      rapItem: row,
      quantity: Number.isFinite(parsed) && parsed !== 0 ? parsed : 1,
    });
  };

  const handleToggleRealization = async (
    row: typeof rapItems[0],
    realized: boolean,
    amount?: number,
  ) => {
    if (!user?.id || !canManage) return;
    setToggleRealizationBusy(row.id);
    try {
      const draft = amountDrafts[row.id];
      const parsedAmount = amount ?? (draft ? parseFloat(draft) : undefined);
      await setRapItemRealization({
        projectId: project.id,
        rapItemId: row.id,
        rapItemName: row.name,
        plannedQty: Number(row.quantity) || 0,
        plannedUnitPrice: Number(row.unit_price) || 0,
        realized,
        amount: parsedAmount,
        recordedBy: user.id,
      });
      await reload();
      await refreshData();
      showToast(realized ? 'Item ditandai realisasi' : 'Realisasi dihapus', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal mengubah realisasi', 'error');
    } finally {
      setToggleRealizationBusy(null);
    }
  };

  const submitQtyDraft = (row: typeof rapItems[0]) => {
    const qty = Number(qtyDrafts[row.id]);
    if (!Number.isFinite(qty) || qty === 0) {
      showToast('Masukkan jumlah (boleh minus untuk koreksi)', 'error');
      return;
    }
    openRealizationDialog(row, qty);
  };

  const handleProgressChange = async (wiId: string, pct: number) => {
    try {
      await updateWorkItem(wiId, {
        progress_pct: pct,
        status: pct >= 100 ? 'completed' : pct > 0 ? 'in_progress' : 'pending',
      });
      const avg = await updateProjectProgressFromWorkItems(project.id);
      if (avg != null) {
        setProject(p => ({ ...p, progress_percentage: avg }));
        updateProject(project.id, { progress_percentage: avg });
      }
      setWorkItems(items => items.map(w => w.id === wiId ? { ...w, progress_pct: pct } : w));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal update progress', 'error');
    }
  };

  const handleManualProgress = async (wiId: string, pct: number) => {
    const wi = workItems.find(w => w.id === wiId);
    if (!wi || !user?.id) return;
    try {
      await updateWorkItem(wiId, {
        progress_pct: pct,
        status: pct >= 100 ? 'completed' : pct > 0 ? 'in_progress' : 'pending',
      });
      if (pct !== Number(wi.progress_pct)) {
        await createDailyLog({
          project_id: project.id,
          work_item_id: wiId,
          date: todayStr(),
          description: `Update progress ${wi.name} â†’ ${pct}%`,
          progress_increment: pct - (Number(wi.progress_pct) || 0),
          recorded_by: user.id,
        });
      }
      const avg = await updateProjectProgressFromWorkItems(project.id);
      if (avg != null) {
        setProject(p => ({ ...p, progress_percentage: avg }));
        updateProject(project.id, { progress_percentage: avg });
      }
      setWorkItems(items => items.map(w => w.id === wiId ? { ...w, progress_pct: pct } : w));
      setProgressDrafts(d => ({ ...d, [wiId]: String(pct) }));
      await reload();
      showToast('Progress diperbarui', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal update progress', 'error');
    }
  };

  const handleManualLog = async () => {
    if (!logDraft.description.trim() || !user?.id) return;
    try {
      await createDailyLog({
        project_id: project.id,
        date: todayStr(),
        description: logDraft.description.trim(),
        progress_increment: logDraft.progress ? Number(logDraft.progress) : 0,
        recorded_by: user.id,
      });
      setLogDraft({ description: '', progress: '' });
      await reload();
      showToast('Log harian tercatat', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal', 'error');
    }
  };

  const progressSection = (
    <div className="space-y-4">
      {workItems.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed"><p className="text-sm text-slate-500">Belum ada pekerjaan.</p></div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-800">Update Progress Manual</h3>
            {workItems.map(wi => (
              <div key={wi.id} className="flex flex-wrap items-center gap-2 text-sm border-t pt-3 first:border-0 first:pt-0">
                <span className="flex-1 min-w-[140px] font-medium">{wi.name}</span>
                <input type="number" min={0} max={100} value={progressDrafts[wi.id] ?? String(Number(wi.progress_pct) || 0)} onChange={e => setProgressDrafts(d => ({ ...d, [wi.id]: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') handleManualProgress(wi.id, Number(progressDrafts[wi.id] ?? wi.progress_pct)); }} className="w-20 px-2 py-1.5 border rounded-lg text-center" />
                <span className="text-xs text-slate-500">%</span>
                <input type="range" min={0} max={100} value={Number(progressDrafts[wi.id] ?? wi.progress_pct) || 0} onChange={e => setProgressDrafts(d => ({ ...d, [wi.id]: e.target.value }))} className="w-24 accent-emerald-600" />
                <button type="button" onClick={() => handleManualProgress(wi.id, Number(progressDrafts[wi.id] ?? wi.progress_pct))} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold">Simpan</button>
              </div>
            ))}
          </div>
          {canManage && (
            <div className="bg-white rounded-2xl border p-4 space-y-2">
              <h3 className="text-sm font-bold text-slate-800">Log Harian Manual</h3>
              <input placeholder="Keterangan aktivitas..." value={logDraft.description} onChange={e => setLogDraft(d => ({ ...d, description: e.target.value }))} className="w-full px-3 py-2 border rounded-xl text-sm" />
              <div className="flex gap-2">
                <input type="number" placeholder="Progress +% (opsional)" value={logDraft.progress} onChange={e => setLogDraft(d => ({ ...d, progress: e.target.value }))} className="flex-1 px-3 py-2 border rounded-xl text-sm" />
                <button type="button" onClick={handleManualLog} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">Catat</button>
              </div>
            </div>
          )}
          {logs.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-8">Belum ada log harian.</p>
          ) : logs.map(log => (
            <div key={log.id} className="bg-white border rounded-xl p-4 text-sm flex justify-between gap-2">
              <div>
                <span>{log.description}</span>
                {log.progress_increment ? (
                  <span className="ml-2 text-emerald-600 text-xs font-bold">+{log.progress_increment}%</span>
                ) : null}
              </div>
              <span className="text-slate-600 shrink-0">{log.date}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col bg-slate-900/70 backdrop-blur-sm"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
          className="bg-white w-full h-full max-w-none rounded-none overflow-hidden flex flex-col shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <ProjectCommandHeader
            project={project}
            health={health}
            daysLeft={daysLeft}
            budgetPct={budgetPct}
            cpi={cpi}
            spi={spi}
            received={cashSummary.received || project.total_received || 0}
            surplus={cashSummary.surplus}
            opi={opi}
            loading={loading}
            onClose={onClose}
            onRefresh={() => reload()}
            onEdit={() => setShowEdit(true)}
            canManage={canManage}
            onAddCost={() => { setActiveTab('realisasi'); setActiveSubTab('biaya'); }}
            onUpdateProgress={() => { setActiveTab('realisasi'); setActiveSubTab('progres'); }}
            onOpenReport={() => setActiveTab('dokumen')}
          />

          <ProjectCommandTabs activeTab={activeTab} badges={tabBadges} onChange={setActiveTab} />

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
            {loading && activeTab === 'overview' ? (
              <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
            ) : (
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div key="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <TabOverview
                      project={project}
                      health={health}
                      daysLeft={daysLeft}
                      cpi={cpi}
                      spi={spi}
                      budgetPct={budgetPct}
                      workItems={workItems}
                      logs={logs}
                      costs={costs}
                      analysis={analysis}
                      piutangOutstanding={piutangSummary.outstanding}
                      onNavigateTab={navigateTab}
                      onAddCost={() => { setActiveTab('realisasi'); setActiveSubTab('biaya'); }}
                      onUpdateProgress={() => { setActiveTab('realisasi'); setActiveSubTab('progres'); }}
                    />
                  </motion.div>
                )}

                {activeTab === 'planning' && (
                  <motion.div key="pl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="flex gap-2 flex-wrap items-center">
                      {['rap', 'schedule'].map(t => (
                        <button key={t} type="button" onClick={() => setActiveSubTab(t)} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${activeSubTab === t ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {t === 'rap' ? `RAP (${rapItems.length})` : `Schedule (${workItems.length})`}
                        </button>
                      ))}
                      {activeSubTab === 'rap' && (
                        <>
                          <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg ml-auto">
                            <button type="button" title="Tabel spreadsheet" onClick={() => setRapView('spreadsheet')} className={`p-1.5 rounded-md ${rapView === 'spreadsheet' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}><Table2 className="w-4 h-4" /></button>
                            <button type="button" title="Tampilan list" onClick={() => setRapView('list')} className={`p-1.5 rounded-md ${rapView === 'list' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}><List className="w-4 h-4" /></button>
                          </div>
                          <button type="button" onClick={handleExportRap} className="flex items-center gap-1 text-xs font-bold text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg"><Download className="w-3.5 h-3.5" /> Export</button>
                          {canManage && (
                            <button type="button" onClick={() => setShowRapImport(true)} className="flex items-center gap-1 text-xs font-bold text-emerald-600 border border-emerald-200 px-2 py-1 rounded-lg"><Upload className="w-3.5 h-3.5" /> Import</button>
                          )}
                        </>
                      )}
                      {canManage && (
                        <button type="button" onClick={() => { setEditingRapId(null); setRapForm({ type: 'material', name: '', unit: 'unit', quantity: 1, unit_price: 0 }); activeSubTab === 'rap' ? setShowRapForm(v => !v) : setShowWiForm(v => !v); }} className={`flex items-center gap-1 text-xs font-bold text-emerald-600 ${activeSubTab !== 'rap' ? 'ml-auto' : ''}`}>
                          <Plus className="w-3.5 h-3.5" /> Tambah
                        </button>
                      )}
                    </div>

                    {activeSubTab === 'rap' && showRapForm && canManage && (
                      <div className="bg-white border rounded-xl p-4 grid grid-cols-2 gap-2 text-sm">
                        <select value={rapForm.type} onChange={e => setRapForm({ ...rapForm, type: e.target.value })} className="border rounded-lg px-2 py-1.5 col-span-2">
                          <option value="material">Material</option><option value="labor">Tenaga</option><option value="equipment">Alat</option><option value="overhead">Overhead</option>
                        </select>
                        <input placeholder="Nama item *" value={rapForm.name} onChange={e => setRapForm({ ...rapForm, name: e.target.value })} className="border rounded-lg px-2 py-1.5 col-span-2" />
                        <input placeholder="Satuan" value={rapForm.unit} onChange={e => setRapForm({ ...rapForm, unit: e.target.value })} className="border rounded-lg px-2 py-1.5" />
                        <input type="number" placeholder="Qty" value={rapForm.quantity} onChange={e => setRapForm({ ...rapForm, quantity: Number(e.target.value) })} className="border rounded-lg px-2 py-1.5" />
                        <input type="number" placeholder="Harga satuan" value={rapForm.unit_price} onChange={e => setRapForm({ ...rapForm, unit_price: Number(e.target.value) })} className="border rounded-lg px-2 py-1.5 col-span-2" />
                        <button type="button" onClick={handleAddRap} className="col-span-2 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs">{editingRapId ? 'Update RAP' : 'Simpan RAP'}</button>
                      </div>
                    )}

                    {activeSubTab === 'schedule' && showWiForm && canManage && (
                      <div className="bg-white border rounded-xl p-4 space-y-2 text-sm">
                        <input placeholder="Nama pekerjaan *" value={wiForm.name} onChange={e => setWiForm({ ...wiForm, name: e.target.value })} className="w-full border rounded-lg px-2 py-1.5" />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="date" value={wiForm.planned_start} onChange={e => setWiForm({ ...wiForm, planned_start: e.target.value })} className="border rounded-lg px-2 py-1.5" />
                          <input type="date" value={wiForm.planned_end} onChange={e => setWiForm({ ...wiForm, planned_end: e.target.value })} className="border rounded-lg px-2 py-1.5" />
                        </div>
                        <button type="button" onClick={handleAddWorkItem} className="w-full py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs">Simpan Pekerjaan</button>
                      </div>
                    )}

                    {activeSubTab === 'rap' ? (
                      rapItems.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-dashed">
                          <p className="text-sm text-slate-500">Belum ada RAP.</p>
                          {canManage && <button type="button" onClick={() => setShowRapForm(true)} className="mt-2 text-emerald-600 text-sm font-bold">+ Tambah item pertama</button>}
                        </div>
                      ) : rapView === 'spreadsheet' && user?.id ? (
                        <RapEditableTable projectId={project.id} items={rapItems} rapActuals={rapActuals} mode="planning" canManage={canManage} recordedBy={user.id} loading={loading} onRefresh={reload} onExport={handleExportRap} />
                      ) : (
                        <RapItemList items={rapItems} rapActuals={rapActuals} mode="planning" canManage={canManage} rapTotal={rapTotal} onEdit={startEditRap} onDelete={id => setConfirmRapId(id)} />
                      )
                    ) : workItems.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-2xl border border-dashed">
                        <p className="text-sm text-slate-500">Belum ada jadwal pekerjaan.</p>
                        {canManage && <button type="button" onClick={() => setShowWiForm(true)} className="mt-2 text-emerald-600 text-sm font-bold">+ Tambah pekerjaan</button>}
                      </div>
                    ) : workItems.map(wi => (
                      <div key={wi.id} className="bg-white rounded-xl border p-4 text-sm">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <div>
                            <span className="font-bold">{wi.name}</span>
                            <div className="text-xs text-slate-600">{formatDateId(wi.planned_start)} – {formatDateId(wi.planned_end)}</div>
                          </div>
                          {canManage && (
                            <button type="button" onClick={() => deleteWorkItem(wi.id).then(reload)} className="text-rose-500 text-xs shrink-0">Hapus</button>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="range" min={0} max={100} value={Number(wi.progress_pct) || 0} disabled={!canManage} onChange={e => handleProgressChange(wi.id, Number(e.target.value))} className="flex-1 accent-emerald-600" />
                          <span className="text-xs font-bold w-10 text-right">{Number(wi.progress_pct) || 0}%</span>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {activeTab === 'realisasi' && (
                  <motion.div key="re" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
                      <div className="flex gap-2 flex-wrap items-center min-w-0">
                        {[
                          { id: 'biaya', label: 'Biaya' },
                          { id: 'uangmasuk', label: 'Uang Masuk' },
                          { id: 'hutang', label: 'Hutang Proyek' },
                          { id: 'piutang', label: 'Piutang' },
                          { id: 'progres', label: 'Progres' },
                        ].map(t => (
                          <button key={t.id} type="button" onClick={() => setActiveSubTab(t.id)} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${activeSubTab === t.id ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{t.label}</button>
                        ))}
                        {activeSubTab === 'biaya' && rapItems.length > 0 && (
                          <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
                            <button type="button" title="Checklist realisasi" onClick={() => setRapView('checklist')} className={`p-1.5 rounded-md ${rapView === 'checklist' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}><CheckSquare className="w-4 h-4" /></button>
                            <button type="button" title="Tabel spreadsheet" onClick={() => setRapView('spreadsheet')} className={`p-1.5 rounded-md ${rapView === 'spreadsheet' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}><Table2 className="w-4 h-4" /></button>
                            <button type="button" title="Tampilan list" onClick={() => setRapView('list')} className={`p-1.5 rounded-md ${rapView === 'list' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}><List className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <button type="button" onClick={() => setCommandModalOpen(true)} className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap"><Plus className="w-3.5 h-3.5" /> Catat via Monefyi</button>
                        <button type="button" onClick={handleExportRap} className="flex items-center gap-1 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap"><FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel</button>
                      </div>
                    </div>

                    {activeSubTab === 'biaya' ? (
                      <>
                        {rapItems.length === 0 ? (
                          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">Buat RAP di tab Planning terlebih dahulu, lalu catat realisasi per item di sini.</div>
                        ) : rapView === 'checklist' ? (
                          <RapChecklistView items={rapItems} rapActuals={rapActuals} canManage={canManage} amountDrafts={amountDrafts} onAmountDraftChange={(id, v) => setAmountDrafts(d => ({ ...d, [id]: v }))} onToggle={handleToggleRealization} busyId={toggleRealizationBusy} />
                        ) : rapView === 'spreadsheet' && user?.id ? (
                          <RapEditableTable projectId={project.id} items={rapItems} rapActuals={rapActuals} mode="realisasi" canManage={canManage} recordedBy={user.id} loading={loading} onRefresh={reload} onExport={handleExportRap} />
                        ) : (
                          <RapItemList items={rapItems} rapActuals={rapActuals} mode="realisasi" canManage={canManage} rapTotal={rapTotal} onEdit={startEditRap} onDelete={id => setConfirmRapId(id)} />
                        )}

                        {importCostSpike && importRepairAttempted.current !== project.id && (
                          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <p className="text-sm text-amber-900">Terdeteksi duplikasi biaya import. Perbaiki agar total realisasi akurat.</p>
                            <button type="button" onClick={handleRepairImportCosts} disabled={repairingImport} className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold shrink-0">
                              {repairingImport ? 'Memperbaiki...' : 'Perbaiki Biaya Import'}
                            </button>
                          </div>
                        )}

                        {costs.length > 0 && (
                          <div className="bg-white rounded-2xl border p-4 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="text-sm font-bold text-slate-800">Riwayat Biaya</h3>
                              <input value={costSearch} onChange={e => setCostSearch(e.target.value)} placeholder="Cari biaya..." className="px-3 py-1.5 border rounded-lg text-xs max-w-[200px]" />
                            </div>
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                              {costs
                                .filter(c => {
                                  const q = costSearch.trim().toLowerCase();
                                  if (!q) return true;
                                  return (c.description || '').toLowerCase().includes(q) || (c.date || '').includes(q);
                                })
                                .map(c => (
                                  <div key={c.id} className="flex items-center justify-between gap-2 text-sm border-b border-slate-100 pb-2 last:border-0">
                                    <div className="min-w-0">
                                      <div className="font-medium truncate">{c.description || 'Biaya'}</div>
                                      <div className="text-xs text-slate-500">{c.date}</div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="font-bold font-mono">{formatRupiah(Number(c.total_amount) || 0)}</span>
                                      {canManage && (
                                        <button type="button" onClick={() => setConfirmCostId(c.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg" aria-label="Hapus biaya"><Trash2 className="w-3.5 h-3.5" /></button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : activeSubTab === 'uangmasuk' ? (
                      <ProjectIncomePanel projectId={project.id} orgId={tenant?.id || ''} userId={user?.id || ''} budget={project.total_budget_planned} canManage={canManage} onUpdated={reload} />
                    ) : activeSubTab === 'hutang' ? (
                      <ProjectTransferPanel projectId={project.id} orgId={tenant?.id || ''} userId={user?.id || ''} projects={projects} spentAmount={project.spent_amount} canManage={canManage} onUpdated={reload} />
                    ) : activeSubTab === 'piutang' ? (
                      <ProjectReceivablePanel projectId={project.id} projectName={project.name} orgId={tenant?.id || ''} userId={user?.id || ''} canManage={canManage} onUpdated={reload} />
                    ) : activeSubTab === 'progres' ? (
                      progressSection
                    ) : null}
                  </motion.div>
                )}

                {activeTab === 'bahan' && (
                  <motion.div key="bh" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <TabBahanTukang rapItems={rapItems} rapActuals={rapActuals} workItems={workItems} />
                  </motion.div>
                )}

                {activeTab === 'dokumen' && (
                  <motion.div key="doc" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <TabDokumenLaporan
                      rapChartData={rapChartData}
                      rapTotal={rapTotal}
                      spent={project.spent_amount}
                      evmPanel={evmPanel}
                      onExport={handleExportRap}
                    />
                    <div className="mt-4 bg-white border rounded-2xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50"><tr><th className="p-3 text-left">Metrik EVM</th><th className="p-3 text-right">Nilai</th></tr></thead>
                        <tbody>
                          {[
                            { m: 'PV (Planned Value)', v: formatRupiah(evm?.pv ?? 0) },
                            { m: 'EV (Earned Value)', v: formatRupiah(evm?.ev ?? 0) },
                            { m: 'AC (Actual Cost)', v: formatRupiah(evm?.ac ?? project.spent_amount) },
                            { m: 'EAC', v: formatRupiah(evm?.eac ?? 0) },
                            { m: 'CV', v: formatRupiah(cv) },
                            { m: 'SV', v: formatRupiah(sv) },
                          ].map(row => (
                            <tr key={row.m} className="border-t"><td className="p-3">{row.m}</td><td className="p-3 text-right font-semibold">{row.v}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'json' && (
                  <motion.div key="json" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <ProjectJsonPanel
                      project={project}
                      rapItems={rapItems}
                      costs={costs}
                      workItems={workItems}
                      logs={logs}
                      orgId={tenant?.id}
                      canEdit={canManage}
                      userId={user?.id}
                      currency={tenant?.currency}
                      onApplied={async p => {
                        setProject(p);
                        updateProject(p.id, p);
                        await reload();
                        await refreshData();
                        showToast('Data JSON diterapkan', 'success');
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </motion.div>

      {showEdit && (
        <ProjectEditModal
          project={project}
          canArchive={canArchive}
          onClose={() => setShowEdit(false)}
          onSave={handleSaveProject}
          onArchive={handleArchiveProject}
        />
      )}
      {confirmCostId && (
        <ConfirmDialog title="Hapus biaya?" message="Entri biaya ini akan dihapus dari proyek." danger confirmLabel="Hapus" onConfirm={() => handleDeleteCost(confirmCostId)} onCancel={() => setConfirmCostId(null)} />
      )}
      {confirmRapId && (
        <ConfirmDialog title="Hapus item RAP?" message="Item RAP dan realisasi biaya terkait akan dihapus." danger confirmLabel="Hapus" onConfirm={async () => {
          if (!confirmRapId) return;
          const { budget, spent } = await removeRapItemWithCleanup(project.id, confirmRapId);
          setConfirmRapId(null);
          setProject(p => ({ ...p, total_budget_planned: budget, spent_amount: spent }));
          updateProject(project.id, { total_budget_planned: budget, spent_amount: spent });
          await reload();
          await refreshData();
          showToast('RAP dihapus', 'success');
        }} onCancel={() => setConfirmRapId(null)} />
      )}
      {realizationDialog && user?.id && (
        <RapRealizationDialog
          rapItem={realizationDialog.rapItem}
          quantity={realizationDialog.quantity}
          projectId={project.id}
          userId={user.id}
          onClose={() => setRealizationDialog(null)}
          onSaved={async () => {
            setQtyDrafts(d => ({ ...d, [realizationDialog.rapItem.id]: '' }));
            await reload();
            await refreshData();
            showToast('Realisasi tercatat', 'success');
          }}
        />
      )}
      {showRapImport && user?.id && (
        <RapImportWizard
          open={showRapImport}
          projectId={project.id}
          projectName={project.name}
          recordedBy={user.id}
          existingItems={rapItems}
          onClose={() => setShowRapImport(false)}
          onImported={() => { void reload(); void refreshData(); }}
        />
      )}
    </>
  );
}
