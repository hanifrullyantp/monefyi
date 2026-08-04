import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  BarChart3,
  BedDouble,
  CalendarCheck,
  DollarSign,
  Home,
  LayoutDashboard,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import StatCard from '../../components/ui/StatCard';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { formatCurrency, formatShortDate } from '../../utils/format';
import {
  computeDashboardStats,
  computeOccupancyData,
  computeOccupancyWeekTrend,
  computePaymentMethodBreakdown,
  computeRevenueData,
  computeRevenueDayTrend,
} from '../../utils/analytics';
import { useLiveClock } from '../../hooks/useLiveClock';
import { cn } from '../../utils/cn';
import type { BookingStatus } from '../../types';

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Menunggu',
  confirmed: 'Dikonfirmasi',
  checked_in: 'Check-in',
  checked_out: 'Check-out',
  cancelled: 'Dibatalkan',
  no_show: 'Tidak Hadir',
};

const STATUS_BADGE: Record<
  BookingStatus,
  'warning' | 'info' | 'success' | 'gray' | 'danger' | 'purple'
> = {
  pending: 'warning',
  confirmed: 'info',
  checked_in: 'success',
  checked_out: 'gray',
  cancelled: 'danger',
  no_show: 'purple',
};

const ROOM_STATUS_LABELS: Record<string, string> = {
  available: 'Tersedia',
  occupied: 'Terisi',
  maintenance: 'Perawatan',
  cleaning: 'Kebersihan',
  blocked: 'Diblokir',
};

const ROOM_STATUS_COLORS: Record<string, string> = {
  available: '#10b981',
  occupied: '#0ea5e9',
  maintenance: '#f59e0b',
  cleaning: '#8b5cf6',
  blocked: '#ef4444',
};

const QUICK_ACTIONS = [
  { label: 'Front Desk', path: '/front-desk', icon: LayoutDashboard, color: 'bg-emerald-500' },
  { label: 'Booking', path: '/bookings', icon: CalendarCheck, color: 'bg-sky-500' },
  { label: 'Laporan', path: '/reports', icon: BarChart3, color: 'bg-violet-500' },
  { label: 'Keuangan', path: '/finance', icon: Wallet, color: 'bg-amber-500' },
] as const;

function pctWidth(value: number, total: number): string {
  if (total <= 0) return '0%';
  return `${Math.min(100, Math.round((value / total) * 100))}%`;
}

/**
 * Dashboard manajerial — ringkasan KPI, alert, dan grafik untuk owner/manager.
 */
export default function ManagerDashboard() {
  const { user, tenant } = useAuthStore();
  const { bookings, rooms, payments } = useAppStore();
  const navigate = useNavigate();
  const userName = user?.name?.split(' ')[0] ?? 'Admin';
  const clock = useLiveClock(userName);

  const stats = useMemo(
    () => computeDashboardStats(bookings, rooms, payments),
    [bookings, rooms, payments]
  );
  const revenueData = useMemo(() => computeRevenueData(payments, 14), [payments]);
  const occupancyData = useMemo(() => computeOccupancyData(bookings, 6), [bookings]);
  const paymentBreakdown = useMemo(() => computePaymentMethodBreakdown(payments), [payments]);
  const revenueTrend = useMemo(() => computeRevenueDayTrend(payments), [payments]);
  const occupancyTrend = useMemo(
    () => computeOccupancyWeekTrend(bookings, rooms),
    [bookings, rooms]
  );

  const roomStatusChart = useMemo(
    () =>
      Object.entries(
        rooms.reduce<Record<string, number>>((acc, r) => {
          if (!r.isActive) return acc;
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        }, {})
      ).map(([status, value]) => ({
        name: ROOM_STATUS_LABELS[status] || status,
        value,
        color: ROOM_STATUS_COLORS[status] || '#94a3b8',
      })),
    [rooms]
  );

  const dirtyRooms = useMemo(
    () => rooms.filter((r) => r.isActive && r.status === 'cleaning').length,
    [rooms]
  );

  const pendingBookings = useMemo(
    () => bookings.filter((b) => b.status === 'pending'),
    [bookings]
  );

  const unpaidBookings = useMemo(
    () => bookings.filter((b) => b.paymentStatus === 'unpaid' || b.paymentStatus === 'partial'),
    [bookings]
  );

  const activeBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.status === 'checked_in' || b.status === 'confirmed')
        .slice(0, 6),
    [bookings]
  );

  const alerts = useMemo(() => {
    const items: { id: string; label: string; detail: string; path: string; tone: string }[] = [];
    if (pendingBookings.length > 0) {
      items.push({
        id: 'pending',
        label: `${pendingBookings.length} booking menunggu`,
        detail: 'Perlu konfirmasi sebelum check-in',
        path: '/bookings',
        tone: 'amber',
      });
    }
    if (unpaidBookings.length > 0) {
      items.push({
        id: 'unpaid',
        label: `${unpaidBookings.length} pembayaran belum lunas`,
        detail: 'Tindak lanjuti di Front Desk atau POS',
        path: '/front-desk',
        tone: 'coral',
      });
    }
    if (stats.maintenanceRooms > 0) {
      items.push({
        id: 'maintenance',
        label: `${stats.maintenanceRooms} kamar maintenance`,
        detail: 'Cek ketersediaan & jadwal perbaikan',
        path: '/rooms',
        tone: 'orange',
      });
    }
    if (dirtyRooms > 0) {
      items.push({
        id: 'dirty',
        label: `${dirtyRooms} kamar perlu dibersihkan`,
        detail: 'Koordinasikan dengan housekeeping',
        path: '/housekeeping',
        tone: 'violet',
      });
    }
    return items;
  }, [pendingBookings.length, unpaidBookings.length, stats.maintenanceRooms, dirtyRooms]);

  const trialDaysLeft = useMemo(() => {
    if (!tenant?.subscriptionExpiry) return null;
    const diff = Math.ceil(
      (new Date(tenant.subscriptionExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return diff > 0 ? diff : null;
  }, [tenant?.subscriptionExpiry]);

  return (
    <div className="space-y-5 pb-2" data-testid="manager-dashboard">
      {/* Header */}
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 p-5 text-white shadow-lg shadow-emerald-200/40 dark:border-emerald-800 dark:shadow-none sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-100/90">
              {clock.greetingEmoji} Selamat {clock.greeting}
            </p>
            <h1 className="mt-1 text-xl font-black sm:text-2xl">{clock.greetingLabel}</h1>
            <p className="mt-1 text-sm capitalize text-emerald-100/90">{clock.dateLabel}</p>
            <p className="mt-2 truncate text-sm font-medium text-white/90">
              {tenant?.name ?? 'Penginapan Anda'}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {trialDaysLeft !== null && (
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur-sm">
                Trial {trialDaysLeft} hari lagi
              </span>
            )}
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold capitalize backdrop-blur-sm">
              {user?.role}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {QUICK_ACTIONS.map(({ label, path, icon: Icon, color }) => (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-left text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white', color)}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="truncate">{label}</span>
              <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 opacity-60" />
            </button>
          ))}
        </div>
      </header>

      {/* Alerts */}
      {alerts.length > 0 && (
        <section className="space-y-2" aria-label="Perlu perhatian">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Perlu Perhatian
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {alerts.map((alert) => (
              <button
                key={alert.id}
                type="button"
                onClick={() => navigate(alert.path)}
                className={cn(
                  'flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:shadow-sm',
                  alert.tone === 'amber' && 'border-amber-200 bg-amber-50 hover:bg-amber-100/80',
                  alert.tone === 'coral' && 'border-red-200 bg-red-50 hover:bg-red-100/80',
                  alert.tone === 'orange' && 'border-orange-200 bg-orange-50 hover:bg-orange-100/80',
                  alert.tone === 'violet' && 'border-violet-200 bg-violet-50 hover:bg-violet-100/80'
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800">{alert.label}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{alert.detail}</p>
                </div>
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Pendapatan Hari Ini"
          value={formatCurrency(stats.revenueToday)}
          icon={<DollarSign className="h-5 w-5" />}
          color="emerald"
          trend={revenueTrend ?? undefined}
          trendLabel={revenueTrend !== null ? 'vs kemarin' : undefined}
        />
        <StatCard
          title="Okupansi"
          value={`${stats.occupancyRate}%`}
          icon={<Home className="h-5 w-5" />}
          color="emerald"
          trend={occupancyTrend ?? undefined}
          trendLabel={occupancyTrend !== null ? 'vs rata-rata 7 hari' : undefined}
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

      {/* Room mini stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Kamar', value: stats.totalRooms, bar: '#64748b', width: '100%' },
          { label: 'Tersedia', value: stats.availableRooms, bar: '#10b981', width: pctWidth(stats.availableRooms, stats.totalRooms) },
          { label: 'Terisi', value: stats.occupiedRooms, bar: '#0ea5e9', width: pctWidth(stats.occupiedRooms, stats.totalRooms) },
          { label: 'Maintenance', value: stats.maintenanceRooms, bar: '#f59e0b', width: pctWidth(stats.maintenanceRooms, stats.totalRooms) },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="text-2xl font-black text-slate-800 dark:text-white">{item.value}</div>
            <div className="mt-1 text-xs font-medium text-slate-500">{item.label}</div>
            {stats.totalRooms > 0 && item.label !== 'Total Kamar' && (
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-1.5 rounded-full" style={{ width: item.width, background: item.bar }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Pendapatan 14 Hari Terakhir"
            subtitle={`Total bulan ini: ${formatCurrency(stats.revenueMonth)}`}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <div className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="mgr-rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00A86B" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00A86B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), 'Pendapatan']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#00A86B" strokeWidth={2.5} fill="url(#mgr-rev)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Status Kamar"
            subtitle={`${stats.totalRooms} kamar aktif`}
            icon={<BedDouble className="h-4 w-4" />}
            action={
              <button
                type="button"
                onClick={() => navigate('/rooms')}
                className="text-xs font-semibold text-emerald-600 hover:underline"
              >
                Kelola
              </button>
            }
          />
          <div className="px-5 pb-5">
            {roomStatusChart.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Belum ada data kamar</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={roomStatusChart}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {roomStatusChart.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-1 grid grid-cols-2 gap-1.5">
                  {roomStatusChart.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
                      <span className="truncate text-xs text-slate-500">
                        {item.name} ({item.value})
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Okupansi Bulanan"
            subtitle="6 bulan terakhir"
            icon={<CalendarCheck className="h-4 w-4" />}
          />
          <div className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={occupancyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, 'Okupansi']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="rate" fill="#00A86B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Metode Pembayaran"
            subtitle="Bulan berjalan"
            icon={<Wallet className="h-4 w-4" />}
          />
          <div className="space-y-3 px-5 pb-5">
            {paymentBreakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Belum ada pembayaran tercatat</p>
            ) : (
              paymentBreakdown.map((item) => (
                <div key={item.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{item.name}</span>
                    <span className="font-bold text-slate-800">{item.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-emerald-500"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{formatCurrency(item.amount)}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Active bookings */}
      <Card>
        <CardHeader
          title="Booking Aktif"
          subtitle="Tamu menginap & akan datang"
          icon={<Users className="h-4 w-4" />}
          action={
            <button
              type="button"
              onClick={() => navigate('/bookings')}
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              Lihat Semua
            </button>
          }
        />
        <div className="space-y-2 px-5 pb-5">
          {activeBookings.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <BedDouble className="mx-auto mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm">Belum ada booking aktif</p>
              <button
                type="button"
                onClick={() => navigate('/bookings')}
                className="mt-3 text-sm font-semibold text-emerald-600 hover:underline"
              >
                Buat booking baru →
              </button>
            </div>
          ) : (
            activeBookings.map((booking) => (
              <button
                key={booking.id}
                type="button"
                onClick={() => navigate('/bookings')}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600">
                  <span className="text-sm font-bold text-white">
                    {booking.guest?.name.charAt(0) ?? '?'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                      {booking.guest?.name ?? 'Tamu'}
                    </p>
                    <Badge variant={STATUS_BADGE[booking.status]}>{STATUS_LABEL[booking.status]}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Kamar {booking.room?.number ?? '—'} · {formatShortDate(booking.checkIn)} –{' '}
                    {formatShortDate(booking.checkOut)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
