import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Search, Loader2, Calculator, RefreshCw, FileText, ChevronDown, Sparkles,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useUiStore } from '../../store/uiStore';
import EstimationCard from '../../components/estimator/EstimationCard';
import {
  deleteEstimation,
  duplicateEstimation,
  loadEstimations,
} from '../../services/estimatorService';
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

export default function EstimatorList() {
  const navigate = useNavigate();
  const { tenant, user } = useAppStore();
  const showToast = useUiStore(s => s.showToast);
  const [rows, setRows] = useState<Estimation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | EstimationStatus>('');
  const [sortKey, setSortKey] = useState<SortKey>('newest');

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const data = await loadEstimations(tenant.id, {
        status: statusFilter || undefined,
        search,
      });
      setRows(data);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat estimasi', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, statusFilter, search, showToast]);

  useEffect(() => { load(); }, [load]);

  const sortedRows = useMemo(() => sortRows(rows, sortKey), [rows, sortKey]);

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

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Calculator className="w-7 h-7 text-emerald-600" /> Estimator
          </h1>
          <p className="text-sm text-slate-500 mt-1">Hitung HPP, margin, dan buat penawaran profesional</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate('/app/estimator/settings')}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Pengaturan
          </button>
          <button
            type="button"
            onClick={() => navigate('/app/estimator/pricelist')}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Pricelist
          </button>
          <button
            type="button"
            onClick={() => navigate('/app/estimator/new')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200"
          >
            <Plus className="w-4 h-4" /> Estimasi Baru
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 mb-4">
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
            className="appearance-none w-full lg:w-48 pl-3 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${
              statusFilter === f.value
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
        <button type="button" onClick={load} className="p-2 text-slate-500 hover:text-emerald-600 ml-auto shrink-0">
          <RefreshCw className="w-4 h-4" />
        </button>
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
            Hitung margin, kirim via WhatsApp, langsung dapat jawaban.
          </p>
          <button
            type="button"
            onClick={() => navigate('/app/estimator/new')}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" /> Buat Estimasi Baru
          </button>
          <div className="flex items-center gap-3 justify-center mt-6 text-xs text-slate-400">
            <span className="h-px w-12 bg-slate-200" />
            atau setup pricelist dulu
            <span className="h-px w-12 bg-slate-200" />
          </div>
          <button
            type="button"
            onClick={() => navigate('/app/estimator/pricelist')}
            className="mt-3 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Setup Pricelist →
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
