import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import Card, { CardHeader } from '../components/ui/Card';
import { formatCurrency } from '../utils/format';
import {
  computeDashboardStats,
  computeRevenueData,
  computeOccupancyData,
  computePaymentMethodBreakdown,
  exportToCsv,
} from '../utils/analytics';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { BarChart3, TrendingUp, Download, Calendar, DollarSign, Users, BedDouble } from 'lucide-react';

export default function ReportsPage() {
  const { bookings, rooms, payments, guests } = useAppStore();
  const [period, setPeriod] = useState<'7' | '14' | '30'>('14');

  const stats = computeDashboardStats(bookings, rooms, payments);
  const revenueData = computeRevenueData(payments, parseInt(period, 10));
  const occupancyData = computeOccupancyData(bookings, 6);
  const paymentMethodData = computePaymentMethodBreakdown(payments);

  const summaryCards = [
    { title: 'Pendapatan Bulan Ini', value: formatCurrency(stats.revenueMonth), icon: <DollarSign className="h-5 w-5" />, color: 'emerald' },
    { title: 'Total Booking', value: bookings.length.toString(), icon: <Calendar className="h-5 w-5" />, color: 'sky' },
    { title: 'Avg. Occupancy', value: `${stats.occupancyRate}%`, icon: <BedDouble className="h-5 w-5" />, color: 'violet' },
    { title: 'Total Tamu', value: guests.length.toString(), icon: <Users className="h-5 w-5" />, color: 'orange' },
  ];

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    sky: 'bg-sky-50 text-sky-600',
    violet: 'bg-violet-50 text-violet-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  const handleExport = () => {
    const headers = ['Booking Code', 'Tamu', 'Check-in', 'Check-out', 'Status', 'Total', 'Dibayar'];
    const rows = bookings.map((b) => [
      b.bookingCode,
      b.guest?.name || '',
      b.checkIn,
      b.checkOut,
      b.status,
      String(b.totalAmount),
      String(b.paidAmount),
    ]);
    exportToCsv(`stay-report-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Laporan & Analitik</h1>
          <p className="text-sm text-slate-500 mt-0.5">Ringkasan kinerja properti Anda</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="flex gap-2">
        {(['7', '14', '30'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${period === p ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200'}`}
          >
            {p} hari
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {summaryCards.map(card => (
          <div key={card.title} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[card.color]}`}>
                {card.icon}
              </div>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-xs text-slate-400 font-medium">{card.title}</p>
            <p className="text-lg font-black text-slate-800 mt-0.5">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Pendapatan" subtitle={`${period} hari terakhir`} icon={<BarChart3 className="h-5 w-5 text-emerald-600" />} />
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b98120" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader title="Occupancy Rate" subtitle="6 bulan terakhir" icon={<TrendingUp className="h-5 w-5 text-violet-600" />} />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={occupancyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="rate" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {paymentMethodData.length > 0 && (
        <Card>
          <CardHeader title="Metode Pembayaran" subtitle="Distribusi dari data live" />
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={paymentMethodData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                {paymentMethodData.map((entry, i) => (
                  <Cell key={entry.name} fill={['#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444'][i % 5]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
