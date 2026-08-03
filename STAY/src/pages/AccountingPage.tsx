import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import {
  BarChart3, ArrowUpCircle, ArrowDownCircle,
  Plus, Download, Filter,
  PieChart, Banknote, Droplets, Zap, Wrench
} from 'lucide-react';
import { cn } from '../utils/cn';
import { formatCurrency, formatDateTime } from '../utils/format';
import { exportToCsv } from '../utils/analytics';
import Button from '../components/ui/Button';
import Card, { CardHeader } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { useAuthStore } from '../store/authStore';

export default function AccountingPage() {
  const { accountingEntries, addAccountingEntry } = useAppStore();
  const { tenant } = useAuthStore();
  const [activeType, setActiveType] = useState<'all' | 'income' | 'expense'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState({ description: '', amount: '', category: 'Lainnya', type: 'expense' as 'income' | 'expense' });

  const transactions = accountingEntries.map((e) => ({
    id: e.id,
    desc: e.description,
    amount: e.amount,
    type: e.type,
    category: e.category,
    date: e.date,
  }));

  const filtered = activeType === 'all' ? transactions : transactions.filter((t) => t.type === activeType);

  const summary = {
    totalIncome: transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    totalExpense: transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
  };

  const handleExport = () => {
    exportToCsv(
      `stay-accounting-${new Date().toISOString().split('T')[0]}.csv`,
      ['Tanggal', 'Deskripsi', 'Kategori', 'Tipe', 'Jumlah'],
      filtered.map((t) => [t.date, t.desc, t.category, t.type, String(t.amount)])
    );
  };

  const handleAddEntry = () => {
    if (!newEntry.description || !newEntry.amount || !tenant) return;
    addAccountingEntry({
      tenantId: tenant.id,
      date: new Date().toISOString().split('T')[0],
      description: newEntry.description,
      category: newEntry.category,
      type: newEntry.type,
      amount: parseInt(newEntry.amount.replace(/\D/g, ''), 10) || 0,
    });
    setShowAdd(false);
    setNewEntry({ description: '', amount: '', category: 'Lainnya', type: 'expense' });
  };

  const categories = [
    { name: 'Gaji', icon: <Banknote />, color: 'bg-emerald-100 text-emerald-600' },
    { name: 'Utilitas', icon: <Zap />, color: 'bg-amber-100 text-amber-600' },
    { name: 'Maintenance', icon: <Wrench />, color: 'bg-rose-100 text-rose-600' },
    { name: 'Laundry', icon: <Droplets />, color: 'bg-sky-100 text-sky-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             <BarChart3 className="h-6 w-6 text-emerald-600" />
             Accounting & Pembukuan
          </h1>
          <p className="text-sm text-slate-500 font-medium">Rekapitulasi kas masuk dan keluar secara real-time</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="rounded-2xl h-12 border-slate-200" onClick={handleExport}><Download className="h-4 w-4 mr-2" /> Export</Button>
           <Button className="rounded-2xl h-12 bg-emerald-600 shadow-xl shadow-emerald-100" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" /> Transaksi Baru</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-200">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Total Kas Masuk</p>
           <p className="text-3xl font-black">{formatCurrency(summary.totalIncome)}</p>
        </div>
        <div className="bg-rose-500 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-rose-200">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Total Kas Keluar</p>
           <p className="text-3xl font-black">{formatCurrency(summary.totalExpense)}</p>
        </div>
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-slate-200">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Laba Bersih (Net)</p>
           <p className="text-3xl font-black">{formatCurrency(summary.totalIncome - summary.totalExpense)}</p>
        </div>
      </div>

      <Card>
        <CardHeader title="Transaksi" subtitle="Filter by type" />
        <div className="flex gap-2 mb-4">
          {(['all', 'income', 'expense'] as const).map((t) => (
            <button key={t} onClick={() => setActiveType(t)} className={cn('px-3 py-1.5 rounded-full text-sm font-medium', activeType === t ? 'bg-emerald-600 text-white' : 'bg-slate-100')}>
              {t === 'all' ? 'Semua' : t === 'income' ? 'Pemasukan' : 'Pengeluaran'}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {filtered.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
              <div>
                <p className="font-medium text-slate-800">{t.desc}</p>
                <p className="text-xs text-slate-400">{formatDateTime(t.date)} · {t.category}</p>
              </div>
              <div className="text-right">
                <p className={cn('font-bold', t.type === 'income' ? 'text-emerald-600' : 'text-rose-600')}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </p>
                <Badge variant={t.type === 'income' ? 'success' : 'danger'}>{t.type}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Transaksi Baru" size="sm">
        <div className="space-y-4">
          <Input label="Deskripsi" value={newEntry.description} onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })} />
          <Input label="Jumlah" value={newEntry.amount} onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })} />
          <select value={newEntry.type} onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value as 'income' | 'expense' })} className="w-full px-4 py-2.5 rounded-xl border">
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </select>
          <Button className="w-full" onClick={handleAddEntry}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
