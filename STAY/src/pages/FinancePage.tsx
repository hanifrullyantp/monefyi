import { useAppStore } from '../store/appStore';
import { mockPayments } from '../data/mockData';
import { formatCurrency, formatDateTime } from '../utils/format';
import { DollarSign, ArrowUpRight, ArrowDownRight, TrendingUp, Calendar, CreditCard } from 'lucide-react';
import Card, { CardHeader } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { cn } from '../utils/cn';

export default function FinancePage() {
  const { bookings } = useAppStore();

  const totalRevenue = mockPayments.reduce((sum, p) => sum + p.amount, 0);
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
          <span className="text-xs font-bold text-slate-600">JUNI 2024</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-500 rounded-3xl p-6 text-white shadow-lg shadow-emerald-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/20 rounded-xl"><DollarSign className="h-5 w-5" /></div>
            <div className="flex items-center gap-1 text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full"><TrendingUp className="h-3 w-3" /> +12.5%</div>
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
            <div className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full">Bulan Ini</div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Transaksi Berhasil</p>
          <p className="text-3xl font-black">{mockPayments.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction History */}
        <Card className="rounded-3xl overflow-hidden border-none shadow-xl shadow-slate-200/50">
          <CardHeader 
            title="Transaksi Terbaru" 
            subtitle="Daftar pembayaran yang masuk hari ini"
            icon={<ArrowDownRight className="h-4 w-4" />}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Waktu</th>
                  <th className="px-5 py-3 text-left">Metode</th>
                  <th className="px-5 py-3 text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {mockPayments.map((p, i) => (
                  <tr key={p.id} className={cn("hover:bg-slate-50/50 transition-colors", i < mockPayments.length - 1 && "border-b border-slate-50")}>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-700">{formatDateTime(p.createdAt).split(',')[1]}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase">{formatDateTime(p.createdAt).split(',')[0]}</p>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="info">{channelLabels[p.method] || p.method}</Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <p className="font-black text-emerald-600">{formatCurrency(p.amount)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Revenue by Category */}
        <Card className="rounded-3xl overflow-hidden border-none shadow-xl shadow-slate-200/50">
          <CardHeader title="Performa Kamar" icon={<TrendingUp className="h-4 w-4" />} />
          <div className="p-5 space-y-6">
            {bookings.slice(0, 5).map(b => (
              <div key={b.id} className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                  <span className="text-slate-500">Kamar {b.room?.number}</span>
                  <span className="text-slate-800">{formatCurrency(b.totalAmount)}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${(b.paidAmount / b.totalAmount) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-black uppercase italic">
                  <span className={cn(b.paymentStatus === 'paid' ? "text-emerald-500" : "text-amber-500")}>
                    {b.paymentStatus}
                  </span>
                  <span className="text-slate-400">{Math.round((b.paidAmount / b.totalAmount) * 100)}% Lunas</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
