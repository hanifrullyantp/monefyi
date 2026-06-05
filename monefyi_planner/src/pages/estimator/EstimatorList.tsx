import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Search, Loader2, Copy, Pencil, Trash2, Calculator, RefreshCw,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useUiStore } from '../../store/uiStore';
import {
  deleteEstimation,
  duplicateEstimation,
  loadEstimations,
} from '../../services/estimatorService';
import {
  ESTIMATION_STATUS_COLOR,
  ESTIMATION_STATUS_LABEL,
  formatDateId,
  formatRupiahFull,
} from '../../lib/estimatorFormat';
import { getSignedImageUrl } from '../../services/estimationImageService';
import type { Estimation, EstimationStatus } from '../../types/estimator';

const STATUS_FILTERS: Array<{ value: '' | EstimationStatus; label: string }> = [
  { value: '', label: 'Semua' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Terkirim' },
  { value: 'accepted', label: 'Diterima' },
  { value: 'converted', label: 'Jadi Proyek' },
];

export default function EstimatorList() {
  const navigate = useNavigate();
  const { tenant, user } = useAppStore();
  const showToast = useUiStore(s => s.showToast);
  const [rows, setRows] = useState<Estimation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | EstimationStatus>('');
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

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

  useEffect(() => {
    let cancelled = false;
    const loadThumbs = async () => {
      const withImage = rows.filter(r => r.image_1_url);
      const entries = await Promise.all(
        withImage.map(async r => {
          try {
            const url = await getSignedImageUrl(r.image_1_url!);
            return [r.id, url] as const;
          } catch {
            return null;
          }
        }),
      );
      if (!cancelled) {
        setThumbs(Object.fromEntries(entries.filter((e): e is [string, string] => e !== null)));
      }
    };
    loadThumbs();
    return () => { cancelled = true; };
  }, [rows]);

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
            <Calculator className="w-7 h-7 text-indigo-600" /> Estimator
          </h1>
          <p className="text-sm text-slate-500 mt-1">Hitung HPP, margin, dan buat penawaran profesional</p>
        </div>
        <div className="flex gap-2">
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
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200"
          >
            <Plus className="w-4 h-4" /> Estimasi Baru
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari kode, judul, customer..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${
                statusFilter === f.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
          <button type="button" onClick={load} className="p-2 text-slate-400 hover:text-indigo-600">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : rows.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200"
        >
          <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="font-semibold text-slate-600">Belum ada estimasi</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">Buat estimasi pertama untuk penawaran customer</p>
          <button
            type="button"
            onClick={() => navigate('/app/estimator/new')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold"
          >
            + Estimasi Baru
          </button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {rows.map(est => (
            <motion.div
              key={est.id}
              layout
              className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-indigo-200 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {thumbs[est.id] && (
                  <img
                    src={thumbs[est.id]}
                    alt=""
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0 hidden sm:block"
                  />
                )}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/app/estimator/${est.id}`)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-indigo-600 font-bold">{est.code}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTIMATION_STATUS_COLOR[est.status]}`}>
                      {ESTIMATION_STATUS_LABEL[est.status]}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 truncate">{est.title}</h3>
                  <p className="text-xs text-slate-500">
                    {est.customer_name || '—'} · {formatDateId(est.updated_at)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-slate-900">{formatRupiahFull(Number(est.total_selling_price))}</div>
                </div>
                <div className="flex gap-1">
                  <IconBtn icon={Pencil} label="Edit" onClick={() => navigate(`/app/estimator/${est.id}`)} />
                  <IconBtn icon={Copy} label="Duplikat" onClick={() => handleDuplicate(est.id)} />
                  <IconBtn icon={Trash2} label="Hapus" danger onClick={() => handleDelete(est.id, est.title)} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function IconBtn({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`p-2 rounded-lg ${danger ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
