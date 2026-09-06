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
      <div className="bg-white rounded-2xl border p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            SOP Garansi Refund (7 hari)
          </h2>
          <button type="button" onClick={() => void load()} className="p-2 rounded-lg border hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
          {REFUND_SOP.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        <p className="text-xs text-slate-500 mt-4">
          Refund otomatis Lynk dinonaktifkan — semua via dashboard Lynk manual.
        </p>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Permintaan Refund</h3>
          <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
            {pending.length} pending
          </span>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500 p-6 text-center">Belum ada permintaan refund.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Paket</th>
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Alasan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                      {new Date(row.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3 font-medium">{row.plan_type}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.purchase_reference || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        row.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : row.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={row.reason}>
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
