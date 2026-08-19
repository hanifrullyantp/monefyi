import { Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'monefyi:post-purchase-banner';

export function markPostPurchaseBanner(product: 'estimator' | 'pro'): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, product);
  } catch {
    /* ignore */
  }
}

export function readPostPurchaseBanner(): 'estimator' | 'pro' | null {
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    if (v === 'estimator' || v === 'pro') return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function dismissPostPurchaseBanner(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

type Props = {
  product: 'estimator' | 'pro';
  onDismiss: () => void;
};

export default function PostPurchaseBanner({ product, onDismiss }: Props) {
  const navigate = useNavigate();
  const isEstimator = product === 'estimator';

  return (
    <div className="mb-4 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-emerald-900">
            {isEstimator ? 'Estimator aktif!' : 'Planner Pro aktif!'}
          </p>
          <p className="text-xs text-emerald-800 mt-0.5">
            {isEstimator
              ? 'Setup pricelist dulu, lalu buat estimasi pertama Anda.'
              : 'Keuangan bisnis dan kuota proyek lebih besar sudah siap dipakai.'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isEstimator && (
          <>
            <button
              type="button"
              onClick={() => navigate('/app/estimator/pricelist')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-200 text-emerald-800 hover:bg-emerald-100"
            >
              Setup Pricelist
            </button>
            <button
              type="button"
              onClick={() => navigate('/app/estimator/new')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Buat Estimasi
            </button>
          </>
        )}
        <button type="button" onClick={onDismiss} className="p-1.5 rounded-lg hover:bg-emerald-100" aria-label="Tutup">
          <X className="w-4 h-4 text-emerald-700" />
        </button>
      </div>
    </div>
  );
}
