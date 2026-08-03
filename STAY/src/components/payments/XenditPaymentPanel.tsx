import { ExternalLink, Loader2, RefreshCw, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';
import { cn } from '../../utils/cn';

interface XenditPaymentPanelProps {
  paymentUrl: string | null;
  status: 'idle' | 'pending' | 'paid' | 'error';
  loading: boolean;
  error: string | null;
  onCreate: () => void;
  onOpenLink?: () => void;
}

export default function XenditPaymentPanel({
  paymentUrl,
  status,
  loading,
  error,
  onCreate,
  onOpenLink,
}: XenditPaymentPanelProps) {
  if (status === 'paid') {
    return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
        <CheckCircle className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
        <p className="text-sm font-bold text-emerald-800">Pembayaran Xendit berhasil!</p>
      </div>
    );
  }

  if (paymentUrl && status === 'pending') {
    return (
      <div className="space-y-3 bg-violet-50 border border-violet-100 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-violet-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest">Menunggu pembayaran...</p>
        </div>
        <p className="text-[11px] text-violet-600 break-all">{paymentUrl}</p>
        <Button
          variant="outline"
          className="w-full"
          icon={<ExternalLink className="h-4 w-4" />}
          onClick={() => {
            window.open(paymentUrl, '_blank');
            onOpenLink?.();
          }}
        >
          Buka Link Pembayaran
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-500">{error}</p>}
      <Button
        className={cn('w-full', loading && 'opacity-70')}
        loading={loading}
        icon={<RefreshCw className="h-4 w-4" />}
        onClick={onCreate}
      >
        Buat Invoice Xendit
      </Button>
      <p className="text-[10px] text-slate-400 text-center">
        Tamu akan menerima link VA / QRIS / E-Wallet via Xendit
      </p>
    </div>
  );
}
