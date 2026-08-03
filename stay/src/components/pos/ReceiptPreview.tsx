import { formatCurrency, formatDateTime } from '../../utils/format';
import type { ReceiptRecord } from '../../types/pos';
import type { PosTransaction } from '../../types/pos';
import Button from '../ui/Button';
import { Printer, MessageCircle, Mail } from 'lucide-react';

interface ReceiptPreviewProps {
  transaction: PosTransaction;
  tenantName: string;
  tenantAddress?: string;
  tenantPhone?: string;
  cashierName?: string;
  onPrint?: () => void;
}

export default function ReceiptPreview({
  transaction,
  tenantName,
  tenantAddress,
  tenantPhone,
  cashierName,
  onPrint,
}: ReceiptPreviewProps) {
  const content = {
    tenantName,
    address: tenantAddress,
    phone: tenantPhone,
    transactionNumber: transaction.transactionNumber,
    date: transaction.createdAt,
    cashier: cashierName,
    items: transaction.items,
    subtotal: transaction.subtotal,
    tax: transaction.taxAmount,
    service: transaction.serviceChargeAmount,
    discount: transaction.discountAmount,
    grandTotal: transaction.grandTotal,
    payments: transaction.payments,
  };

  const waText = encodeURIComponent(
    `Struk ${transaction.transactionNumber} - ${tenantName}\nTotal: ${formatCurrency(transaction.grandTotal)}`
  );

  return (
    <div className="receipt-thermal mx-auto bg-white text-black p-4 font-mono text-xs max-w-[80mm]">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .receipt-thermal, .receipt-thermal * { visibility: visible; }
          .receipt-thermal { position: absolute; left: 0; top: 0; width: 80mm; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="text-center border-b border-dashed border-black pb-2 mb-2">
        <p className="font-bold text-sm">{tenantName}</p>
        {tenantAddress && <p>{tenantAddress}</p>}
        {tenantPhone && <p>{tenantPhone}</p>}
      </div>
      <p>No: {transaction.transactionNumber}</p>
      <p>Tgl: {formatDateTime(transaction.createdAt)}</p>
      {cashierName && <p>Kasir: {cashierName}</p>}
      <div className="border-t border-dashed border-black my-2" />
      {transaction.items.map((item) => (
        <div key={item.id} className="flex justify-between">
          <span>{item.description} x{item.quantity}</span>
          <span>{formatCurrency(item.subtotal)}</span>
        </div>
      ))}
      <div className="border-t border-dashed border-black my-2" />
      <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(transaction.subtotal)}</span></div>
      {transaction.taxAmount > 0 && <div className="flex justify-between"><span>Pajak</span><span>{formatCurrency(transaction.taxAmount)}</span></div>}
      {transaction.serviceChargeAmount > 0 && <div className="flex justify-between"><span>Service</span><span>{formatCurrency(transaction.serviceChargeAmount)}</span></div>}
      {transaction.discountAmount > 0 && <div className="flex justify-between"><span>Diskon</span><span>-{formatCurrency(transaction.discountAmount)}</span></div>}
      <div className="flex justify-between font-bold text-sm mt-1"><span>TOTAL</span><span>{formatCurrency(transaction.grandTotal)}</span></div>
      <div className="border-t border-dashed border-black my-2" />
      {transaction.payments.map((p) => (
        <div key={p.id}>
          <div className="flex justify-between">
            <span>{p.paymentMethod?.name ?? 'Bayar'}</span>
            <span>{formatCurrency(p.amount)}</span>
          </div>
          {p.changeAmount != null && p.changeAmount > 0 && (
            <div className="flex justify-between"><span>Kembalian</span><span>{formatCurrency(p.changeAmount)}</span></div>
          )}
        </div>
      ))}
      <div className="border-t border-dashed border-black my-2 text-center">
        <p>Terima kasih sudah menginap!</p>
        <p className="text-[10px]">Powered by STAY</p>
      </div>
      <div className="no-print flex gap-2 mt-4">
        <Button size="sm" variant="outline" icon={<Printer className="h-4 w-4" />} onClick={onPrint ?? (() => window.print())}>Cetak</Button>
        <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer">
          <Button size="sm" variant="outline" icon={<MessageCircle className="h-4 w-4" />}>WA</Button>
        </a>
        <a href={`mailto:?subject=Struk ${transaction.transactionNumber}&body=${waText}`}>
          <Button size="sm" variant="outline" icon={<Mail className="h-4 w-4" />}>Email</Button>
        </a>
      </div>
    </div>
  );
}

/** Generate invoice PDF content as printable HTML */
export function InvoicePrintView(props: ReceiptPreviewProps & { guestName?: string; bookingCode?: string }) {
  return (
    <div className="invoice-a4 p-8 max-w-[210mm] mx-auto bg-white">
      <style>{`
        @media print {
          .invoice-a4 { width: 210mm; }
          .no-print { display: none; }
        }
      `}</style>
      <ReceiptPreview {...props} />
    </div>
  );
}
