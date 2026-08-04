import { useEffect } from 'react';
import { ExternalLink, Loader2, CheckCircle, QrCode } from 'lucide-react';
import Button from '../ui/Button';
import { cn } from '../../utils/cn';
import { useXenditPayment } from '../../hooks/useXenditPayment';
import { usePosStore } from '../../store/posStore';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/format';
import type { PaymentMethod } from '../../types';

interface XenditPaymentPanelLegacyProps {
  paymentUrl: string | null;
  status: 'idle' | 'pending' | 'paid' | 'error';
  loading: boolean;
  error: string | null;
  onCreate: () => void;
  onOpenLink?: () => void;
}

interface XenditPaymentPanelIntegratedProps {
  bookingId: string;
  amount: number;
  method: PaymentMethod;
  onPaid?: () => void;
}

type XenditPaymentPanelProps = XenditPaymentPanelLegacyProps | XenditPaymentPanelIntegratedProps;

function isIntegrated(props: XenditPaymentPanelProps): props is XenditPaymentPanelIntegratedProps {
  return 'bookingId' in props;
}

const METHOD_LABELS: Record<string, string> = {
  qris: 'QRIS',
  virtual_account: 'Virtual Account',
  ewallet: 'E-Wallet',
  credit_card: 'Kartu Kredit/Debit',
};

export default function XenditPaymentPanel(props: XenditPaymentPanelProps) {
  if (isIntegrated(props)) {
    return <XenditIntegrated {...props} />;
  }
  return <XenditLegacy {...props} />;
}

function XenditIntegrated({ bookingId, amount, method, onPaid }: XenditPaymentPanelIntegratedProps) {
  const xendit = useXenditPayment(bookingId);
  const pos = usePosStore();
  const { tenant } = useAppStore();
  const { user } = useAuthStore();
  const booking = useAppStore.getState().bookings.find((b) => b.id === bookingId);

  useEffect(() => {
    if (xendit.status === 'paid') {
      onPaid?.();
    }
  }, [xendit.status, onPaid]);

  const handleCreate = async () => {
    await xendit.createInvoice(amount, method);
    if (xendit.paymentUrl && xendit.externalId && user) {
      pos.createPendingXenditTransaction(method, amount, xendit.externalId, xendit.paymentUrl, user.id, tenant.id);
    }
  };

  if (xendit.status === 'paid') {
    return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
        <CheckCircle className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
        <p className="text-sm font-bold text-emerald-800">Pembayaran {METHOD_LABELS[method]} berhasil!</p>
      </div>
    );
  }

  if (xendit.paymentUrl && xendit.status === 'pending') {
    return (
      <div className="space-y-3 bg-violet-50 border border-violet-100 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-violet-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p className="text-xs font-bold uppercase">Menunggu {METHOD_LABELS[method]}...</p>
        </div>
        <p className="text-center text-lg font-black">{formatCurrency(amount)}</p>
        {method === 'qris' && (
          <div className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl">
            <QrCode className="h-24 w-24 text-slate-800" />
            <p className="text-xs text-slate-500">Scan QRIS di layar ini</p>
          </div>
        )}
        <p className="text-[11px] text-violet-600 break-all">{xendit.paymentUrl}</p>
        <Button
          variant="outline"
          className="w-full"
          icon={<ExternalLink className="h-4 w-4" />}
          onClick={() => window.open(xendit.paymentUrl!, '_blank')}
        >
          Buka {METHOD_LABELS[method]}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {xendit.error && <p className="text-xs text-red-500">{xendit.error}</p>}
      <p className="text-sm text-center font-bold">{formatCurrency(amount)} via {METHOD_LABELS[method]}</p>
      <Button
        className={cn('w-full', xendit.loading && 'opacity-70')}
        loading={xendit.loading}
        onClick={handleCreate}
      >
        Generate {METHOD_LABELS[method]}
      </Button>
      {booking && <p className="text-[10px] text-slate-400 text-center">{booking.bookingCode} · {booking.guest?.name}</p>}
    </div>
  );
}

function XenditLegacy({ paymentUrl, status, loading, error, onCreate, onOpenLink }: XenditPaymentPanelLegacyProps) {
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
        <Button variant="outline" className="w-full" icon={<ExternalLink className="h-4 w-4" />} onClick={() => { window.open(paymentUrl, '_blank'); onOpenLink?.(); }}>
          Buka Link Pembayaran
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-500">{error}</p>}
      <Button className={cn('w-full', loading && 'opacity-70')} loading={loading} onClick={onCreate}>
        Buat Invoice Xendit
      </Button>
    </div>
  );
}
