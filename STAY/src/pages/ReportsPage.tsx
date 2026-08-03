import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { mockRevenueData, mockOccupancyData, mockDashboardStats } from '../data/mockData';
import Card, { CardHeader } from '../components/ui/Card';
import { formatCurrency } from '../utils/format';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { BarChart3, TrendingUp, Download, Calendar, DollarSign, Users, BedDouble } from 'lucide-react';

const paymentMethodData = [
  { name: 'Tunai', value: 35, color: '#10b981' },
  { name: 'Transfer', value: 28, color: '#0ea5e9' },
  { name: 'QRIS', value: 20, color: '#f59e0b' },
  { name: 'VA', value: 12, color: '#8b5cf6' },
  { name: 'E-Wallet', value: 5, color: '#ef4444' },
];

export default function ReportsPage() {
  const { bookings } = useAppStore();
  const [period, setPeriod] = useState<'7' | '14' | '30'>('14');

  const stats = mockDashboardStats;

  const summaryCards = [
    { title: 'Pendapatan Bulan Ini', value: formatCurrency(stats.revenueMonth), icon: <DollarSign className="h-5 w-5" />, color: 'emerald', change: '+12%' },
    { title: 'Total Booking', value: bookings.length.toString(), icon: <Calendar className="h-5 w-5" />, color: 'sky', change: '+8%' },
    { title: 'Avg. Occupancy', value: `${stats.occupancyRate}%`, icon: <BedDouble className="h-5 w-5" />, color: 'violet', change: '+5%' },
    { title: 'Total Tamu', value: '127', icon: <Users className="h-5 w-5" />, color: 'orange', change: '+15%' },
  ];

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    sky: 'bg-sky-50 text-sky-600',
    violet: 'bg-violet-50 text-violet-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Laporan & Analitik</h1>
          <p className="text-sm text-slate-500 mt-0.5">Ringkasan kinerja properti Anda</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        {summaryCards.map(card => (
          <div key={card.title} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[card.color]}`}>
                {card.icon}
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {card.change}
              </span>
            </div>
            <p className="text-xl font-bold text-slate-800">{card.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{card.title}</p>
          </div>
        ))}
      </div>

      {/* Period selector */}
      <div className="flex gap-2">
        {(['7', '14', '30'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              period === p ? 'bg-sky-500 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {p} Hari
          </button>
        ))}
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader
          title="Tren Pendapatan"
          subtitle="Pendapatan harian dalam periode terpilih"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <div className="px-5 pb-5">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={mockRevenueData.slice(-parseInt(period))}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                formatter={(v) => [formatCurrency(Number(v)), 'Pendapatan']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#revGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Occupancy */}
        <Card>
          <CardHeader
            title="Occupancy Rate"
            subtitle="6 bulan terakhir"
            icon={<BarChart3 className="h-4 w-4" />}
          />
          <div className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={mockOccupancyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  formatter={(v) => [`${v}%`, 'Occupancy']}
                />
                <Bar dataKey="rate" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Payment methods */}
        <Card>
          <CardHeader
            title="Metode Pembayaran"
            subtitle="Distribusi bulan ini"
            icon={<BarChart3 className="h-4 w-4" />}
          />
          <div className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={paymentMethodData} cx="50%" cy="50%" outerRadius={65} dataKey="value" paddingAngle={2}>
                  {paymentMethodData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  formatter={(v) => [`${v}%`, 'Proporsi']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {paymentMethodData.map(item => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-xs text-slate-500">{item.name} ({item.value}%)</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Booking status breakdown */}
      <Card>
        <CardHeader title="Distribusi Status Booking" icon={<BarChart3 className="h-4 w-4" />} />
        <div className="px-5 pb-5 space-y-3">
          {[
            { label: 'Check-in', count: bookings.filter(b => b.status === 'checked_in').length, color: 'bg-emerald-400' },
            { label: 'Dikonfirmasi', count: bookings.filter(b => b.status === 'confirmed').length, color: 'bg-sky-400' },
            { label: 'Menunggu', count: bookings.filter(b => b.status === 'pending').length, color: 'bg-amber-400' },
            { label: 'Check-out', count: bookings.filter(b => b.status === 'checked_out').length, color: 'bg-slate-400' },
            { label: 'Dibatalkan', count: bookings.filter(b => b.status === 'cancelled').length, color: 'bg-red-400' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="text-sm text-slate-600 w-28 flex-shrink-0">{item.label}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                <div
                  className={`${item.color} h-2.5 rounded-full transition-all`}
                  style={{ width: `${(item.count / bookings.length) * 100}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-slate-700 w-6 flex-shrink-0">{item.count}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
