import { AlertCircle, X } from 'lucide-react';
import { redirectToCheckout } from '../../lib/checkout';
import { useAppStore } from '../../store/appStore';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function PaymentFailureModal({ open, onClose }: Props) {
  const { tenant, user } = useAppStore();

  if (!open) return null;

  const retry = () => {
    if (!tenant?.id || !user?.id) return;
    redirectToCheckout('estimator', { orgId: tenant.id, userId: user.id });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center relative">
        <button type="button" onClick={onClose} className="absolute top-3 right-3 p-2 rounded-lg hover:bg-slate-100" aria-label="Tutup">
          <X className="w-5 h-5 text-slate-500" />
        </button>
        <AlertCircle className="w-14 h-14 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Pembayaran belum selesai</h2>
        <p className="text-sm text-slate-600 mt-2">
          Transaksi dibatalkan atau gagal. Anda bisa coba lagi kapan saja.
        </p>
        <div className="mt-5 flex gap-2 justify-center">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
            Tutup
          </button>
          <button type="button" onClick={retry} className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700">
            Coba Lagi
          </button>
        </div>
      </div>
    </div>
  );
}
