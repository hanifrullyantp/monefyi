import { CheckCircle2, X } from 'lucide-react';

type Props = {
  open: boolean;
  product: 'estimator' | 'pro';
  onClose: () => void;
  onSetupPricelist: () => void;
  onNewEstimation: () => void;
  onGoDashboard: () => void;
};

export default function PaymentSuccessModal({
  open,
  product,
  onClose,
  onSetupPricelist,
  onNewEstimation,
  onGoDashboard,
}: Props) {
  if (!open) return null;

  const title = product === 'pro' ? 'Planner Pro Aktif!' : 'Estimator Aktif!';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 text-center relative">
        <button type="button" onClick={onClose} className="absolute top-3 right-3 p-2 rounded-lg hover:bg-slate-100" aria-label="Tutup">
          <X className="w-5 h-5 text-slate-500" />
        </button>
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
        <h2 className="text-xl font-black text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600 mt-2">
          {product === 'pro'
            ? 'Keuangan bisnis dan kuota proyek lebih besar sudah aktif.'
            : 'Anda sekarang bisa membuat penawaran profesional dan 1 proyek gratis di Planner.'}
        </p>
        <p className="text-xs text-slate-500 mt-4">Yuk mulai dari mana?</p>
        <div className="mt-4 space-y-2">
          {product === 'estimator' && (
            <>
              <button type="button" onClick={onSetupPricelist} className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">
                Setup Pricelist
              </button>
              <button type="button" onClick={onNewEstimation} className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700">
                Buat Estimasi Pertama
              </button>
            </>
          )}
          <button type="button" onClick={onGoDashboard} className="w-full py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
            Ke Dashboard Estimator →
          </button>
        </div>
      </div>
    </div>
  );
}
