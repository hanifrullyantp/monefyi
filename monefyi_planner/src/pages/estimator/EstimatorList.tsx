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
  ChevronDown,
  Sparkles,
  Settings,
  List,
  ArrowUpDown,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useUiStore } from '../../store/uiStore';
import EstimationCard from '../../components/estimator/EstimationCard';
import ConvertEstimationWizard from '../../components/estimator/ConvertEstimationWizard';
import EstimatorOnboardingWizard from '../../components/estimator/EstimatorOnboardingWizard';
import ShareWhatsAppModal from '../../components/estimator/ShareWhatsAppModal';
import PostPurchaseBanner, {
  dismissPostPurchaseBanner,
  readPostPurchaseBanner,
} from '../../components/entitlement/PostPurchaseBanner';
import { countEstimationsByStatus } from '../../lib/estimationStatus';
import {
  deleteEstimation,
  duplicateEstimation,
  estimationToFormDraft,
  loadEstimation,
  loadEstimations,
} from '../../services/estimatorService';
import { assertEstimationConvertible } from '../../services/estimationConvertService';
import { getProject } from '../../services/projectService';
import { shouldShowEstimatorOnboarding } from '../../services/estimatorOnboardingService';
import {
  loadWhatsAppTemplate,
  defaultWhatsAppTemplateConfig,
} from '../../services/quotationTemplateService';
import { loadPdfSettings } from '../../services/pdfSettingsService';
import type { EstimationFormDraft } from '../../types/estimator';
import type { PdfSettings } from '../../types/pdfSettings';
import type { WhatsAppTemplateConfig } from '../../lib/whatsappQuotationMessage';
import type { Estimation, EstimationStatus } from '../../types/estimator';

const STATUS_FILTERS: Array<{ value: '' | EstimationStatus; label: string }> = [
  { value: '', label: 'Semua' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Terkirim' },
  { value: 'accepted', label: 'Diterima' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'converted', label: 'Jadi Proyek' },
];

type SortKey = 'newest' | 'oldest' | 'value_desc' | 'value_asc' | 'profit_desc';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'oldest', label: 'Terlama' },
  { value: 'value_desc', label: 'Nilai Tertinggi' },
  { value: 'value_asc', label: 'Nilai Terendah' },
  { value: 'profit_desc', label: 'Profit Tertinggi' },
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'' | EstimationStatus>('');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

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
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', closeMenus);
    return () => document.removeEventListener('mousedown', closeMenus);
  }, []);

  const statusCounts = useMemo(() => countEstimationsByStatus(rows), [rows]);

  const filteredRows = useMemo(() => {
    if (!statusFilter) return rows;
    return rows.filter(r => r.status === statusFilter);
  }, [rows, statusFilter]);

  const sortedRows = useMemo(() => sortRows(filteredRows, sortKey), [filteredRows, sortKey]);

  const activeFilterLabel = STATUS_FILTERS.find(f => f.value === statusFilter)?.label || 'Semua';
  const activeSortLabel = SORT_OPTIONS.find(o => o.value === sortKey)?.label || 'Terbaru';

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

      {/* Icon toolbar — mobile-first; desktop keeps wider search row below */}
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

        <div className="relative" ref={sortRef}>
          <ToolbarIconButton
            label={`Urutkan: ${activeSortLabel}`}
            active={sortOpen}
            onClick={() => { setSortOpen(v => !v); setFilterOpen(false); }}
          >
            <ArrowUpDown className="w-4 h-4" />
          </ToolbarIconButton>
          {sortOpen && (
            <div className="absolute left-0 top-full mt-1 z-30 min-w-[11rem] bg-white border border-slate-200 rounded-xl shadow-lg py-1">
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
            </div>
          )}
        </div>

        <div className="relative" ref={filterRef}>
          <ToolbarIconButton
            label={`Filter: ${activeFilterLabel}`}
            active={filterOpen || Boolean(statusFilter)}
            onClick={() => { setFilterOpen(v => !v); setSortOpen(false); }}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </ToolbarIconButton>
          {filterOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 min-w-[10rem] bg-white border border-slate-200 rounded-xl shadow-lg py-1 max-h-64 overflow-y-auto">
              {STATUS_FILTERS.map(f => {
                const count = f.value ? statusCounts[f.value] : statusCounts.all;
                return (
                  <button
                    key={f.value || 'all'}
                    type="button"
                    onClick={() => { setStatusFilter(f.value); setFilterOpen(false); }}
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

      {/* Desktop: inline search + sort (hidden on mobile — toolbar handles it) */}
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
        <div className="relative">
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="appearance-none w-48 pl-3 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Status chips — compact on mobile */}
      <div className="flex gap-2 overflow-x-auto mb-4 pb-1 -mx-1 px-1 scrollbar-none">
        {STATUS_FILTERS.map(f => {
          const count = f.value ? statusCounts[f.value] : statusCounts.all;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 ${
                statusFilter === f.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label} {count}
            </button>
          );
        })}
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
        <div className="space-y-3">
          {sortedRows.map(est => (
            <EstimationCard
              key={est.id}
              estimation={est}
              onOpen={() => navigate(`/app/estimator/${est.id}`)}
              onEdit={() => navigate(`/app/estimator/${est.id}`)}
              onDuplicate={() => handleDuplicate(est.id)}
              onDelete={() => handleDelete(est.id, est.title)}
              onConvert={() => handleConvert(est.id)}
              onShareWhatsApp={() => handleShareWhatsApp(est.id)}
            />
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
