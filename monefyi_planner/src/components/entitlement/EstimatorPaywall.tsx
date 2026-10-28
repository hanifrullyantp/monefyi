import { Calculator, Check, Lock, Rocket, Sparkles } from 'lucide-react';
import { redirectToCheckout } from '../../lib/checkout';
import {
  ESTIMATOR_PRICE_IDR,
  ESTIMATOR_PRO_PRICE_IDR,
  FREE_ESTIMATION_LIMIT,
} from '../../lib/entitlement';
import { useAppStore } from '../../store/appStore';

export default function EstimatorPaywall() {
  const { tenant, user } = useAppStore();

  const handleBuy = (product: 'estimator_standard' | 'estimator_pro') => {
    if (!tenant?.id || !user?.id) return;
    redirectToCheckout(product, {
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

      <h1 className="text-2xl font-black text-slate-900">Lanjut dengan Estimator</h1>
      <p className="text-sm text-slate-500 mt-2">
        Coba gratis {FREE_ESTIMATION_LIMIT} estimasi, atau langsung ambil Standard / Pro sekali bayar.
      </p>

      <ul className="text-left text-sm text-slate-700 space-y-2 mt-8 max-w-sm mx-auto">
        {[
          'Hitung harga di HP saat survei',
          'PDF penawaran profesional',
          'Kalkulasi HPP & margin otomatis',
          'Kirim ke WhatsApp klien',
        ].map(item => (
          <li key={item} className="flex gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            {item}
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-3">
        <button
          type="button"
          onClick={() => handleBuy('estimator_standard')}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-emerald-600 text-emerald-700 font-bold hover:bg-emerald-50"
        >
          Standard — Rp {ESTIMATOR_PRICE_IDR.toLocaleString('id-ID')}
        </button>
        <button
          type="button"
          onClick={() => handleBuy('estimator_pro')}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700"
        >
          <Rocket className="w-4 h-4" /> Pro — Rp {ESTIMATOR_PRO_PRICE_IDR.toLocaleString('id-ID')}
        </button>
      </div>

      <p className="text-xs text-slate-400 mt-4">
        ✓ 7 hari uang kembali · QRIS / transfer / e-wallet · Akses selamanya
      </p>
      <p className="text-xs text-slate-500 mt-2 flex items-center justify-center gap-1">
        <Lock className="w-3 h-3" /> Checkout aman via Lynk.id
      </p>
    </div>
  );
}
