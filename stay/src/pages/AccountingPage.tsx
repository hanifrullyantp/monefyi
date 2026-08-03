import { useState } from 'react';
import { 
  BarChart3, ArrowUpCircle, ArrowDownCircle, 
  Plus, Download, Filter, Search, 
  PieChart, Calendar, Banknote, ShoppingCart,
  Utensils, Droplets, Zap, Wrench
} from 'lucide-react';
import { cn } from '../utils/cn';
import { formatCurrency, formatDateTime } from '../utils/format';
import Button from '../components/ui/Button';
import Card, { CardHeader } from '../components/ui/Card';
import Badge from '../components/ui/Badge';

export default function AccountingPage() {
  const [activeType, setActiveType] = useState<'all' | 'income' | 'expense'>('all');

  const transactions = [
    { id: '1', desc: 'Booking Kamar 102 - Agus Permana', amount: 770000, type: 'income', category: 'Kamar', date: new Date().toISOString() },
    { id: '2', desc: 'Tagihan Listrik & Air - Mei', amount: 3450000, type: 'expense', category: 'Utilitas', date: new Date().toISOString() },
    { id: '3', desc: 'Pembelian Sabun & Shampoo (Bulk)', amount: 1200000, type: 'expense', category: 'Perlengkapan', date: new Date().toISOString() },
    { id: '4', desc: 'POS: Laundry Kamar 201', amount: 45000, type: 'income', category: 'Layanan', date: new Date().toISOString() },
    { id: '5', desc: 'Gaji Staff Resepsionis - Ahmad', amount: 3500000, type: 'expense', category: 'Staff', date: new Date().toISOString() },
  ];

  const summary = {
    totalIncome: transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    totalExpense: transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
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
           <Button variant="outline" className="rounded-2xl h-12 border-slate-200"><Download className="h-4 w-4 mr-2" /> Export</Button>
           <Button className="rounded-2xl h-12 bg-emerald-600 shadow-xl shadow-emerald-100"><Plus className="h-4 w-4 mr-2" /> Transaksi Baru</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-200">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Total Kas Masuk</p>
           <p className="text-3xl font-black">{formatCurrency(summary.totalIncome)}</p>
           <div className="mt-4 flex items-center gap-2 text-[10px] font-black bg-white/20 w-fit px-3 py-1 rounded-full uppercase">
             <ArrowUpCircle className="h-3 w-3" /> +Rp4.2M Hari Ini
           </div>
        </div>
        
        <div className="bg-rose-500 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-rose-200">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Total Kas Keluar</p>
           <p className="text-3xl font-black">{formatCurrency(summary.totalExpense)}</p>
           <div className="mt-4 flex items-center gap-2 text-[10px] font-black bg-white/20 w-fit px-3 py-1 rounded-full uppercase">
             <ArrowDownCircle className="h-3 w-3" /> -Rp8.1M Hari Ini
           </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-slate-200">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Laba Bersih (Net)</p>
           <p className="text-3xl font-black">{formatCurrency(summary.totalIncome - summary.totalExpense)}</p>
           <div className="mt-4 flex items-center gap-2 text-[10px] font-black bg-emerald-500 text-white w-fit px-3 py-1 rounded-full uppercase">
             <PieChart className="h-3 w-3" /> Profit Positif
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
              {['all', 'income', 'expense'].map(type => (
                <button 
                  key={type} 
                  onClick={() => setActiveType(type as any)}
                  className={cn(
                    "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    activeType === type ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {type === 'all' ? 'Semua' : type === 'income' ? 'Masuk' : 'Keluar'}
                </button>
              ))}
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold outline-none focus:ring-4 focus:ring-emerald-500/10" placeholder="Cari transaksi..." />
            </div>
          </div>

          <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/40 overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-sm">
                   <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-8 py-4 text-left">Deskripsi & Kategori</th>
                        <th className="px-8 py-4 text-left">Waktu</th>
                        <th className="px-8 py-4 text-right">Nominal</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {transactions.filter(t => activeType === 'all' || t.type === activeType).map(t => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-5">
                             <p className="font-black text-slate-800 tracking-tight uppercase">{t.desc}</p>
                             <div className="mt-1 flex items-center gap-2">
                                <div className={cn("w-1.5 h-1.5 rounded-full", t.type === 'income' ? "bg-emerald-500" : "bg-rose-500")} />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.category}</span>
                             </div>
                          </td>
                          <td className="px-8 py-5">
                             <p className="text-xs font-bold text-slate-500">{formatDateTime(t.date)}</p>
                          </td>
                          <td className="px-8 py-5 text-right">
                             <p className={cn("text-lg font-black", t.type === 'income' ? "text-emerald-600" : "text-rose-500")}>
                               {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                             </p>
                          </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
           <Card className="p-6 rounded-[2rem] border-none shadow-xl shadow-slate-200/40">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Pengeluaran Terbesar</h3>
              <div className="space-y-4">
                 {categories.map(c => (
                   <div key={c.name} className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                         <span className="text-slate-600">{c.name}</span>
                         <span className="text-slate-400">45%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                         <div className={cn("h-full transition-all duration-1000", c.color.split(' ')[0].replace('-100', '-500'))} style={{ width: '45%' }} />
                      </div>
                   </div>
                 ))}
              </div>
           </Card>

           <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2.5rem] flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-200/50 mb-4">
                 <ShoppingCart className="h-8 w-8" />
              </div>
              <h4 className="text-sm font-black text-emerald-800 uppercase tracking-widest mb-1">Stok Hampir Habis</h4>
              <p className="text-[10px] text-emerald-600 font-medium leading-relaxed">
                Persediaan sabun dan air mineral di gudang sisa 15%. Ingin pesan sekarang?
              </p>
              <button className="mt-4 w-full py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200 active:scale-95 transition-all">Lihat Inventory</button>
           </div>
        </div>
      </div>
    </div>
  );
}
