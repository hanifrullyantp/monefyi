import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { submitPlannerRefundRequest, REFUND_WINDOW_DAYS } from '../services/refundService';
import { useUiStore } from '../store/uiStore';

function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto p-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6">
          <ArrowLeft className="w-4 h-4" /> Beranda
        </Link>
        <h1 className="text-2xl font-black text-slate-900 mb-4">{title}</h1>
        <div className="bg-white rounded-2xl border p-6 text-sm text-slate-600 leading-relaxed space-y-4">{children}</div>
      </div>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell title="Kebijakan Privasi">
      <p>Monefyi Planner mengumpulkan data akun (email, nama) dan data proyek yang Anda input untuk keperluan operasional aplikasi.</p>
      <p>Data disimpan di Supabase dengan enkripsi transit. Kami tidak menjual data pribadi kepada pihak ketiga.</p>
      <p>Hubungi tim Monefyi untuk permintaan penghapusan data akun.</p>
    </LegalShell>
  );
}

export function TermsPage() {
  return (
    <LegalShell title="Syarat & Ketentuan">
      <p>Dengan menggunakan Monefyi Planner, Anda setuju menggunakan layanan secara legal dan bertanggung jawab atas data proyek yang dimasukkan.</p>
      <p>Layanan disediakan &quot;sebagaimana adanya&quot;. Fitur beta dapat berubah tanpa pemberitahuan sebelumnya.</p>
      <p className="font-semibold text-slate-800">Garansi uang kembali 7 hari</p>
      <p>
        Pembelian Estimator dapat diajukan refund dalam {REFUND_WINDOW_DAYS} hari jika produk tidak sesuai harapan.
        Refund diproses manual ke metode pembayaran asal (Lynk) setelah review tim — bukan otomatis instan.
      </p>
    </LegalShell>
  );
}

function RefundRequestForm() {
  const { isAuthenticated } = useAppStore();
  const showToast = useUiStore(s => s.showToast);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await submitPlannerRefundRequest(reason);
      if (!res.success) {
        showToast(res.error || 'Gagal mengirim permintaan', 'error');
        return;
      }
      setSent(true);
      showToast(res.message || 'Permintaan refund diterima', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengirim', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
        <p className="font-bold">Permintaan refund diterima</p>
        <p className="text-sm mt-1">Tim review 1–3 hari kerja. Refund manual via Lynk ke rekening/metode pembayaran asal.</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <p>Login diperlukan untuk mengajukan garansi refund (verifikasi pembelian otomatis).</p>
        <Link
          to="/login?next=/contact%3Frefund%3D1"
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold"
        >
          Login untuk ajukan refund
        </Link>
        <p className="text-xs text-slate-500">
          Atau email{' '}
          <a href="mailto:support@monefyi.com?subject=Garansi%20Refund%20Estimator" className="text-emerald-600 font-medium">
            support@monefyi.com
          </a>{' '}
          dengan bukti pembayaran & alasan.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs text-slate-500">
        Garansi berlaku {REFUND_WINDOW_DAYS} hari sejak pembelian. Alasan minimal 10 karakter.
      </p>
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        rows={4}
        required
        minLength={10}
        placeholder="Jelaskan mengapa Estimator tidak sesuai kebutuhan bisnis Anda..."
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
      />
      <button
        type="submit"
        disabled={loading || reason.trim().length < 10}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
        Ajukan refund garansi
      </button>
    </form>
  );
}

export function ContactPage() {
  const [params] = useSearchParams();
  const showRefund = params.get('refund') === '1';

  return (
    <LegalShell title={showRefund ? 'Garansi Refund 7 Hari' : 'Kontak'}>
      {showRefund ? (
        <>
          <p>
            Ajukan garansi uang kembali 100% jika Monefyi Estimator tidak membantu bisnis Anda dalam{' '}
            {REFUND_WINDOW_DAYS} hari pertama setelah pembelian.
          </p>
          <RefundRequestForm />
        </>
      ) : (
        <>
          <p>Email: <a href="mailto:support@monefyi.com" className="text-emerald-600 font-medium">support@monefyi.com</a></p>
          <p>Untuk demo enterprise atau integrasi kustom, sertakan nama perusahaan dan jumlah proyek aktif.</p>
          <p>
            <Link to="/contact?refund=1" className="text-emerald-600 font-semibold hover:underline">
              Ajukan garansi refund 7 hari →
            </Link>
          </p>
        </>
      )}
    </LegalShell>
  );
}
