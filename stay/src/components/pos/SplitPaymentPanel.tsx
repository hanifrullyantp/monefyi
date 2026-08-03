import { useState } from 'react';
import { formatCurrency } from '../../utils/format';
import Button from '../ui/Button';
import type { PaymentChannelKey } from './PosCart';

interface SplitLine {
  methodCode: string;
  amount: number;
  cashReceived?: number;
  referenceNumber?: string;
}

interface SplitPaymentPanelProps {
  grandTotal: number;
  onConfirm: (splits: SplitLine[]) => void;
  onCancel: () => void;
}

const METHODS = [
  { code: 'cash', label: 'Tunai' },
  { code: 'transfer', label: 'Transfer' },
  { code: 'qris', label: 'QRIS' },
];

export default function SplitPaymentPanel({ grandTotal, onConfirm, onCancel }: SplitPaymentPanelProps) {
  const [splits, setSplits] = useState<SplitLine[]>([{ methodCode: 'cash', amount: 0 }]);

  const used = splits.reduce((s, x) => s + x.amount, 0);
  const remaining = grandTotal - used;

  const addSplit = () => setSplits([...splits, { methodCode: 'transfer', amount: 0 }]);
  const updateSplit = (i: number, updates: Partial<SplitLine>) => {
    setSplits(splits.map((s, idx) => (idx === i ? { ...s, ...updates } : s)));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="font-bold">Total: {formatCurrency(grandTotal)}</span>
        <span className={remaining === 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
          Sisa: {formatCurrency(remaining)}
        </span>
      </div>
      {splits.map((split, i) => (
        <div key={i} className="flex gap-2 items-end">
          <select
            value={split.methodCode}
            onChange={(e) => updateSplit(i, { methodCode: e.target.value })}
            className="px-3 py-2 rounded-xl border text-sm"
          >
            {METHODS.map((m) => (
              <option key={m.code} value={m.code}>{m.label}</option>
            ))}
          </select>
          <input
            type="number"
            value={split.amount || ''}
            onChange={(e) => updateSplit(i, { amount: Number(e.target.value) })}
            placeholder="Nominal"
            className="flex-1 px-3 py-2 rounded-xl border"
          />
          {split.methodCode === 'cash' && (
            <input
              type="number"
              value={split.cashReceived || ''}
              onChange={(e) => updateSplit(i, { cashReceived: Number(e.target.value) })}
              placeholder="Diterima"
              className="w-28 px-3 py-2 rounded-xl border text-sm"
            />
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addSplit}>+ Tambah Metode</Button>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Batal</Button>
        <Button className="flex-1" disabled={remaining !== 0} onClick={() => onConfirm(splits)}>Bayar Split</Button>
      </div>
    </div>
  );
}

interface DepositPaymentPanelProps {
  grandTotal: number;
  minPercent?: number;
  onConfirm: (percent: number, methodCode: string) => void;
  onCancel: () => void;
}

export function DepositPaymentPanel({ grandTotal, minPercent = 50, onConfirm, onCancel }: DepositPaymentPanelProps) {
  const [percent, setPercent] = useState(minPercent);
  const [method, setMethod] = useState('qris');
  const amount = Math.round(grandTotal * (percent / 100));

  return (
    <div className="space-y-4">
      <p className="text-center">Total: <strong>{formatCurrency(grandTotal)}</strong></p>
      <div>
        <label className="text-sm font-medium">DP (%)</label>
        <input type="range" min={10} max={100} value={percent} onChange={(e) => setPercent(Number(e.target.value))} className="w-full" />
        <p className="text-center text-2xl font-black text-emerald-600">{percent}% = {formatCurrency(amount)}</p>
      </div>
      <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border">
        <option value="cash">Tunai</option>
        <option value="transfer">Transfer</option>
        <option value="qris">QRIS</option>
        <option value="virtual_account">Virtual Account</option>
      </select>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Batal</Button>
        <Button className="flex-1" onClick={() => onConfirm(percent, method)}>Bayar DP</Button>
      </div>
    </div>
  );
}

export type { SplitLine };
