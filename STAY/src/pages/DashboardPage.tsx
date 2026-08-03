import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import StatCard from '../components/ui/StatCard';
import Card, { CardHeader } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { formatCurrency, formatShortDate } from '../utils/format';
import { mockDashboardStats, mockRevenueData, mockOccupancyData } from '../data/mockData';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, BedDouble, Users, ArrowDownToLine, ArrowUpFromLine,
  CalendarCheck, DollarSign, Home
} from 'lucide-react';
import type { BookingStatus } from '../types';
import { useNavigate } from 'react-router-dom';

const statusLabel: Record<BookingStatus, string> = {
  pending: 'Menunggu',
  confirmed: 'Dikonfirmasi',
  checked_in: 'Check-in',
  checked_out: 'Check-out',
  cancelled: 'Dibatalkan',
  no_show: 'Tidak Hadir',
};

const statusBadge: Record<BookingStatus, 'warning' | 'info' | 'success' | 'gray' | 'danger' | 'purple'> = {
  pending: 'warning',
  confirmed: 'info',
  checked_in: 'success',
  checked_out: 'gray',
  cancelled: 'danger',
  no_show: 'purple',
};

const roomStatusColors = [
  { name: 'Tersedia', value: 5, color: '#10b981' },
  { name: 'Terisi', value: 5, color: '#0ea5e9' },
  { name: 'Perawatan', value: 1, color: '#f59e0b' },
  { name: 'Kebersihan', value: 1, color: '#8b5cf6' },
];

export default function DashboardPage() {
  const { user, tenant } = useAuthStore();
  const { bookings } = useAppStore();
  const navigate = useNavigate();
  const stats = mockDashboardStats;

  const todayBookings = bookings.filter(b =>
    b.status === 'checked_in' || b.status === 'confirmed'
  ).slice(0, 5);

  const pendingBookings = bookings.filter(b => b.status === 'pending');

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">{tenant?.name} · {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        {pendingBookings.length > 0 && (
          <button
            onClick={() => navigate('/bookings')}
            className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-2 rounded-xl hover:bg-amber-100 transition-colors"
          >
            ⏳ {pendingBookings.length} Pending
          </button>
        )}
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Pendapatan Hari Ini"
          value={formatCurrency(stats.revenueToday)}
          icon={<DollarSign className="h-5 w-5" />}
          color="emerald"
          trend={12}
          trendLabel="vs kemarin"
        />
        <StatCard
          title="Occupancy Rate"
          value={`${stats.occupancyRate}%`}
          icon={<Home className="h-5 w-5" />}
          color="emerald"
          trend={5}
          trendLabel="vs minggu lalu"
        />
        <StatCard
          title="Check-in Hari Ini"
          value={stats.checkInsToday}
          icon={<ArrowDownToLine className="h-5 w-5" />}
          color="violet"
          subtitle="tamu masuk"
        />
        <StatCard
          title="Check-out Hari Ini"
          value={stats.checkOutsToday}
          icon={<ArrowUpFromLine className="h-5 w-5" />}
          color="orange"
          subtitle="tamu keluar"
        />
      </div>

      {/* Room status mini-stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-slate-800">{stats.availableRooms}</div>
          <div className="text-xs text-slate-500 mt-1 font-medium">Kamar Tersedia</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${(stats.availableRooms / stats.totalRooms) * 100}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-slate-800">{stats.occupiedRooms}</div>
          <div className="text-xs text-slate-500 mt-1 font-medium">Kamar Terisi</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div className="bg-sky-400 h-1.5 rounded-full" style={{ width: `${(stats.occupiedRooms / stats.totalRooms) * 100}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-amber-500">{stats.maintenanceRooms}</div>
          <div className="text-xs text-slate-500 mt-1 font-medium">Perawatan</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${(stats.maintenanceRooms / stats.totalRooms) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue chart */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Pendapatan 14 Hari Terakhir"
            subtitle={`Total bulan ini: ${formatCurrency(stats.revenueMonth)}`}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <div className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={mockRevenueData}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), 'Pendapatan']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#rev)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Room status pie */}
        <Card>
          <CardHeader
            title="Status Kamar"
            subtitle={`Total ${stats.totalRooms} kamar`}
            icon={<BedDouble className="h-4 w-4" />}
          />
          <div className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={roomStatusColors} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {roomStatusColors.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {roomStatusColors.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-xs text-slate-500">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Occupancy bar */}
        {(user?.role === 'owner' || user?.role === 'manager') && (
          <Card>
            <CardHeader
              title="Occupancy Bulanan"
              subtitle="6 bulan terakhir"
              icon={<CalendarCheck className="h-4 w-4" />}
            />
            <div className="px-5 pb-5">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={mockOccupancyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Occupancy']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="rate" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Recent bookings */}
        <Card className={user?.role === 'receptionist' ? 'lg:col-span-2' : ''}>
          <CardHeader
            title="Booking Aktif"
            subtitle="Tamu yang sedang menginap & akan datang"
            icon={<Users className="h-4 w-4" />}
            action={
              <button onClick={() => navigate('/bookings')} className="text-xs text-sky-500 font-medium hover:underline">
                Lihat Semua
              </button>
            }
          />
          <div className="px-5 pb-5 space-y-2.5">
            {todayBookings.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <BedDouble className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Belum ada booking aktif</p>
              </div>
            ) : (
              todayBookings.map((booking) => (
                <div
                  key={booking.id}
                  onClick={() => navigate('/bookings')}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors border border-slate-50"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">
                      {booking.guest?.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800 truncate">{booking.guest?.name}</p>
                      <Badge variant={statusBadge[booking.status]}>{statusLabel[booking.status]}</Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Kamar {booking.room?.number} · {formatShortDate(booking.checkIn)} – {formatShortDate(booking.checkOut)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
