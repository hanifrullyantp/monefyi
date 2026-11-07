import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useUiStore } from '../../store/uiStore';
import EstimationKanbanView from '../../components/estimator/EstimationKanbanView';
import ConvertEstimationWizard from '../../components/estimator/ConvertEstimationWizard';
import EstimatorOnboardingWizard from '../../components/estimator/EstimatorOnboardingWizard';
import ShareWhatsAppModal from '../../components/estimator/ShareWhatsAppModal';
import KwitansiModal from '../../components/estimator/KwitansiModal';
import UpgradeModal from '../../components/entitlement/UpgradeModal';
import PostPurchaseBanner, {
  dismissPostPurchaseBanner,
  readPostPurchaseBanner,
} from '../../components/entitlement/PostPurchaseBanner';
import EstimatorListDashboard from '../../components/estimator/list/EstimatorListDashboard';
import EstimatorListToolbar from '../../components/estimator/list/EstimatorListToolbar';
import EstimatorListOptionsSheet from '../../components/estimator/list/EstimatorListOptionsSheet';
import EstimatorStatusPickerSheet from '../../components/estimator/list/EstimatorStatusPickerSheet';
import EstimatorBulkStatusPickerSheet from '../../components/estimator/list/EstimatorBulkStatusPickerSheet';
import EstimatorListBulkActionBar from '../../components/estimator/list/EstimatorListBulkActionBar';
import EstimatorArchiveConfirmDialog from '../../components/estimator/list/EstimatorArchiveConfirmDialog';
import EstimatorListExpandBar from '../../components/estimator/list/EstimatorListExpandBar';
import EstimationListCard from '../../components/estimator/list/EstimationListCard';
import EstimationListSkeleton from '../../components/estimator/list/EstimationListSkeleton';
import EstimatorListEmpty from '../../components/estimator/list/EstimatorListEmpty';
import type { PipelineTabId } from '../../components/estimator/EstimationPipelineTabs';
import {
  PIPELINE_GROUP_META,
  countEstimationsByStatus,
  getPipelineSummaryBucket,
  normalizeEstimationStatus,
} from '../../lib/estimationStatus';
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
import { getEstimationListStats } from '../../lib/estimatorListStats';
import {
  DASHBOARD_FILTER_LABEL,
  getEstimatorDashboardStats,
  isEstimationArchived,
  isEstimationStale,
  matchesDashboardFilter,
  sortEstimationsForDashboard,
  type DashboardListFilter,
} from '../../lib/estimatorListDashboard';
import { ESTIMATOR_LIST_PAGE_SIZE } from '../../lib/estimatorListThresholds';
import {
  countLifetimeEstimations,
  deleteEstimation,
  duplicateEstimation,
  estimationToFormDraft,
  loadEstimation,
  loadEstimations,
  updateEstimationOrder,
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
import {
  canCreateEstimation,
  canGenerateKwitansi,
  FREE_ESTIMATION_LIMIT,
} from '../../lib/entitlement';
import { useEntitlement } from '../../hooks/useEntitlement';
import { analytics } from '../../lib/analytics/events';
import { ESTIMATION_STATUS_LABEL } from '../../lib/estimatorFormat';
import type { EstimationFormDraft } from '../../types/estimator';
import type { PdfSettings } from '../../types/pdfSettings';
import type { WhatsAppTemplateConfig } from '../../lib/whatsappQuotationMessage';
import type { Estimation, EstimationStatus, EstimationWorkflowStatus } from '../../types/estimator';
import type { UpgradeModalTrigger } from '../../types/entitlement';

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

type SortKey = 'manual' | 'newest' | 'oldest' | 'value_desc' | 'value_asc' | 'profit_desc' | 'status';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'manual', label: 'Urutan Custom (Drag & Drop)' },
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

function matchesSearch(est: Estimation, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  return (
    est.code.toLowerCase().includes(q) ||
    est.title.toLowerCase().includes(q) ||
    (est.customer_name || '').toLowerCase().includes(q)
  );
}

function sortRows(rows: Estimation[], key: SortKey): Estimation[] {
  if (key === 'manual') {
    return [...rows].sort((a, b) => {
      const orderA = Number(a.sort_order ?? 0);
      const orderB = Number(b.sort_order ?? 0);
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }
  if (key === 'newest') return sortEstimationsForDashboard(rows);
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
      return sortEstimationsForDashboard(copy);
  }
}

export default function EstimatorListPage() {
  const navigate = useNavigate();
  const { tenant, user, projects, addProject } = useAppStore();
  const showToast = useUiStore(s => s.showToast);
  const entitlement = useEntitlement();

  const [rows, setRows] = useState<Estimation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [lifetimeCount, setLifetimeCount] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<'filter' | 'sort'>('filter');
  const [statusFilter, setStatusFilter] = useState<'' | EstimationStatus>('');
  const [pipelineTab, setPipelineTab] = useState<PipelineTabId>('all');
  const [dashboardFilter, setDashboardFilter] = useState<DashboardListFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [groupMode, setGroupMode] = useState<EstimationGroupMode>('none');
  const [listViewMode, setListViewMode] = useState<EstimationListViewMode>(readEstimationListViewMode);
  const [visibleCount, setVisibleCount] = useState(ESTIMATOR_LIST_PAGE_SIZE);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusPickerId, setStatusPickerId] = useState<string | null>(null);
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
  const [kwitansiOpen, setKwitansiOpen] = useState(false);
  const [kwitansiDraft, setKwitansiDraft] = useState<EstimationFormDraft | null>(null);
  const [kwitansiPdfSettings, setKwitansiPdfSettings] = useState<PdfSettings | null>(null);
  const [kwitansiLoadingId, setKwitansiLoadingId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeTrigger, setUpgradeTrigger] = useState<UpgradeModalTrigger>('estimator_pro_feature');
  const [upgradeFeatureName, setUpgradeFeatureName] = useState('Generator Kwitansi Pro');
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [archiveConfirmCount, setArchiveConfirmCount] = useState(0);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const archiveConfirmRunner = useRef<(() => Promise<void>) | null>(null);
  const [listSectionOpen, setListSectionOpen] = useState(true);

  const setListView = (mode: EstimationListViewMode) => {
    setListViewMode(mode);
    persistEstimationListViewMode(mode);
  };

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const data = await loadEstimations(tenant.id);
      setRows(data);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat estimasi', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, showToast]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!tenant?.id) return;
    void countLifetimeEstimations(tenant.id)
      .then(setLifetimeCount)
      .catch(error => console.error('Kuota estimasi gagal dimuat:', error));
  }, [tenant?.id, rows]);

  useEffect(() => {
    if (!tenant?.id || !user?.id || loading || onboardingChecked) return;
    void shouldShowEstimatorOnboarding(user.id, tenant.id, tenant.name).then(should => {
      setOnboardingChecked(true);
      if (should) setOnboardingOpen(true);
    });
  }, [tenant?.id, tenant?.name, user?.id, loading, onboardingChecked]);

  const statusCounts = useMemo(() => countEstimationsByStatus(rows), [rows]);
  const listStats = useMemo(() => getEstimationListStats(rows), [rows]);
  const dashboardStats = useMemo(() => getEstimatorDashboardStats(rows), [rows]);

  const searchedRows = useMemo(
    () => rows.filter(r => matchesSearch(r, debouncedSearch)),
    [rows, debouncedSearch],
  );

  const filteredRows = useMemo(() => {
    if (dashboardFilter !== 'all') {
      return searchedRows.filter(r => matchesDashboardFilter(r, dashboardFilter));
    }
    if (statusFilter) {
      return searchedRows.filter(r => normalizeEstimationStatus(r.status) === statusFilter);
    }
    if (pipelineTab === 'archive') {
      return searchedRows.filter(r => isEstimationArchived(r.status));
    }
    if (pipelineTab === 'all') {
      return searchedRows.filter(r => !isEstimationArchived(r.status));
    }
    return searchedRows.filter(r => getPipelineSummaryBucket(r.status) === pipelineTab);
  }, [searchedRows, dashboardFilter, statusFilter, pipelineTab]);

  const sortedRows = useMemo(() => sortRows(filteredRows, sortKey), [filteredRows, sortKey]);
  const groupedRows = useMemo(() => groupEstimationsForList(sortedRows, groupMode), [sortedRows, groupMode]);

  const newestId = sortedRows[0]?.id ?? null;

  const kanbanRows = useMemo(
    () => sortedRows.filter(r => {
      const s = normalizeEstimationStatus(r.status);
      return !isEstimationArchived(s);
    }),
    [sortedRows],
  );

  const pipelineCounts = useMemo(() => {
    const counts: Record<PipelineTabId, number> = {
      all: 0,
      wa: 0,
      survei: 0,
      closing: 0,
      archive: 0,
    };
    for (const row of rows) {
      if (isEstimationArchived(row.status)) {
        counts.archive += 1;
        continue;
      }
      counts.all += 1;
      const bucket = getPipelineSummaryBucket(row.status);
      if (bucket) counts[bucket] += 1;
    }
    return counts;
  }, [rows]);

  const statusFilterOptions = useMemo(
    () => STATUS_FILTERS.map(f => ({
      ...f,
      count: f.value ? statusCounts[f.value] : statusCounts.all,
    })),
    [statusCounts],
  );

  const listTitle = (() => {
    if (dashboardFilter !== 'all') return DASHBOARD_FILTER_LABEL[dashboardFilter];
    if (statusFilter) return STATUS_FILTERS.find(f => f.value === statusFilter)?.label ?? 'Filter';
    if (pipelineTab !== 'all') {
      if (pipelineTab === 'archive') return 'Arsip';
      return PIPELINE_GROUP_META[pipelineTab].title;
    }
    return DASHBOARD_FILTER_LABEL.all;
  })();

  const hasActiveFilter = dashboardFilter !== 'all' || Boolean(statusFilter) || pipelineTab !== 'all';

  useEffect(() => {
    setVisibleCount(ESTIMATOR_LIST_PAGE_SIZE);
    setExpandedId(null);
  }, [dashboardFilter, statusFilter, pipelineTab, debouncedSearch, sortKey, groupMode]);

  useEffect(() => {
    if (listViewMode === 'kanban' && selectionMode) {
      setSelectionMode(false);
      setSelectedIds(new Set());
    }
  }, [listViewMode, selectionMode]);

  const selectableRows = useMemo(
    () => sortedRows.filter(r => normalizeEstimationStatus(r.status) !== 'converted'),
    [sortedRows],
  );

  const selectedCount = useMemo(
    () => selectableRows.filter(r => selectedIds.has(r.id)).length,
    [selectableRows, selectedIds],
  );

  const toggleSelectionMode = () => {
    if (listViewMode === 'kanban') {
      showToast('Checklist hanya di tampilan list', 'info');
      return;
    }
    setSelectionMode(prev => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
    setExpandedId(null);
  };

  const toggleRowSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const allIds = selectableRows.map(r => r.id);
    const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(allIds));
  };

  const clearListFilter = () => {
    setDashboardFilter('all');
    setStatusFilter('');
    setPipelineTab('all');
  };

  const toggleDashboardFilter = (filter: Exclude<DashboardListFilter, 'all'>) => {
    setDashboardFilter(prev => (prev === filter ? 'all' : filter));
    setStatusFilter('');
    setPipelineTab('all');
  };

  const handlePipelineTabChange = (tab: PipelineTabId) => {
    setPipelineTab(tab);
    setStatusFilter('');
    setDashboardFilter('all');
  };

  const handleStatusFilterChange = (value: '' | EstimationStatus) => {
    setStatusFilter(value);
    if (value) setPipelineTab('all');
    setDashboardFilter('all');
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Hapus estimasi "${title}"?\nEstimasi akan dipindahkan ke arsip selama 30 hari sebelum dihapus permanen.`)) return;
    try {
      await deleteEstimation(id, user?.id);
      showToast('Estimasi dipindahkan ke arsip (dihapus setelah 30 hari)', 'success');
      void load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menghapus', 'error');
    }
  };

  const handleDuplicate = async (id: string) => {
    if (!tenant?.id || !user?.id) return;
    try {
      const used = lifetimeCount ?? await countLifetimeEstimations(tenant.id);
      if (!canCreateEstimation(entitlement, used)) {
        setUpgradeTrigger('estimator_paywall');
        setUpgradeFeatureName(`Kuota gratis ${FREE_ESTIMATION_LIMIT} estimasi habis`);
        setUpgradeOpen(true);
        return;
      }
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
      assertEstimationConvertible(est, projects);
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

  const handleKwitansi = async (id: string) => {
    if (!tenant?.id) return;
    if (!canGenerateKwitansi(entitlement)) {
      setUpgradeTrigger('estimator_pro_feature');
      setUpgradeFeatureName('Generator Kwitansi Pro');
      setUpgradeOpen(true);
      return;
    }
    setKwitansiLoadingId(id);
    try {
      const est = await loadEstimation(id);
      if (!est) throw new Error('Estimasi tidak ditemukan');
      const [draft, settings] = await Promise.all([
        estimationToFormDraft(est),
        loadPdfSettings(tenant.id, tenant.name),
      ]);
      setKwitansiDraft(draft);
      setKwitansiPdfSettings(settings);
      setKwitansiOpen(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat data kwitansi', 'error');
    } finally {
      setKwitansiLoadingId(null);
    }
  };

  const handleStatusChange = async (estId: string, next: EstimationWorkflowStatus | 'rejected') => {
    const est = rows.find(r => r.id === estId);
    if (!est) return;
    const prevStatus = normalizeEstimationStatus(est.status);
    if (prevStatus === next || prevStatus === 'converted') return;

    setStatusUpdatingId(estId);
    setRows(prev =>
      prev.map(r => (r.id === estId ? { ...r, status: next, updated_at: new Date().toISOString() } : r)),
    );

    try {
      const updated = await updateEstimationStatus(estId, next);
      setRows(prev => prev.map(r => (r.id === estId ? updated : r)));
      analytics.estimationStatusChanged({ estimationId: estId, from: prevStatus, to: next });
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
    }
  };

  const openArchiveConfirm = (count: number, run: () => Promise<void>) => {
    archiveConfirmRunner.current = run;
    setArchiveConfirmCount(count);
    setArchiveConfirmOpen(true);
  };

  const closeArchiveConfirm = () => {
    if (bulkBusy || archiveBusy) return;
    setArchiveConfirmOpen(false);
    archiveConfirmRunner.current = null;
  };

  const confirmArchive = () => {
    const run = archiveConfirmRunner.current;
    if (!run) {
      closeArchiveConfirm();
      return;
    }
    setArchiveConfirmOpen(false);
    void run().finally(() => {
      archiveConfirmRunner.current = null;
    });
  };

  const handleArchive = (est: Estimation) => {
    if (isEstimationArchived(est.status)) return;
    openArchiveConfirm(1, async () => {
      await handleStatusChange(est.id, 'rejected');
    });
  };

  const handleBulkDelete = () => {
    const targets = bulkSelectedEstimations();
    if (targets.length === 0) {
      showToast('Tidak ada estimasi yang dipilih', 'info');
      return;
    }
    if (!window.confirm(`Hapus ${targets.length} estimasi terpilih?\nEstimasi akan dipindahkan ke arsip selama 30 hari sebelum dihapus permanen.`)) return;
    setBulkBusy(true);
    (async () => {
      try {
        for (const est of targets) {
          await deleteEstimation(est.id, user?.id);
        }
        showToast(`${targets.length} estimasi dipindahkan ke arsip (30 hari)`, 'success');
        setSelectedIds(new Set());
        setSelectionMode(false);
        void load();
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Gagal menghapus estimasi', 'error');
        void load();
      } finally {
        setBulkBusy(false);
      }
    })();
  };

  const bulkSelectedEstimations = useCallback(() => {
    return rows.filter(r => selectedIds.has(r.id) && normalizeEstimationStatus(r.status) !== 'converted');
  }, [rows, selectedIds]);

  const handleBulkArchive = () => {
    const targets = bulkSelectedEstimations().filter(r => !isEstimationArchived(r.status));
    if (targets.length === 0) {
      showToast('Tidak ada estimasi yang bisa diarsipkan', 'info');
      return;
    }
    openArchiveConfirm(targets.length, async () => {
      setBulkBusy(true);
      try {
        for (const est of targets) {
          await updateEstimationStatus(est.id, 'rejected');
        }
        showToast(`${targets.length} estimasi diarsipkan`, 'success');
        setSelectedIds(new Set());
        setSelectionMode(false);
        void load();
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Gagal mengarsipkan', 'error');
        void load();
      } finally {
        setBulkBusy(false);
      }
    });
  };

  const handleBulkStatusPick = async (next: EstimationWorkflowStatus | 'rejected') => {
    const targets = bulkSelectedEstimations();
    if (targets.length === 0) return;
    setBulkBusy(true);
    setBulkStatusOpen(false);
    try {
      for (const est of targets) {
        const prev = normalizeEstimationStatus(est.status);
        if (prev === next || prev === 'converted') continue;
        await updateEstimationStatus(est.id, next);
      }
      showToast(`Status ${targets.length} estimasi diubah ke ${ESTIMATION_STATUS_LABEL[next]}`, 'success');
      setSelectedIds(new Set());
      setSelectionMode(false);
      void load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal mengubah status', 'error');
      void load();
    } finally {
      setBulkBusy(false);
    }
  };

  const handleArchiveStale = () => {
    const stale = rows.filter(r => isEstimationStale(r));
    if (stale.length === 0) return;
    openArchiveConfirm(stale.length, async () => {
      setArchiveBusy(true);
      try {
        for (const est of stale) {
          await updateEstimationStatus(est.id, 'rejected');
        }
        showToast(`${stale.length} estimasi diarsipkan`, 'success');
        void load();
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Gagal mengarsipkan', 'error');
        void load();
      } finally {
        setArchiveBusy(false);
      }
    });
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
    void load();
  };

  const renderCard = (est: Estimation, dragHandleProps?: Record<string, unknown> | null) => {
    const linkedProjId = est.converted_project_id || est.project_id || null;
    const linkedProj = linkedProjId ? projects.find(p => p.id === linkedProjId) : null;

    const isProjectActive = Boolean(linkedProj);

    return (
      <EstimationListCard
        key={est.id}
        estimation={est}
        newestId={newestId}
        dragHandleProps={dragHandleProps}
        expanded={!selectionMode && expandedId === est.id}
        onToggleExpand={() => setExpandedId(prev => (prev === est.id ? null : est.id))}
        onOpen={() => navigate(`/app/estimator/${est.id}`)}
        selectionMode={selectionMode}
        selected={selectedIds.has(est.id)}
        onToggleSelect={() => toggleRowSelected(est.id)}
        onDuplicate={() => handleDuplicate(est.id)}
        onDelete={() => handleDelete(est.id, est.title)}
        onConvert={() => handleConvert(est.id)}
        onShareWhatsApp={() => handleShareWhatsApp(est.id)}
        onChangeStatus={() => setStatusPickerId(est.id)}
        onArchive={() => { void handleArchive(est); }}
        onKwitansi={() => handleKwitansi(est.id)}
        onOpenProject={linkedProjId && isProjectActive ? () => navigate(`/app/projects/${linkedProjId}`) : undefined}
        linkedProjectName={linkedProj?.name ?? null}
        isLinkedProjectActive={isProjectActive}
        waLoading={waLoadingId === est.id}
        kwitansiLoading={kwitansiLoadingId === est.id}
        statusBusy={statusUpdatingId === est.id}
        archiveBusy={statusUpdatingId === est.id || archiveBusy}
        archiveDisabled={isEstimationArchived(est.status)}
        statusDisabled={false}
      />
    );
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const sourceIdx = result.source.index;
    const destIdx = result.destination.index;
    if (sourceIdx === destIdx) return;

    const reordered = Array.from(sortedRows);
    const [moved] = reordered.splice(sourceIdx, 1);
    reordered.splice(destIdx, 0, moved);

    if (sortKey !== 'manual') {
      setSortKey('manual');
    }

    const updatedRows = rows.map(r => {
      const foundIdx = reordered.findIndex(item => item.id === r.id);
      if (foundIdx !== -1) {
        return { ...r, sort_order: foundIdx };
      }
      return r;
    });
    setRows(updatedRows);

    const payload = reordered.map((item, idx) => ({
      id: item.id,
      sort_order: idx,
    }));
    await updateEstimationOrder(payload);
  };

  const quotaUsed = lifetimeCount ?? listStats.total;
  const visibleRows = sortedRows.slice(0, visibleCount);
  const statusPickerEst = rows.find(r => r.id === statusPickerId) ?? null;
  const statusPickerProjectId = statusPickerEst ? (statusPickerEst.converted_project_id || statusPickerEst.project_id) : null;
  const isStatusPickerProjectActive = statusPickerProjectId ? projects.some(p => p.id === statusPickerProjectId) : false;

  const goNew = () => {
    if (!canCreateEstimation(entitlement, quotaUsed)) {
      setUpgradeTrigger('estimator_paywall');
      setUpgradeFeatureName(`Kuota gratis ${FREE_ESTIMATION_LIMIT} estimasi habis`);
      setUpgradeOpen(true);
      return;
    }
    navigate('/app/estimator/new');
  };

  const freeRemaining =
    entitlement.isFree && entitlement.maxEstimations != null
      ? Math.max(0, entitlement.maxEstimations - quotaUsed)
      : null;

  return (
    <div className="max-w-6xl mx-auto pb-24 lg:pb-6 min-h-full bg-[#F4F7F5] overflow-x-hidden">
      {postPurchaseProduct && (
        <div className="px-4 pt-4 lg:px-0 lg:pt-4">
          <PostPurchaseBanner
            product={postPurchaseProduct}
            onDismiss={() => {
              dismissPostPurchaseBanner();
              setPostPurchaseProduct(null);
            }}
          />
        </div>
      )}

      {entitlement.isFree && freeRemaining != null && (
        <div className="mx-4 mt-4 lg:mx-0 lg:mt-4 mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">
            Paket gratis · {freeRemaining} dari {FREE_ESTIMATION_LIMIT} estimasi tersisa
          </p>
          <p className="text-xs text-amber-800 mt-0.5">
            Kuota dihitung seumur hidup. Menghapus estimasi tidak mengembalikan jatah. Upgrade ke Standard untuk unlimited.
          </p>
          <button
            type="button"
            onClick={() => {
              setUpgradeTrigger('estimator_paywall');
              setUpgradeFeatureName('Estimasi unlimited');
              setUpgradeOpen(true);
            }}
            className="mt-2 text-xs font-bold text-emerald-700 hover:underline"
          >
            Upgrade sekarang →
          </button>
        </div>
      )}

      <div className="pt-4">
        <EstimatorListDashboard
          stats={dashboardStats}
          activeFilter={dashboardFilter}
          onToggleFilter={toggleDashboardFilter}
          onCreate={goNew}
        />
      </div>

      <EstimatorListToolbar
        title={listTitle}
        count={sortedRows.length}
        search={searchInput}
        searchOpen={searchOpen}
        onSearchOpen={() => setSearchOpen(true)}
        onSearchClose={() => {
          setSearchOpen(false);
          setSearchInput('');
        }}
        onSearchChange={setSearchInput}
        onOpenFilter={() => {
          setSheetMode('filter');
          setSheetOpen(true);
        }}
        onOpenSort={() => {
          setSheetMode('sort');
          setSheetOpen(true);
        }}
        activeFilterLabel={hasActiveFilter ? listTitle : null}
        onClearFilter={clearListFilter}
        staleArchiveCount={dashboardFilter === 'stale' ? dashboardStats.staleCount : 0}
        onArchiveStale={() => { void handleArchiveStale(); }}
        archiveStaleBusy={archiveBusy}
        selectionMode={selectionMode}
        onToggleSelectionMode={toggleSelectionMode}
        selectionModeDisabled={listViewMode === 'kanban'}
        listSectionOpen={listSectionOpen}
        onToggleListSection={
          listViewMode === 'kanban' || sortedRows.length === 0
            ? undefined
            : () => setListSectionOpen(v => !v)
        }
      />

      {!loading && sortedRows.length > 0 && listViewMode !== 'kanban' && !listSectionOpen && (
        <div className="pb-2">
          <EstimatorListExpandBar
            totalCount={sortedRows.length}
            visibleCount={0}
            collapsed
            pageSize={ESTIMATOR_LIST_PAGE_SIZE}
            onToggleCollapsed={() => setListSectionOpen(true)}
          />
        </div>
      )}

      {loading ? (
        <EstimationListSkeleton />
      ) : rows.length === 0 ? (
        <EstimatorListEmpty onCreate={goNew} />
      ) : sortedRows.length === 0 ? (
        <div className="mx-4 text-center py-12 px-4 text-sm text-slate-500 bg-white rounded-[14px] border border-dashed border-[#E5EAE8]">
          Tidak ada estimasi di filter ini.
        </div>
      ) : listViewMode === 'kanban' ? (
        <div className="px-4">
          <EstimationKanbanView
            rows={kanbanRows}
            onOpen={est => navigate(`/app/estimator/${est.id}`)}
            onStatusChange={handleStatusChange}
            statusUpdatingId={statusUpdatingId}
          />
        </div>
      ) : !listSectionOpen ? null : groupMode === 'none' ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="estimator-list" isDropDisabled={selectionMode}>
            {provided => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="px-4 space-y-2"
              >
                {visibleRows.map((est, idx) => (
                  <Draggable
                    key={est.id}
                    draggableId={est.id}
                    index={idx}
                    isDragDisabled={selectionMode}
                  >
                    {dragProvided => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                      >
                        {renderCard(est, dragProvided.dragHandleProps)}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                <EstimatorListExpandBar
                  totalCount={sortedRows.length}
                  visibleCount={visibleRows.length}
                  pageSize={ESTIMATOR_LIST_PAGE_SIZE}
                  onShowAll={() => setVisibleCount(sortedRows.length)}
                  onShowLess={() => setVisibleCount(ESTIMATOR_LIST_PAGE_SIZE)}
                />
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <div className="px-4 space-y-4">
          {groupedRows.map(group => (
            <div key={group.key}>
              {group.label && (
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 px-1">
                  {group.label}
                  <span className="text-slate-400 font-semibold normal-case ml-1.5">({group.rows.length})</span>
                </h2>
              )}
              <div className="space-y-2">
                {group.rows.map(est => renderCard(est))}
              </div>
            </div>
          ))}
          <EstimatorListExpandBar
            totalCount={sortedRows.length}
            visibleCount={sortedRows.length}
            pageSize={ESTIMATOR_LIST_PAGE_SIZE}
            onShowLess={() => setListSectionOpen(false)}
          />
        </div>
      )}

      <EstimatorListOptionsSheet
        open={sheetOpen}
        mode={sheetMode}
        onClose={() => setSheetOpen(false)}
        listViewMode={listViewMode}
        onListViewChange={setListView}
        sortKey={sortKey}
        onSortChange={setSortKey}
        groupMode={groupMode}
        onGroupChange={setGroupMode}
        pipelineTab={pipelineTab}
        onPipelineTabChange={handlePipelineTabChange}
        pipelineCounts={pipelineCounts}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        statusFilters={statusFilterOptions}
        sortOptions={SORT_OPTIONS}
        groupOptions={GROUP_OPTIONS}
        onRefresh={() => void load()}
        onOpenPricelist={() => navigate('/app/estimator/pricelist')}
        onOpenSettings={() => navigate('/app/estimator/settings')}
      />

      {selectionMode && (
        <EstimatorListBulkActionBar
          selectedCount={selectedCount}
          selectableCount={selectableRows.length}
          busy={bulkBusy}
          onCancel={() => {
            setSelectionMode(false);
            setSelectedIds(new Set());
          }}
          onSelectAll={handleSelectAllVisible}
          onArchive={() => { void handleBulkArchive(); }}
          onChangeStatus={() => setBulkStatusOpen(true)}
        />
      )}

      <EstimatorArchiveConfirmDialog
        open={archiveConfirmOpen}
        count={archiveConfirmCount}
        busy={bulkBusy || archiveBusy}
        onCancel={closeArchiveConfirm}
        onConfirm={confirmArchive}
      />

      <EstimatorBulkStatusPickerSheet
        open={bulkStatusOpen}
        count={selectedCount}
        busy={bulkBusy}
        onClose={() => setBulkStatusOpen(false)}
        onPick={next => { void handleBulkStatusPick(next); }}
        onArchive={() => { void handleBulkArchive(); }}
        onDelete={() => { void handleBulkDelete(); }}
      />

      <EstimatorStatusPickerSheet
        open={Boolean(statusPickerId)}
        estimation={statusPickerEst}
        busy={Boolean(statusUpdatingId)}
        isProjectActive={isStatusPickerProjectActive}
        onUnlinkProject={async () => {
          if (!statusPickerEst) return;
          try {
            await updateEstimationStatus(statusPickerEst.id, 'selesai');
            showToast('Kaitan proyek dilepas. Status diubah ke Selesai', 'success');
            void load();
          } catch (e) {
            showToast(e instanceof Error ? e.message : 'Gagal melepas kaitan proyek', 'error');
          }
        }}
        onClose={() => setStatusPickerId(null)}
        onPick={next => {
          if (!statusPickerId) return;
          const id = statusPickerId;
          setStatusPickerId(null);
          void handleStatusChange(id, next);
        }}
        onArchive={() => {
          if (!statusPickerEst) return;
          void handleArchive(statusPickerEst);
        }}
        onDelete={() => {
          if (!statusPickerEst) return;
          void handleDelete(statusPickerEst.id, statusPickerEst.title);
        }}
      />

      {kwitansiOpen && kwitansiDraft && kwitansiPdfSettings && (
        <KwitansiModal
          open={kwitansiOpen}
          draft={kwitansiDraft}
          settings={kwitansiPdfSettings}
          onClose={() => {
            setKwitansiOpen(false);
            setKwitansiDraft(null);
            setKwitansiPdfSettings(null);
          }}
          onToast={(msg, type) => showToast(msg, type)}
        />
      )}

      <UpgradeModal
        open={upgradeOpen}
        trigger={upgradeTrigger}
        featureName={upgradeFeatureName}
        onClose={() => setUpgradeOpen(false)}
      />

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
          onConverted={summary => { void handleConverted(summary); }}
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
            void load();
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
