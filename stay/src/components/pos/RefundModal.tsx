import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { formatCurrency } from '../../utils/format';

interface RefundModalProps {
  open: boolean;
  onClose: () => void;
  transactionId: string;
  maxAmount: number;
  bookingId?: string;
  bookingCode?: string;
  viaXendit?: boolean;
  onConfirm: (amount: number, reason: string) => void;
}

export default function RefundModal({
  open,
  onClose,
  maxAmount,
  onConfirm,
}: RefundModalProps) {
  const [amount, setAmount] = useState(String(maxAmount));
  const [reason, setReason] = useState('');

  return (
    <Modal open={open} onClose={onClose} title="Refund / Pengembalian" size="md">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">Maksimum refund: <strong>{formatCurrency(maxAmount)}</strong></p>
        <Input label="Jumlah Refund" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input label="Alasan (wajib)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <p className="text-xs text-amber-600">Memerlukan persetujuan manager/owner</p>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={!reason || parseFloat(amount) <= 0 || parseFloat(amount) > maxAmount}
            onClick={() => { onConfirm(parseFloat(amount), reason); onClose(); }}
          >
            Proses Refund
          </Button>
        </div>
      </div>
    </Modal>
  );
}
