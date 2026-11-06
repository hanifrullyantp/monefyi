import { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldCheck, RefreshCw } from 'lucide-react';
import { listRefundRequestsAdmin, type RefundRequestRow } from '../../services/refundService';
import { showToast } from '../../store/uiStore';

const REFUND_SOP = [
  'Verifikasi pembelian di Lynk Dashboard (ref_id / email buyer).',
  'Pastikan permintaan ≤ 7 hari sejak tanggal transaksi.',
  'Hubungi user via email/WA jika perlu klarifikasi.',
  'Proses refund manual di Lynk.id (otomatis dinonaktifkan).',
  'Update status di database / catat admin_notes.',
  'Konfirmasi ke user bahwa dana dikembalikan (1–3 hari kerja).',
];

export default function AdminRefundsPanel() {
  const [rows, setRows] = useState<RefundRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listRefundRequestsAdmin();
      setRows(data);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat refund', 'error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = rows.filter(r => r.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E5EAE8] p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-bold text-[#0F172A] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#059669]" />
            SOP Garansi Refund (7 hari)
          </h2>
          <button type="button" aria-label="Muat ulang permintaan refund" onClick={() => void load()} className="p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-xl border border-[#E5EAE8] hover:bg-[#F4F7F5] text-[#5B6B7A]">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <ol className="list-decimal list-inside space-y-2 text-sm text-[#0F172A]">
          {REFUND_SOP.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        <p className="text-xs text-[#5B6B7A] mt-4">
          Refund otomatis Lynk dinonaktifkan — semua via dashboard Lynk manual.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5EAE8] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5EAE8] flex items-center justify-between">
          <h3 className="font-bold text-[#0F172A]">Permintaan Refund</h3>
          <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full">
            {pending.length} pending
          </span>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#059669]" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[#5B6B7A] p-6 text-center">Belum ada permintaan refund.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F4F7F5] border-b border-[#E5EAE8] text-left text-xs text-[#5B6B7A] uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Paket</th>
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAE8]">
                {rows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-[#5B6B7A]">
                      {new Date(row.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3 font-medium text-[#0F172A]">{row.plan_type}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#5B6B7A]">{row.purchase_reference || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        row.status === 'pending'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : row.status === 'approved'
                            ? 'bg-emerald-50 text-[#059669] border border-emerald-200'
                            : 'bg-slate-100 text-[#5B6B7A]'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#5B6B7A] max-w-xs truncate" title={row.reason}>
                      {row.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
