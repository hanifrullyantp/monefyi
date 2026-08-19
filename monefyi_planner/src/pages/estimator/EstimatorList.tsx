import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Loader2,
  Calculator,
  RefreshCw,
  FileText,
  Sparkles,
  Settings,
  List,
  ArrowUpDown,
  X,
  LayoutGrid,
  AlignJustify,
  PanelTop,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useUiStore } from '../../store/uiStore';
import EstimationCard from '../../components/estimator/EstimationCard';
import EstimationPipelineSummary from '../../components/estimator/EstimationPipelineSummary';
import ConvertEstimationWizard from '../../components/estimator/ConvertEstimationWizard';
import EstimatorOnboardingWizard from '../../components/estimator/EstimatorOnboardingWizard';
import ShareWhatsAppModal from '../../components/estimator/ShareWhatsAppModal';
import PostPurchaseBanner, {
  dismissPostPurchaseBanner,
  readPostPurchaseBanner,
} from '../../components/entitlement/PostPurchaseBanner';
import { countEstimationsByStatus, countEstimationsByPipelineSummary, matchesPipelineSummaryFilter, normalizeEstimationStatus, type PipelineSummaryBucket } from '../../lib/estimationStatus';
import {
  groupEstimationsForList,
  statusSortIndex,
  type EstimationGroupMode,
} from '../../lib/estimationListGrouping';
import {
  ESTIMATION_LIST_VIEW_OPTIONS,
  persistEstimationListViewMode,
  readEstimationListViewMode,
  type EstimationListViewMode,
} from '../../lib/estimationListView';
import {
  deleteEstimation,
  duplicateEstimation,
  estimationToFormDraft,
  loadEstimation,
  loadEstimations,
  updateEstimationStatus,
} from '../../services/estimatorService';
import { assertEstimationConvertible } from '../../services/estimationConvertService';
import { getProject } from '../../services/projectService';
import { shouldShowEstimatorOnboarding } from '../../services/estimatorOnboardingService';
import {
  loadWhatsAppTemplate,
  defaultWhatsAppTemplateConfig,
} from '../../services/quotationTemplateService';
import { loadPdfSettings } from '../../services/pdfSettingsService';
import { analytics } from '../../lib/analytics/events';
import { ESTIMATION_STATUS_LABEL } from '../../lib/estimatorFormat';
import type { EstimationFormDraft } from '../../types/estimator';
import type { PdfSettings } from '../../types/pdfSettings';
import type { WhatsAppTemplateConfig } from '../../lib/whatsappQuotationMessage';
import type { Estimation, EstimationStatus, EstimationWorkflowStatus } from '../../types/estimator';

const STATUS_FILTERS: Array<{ value: '' | EstimationStatus; label: string }> = [
  { value: '', label: 'Semua' },
  { value: 'wa', label: 'WA' },
  { value: 'survei', label: 'Survei' },
  { value: 'penawaran', label: 'Penawaran' },
  { value: 'closing', label: 'Closing' },
  { value: 'proses', label: 'Proses' },
  { value: 'finishing', label: 'Finishing' },
  { value: 'selesai', label: 'Selesai' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'converted', label: 'Jadi Proyek' },
];

type SortKey = 'newest' | 'oldest' | 'value_desc' | 'value_asc' | 'profit_desc' | 'status';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'oldest', label: 'Terlama' },
  { value: 'status', label: 'Status pipeline' },
  { value: 'value_desc', label: 'Nilai Tertinggi' },
  { value: 'value_asc', label: 'Nilai Terendah' },
  { value: 'profit_desc', label: 'Profit Tertinggi' },
];

const GROUP_OPTIONS: Array<{ value: EstimationGroupMode; label: string }> = [
  { value: 'none', label: 'Tanpa kelompok' },
  { value: 'status', label: 'Kelompok status' },
  { value: 'product', label: 'Kelompok produk' },
  { value: 'client', label: 'Kelompok klien' },
];

function sortRows(rows: Estimation[], key: SortKey): Estimation[] {
  const copy = [...rows];
  switch (key) {
    case 'oldest':
      return copy.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
    case 'value_desc':
      return copy.sort((a, b) => Number(b.total_selling_price) - Number(a.total_selling_price));
    case 'value_asc':
      return copy.sort((a, b) => Number(a.total_selling_price) - Number(b.total_selling_price));
    case 'profit_desc':
      return copy.sort((a, b) => Number(b.total_profit) - Number(a.total_profit));
    case 'status':
      return copy.sort((a, b) => {
        const byStatus = statusSortIndex(a.status) - statusSortIndex(b.status);
        if (byStatus !== 0) return byStatus;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
    default:
      return copy.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }
}

function ToolbarIconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`p-2.5 rounded-xl border transition-colors shrink-0 ${
        active
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  );
}

export default function EstimatorList() {
  const navigate = useNavigate();
  const { tenant, user, projects, addProject } = useAppStore();
  const showToast = useUiStore(s => s.showToast);
  const [rows, setRows] = useState<Estimation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'' | EstimationStatus>('');
  const [pipelineFilter, setPipelineFilter] = useState<'' | PipelineSummaryBucket>('');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [groupMode, setGroupMode] = useState<EstimationGroupMode>('none');
  const [listViewMode, setListViewMode] = useState<EstimationListViewMode>(readEstimationListViewMode);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertEstimation, setConvertEstimation] = useState<Estimation | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [postPurchaseProduct, setPostPurchaseProduct] = useState<'estimator' | 'pro' | null>(
    () => readPostPurchaseBanner(),
  );
  const [waShareOpen, setWaShareOpen] = useState(false);
  const [waDraft, setWaDraft] = useState<EstimationFormDraft | null>(null);
  const [waPdfSettings, setWaPdfSettings] = useState<PdfSettings | null>(null);
  const [waTemplate, setWaTemplate] = useState<WhatsAppTemplateConfig>(defaultWhatsAppTemplateConfig());
  const [waEstimationId, setWaEstimationId] = useState<string | undefined>();
  const [waProjectName, setWaProjectName] = useState<string | null>(null);
  const [waLoadingId, setWaLoadingId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [statusLoadingStage, setStatusLoadingStage] = useState<EstimationWorkflowStatus | 'rejected' | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const setListView = (mode: EstimationListViewMode) => {
    setListViewMode(mode);
    persistEstimationListViewMode(mode);
  };

  const listViewIcons: Record<EstimationListViewMode, typeof LayoutGrid> = {
    card: LayoutGrid,
    standard: AlignJustify,
    detail: PanelTop,
  };

  const listRowSpacing =
    listViewMode === 'card' ? 'space-y-2' : listViewMode === 'detail' ? 'space-y-4' : 'space-y-3';

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const data = await loadEstimations(tenant.id, { search });
      setRows(data);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat estimasi', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, search, showToast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!tenant?.id || !user?.id || loading || onboardingChecked) return;
    void shouldShowEstimatorOnboarding(user.id, tenant.id, tenant.name).then(should => {
      setOnboardingChecked(true);
      if (should) setOnboardingOpen(true);
    });
  }, [tenant?.id, tenant?.name, user?.id, loading, onboardingChecked]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const closeMenus = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', closeMenus);
    return () => document.removeEventListener('mousedown', closeMenus);
  }, []);

  const statusCounts = useMemo(() => countEstimationsByStatus(rows), [rows]);
  const pipelineSummaryCounts = useMemo(() => countEstimationsByPipelineSummary(rows), [rows]);

  const filteredRows = useMemo(() => {
    if (statusFilter) {
      return rows.filter(r => normalizeEstimationStatus(r.status) === statusFilter);
    }
    if (pipelineFilter) {
      return rows.filter(r => matchesPipelineSummaryFilter(r.status, pipelineFilter));
    }
    return rows;
  }, [rows, statusFilter, pipelineFilter]);

  const sortedRows = useMemo(() => sortRows(filteredRows, sortKey), [filteredRows, sortKey]);

  const groupedRows = useMemo(
    () => groupEstimationsForList(sortedRows, groupMode),
    [sortedRows, groupMode],
  );

  const activeFilterLabel = STATUS_FILTERS.find(f => f.value === statusFilter)?.label
    || (pipelineFilter === 'wa' ? 'WA'
      : pipelineFilter === 'survei' ? 'Survei & Penawaran'
        : pipelineFilter === 'closing' ? 'Closing & Produksi'
          : 'Semua');
  const activeSortLabel = SORT_OPTIONS.find(o => o.value === sortKey)?.label || 'Terbaru';
  const activeGroupLabel = GROUP_OPTIONS.find(g => g.value === groupMode)?.label || 'Tanpa kelompok';
  const toolbarSortLabel = [
    activeSortLabel,
    groupMode !== 'none' ? activeGroupLabel : '',
    statusFilter || pipelineFilter ? activeFilterLabel : '',
  ].filter(Boolean).join(' · ');

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Hapus estimasi "${title}"?`)) return;
    try {
      await deleteEstimation(id);
      showToast('Estimasi dihapus', 'success');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menghapus', 'error');
    }
  };

  const handleDuplicate = async (id: string) => {
    if (!tenant?.id || !user?.id) return;
    try {
      const copy = await duplicateEstimation(id, tenant.id, user.id);
      showToast('Estimasi diduplikasi', 'success');
      navigate(`/app/estimator/${copy.id}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menduplikasi', 'error');
    }
  };

  const handleConvert = async (id: string) => {
    try {
      const est = await loadEstimation(id);
      if (!est) throw new Error('Estimasi tidak ditemukan');
      assertEstimationConvertible(est);
      setConvertEstimation(est);
      setConvertOpen(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Tidak bisa dijadikan proyek', 'error');
    }
  };

  const handleShareWhatsApp = async (id: string) => {
    if (!tenant?.id) return;
    setWaLoadingId(id);
    try {
      const est = await loadEstimation(id);
      if (!est) throw new Error('Estimasi tidak ditemukan');
      const [draft, settings, template] = await Promise.all([
        estimationToFormDraft(est),
        loadPdfSettings(tenant.id, tenant.name),
        loadWhatsAppTemplate(tenant.id),
      ]);
      const projectName = est.project_id
        ? projects.find(p => p.id === est.project_id)?.name || est.title
        : est.title;
      setWaDraft(draft);
      setWaPdfSettings(settings);
      setWaTemplate(template);
      setWaEstimationId(id);
      setWaProjectName(projectName);
      setWaShareOpen(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat data share', 'error');
    } finally {
      setWaLoadingId(null);
    }
  };

  const handleStatusChange = async (estId: string, next: EstimationWorkflowStatus | 'rejected') => {
    const est = rows.find(r => r.id === estId);
    if (!est) return;
    const prevStatus = normalizeEstimationStatus(est.status);
    if (prevStatus === next || prevStatus === 'converted') return;

    setStatusUpdatingId(estId);
    setStatusLoadingStage(next);
    setRows(prev =>
      prev.map(r => (r.id === estId ? { ...r, status: next, updated_at: new Date().toISOString() } : r)),
    );

    try {
      const updated = await updateEstimationStatus(estId, next);
      setRows(prev => prev.map(r => (r.id === estId ? updated : r)));
      analytics.estimationStatusChanged({
        estimationId: estId,
        from: prevStatus,
        to: next,
      });
      if (next === 'closing') {
        const daysFromCreated = est.created_at
          ? Math.max(0, Math.floor((Date.now() - new Date(est.created_at).getTime()) / 86_400_000))
          : 0;
        analytics.estimationAccepted({
          estimationId: estId,
          total: Number(est.total_selling_price || 0),
          profit: Number(est.total_profit || 0),
          daysFromCreated,
        });
      }
      showToast(`Status diubah ke ${ESTIMATION_STATUS_LABEL[next]}`, 'success');
    } catch (e) {
      setRows(prev => prev.map(r => (r.id === estId ? est : r)));
      showToast(e instanceof Error ? e.message : 'Gagal mengubah status', 'error');
    } finally {
      setStatusUpdatingId(null);
      setStatusLoadingStage(null);
    }
  };

  const handleConverted = async (summary: { projectId: string; projectName: string }) => {
    showToast('Proyek berhasil dibuat', 'success');
    setConvertOpen(false);
    setConvertEstimation(null);
    try {
      const project = await getProject(summary.projectId, tenant?.currency);
      if (project) addProject(project);
    } catch {
      /* non-blocking */
    }
    load();
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-24 lg:pb-6">
      {postPurchaseProduct && (
        <PostPurchaseBanner
          product={postPurchaseProduct}
          onDismiss={() => {
            dismissPostPurchaseBanner();
            setPostPurchaseProduct(null);
          }}
        />
      )}

      {/* Title + Estimasi Baru */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2 min-w-0">
          <Calculator className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600 shrink-0" />
          <span className="truncate">Estimator</span>
        </h1>
        <button
          type="button"
          onClick={() => navigate('/app/estimator/new')}
          className="inline-flex items-center justify-center gap-1.5 shrink-0 min-w-[2.75rem] h-10 px-3 sm:px-4 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-md shadow-emerald-200/60"
          title="Estimasi Baru"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="hidden min-[420px]:inline">Estimasi Baru</span>
        </button>
      </div>

      <EstimationPipelineSummary
        counts={pipelineSummaryCounts}
        activePipelineFilter={pipelineFilter}
        onSelect={bucket => {
          setPipelineFilter(bucket);
          if (bucket) setStatusFilter('');
        }}
      />

      {/* Icon toolbar */}
      <div className="flex items-center gap-1.5 mb-3">
        <ToolbarIconButton label="Pengaturan" onClick={() => navigate('/app/estimator/settings')}>
          <Settings className="w-4 h-4" />
        </ToolbarIconButton>
        <ToolbarIconButton label="Pricelist" onClick={() => navigate('/app/estimator/pricelist')}>
          <List className="w-4 h-4" />
        </ToolbarIconButton>
        <ToolbarIconButton
          label="Cari estimasi"
          active={searchOpen || Boolean(search)}
          onClick={() => setSearchOpen(v => !v)}
        >
          <Search className="w-4 h-4" />
        </ToolbarIconButton>

        <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shrink-0">
          {ESTIMATION_LIST_VIEW_OPTIONS.map(option => {
            const Icon = listViewIcons[option.value];
            return (
              <button
                key={option.value}
                type="button"
                title={option.description}
                aria-label={option.label}
                aria-pressed={listViewMode === option.value}
                onClick={() => setListView(option.value)}
                className={`p-2 rounded-lg transition-colors ${
                  listViewMode === option.value
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>

        <div className="relative" ref={sortRef}>
          <ToolbarIconButton
            label={`Urutkan & filter: ${toolbarSortLabel}`}
            active={sortOpen || Boolean(statusFilter) || Boolean(pipelineFilter)}
            onClick={() => setSortOpen(v => !v)}
          >
            <ArrowUpDown className="w-4 h-4" />
          </ToolbarIconButton>
          {sortOpen && (
            <div className="absolute left-0 top-full mt-1 z-30 min-w-[12rem] bg-white border border-slate-200 rounded-xl shadow-lg py-1 max-h-80 overflow-y-auto">
              <p className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Urutkan</p>
              {SORT_OPTIONS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { setSortKey(o.value); setSortOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm ${
                    sortKey === o.value ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {o.label}
                </button>
              ))}
              <div className="my-1 border-t border-slate-100" />
              <p className="px-3 pt-1 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Kelompokkan</p>
              {GROUP_OPTIONS.map(g => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => { setGroupMode(g.value); setSortOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm ${
                    groupMode === g.value ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {g.label}
                </button>
              ))}
              <div className="my-1 border-t border-slate-100" />
              <p className="px-3 pt-1 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Filter status</p>
              {STATUS_FILTERS.map(f => {
                const count = f.value ? statusCounts[f.value] : statusCounts.all;
                return (
                  <button
                    key={f.value || 'all'}
                    type="button"
                    onClick={() => {
                      setStatusFilter(f.value);
                      setPipelineFilter('');
                      setSortOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm flex justify-between gap-2 ${
                      statusFilter === f.value ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className="text-slate-400 tabular-nums">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={load}
          title="Refresh"
          aria-label="Refresh"
          className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-emerald-600 hover:bg-slate-50 shrink-0 ml-auto"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Expandable search */}
      {(searchOpen || search) && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={searchInputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari kode, judul, klien..."
            className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-emerald-400 outline-none"
          />
          {(searchOpen || search) && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSearchOpen(false); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              aria-label="Tutup pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Desktop: inline search + urut/filter */}
      <div className="hidden lg:flex flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari kode, judul, klien..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-emerald-400 outline-none"
          />
        </div>
        <select
          value={sortKey}
          onChange={e => setSortKey(e.target.value as SortKey)}
          className="appearance-none w-44 pl-3 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={groupMode}
          onChange={e => setGroupMode(e.target.value as EstimationGroupMode)}
          className="appearance-none w-44 pl-3 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white"
        >
          {GROUP_OPTIONS.map(g => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => {
            setStatusFilter(e.target.value as '' | EstimationStatus);
            setPipelineFilter('');
          }}
          className="appearance-none w-44 pl-3 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white"
        >
          {STATUS_FILTERS.map(f => {
            const count = f.value ? statusCounts[f.value] : statusCounts.all;
            return (
              <option key={f.value || 'all'} value={f.value}>{f.label} ({count})</option>
            );
          })}
        </select>
        <select
          value={listViewMode}
          onChange={e => setListView(e.target.value as EstimationListViewMode)}
          className="appearance-none w-40 pl-3 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white"
          aria-label="Tampilan daftar"
        >
          {ESTIMATION_LIST_VIEW_OPTIONS.map(v => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : sortedRows.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 px-6 bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-dashed border-slate-200"
        >
          <div className="relative inline-flex mb-4">
            <FileText className="w-14 h-14 text-slate-300" />
            <Sparkles className="w-5 h-5 text-emerald-500 absolute -top-1 -right-1" />
          </div>
          <h2 className="text-lg font-black text-slate-800">Buat penawaran pertama Anda</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Dari pricelist ke PDF profesional dalam 5 menit.
          </p>
          <button
            type="button"
            onClick={() => navigate('/app/estimator/new')}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" /> Buat Estimasi Baru
          </button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {groupedRows.map(group => (
            <div key={group.key}>
              {groupMode !== 'none' && group.label && (
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 px-1">
                  {group.label}
                  <span className="text-slate-400 font-semibold normal-case ml-1.5">({group.rows.length})</span>
                </h2>
              )}
              <div className={listRowSpacing}>
                {group.rows.map(est => (
                  <EstimationCard
                    key={est.id}
                    estimation={est}
                    viewMode={listViewMode}
                    onOpen={() => navigate(`/app/estimator/${est.id}`)}
                    onEdit={() => navigate(`/app/estimator/${est.id}`)}
                    onDuplicate={() => handleDuplicate(est.id)}
                    onDelete={() => handleDelete(est.id, est.title)}
                    onConvert={() => handleConvert(est.id)}
                    onShareWhatsApp={() => handleShareWhatsApp(est.id)}
                    onStatusChange={next => handleStatusChange(est.id, next)}
                    statusLoading={statusUpdatingId === est.id ? statusLoadingStage : null}
                    waLoading={waLoadingId === est.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {waShareOpen && waDraft && waPdfSettings && (
        <ShareWhatsAppModal
          open={waShareOpen}
          onClose={() => {
            setWaShareOpen(false);
            setWaDraft(null);
            setWaPdfSettings(null);
          }}
          draft={waDraft}
          settings={waPdfSettings}
          projectName={waProjectName}
          estimationId={waEstimationId}
          templateConfig={waTemplate}
          onToast={(msg, type) => showToast(msg, type)}
        />
      )}

      {convertOpen && convertEstimation && (
        <ConvertEstimationWizard
          open={convertOpen}
          estimation={convertEstimation}
          onClose={() => {
            setConvertOpen(false);
            setConvertEstimation(null);
          }}
          onConverted={summary => {
            void handleConverted(summary);
          }}
        />
      )}

      {onboardingOpen && tenant?.id && user?.id && (
        <EstimatorOnboardingWizard
          open={onboardingOpen}
          orgId={tenant.id}
          orgName={tenant.name}
          userId={user.id}
          onClose={() => setOnboardingOpen(false)}
          onCompleted={() => {
            setOnboardingChecked(true);
            load();
          }}
        />
      )}

      {waLoadingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 pointer-events-none">
          <Loader2 className="w-8 h-8 animate-spin text-white drop-shadow" />
        </div>
      )}
    </div>
  );
}
