import { useState } from 'react';
import { Copy, MessageCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import Button from '../ui/Button';
import type { BankAccount } from '../../types/pos';

interface TransferPaymentPanelProps {
  grandTotal: number;
  bankAccounts: BankAccount[];
  guestName?: string;
  onConfirm: (referenceNumber: string, proofUrl?: string) => void;
  onCancel: () => void;
}

export default function TransferPaymentPanel({
  grandTotal,
  bankAccounts,
  guestName,
  onConfirm,
  onCancel,
}: TransferPaymentPanelProps) {
  const [ref, setRef] = useState('');
  const primary = bankAccounts.find((b) => b.isPrimary) ?? bankAccounts[0];

  const copyAccount = () => {
    if (primary) navigator.clipboard.writeText(primary.accountNumber);
  };

  const waMessage = primary
    ? encodeURIComponent(
        `Halo, saya ${guestName ?? 'tamu'} ingin transfer ${formatCurrency(grandTotal)} ke ${primary.bankName} ${primary.accountNumber} a.n. ${primary.accountHolder}`
      )
    : '';

  return (
    <div className="space-y-4">
      <p className="text-center text-2xl font-black">{formatCurrency(grandTotal)}</p>
      {primary && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
          <p className="font-bold text-amber-900">{primary.bankName}</p>
          <div className="flex items-center gap-2">
            <p className="font-mono text-lg flex-1">{primary.accountNumber}</p>
            <button type="button" onClick={copyAccount} className="p-2 bg-white rounded-lg border">
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-amber-800">a.n. {primary.accountHolder}</p>
          <a
            href={`https://wa.me/?text=${waMessage}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-sm text-emerald-700 font-medium"
          >
            <MessageCircle className="h-4 w-4" /> Kirim info via WhatsApp
          </a>
        </div>
      )}
      <div>
        <label className="text-sm font-medium text-slate-700">No. Referensi Transfer</label>
        <input
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          className="w-full mt-1 px-4 py-2.5 rounded-xl border"
          placeholder="Contoh: TRF123456"
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Batal</Button>
        <Button className="flex-1" disabled={!ref} onClick={() => onConfirm(ref)}>Konfirmasi</Button>
      </div>
    </div>
  );
}
