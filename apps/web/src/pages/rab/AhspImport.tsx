import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { rabService } from '../../services/rabService';
import { isRabSuperAdmin } from '../../lib/rab';

interface CatalogComponent {
  id: string;
  project_id: string;
  code: string;
  name: string;
  unit?: string | null;
  category?: string | null;
  is_active: boolean;
  created_at: string;
}

interface CatalogAnalysis {
  id: string;
  component_id: string;
  name: string;
  uom?: string | null;
  quantity: number;
  created_at: string;
  component?: CatalogComponent;
}

interface VerifiedState {
  [analysisId: string]: 'draft' | 'terverifikasi';
}

const FILTER_OPTIONS: { value: 'all' | 'draft' | 'terverifikasi'; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'draft', label: 'Draft' },
  { value: 'terverifikasi', label: 'Terverifikasi' },
];

export default function AhspImport() {
  const { user, emailVerified } = useAppStore();
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<CatalogAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState<VerifiedState>({});
  const [verifying, setVerifying] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'terverifikasi'>('all');

  useEffect(() => {
    if (!isRabSuperAdmin(user?.email, emailVerified)) {
      navigate('/app/rab', { replace: true });
      return;
    }
    void loadAnalyses();
  }, [user, emailVerified, navigate]);

  const loadAnalyses = useCallback(async () => {
    setLoading(true);
    try {
      // Ambil analisis katalog dari Supabase via edge function
      const { data, error } = await rabService.list('rab_catalog_analyses');
      if (error) throw new Error(error);
      const rows = (data as CatalogAnalysis[] ?? []).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setAnalyses(rows);
    } catch (err: any) {
      console.error('Gagal memuat katalog AHSP:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVerify = useCallback(async (analysisId: string) => {
    setVerifying(analysisId);
    try {
      // Catat verifikasi ke audit log via edge function
      const actorEmail = user?.email ?? 'unknown';
      await rabService.create('rab_audit_log', {
        actor_email: actorEmail,
        action: 'verify_ahsp_analysis',
        table_name: 'rab_catalog_analyses',
        row_id: analysisId,
        meta: {
          verified_at: new Date().toISOString(),
          source: 'SE 47/SE/Dk/2026 Lampiran VI',
          actor: actorEmail,
        },
      });
      setVerified((prev) => ({ ...prev, [analysisId]: 'terverifikasi' }));
    } catch (err: any) {
      console.error('Gagal verifikasi analisis:', err);
      alert('Gagal menyimpan verifikasi. Coba lagi.');
    } finally {
      setVerifying(null);
    }
  }, [user]);

  const filtered = analyses.filter((a) => {
    if (statusFilter === 'all') return true;
    return verified[a.id] === statusFilter;
  });

  const total = analyses.length;
  const verifiedCount = Object.values(verified).filter((v) => v === 'terverifikasi').length;
  const draftCount = total - verifiedCount;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7F5] p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#157F5F] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-600">Memuat katalog AHSP…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7F5]">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AhspImport — Verifikasi Katalog AHSP</h1>
            <p className="text-slate-600 text-sm mt-1">
              Sumber: SE 47/SE/Dk/2026 Lampiran VI (Cipta Karya). Hanya super admin terverifikasi yang dapat mengubah status.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/app/rab"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#E5EAE8] rounded-lg text-sm text-slate-700 hover:bg-[#F0F4F2] transition"
            >
              ← Kembali ke Dashboard RAB
            </Link>
          </div>
        </div>

        {/* Ringkasan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-[#E5EAE8] shadow-sm">
            <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold mb-1">Total Analisis</p>
            <p className="text-2xl font-bold text-slate-900">{total}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-[#E5EAE8] shadow-sm">
            <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold mb-1">Terverifikasi</p>
            <p className="text-2xl font-bold text-[#157F5F]">{verifiedCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-[#E5EAE8] shadow-sm">
            <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold mb-1">Draft (belum diverifikasi)</p>
            <p className="text-2xl font-bold text-[#B4533C]">{draftCount}</p>
          </div>
        </div>

        {/* Filter status */}
        <div className="flex gap-2 mb-4">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-md text-sm border font-medium transition ${
                statusFilter === opt.value
                  ? 'bg-[#157F5F] border-[#157F5F] text-white'
                  : 'bg-white border-[#E5EAE8] text-slate-700 hover:bg-[#F0F4F2]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Tabel katalog */}
        <div className="bg-white rounded-lg border border-[#E5EAE8] shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F0F4F2] text-slate-600 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-semibold">Kode Komponen</th>
                <th className="px-4 py-3 font-semibold">Uraian Analisis</th>
                <th className="px-4 py-3 font-semibold">Satuan</th>
                <th className="px-4 py-3 font-semibold text-center">Kuantitas</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const status = verified[a.id] ?? 'draft';
                const isVerified = status === 'terverifikasi';
                return (
                  <tr key={a.id} className="border-b border-[#E5EAE8] hover:bg-[#F0F4F2] transition last:border-0">
                    <td className="px-4 py-3 text-sm text-slate-700 font-mono">
                      {a.component?.code ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800">{a.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{a.uom ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-center">
                      {a.quantity.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                        isVerified
                          ? 'bg-[#E3F7EC] text-[#157F5F] border border-[#157F5F]/30'
                          : 'bg-[#FEF3E5] text-[#B4533C] border border-[#B4533C]/30'
                      }`}>
                        {isVerified ? '●' : '○'} {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!isVerified ? (
                        <button
                          disabled={verifying === a.id}
                          onClick={() => handleVerify(a.id)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#157F5F] text-white text-xs rounded-md hover:bg-[#0E6B4E] disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          {verifying === a.id ? (
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l7-7.617z"></path>
                            </svg>
                          ) : (
                            'Verifikasi'
                          )}
                        </button>
                      ) : (
                        <span className="text-[10px] text-[#157F5F] font-medium">Sudah diverifikasi</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Tidak ada data analisis katalog. Data AHSP dari SE 47/SE/Dk/2026 Lampiran VI akan tersedia setelah migrasi data selesai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Catatan */}
        <div className="mt-6 p-4 bg-[#FEF3E5] border border-[#B4533C]/20 rounded-lg text-sm text-slate-700">
          <p className="font-semibold text-[#B4533C] mb-2">Penting:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>AHSP hanya menyimpan koefisien, bukan harga. Harga dasar bahan/upah tetap dari input pengguna/HSD daerah.</li>
            <li>Analisis yang belum diverifikasi ditandai "draft" dan tidak dihitung dalam RAB.</li>
            <li>Semua aksi verifikasi dicatat di `rab_audit_log` dengan email actor dan waktu.</li>
            <li>Hanya super admin terverifikasi ({user?.email}) yang dapat mengakses halaman ini.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
