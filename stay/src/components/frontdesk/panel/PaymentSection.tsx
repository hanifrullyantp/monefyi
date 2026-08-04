import { FileText, MessageCircle, Plus } from 'lucide-react';
import { formatCurrency } from '../../../utils/format';
import { format, parseISO } from 'date-fns';
import type { Payment } from '../../../types';
import type { RoomCardBookingSummary } from '../../../types/frontdesk.types';
import Button from '../../ui/Button';

export interface PaymentSectionProps {
  booking: RoomCardBookingSummary;
  payments: Payment[];
  onAddPayment?: () => void;
  onViewInvoice?: () => void;
  onSendInvoiceWA?: () => void;
}

export default function PaymentSection({
  booking,
  payments,
  onAddPayment,
  onViewInvoice,
  onSendInvoiceWA,
}: PaymentSectionProps) {
  const balance = Math.max(0, booking.totalAmount - booking.paidAmount);
  const paidPercent =
    booking.totalAmount > 0
      ? Math.round((booking.paidAmount / booking.totalAmount) * 100)
      : 0;

  return (
    <section className="space-y-4" aria-labelledby="payment-heading">
      <h3 id="payment-heading" className="text-xs font-black uppercase tracking-widest text-gray-400">
        Pembayaran
      </h3>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-[10px] font-bold uppercase text-gray-400">Total Tagihan</p>
        <p className="text-3xl font-black text-gray-900">
          {formatCurrency(booking.totalAmount)}
        </p>

        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs font-bold">
            <span className="text-emerald-700">Dibayar {paidPercent}%</span>
            <span className="text-gray-500">
              {formatCurrency(booking.paidAmount)} / {formatCurrency(booking.totalAmount)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${paidPercent}%` }}
            />
          </div>
        </div>

        {balance > 0 && (
          <p className="mt-3 text-lg font-black text-red-600">
            Sisa: {formatCurrency(balance)}
          </p>
        )}
      </div>

      {payments.length > 0 && (
        <ul className="space-y-2">
          {payments.slice(0, 5).map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2 text-sm"
            >
              <div>
                <p className="font-bold capitalize text-gray-800">{p.method.replace('_', ' ')}</p>
                <p className="text-xs text-gray-400">
                  {format(parseISO(p.createdAt), 'dd MMM yyyy HH:mm')}
                </p>
              </div>
              <span className="font-bold text-emerald-700">
                {formatCurrency(p.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        {balance > 0 && onAddPayment && (
          <Button
            className="min-h-[48px] w-full rounded-xl"
            icon={<Plus className="h-4 w-4" />}
            onClick={onAddPayment}
          >
            Tambah Pembayaran
          </Button>
        )}
        {onViewInvoice && (
          <Button
            variant="outline"
            className="min-h-[44px] w-full rounded-xl"
            icon={<FileText className="h-4 w-4" />}
            onClick={onViewInvoice}
          >
            Lihat Invoice
          </Button>
        )}
        {onSendInvoiceWA && (
          <Button
            variant="secondary"
            className="min-h-[44px] w-full rounded-xl"
            icon={<MessageCircle className="h-4 w-4" />}
            onClick={onSendInvoiceWA}
          >
            Kirim Invoice ke WA
          </Button>
        )}
      </div>
    </section>
  );
}
