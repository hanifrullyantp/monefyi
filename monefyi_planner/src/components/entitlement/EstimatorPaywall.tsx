import { Calculator, Check, Lock, Rocket, Sparkles } from 'lucide-react';
import { redirectToCheckout } from '../../lib/checkout';
import { ESTIMATOR_PRICE_IDR } from '../../lib/entitlement';
import { useAppStore } from '../../store/appStore';

export default function EstimatorPaywall() {
  const { tenant, user } = useAppStore();

  const handleBuy = () => {
    if (!tenant?.id || !user?.id) return;
    redirectToCheckout('estimator', {
      orgId: tenant.id,
      userId: user.id,
      email: user.email ?? undefined,
    });
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 mb-4">
        <Sparkles className="w-8 h-8" />
      </div>
      <Calculator className="w-10 h-10 text-emerald-600 mx-auto mb-3" />

      <h1 className="text-2xl font-black text-slate-900">Buat Penawaran Profesional</h1>
      <p className="text-sm text-slate-500 mt-2">
        dengan Monefyi Estimator — dari pricelist ke PDF berlogo dalam 5 menit.
      </p>

      <ul className="text-left text-sm text-slate-700 space-y-2 mt-8 max-w-sm mx-auto">
        {[
          'Pricelist master (unlimited item)',
          'PDF profesional 4 template',
          'Kalkulasi HPP & margin otomatis',
          'Kirim langsung ke WhatsApp klien',
          'Pipeline estimasi (draft → diterima)',
        ].map(item => (
          <li key={item} className="flex gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            {item}
          </li>
        ))}
        <li className="flex gap-2 font-semibold text-emerald-700">
          <Check className="w-4 h-4 shrink-0 mt-0.5" />
          BONUS: 1 proyek GRATIS di Planner
        </li>
      </ul>

      <div className="mt-8 p-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50">
        <div className="text-3xl font-black text-emerald-700 tabular-nums">
          Rp {ESTIMATOR_PRICE_IDR.toLocaleString('id-ID')}
        </div>
        <p className="text-xs text-emerald-800 mt-1">Sekali bayar, seumur hidup akses</p>
      </div>

      <button
        type="button"
        onClick={handleBuy}
        className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700"
      >
        <Rocket className="w-4 h-4" /> Beli Sekarang
      </button>

      <p className="text-xs text-slate-400 mt-4">
        ✓ 7 hari uang kembali · Pembayaran via QRIS, transfer, e-wallet
      </p>
      <p className="text-xs text-slate-500 mt-2 flex items-center justify-center gap-1">
        <Lock className="w-3 h-3" /> Checkout aman via Lynk.id
      </p>
    </div>
  );
}
