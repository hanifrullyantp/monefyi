import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';

const EXPENSE_CATEGORIES = [
  'Perlengkapan Kebersihan',
  'Perlengkapan',
  'Utilitas',
  'Makanan',
  'ATK',
  'Maintenance',
  'Lainnya',
];

interface ExpensePanelProps {
  onSubmit: (description: string, amount: number, category: string, method: 'cash' | 'transfer', proofUrl?: string) => void;
}

export default function ExpensePanel({ onSubmit }: ExpensePanelProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [method, setMethod] = useState<'cash' | 'transfer'>('cash');

  return (
    <div className="space-y-4">
      <Input label="Keterangan" value={description} onChange={(e) => setDescription(e.target.value)} />
      <Input label="Nominal" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <div>
        <label className="text-sm font-medium text-slate-700">Kategori</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full mt-1 px-4 py-2.5 rounded-xl border">
          {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Sumber Dana</label>
        <select value={method} onChange={(e) => setMethod(e.target.value as 'cash' | 'transfer')} className="w-full mt-1 px-4 py-2.5 rounded-xl border">
          <option value="cash">Kas Tunai</option>
          <option value="transfer">Kas Bank</option>
        </select>
      </div>
      <Button
        className="w-full"
        disabled={!description || !amount}
        onClick={() => onSubmit(description, parseFloat(amount), category, method)}
      >
        Catat Pengeluaran
      </Button>
    </div>
  );
}

export function PayrollExpensePanel({
  payroll,
  onPay,
}: {
  payroll: { id: string; userId: string; netPay: number; status: string }[];
  onPay: (id: string) => void;
}) {
  const unpaid = payroll.filter((p) => p.status !== 'paid');
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {unpaid.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">Semua gaji sudah dibayar</p>
      ) : (
        unpaid.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-3 bg-violet-50 rounded-xl">
            <span className="text-sm font-medium">Staff {p.userId}</span>
            <Button size="sm" onClick={() => onPay(p.id)}>Bayar</Button>
          </div>
        ))
      )}
    </div>
  );
}
