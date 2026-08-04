import { useAppStore } from '../store/appStore';
import { formatCurrency, formatDateTime } from '../utils/format';
import { DollarSign, ArrowUpRight, TrendingUp, Calendar, CreditCard } from 'lucide-react';
import Card, { CardHeader } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { cn } from '../utils/cn';

export default function FinancePage() {
  const { bookings, payments } = useAppStore();

  const totalRevenue = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount - b.paidAmount), 0);

  const channelLabels: Record<string, string> = {
    cash: '💵 Tunai',
    transfer: '🏦 Transfer',
    virtual_account: '🏧 VA',
    qris: '📷 QRIS',
    credit_card: '💳 Kartu',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">Laporan Keuangan</h1>
          <p className="text-sm text-slate-500 font-medium">Rekapitulasi pendapatan riil properti</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 p-2 rounded-xl shadow-sm">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-600">{new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-500 rounded-3xl p-6 text-white shadow-lg shadow-emerald-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/20 rounded-xl"><DollarSign className="h-5 w-5" /></div>
            <div className="flex items-center gap-1 text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full"><TrendingUp className="h-3 w-3" /> Live</div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Total Pendapatan Diterima</p>
          <p className="text-3xl font-black">{formatCurrency(totalRevenue)}</p>
        </div>

        <div className="bg-amber-500 rounded-3xl p-6 text-white shadow-lg shadow-amber-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/20 rounded-xl"><ArrowUpRight className="h-5 w-5" /></div>
            <div className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full">Outstanding</div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Piutang Belum Terbayar</p>
          <p className="text-3xl font-black">{formatCurrency(pendingRevenue)}</p>
        </div>

        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-lg shadow-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/20 rounded-xl"><CreditCard className="h-5 w-5" /></div>
            <div className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full">{payments.length} tx</div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Total Transaksi</p>
          <p className="text-3xl font-black">{payments.length}</p>
        </div>
      </div>

      <Card>
        <CardHeader title="Ledger Pembayaran" subtitle="Riwayat transaksi dari POS & Payments" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase">
                <th className="pb-3 pr-4">Waktu</th>
                <th className="pb-3 pr-4">Booking</th>
                <th className="pb-3 pr-4">Metode</th>
                <th className="pb-3 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => {
                const booking = bookings.find(b => b.id === p.bookingId);
                return (
                  <tr key={p.id} className={cn('hover:bg-slate-50/50', i < payments.length - 1 && 'border-b border-slate-50')}>
                    <td className="py-3 pr-4 text-slate-500">{formatDateTime(p.createdAt)}</td>
                    <td className="py-3 pr-4 font-medium">{booking?.bookingCode || p.bookingId}</td>
                    <td className="py-3 pr-4"><Badge variant="info">{channelLabels[p.method] || p.method}</Badge></td>
                    <td className="py-3 text-right font-bold text-emerald-600">{formatCurrency(p.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
