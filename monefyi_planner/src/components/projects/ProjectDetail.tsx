import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, TrendingUp, BarChart3, Target, Layers, Trash2, Edit3,
  Sparkles, Activity, X, RefreshCw, MapPin, Calendar, Loader2,
} from 'lucide-react';
import { useAppStore, Project } from '../../store/appStore';
import { useUiStore } from '../../store/uiStore';
import { deleteProject, updateProject as updateProjectApi } from '../../services/projectService';
import { loadRapItems, rapSummary, rapActualsFromCosts, createRapItem, deleteRapItem, updateRapItem } from '../../services/rapService';
import { loadWorkItems, createWorkItem, deleteWorkItem, updateWorkItem, updateProjectProgressFromWorkItems } from '../../services/workItemService';
import { loadCostRealizations, deleteCostRealization, aggregateCostByRapItem } from '../../services/costService';
import { loadDailyLogs, createDailyLog } from '../../services/dailyLogService';
import { analyzeProject, type AnalyzeResult } from '../../services/analyzeService';
import ConfirmDialog from '../ConfirmDialog';
import EditProjectModal from './EditProjectModal';
import RapRealizationDialog from './RapRealizationDialog';
import { todayStr } from '../../lib/adapters';
import {
  formatRupiah, HEALTH_CONFIG, STATUS_LABEL, daysUntil, formatDateId,
} from '../../utils/projectUi';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid,
} from 'recharts';

interface ProjectDetailProps {
  project: Project;
  onClose: () => void;
}

export default function ProjectDetail({ project: initialProject, onClose }: ProjectDetailProps) {
  const { setCommandModalOpen, setSelectedProjectId, updateProject, removeProject, refreshData, tenant, user } = useAppStore();
  const showToast = useUiStore(s => s.showToast);
  const [project, setProject] = useState(initialProject);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeSubTab, setActiveSubTab] = useState('rap');
  const [loading, setLoading] = useState(true);
  const [costs, setCosts] = useState<Awaited<ReturnType<typeof loadCostRealizations>>>([]);
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof loadDailyLogs>>>([]);
  const [workItems, setWorkItems] = useState<Awaited<ReturnType<typeof loadWorkItems>>>([]);
  const [rapItems, setRapItems] = useState<Awaited<ReturnType<typeof loadRapItems>>>([]);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCostId, setConfirmCostId] = useState<string | null>(null);
  const [confirmRapId, setConfirmRapId] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showRapForm, setShowRapForm] = useState(false);
  const [showWiForm, setShowWiForm] = useState(false);
  const [editingRapId, setEditingRapId] = useState<string | null>(null);
  const [rapForm, setRapForm] = useState({ type: 'material', name: '', unit: 'unit', quantity: 1, unit_price: 0 });
  const [wiForm, setWiForm] = useState({ name: '', planned_start: project.start_date, planned_end: project.end_date, progress_pct: 0 });
  const [rapActuals, setRapActuals] = useState<Record<string, { qty: number; amount: number }>>({});
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});
  const [realizationDialog, setRealizationDialog] = useState<{ rapItem: typeof rapItems[0]; quantity: number } | null>(null);
  const [progressDrafts, setProgressDrafts] = useState<Record<string, string>>({});
  const [logDraft, setLogDraft] = useState({ description: '', progress: '' });

  const canManage = user?.role === 'owner' || user?.role === 'manager' || user?.role === 'admin';
  const health = HEALTH_CONFIG[project.health_status] || HEALTH_CONFIG.on_track;
  const daysLeft = daysUntil(project.end_date);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [c, l, w, r, rapAgg] = await Promise.all([
        loadCostRealizations(project.id),
        loadDailyLogs(project.id),
        loadWorkItems(project.id),
        loadRapItems(project.id),
        aggregateCostByRapItem(project.id),
      ]);
      setCosts(c);
      setLogs(l);
      setWorkItems(w);
      setRapItems(r);
      setRapActuals(rapAgg);
      const a = await analyzeProject(project.id);
      setAnalysis(a);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => { setProject(initialProject); }, [initialProject]);

  useEffect(() => {
    setSelectedProjectId(project.id);
    reload();
    return () => setSelectedProjectId(null);
  }, [project.id, reload, setSelectedProjectId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (activeTab === 'planning') setActiveSubTab('rap');
    if (activeTab === 'realisasi') setActiveSubTab('biaya');
  }, [activeTab]);

  const rapTotal = rapItems.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
  const rapByType = rapItems.reduce<Record<string, typeof rapItems>>((acc, item) => {
    const key = item.type || 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const evm = analysis?.evm;
  const budgetPct = project.total_budget_planned ? (project.spent_amount / project.total_budget_planned) * 100 : 0;
  const cpi = evm?.cpi ?? 1;
  const spi = evm?.spi ?? 1;
  const cv = evm ? evm.ev - evm.ac : 0;
  const sv = evm ? evm.ev - evm.pv : 0;
  const opi = ((cpi + spi) / 2).toFixed(2);

  const sCurveData = workItems.length
    ? workItems.slice(0, 10).map((wi, i) => ({
        week: wi.name.slice(0, 8) || `W${i + 1}`,
        planned: Math.min(100, ((i + 1) / workItems.length) * 100),
        actual: Number(wi.progress_pct) || 0,
      }))
    : [{ week: 'Now', planned: project.planned_progress, actual: project.progress_percentage }];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Target },
    { id: 'planning', label: 'Planning', icon: Layers },
    { id: 'realisasi', label: 'Realisasi', icon: TrendingUp },
    { id: 'laporan', label: 'Laporan', icon: BarChart3 },
  ];

  const handleStatusChange = async (status: Project['status']) => {
    try {
      const updated = await updateProjectApi(project.id, { status }, tenant?.currency);
      setProject(updated);
      updateProject(project.id, updated);
      showToast(`Status: ${STATUS_LABEL[status]}`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal update status', 'error');
    }
  };

  const handleDeleteProject = async () => {
    try {
      await deleteProject(project.id);
      removeProject(project.id);
      showToast('Proyek dihapus', 'success');
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menghapus', 'error');
    }
    setConfirmDelete(false);
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
      quantity: Number.isFinite(parsed) && parsed > 0 ? parsed : 1,
    });
  };

  const submitQtyDraft = (row: typeof rapItems[0]) => {
    const qty = Number(qtyDrafts[row.id]);
    if (!Number.isFinite(qty) || qty <= 0) {
      showToast('Masukkan jumlah yang valid', 'error');
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
          description: `Update progress ${wi.name} → ${pct}%`,
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

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="bg-white w-full max-w-5xl h-full sm:h-[90vh] sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl"
        >
          <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 p-5 md:p-6 text-white shrink-0">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded-md">{project.code}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/20 text-white">{health.label}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 uppercase">{STATUS_LABEL[project.status]}</span>
                </div>
                <h2 className="text-xl md:text-2xl font-black truncate">{project.name}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-indigo-100 text-xs">
                  {project.client_name && <span>{project.client_name}</span>}
                  {project.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{project.location}</span>}
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDateId(project.start_date)} – {formatDateId(project.end_date)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => reload()} className="p-2 hover:bg-white/20 rounded-xl" aria-label="Refresh"><RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
                <button type="button" onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl" aria-label="Tutup"><X className="w-6 h-6" /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/10 rounded-2xl p-4 border border-white/10">
              {[
                { label: 'Progress', value: `${project.progress_percentage.toFixed(0)}%` },
                { label: 'Budget', value: `${Math.round(budgetPct)}%` },
                { label: 'Sisa Hari', value: daysLeft > 0 ? `${daysLeft}d` : 'Lewat' },
                { label: 'OPI', value: opi },
              ].map(m => (
                <div key={m.label} className="text-center">
                  <div className="text-xs text-indigo-100 mb-0.5">{m.label}</div>
                  <div className="text-xl font-black">{m.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex overflow-x-auto border-b border-slate-200 bg-white px-2 shrink-0">
            {tabs.map(tab => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-3.5 text-sm font-bold whitespace-nowrap border-b-2 ${activeTab === tab.id ? 'text-indigo-600 border-indigo-600' : 'text-slate-400 border-transparent'}`}>
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
            {loading && activeTab === 'overview' ? (
              <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
            ) : (
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div key="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                    {project.description && (
                      <p className="text-sm text-slate-600 bg-white rounded-xl p-4 border">{project.description}</p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                      {[
                        { label: 'CPI', value: cpi.toFixed(2), ok: cpi >= 1 },
                        { label: 'SPI', value: spi.toFixed(2), ok: spi >= 1 },
                        { label: 'CV', value: formatRupiah(cv), ok: cv >= 0 },
                        { label: 'SV', value: formatRupiah(sv), ok: sv >= 0 },
                        { label: 'BAC', value: formatRupiah(project.total_budget_planned), ok: true },
                        { label: 'AC', value: formatRupiah(evm?.ac ?? project.spent_amount), ok: true },
                      ].map(m => (
                        <div key={m.label} className="bg-white rounded-xl p-3 border text-center">
                          <div className={`text-lg font-black ${m.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{m.value}</div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase">{m.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white rounded-2xl p-5 border">
                      <h3 className="font-bold text-slate-800 mb-4">Kurva S</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={sCurveData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                          <Tooltip />
                          <Area type="monotone" dataKey="planned" name="Rencana" stroke="#6366f1" fill="#6366f120" strokeDasharray="5 5" />
                          <Area type="monotone" dataKey="actual" name="Aktual" stroke="#10b981" fill="#10b98120" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-2xl p-5 border">
                        <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-600" /> Log Terbaru</h3>
                        {logs.length === 0 ? <p className="text-xs text-slate-400">Belum ada log harian.</p> : logs.slice(0, 5).map(log => (
                          <div key={log.id} className="text-xs text-slate-600 py-2 border-b last:border-0">{log.description} <span className="text-slate-400">· {log.date}</span></div>
                        ))}
                      </div>
                      <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
                        <h3 className="font-bold text-amber-800 text-sm mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4" /> AI Insights</h3>
                        {!analysis?.recommendations?.length ? (
                          <p className="text-xs text-amber-700">Tambahkan RAP, jadwal, dan biaya untuk rekomendasi AI.</p>
                        ) : analysis.recommendations.slice(0, 3).map((rec, i) => (
                          <div key={i} className="p-3 bg-white/60 rounded-xl text-xs text-amber-900 mb-2">
                            <strong>{rec.title}</strong>
                            <p className="mt-1 opacity-90">{rec.message}</p>
                            {rec.action && <p className="mt-1 text-indigo-700 font-semibold">→ {rec.action}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'planning' && (
                  <motion.div key="pl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="flex gap-2 flex-wrap items-center">
                      {['rap', 'schedule'].map(t => (
                        <button key={t} type="button" onClick={() => setActiveSubTab(t)} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${activeSubTab === t ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {t === 'rap' ? `RAP (${rapItems.length})` : `Schedule (${workItems.length})`}
                        </button>
                      ))}
                      {canManage && (
                        <button type="button" onClick={() => { setEditingRapId(null); setRapForm({ type: 'material', name: '', unit: 'unit', quantity: 1, unit_price: 0 }); activeSubTab === 'rap' ? setShowRapForm(v => !v) : setShowWiForm(v => !v); }} className="ml-auto flex items-center gap-1 text-xs font-bold text-indigo-600">
                          <Plus className="w-3.5 h-3.5" /> Tambah
                        </button>
                      )}
                    </div>

                    {activeSubTab === 'rap' && showRapForm && canManage && (
                      <div className="bg-white border rounded-xl p-4 grid grid-cols-2 gap-2 text-sm">
                        <select value={rapForm.type} onChange={e => setRapForm({ ...rapForm, type: e.target.value })} className="border rounded-lg px-2 py-1.5 col-span-2">
                          <option value="material">Material</option>
                          <option value="labor">Tenaga</option>
                          <option value="equipment">Alat</option>
                          <option value="overhead">Overhead</option>
                        </select>
                        <input placeholder="Nama item *" value={rapForm.name} onChange={e => setRapForm({ ...rapForm, name: e.target.value })} className="border rounded-lg px-2 py-1.5 col-span-2" />
                        <input placeholder="Satuan" value={rapForm.unit} onChange={e => setRapForm({ ...rapForm, unit: e.target.value })} className="border rounded-lg px-2 py-1.5" />
                        <input type="number" placeholder="Qty" value={rapForm.quantity} onChange={e => setRapForm({ ...rapForm, quantity: Number(e.target.value) })} className="border rounded-lg px-2 py-1.5" />
                        <input type="number" placeholder="Harga satuan" value={rapForm.unit_price} onChange={e => setRapForm({ ...rapForm, unit_price: Number(e.target.value) })} className="border rounded-lg px-2 py-1.5 col-span-2" />
                        <button type="button" onClick={handleAddRap} className="col-span-2 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs">{editingRapId ? 'Update RAP' : 'Simpan RAP'}</button>
                      </div>
                    )}

                    {activeSubTab === 'schedule' && showWiForm && canManage && (
                      <div className="bg-white border rounded-xl p-4 space-y-2 text-sm">
                        <input placeholder="Nama pekerjaan *" value={wiForm.name} onChange={e => setWiForm({ ...wiForm, name: e.target.value })} className="w-full border rounded-lg px-2 py-1.5" />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="date" value={wiForm.planned_start} onChange={e => setWiForm({ ...wiForm, planned_start: e.target.value })} className="border rounded-lg px-2 py-1.5" />
                          <input type="date" value={wiForm.planned_end} onChange={e => setWiForm({ ...wiForm, planned_end: e.target.value })} className="border rounded-lg px-2 py-1.5" />
                        </div>
                        <button type="button" onClick={handleAddWorkItem} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs">Simpan Pekerjaan</button>
                      </div>
                    )}

                    {activeSubTab === 'rap' ? (
                      rapItems.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-dashed">
                          <p className="text-sm text-slate-500">Belum ada RAP.</p>
                          {canManage && <button type="button" onClick={() => setShowRapForm(true)} className="mt-2 text-indigo-600 text-sm font-bold">+ Tambah item pertama</button>}
                        </div>
                      ) : (
                        <>
                          <div className="bg-indigo-50 rounded-xl p-3 text-sm font-bold text-indigo-800 flex justify-between">
                            <span>Total RAP</span>
                            <span>{formatRupiah(rapTotal)}</span>
                          </div>
                          {Object.entries(rapByType).map(([cat, items]) => (
                            <div key={cat} className="bg-white rounded-2xl border overflow-hidden">
                              <div className="px-4 py-3 bg-slate-50 font-bold text-sm uppercase">{cat}</div>
                              {items.map(row => {
                                const actual = rapActuals[row.id];
                                const actualQty = actual?.qty || 0;
                                const plannedQty = Number(row.quantity) || 0;
                                const fillPct = plannedQty > 0 ? Math.min(100, (actualQty / plannedQty) * 100) : 0;
                                return (
                                <div key={row.id} className="p-4 border-t text-sm gap-2">
                                  <div className="flex justify-between items-center gap-2">
                                    <div className="min-w-0">
                                      <div className="font-medium truncate">{row.name}</div>
                                      <div className="text-xs text-slate-400">
                                        Rencana: {row.quantity} {row.unit} × {formatRupiah(Number(row.unit_price))}
                                      </div>
                                      {actual && (
                                        <div className="text-xs text-emerald-600 mt-0.5">
                                          Realisasi: {actualQty} {row.unit} · {formatRupiah(actual.amount)}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="font-bold">{formatRupiah(Number(row.quantity) * Number(row.unit_price))}</span>
                                      {canManage && (
                                        <>
                                          <button type="button" onClick={() => startEditRap(row)} className="text-indigo-600 text-xs">Edit</button>
                                          <button type="button" onClick={() => setConfirmRapId(row.id)} className="text-rose-500 text-xs">Hapus</button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  {plannedQty > 0 && (
                                    <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${fillPct}%` }} />
                                    </div>
                                  )}
                                </div>
                              );})}
                            </div>
                          ))}
                        </>
                      )
                    ) : workItems.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-2xl border border-dashed">
                        <p className="text-sm text-slate-500">Belum ada jadwal pekerjaan.</p>
                        {canManage && <button type="button" onClick={() => setShowWiForm(true)} className="mt-2 text-indigo-600 text-sm font-bold">+ Tambah pekerjaan</button>}
                      </div>
                    ) : workItems.map(wi => (
                      <div key={wi.id} className="bg-white rounded-xl border p-4 text-sm">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <div>
                            <span className="font-bold">{wi.name}</span>
                            <div className="text-xs text-slate-400">{formatDateId(wi.planned_start)} – {formatDateId(wi.planned_end)}</div>
                          </div>
                          {canManage && (
                            <button type="button" onClick={() => deleteWorkItem(wi.id).then(reload)} className="text-rose-500 text-xs shrink-0">Hapus</button>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="range" min={0} max={100} value={Number(wi.progress_pct) || 0} disabled={!canManage} onChange={e => handleProgressChange(wi.id, Number(e.target.value))} className="flex-1 accent-indigo-600" />
                          <span className="text-xs font-bold w-10 text-right">{Number(wi.progress_pct) || 0}%</span>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {activeTab === 'realisasi' && (
                  <motion.div key="re" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div className="flex gap-2">
                        {['biaya', 'progres'].map(t => (
                          <button key={t} type="button" onClick={() => setActiveSubTab(t)} className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize ${activeSubTab === t ? 'bg-indigo-600 text-white' : 'bg-slate-200'}`}>{t}</button>
                        ))}
                      </div>
                      <button type="button" onClick={() => setCommandModalOpen(true)} className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-bold">
                        <Plus className="w-3.5 h-3.5" /> Catat via Monefyi Button
                      </button>
                    </div>
                    {activeSubTab === 'biaya' ? (
                      <>
                        {rapItems.length === 0 ? (
                          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
                            Buat RAP di tab Planning terlebih dahulu, lalu catat realisasi per item di sini.
                          </div>
                        ) : (
                          <div className="bg-white rounded-2xl border overflow-hidden">
                            <div className="px-4 py-3 bg-indigo-50 border-b">
                              <h3 className="text-sm font-bold text-indigo-900">Input Realisasi Manual</h3>
                              <p className="text-xs text-indigo-700 mt-0.5">
                                Klik item RAP atau isi jumlah ({' '}
                                <span className="font-semibold">pcs/satuan</span>) lalu tekan Enter — dialog harga satuan/total akan muncul.
                              </p>
                            </div>
                            {Object.entries(rapByType).map(([cat, items]) => (
                              <div key={cat}>
                                <div className="px-4 py-2 bg-slate-50 text-xs font-bold uppercase text-slate-500">{cat}</div>
                                {items.map(row => {
                                  const actual = rapActuals[row.id];
                                  const actualQty = actual?.qty || 0;
                                  const plannedQty = Number(row.quantity) || 0;
                                  const fillPct = plannedQty > 0 ? Math.min(100, (actualQty / plannedQty) * 100) : 0;
                                  return (
                                    <div key={row.id} className="p-4 border-t">
                                      <button
                                        type="button"
                                        onClick={() => canManage && openRealizationDialog(row)}
                                        disabled={!canManage}
                                        className="w-full text-left disabled:cursor-default"
                                      >
                                        <div className="flex justify-between gap-2 text-sm">
                                          <div>
                                            <div className="font-semibold text-slate-800">{row.name}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                              Rencana {plannedQty} {row.unit} · Realisasi {actualQty} {row.unit}
                                            </div>
                                          </div>
                                          <div className="text-right shrink-0">
                                            <div className="text-xs text-slate-400">RAP</div>
                                            <div className="font-bold">{formatRupiah(plannedQty * Number(row.unit_price))}</div>
                                            {actual && (
                                              <div className="text-xs text-emerald-600 font-semibold mt-0.5">
                                                {formatRupiah(actual.amount)}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        {plannedQty > 0 && (
                                          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${fillPct}%` }} />
                                          </div>
                                        )}
                                      </button>
                                      {canManage && (
                                        <div className="mt-3 flex gap-2 items-center">
                                          <input
                                            type="number"
                                            min={0}
                                            step="any"
                                            placeholder={`Jumlah (${row.unit})`}
                                            value={qtyDrafts[row.id] ?? ''}
                                            onChange={e => setQtyDrafts(d => ({ ...d, [row.id]: e.target.value }))}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitQtyDraft(row); } }}
                                            className="flex-1 px-3 py-2 border rounded-xl text-sm"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => submitQtyDraft(row)}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shrink-0"
                                          >
                                            Enter ↵
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="bg-white rounded-2xl border overflow-hidden">
                          <div className="px-4 py-3 bg-slate-50 text-xs font-bold text-slate-500 flex justify-between">
                            <span>Riwayat biaya tercatat</span>
                            <span>{formatRupiah(costs.reduce((s, c) => s + Number(c.total_amount), 0))}</span>
                          </div>
                          <table className="w-full text-xs">
                            <thead className="bg-slate-50 border-t"><tr><th className="p-3 text-left">Tanggal</th><th className="p-3 text-left">Keterangan</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Total</th>{canManage && <th className="p-3 w-10" />}</tr></thead>
                            <tbody>
                              {costs.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Belum ada biaya — input manual di atas atau gunakan Monefyi Button.</td></tr>
                              ) : costs.map(tx => (
                                <tr key={tx.id} className="border-t hover:bg-slate-50">
                                  <td className="p-3 whitespace-nowrap">{tx.date}</td>
                                  <td className="p-3 font-medium">{tx.description}</td>
                                  <td className="p-3 text-right text-slate-500">{tx.quantity != null ? `${tx.quantity}` : '—'}</td>
                                  <td className="p-3 text-right font-bold">{formatRupiah(Number(tx.total_amount))}</td>
                                  {canManage && (
                                    <td className="p-3 text-center">
                                      <button type="button" onClick={() => setConfirmCostId(tx.id)} className="p-1 hover:bg-rose-50 rounded"><Trash2 className="w-4 h-4 text-rose-500" /></button>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <>
                        {canManage && workItems.length > 0 && (
                          <div className="bg-white rounded-2xl border p-4 space-y-3">
                            <h3 className="text-sm font-bold text-slate-800">Update Progress Manual</h3>
                            <p className="text-xs text-slate-500">Isi persentase lalu Enter atau klik Simpan.</p>
                            {workItems.map(wi => (
                              <div key={wi.id} className="flex flex-wrap items-center gap-2 text-sm border-t pt-3 first:border-0 first:pt-0">
                                <span className="flex-1 min-w-[140px] font-medium">{wi.name}</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={progressDrafts[wi.id] ?? String(Number(wi.progress_pct) || 0)}
                                  onChange={e => setProgressDrafts(d => ({ ...d, [wi.id]: e.target.value }))}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      handleManualProgress(wi.id, Number(progressDrafts[wi.id] ?? wi.progress_pct));
                                    }
                                  }}
                                  className="w-20 px-2 py-1.5 border rounded-lg text-center"
                                />
                                <span className="text-xs text-slate-500">%</span>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={Number(progressDrafts[wi.id] ?? wi.progress_pct) || 0}
                                  onChange={e => setProgressDrafts(d => ({ ...d, [wi.id]: e.target.value }))}
                                  className="w-24 accent-indigo-600"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleManualProgress(wi.id, Number(progressDrafts[wi.id] ?? wi.progress_pct))}
                                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                                >
                                  Simpan
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {canManage && (
                          <div className="bg-white rounded-2xl border p-4 space-y-2">
                            <h3 className="text-sm font-bold text-slate-800">Log Harian Manual</h3>
                            <input
                              placeholder="Keterangan aktivitas lapangan..."
                              value={logDraft.description}
                              onChange={e => setLogDraft(d => ({ ...d, description: e.target.value }))}
                              className="w-full px-3 py-2 border rounded-xl text-sm"
                            />
                            <div className="flex gap-2">
                              <input
                                type="number"
                                placeholder="Progress +% (opsional)"
                                value={logDraft.progress}
                                onChange={e => setLogDraft(d => ({ ...d, progress: e.target.value }))}
                                className="flex-1 px-3 py-2 border rounded-xl text-sm"
                              />
                              <button
                                type="button"
                                onClick={handleManualLog}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                              >
                                Catat
                              </button>
                            </div>
                          </div>
                        )}

                        {logs.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-8">Belum ada log harian.</p>
                        ) : logs.map(log => (
                          <div key={log.id} className="bg-white border rounded-xl p-4 text-sm flex justify-between gap-2">
                            <div>
                              <span>{log.description}</span>
                              {log.progress_increment ? (
                                <span className="ml-2 text-emerald-600 text-xs font-bold">+{log.progress_increment}%</span>
                              ) : null}
                            </div>
                            <span className="text-slate-400 shrink-0">{log.date}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </motion.div>
                )}

                {activeTab === 'laporan' && (
                  <motion.div key="la" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-white border rounded-2xl p-5">
                        <h3 className="font-bold text-sm mb-4">RAP vs Realisasi (jt)</h3>
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={rapChartData.length ? rapChartData : [{ name: 'Total', planned: rapTotal / 1e6, actual: project.spent_amount / 1e6 }]}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="planned" name="RAP" fill="#e2e8f0" radius={4} />
                            <Bar dataKey="actual" name="Realisasi" fill="#6366f1" radius={4} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="bg-white border rounded-2xl p-5 flex flex-col items-center justify-center text-center">
                        <div className="text-4xl font-black text-slate-900">{opi}</div>
                        <div className="text-sm text-slate-500 mt-1">Overall Performance Index</div>
                        <div className={`mt-3 px-3 py-1 rounded-full text-xs font-bold ${Number(opi) >= 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {Number(opi) >= 1 ? 'Performa baik' : 'Perlu perhatian'}
                        </div>
                        <p className="text-xs text-slate-400 mt-3">CPI {cpi.toFixed(2)} · SPI {spi.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="bg-white border rounded-2xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50"><tr><th className="p-3 text-left">Metrik EVM</th><th className="p-3 text-right">Nilai</th></tr></thead>
                        <tbody>
                          {[
                            { m: 'PV (Planned Value)', v: formatRupiah(evm?.pv ?? 0) },
                            { m: 'EV (Earned Value)', v: formatRupiah(evm?.ev ?? 0) },
                            { m: 'AC (Actual Cost)', v: formatRupiah(evm?.ac ?? project.spent_amount) },
                            { m: 'EAC (Estimate at Completion)', v: formatRupiah(evm?.eac ?? 0) },
                            { m: 'ETC (Estimate to Complete)', v: formatRupiah(evm?.etc ?? 0) },
                            { m: 'CV (Cost Variance)', v: formatRupiah(cv) },
                            { m: 'SV (Schedule Variance)', v: formatRupiah(sv) },
                          ].map(row => (
                            <tr key={row.m} className="border-t"><td className="p-3">{row.m}</td><td className="p-3 text-right font-semibold">{row.v}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

          {canManage && (
            <div className="p-4 bg-white border-t flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmDelete(true)} className="p-2.5 rounded-xl hover:bg-rose-50 text-rose-500" title="Hapus proyek"><Trash2 className="w-5 h-5" /></button>
                <button type="button" onClick={() => setShowEdit(true)} className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-500" title="Edit proyek"><Edit3 className="w-5 h-5" /></button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 font-medium">Status:</label>
                <select
                  value={project.status}
                  onChange={e => handleStatusChange(e.target.value as Project['status'])}
                  className="text-xs font-bold border rounded-xl px-3 py-2.5 bg-slate-50"
                >
                  {(['planning', 'active', 'on_hold', 'completed', 'archived'] as const).map(s => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {confirmDelete && (
        <ConfirmDialog title="Hapus proyek?" message={`"${project.name}" dan semua data terkait akan dihapus permanen.`} danger confirmLabel="Hapus" onConfirm={handleDeleteProject} onCancel={() => setConfirmDelete(false)} />
      )}
      {confirmCostId && (
        <ConfirmDialog title="Hapus biaya?" message="Entri biaya ini akan dihapus dari proyek." danger confirmLabel="Hapus" onConfirm={() => handleDeleteCost(confirmCostId)} onCancel={() => setConfirmCostId(null)} />
      )}
      {confirmRapId && (
        <ConfirmDialog title="Hapus item RAP?" message="Item RAP akan dihapus dari perencanaan." danger confirmLabel="Hapus" onConfirm={async () => { await deleteRapItem(confirmRapId); setConfirmRapId(null); await reload(); showToast('RAP dihapus', 'success'); }} onCancel={() => setConfirmRapId(null)} />
      )}
      {showEdit && (
        <EditProjectModal project={project} onClose={() => setShowEdit(false)} onSaved={p => { setProject(p); updateProject(p.id, p); refreshData(); }} />
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
    </>
  );
}
