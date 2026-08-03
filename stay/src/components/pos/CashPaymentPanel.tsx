import { useState } from 'react';
import { formatCurrency } from '../../utils/format';
import Button from '../ui/Button';
import { Delete } from 'lucide-react';

const DENOMINATIONS = [50_000, 100_000, 200_000, 500_000, 1_000_000];

interface CashPaymentPanelProps {
  grandTotal: number;
  onConfirm: (cashReceived: number) => void;
  onCancel: () => void;
}

export default function CashPaymentPanel({ grandTotal, onConfirm, onCancel }: CashPaymentPanelProps) {
  const [input, setInput] = useState('');
  const received = parseFloat(input.replace(/\D/g, '')) || 0;
  const change = received - grandTotal;

  const appendDigit = (d: string) => {
    if (d === 'C') setInput('');
    else if (d === 'exact') setInput(String(grandTotal));
    else setInput((prev) => prev + d);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-slate-500">Total Tagihan</p>
        <p className="text-3xl font-black text-slate-900">{formatCurrency(grandTotal)}</p>
      </div>
      <div className="bg-slate-900 text-white rounded-2xl p-4 text-right">
        <p className="text-xs text-slate-400">Nominal Diterima</p>
        <p className="text-4xl font-mono font-bold">{formatCurrency(received)}</p>
        {received >= grandTotal && (
          <p className="text-emerald-400 text-lg font-bold mt-2">Kembalian: {formatCurrency(change)}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {DENOMINATIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setInput(String((received || 0) + d))}
            className="px-3 py-2 bg-emerald-100 text-emerald-800 rounded-xl text-sm font-bold"
          >
            +{formatCurrency(d)}
          </button>
        ))}
        <button type="button" onClick={() => appendDigit('exact')} className="px-3 py-2 bg-slate-200 rounded-xl text-sm font-bold">
          Pas
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'C'].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => appendDigit(k)}
            className="py-4 text-xl font-bold bg-slate-100 rounded-xl hover:bg-slate-200 active:scale-95"
          >
            {k === 'C' ? <Delete className="h-5 w-5 mx-auto" /> : k}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Batal</Button>
        <Button className="flex-1" disabled={received < grandTotal} onClick={() => onConfirm(received)}>
          Bayar
        </Button>
      </div>
    </div>
  );
}
