import { useMemo } from 'react';
import {
  Wallet, TrendingUp, TrendingDown, DollarSign,
  AlertTriangle, AlertCircle, Info,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import StatCard from '../ui/StatCard';
import Card, { CardHeader } from '../ui/Card';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../utils/cn';
import { useFinanceStore } from '../../store/financeStore';
import { useAppStore } from '../../store/appStore';
import { buildDailyCashFlow } from '../../services/finance/cashFlowService';
import type { FinanceAlert } from '../../types/finance';

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

function AlertIcon({ type }: { type: FinanceAlert['type'] }) {
  if (type === 'danger') return <AlertCircle className="h-4 w-4 text-rose-500" />;
  if (type === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <Info className="h-4 w-4 text-sky-500" />;
}

export default function FinanceDashboard() {
  const kpis = useFinanceStore((s) => s.getKpis());
  const alerts = useFinanceStore((s) => s.getAlerts());
  const accounts = useFinanceStore((s) => s.accounts);
  const journalEntries = useFinanceStore((s) => s.journalEntries);
  const journalLines = useFinanceStore((s) => s.journalLines);
  const { payments, bookings } = useAppStore();

  const cashFlowData = useMemo(
    () => buildDailyCashFlow(journalEntries, journalLines, accounts, 30),
    [journalEntries, journalLines, accounts]
  );

  const revenueBySource = useMemo(() => {
    const sources: Record<string, number> = { Direct: 0, OTA: 0, 'Walk-in': 0, Lainnya: 0 };
    for (const p of payments.filter((pay) => pay.status === 'paid')) {
      const booking = bookings.find((b) => b.id === p.bookingId);
      const src = booking?.source === 'ota' ? 'OTA' : booking?.source === 'walk_in' ? 'Walk-in' : booking?.source === 'manual' ? 'Direct' : 'Lainnya';
      sources[src] = (sources[src] ?? 0) + p.amount;
    }
    return Object.entries(sources)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [payments, bookings]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Kas Total"
          value={formatCurrency(kpis.totalCash)}
          icon={<Wallet className="h-5 w-5" />}
          color="emerald"
          subtitle="Kas + Bank + Xendit"
        />
        <StatCard
          title="Pendapatan Bulan Ini"
          value={formatCurrency(kpis.monthlyRevenue)}
          icon={<TrendingUp className="h-5 w-5" />}
          color="sky"
          trend={kpis.revenueChange}
          trendLabel="vs bulan lalu"
        />
        <StatCard
          title="Pengeluaran Bulan Ini"
          value={formatCurrency(kpis.monthlyExpenses)}
          icon={<TrendingDown className="h-5 w-5" />}
          color="rose"
          trend={-kpis.expenseChange}
        />
        <StatCard
          title="Laba Bersih Bulan Ini"
          value={formatCurrency(kpis.netProfit)}
          icon={<DollarSign className="h-5 w-5" />}
          color="violet"
          trend={kpis.profitChange}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Arus Kas 30 Hari" subtitle="Kas masuk vs kas keluar" />
          <div className="h-56">
            {cashFlowData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cashFlowData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Line type="monotone" dataKey="inflow" stroke="#10b981" strokeWidth={2} dot={false} name="Masuk" />
                  <Line type="monotone" dataKey="outflow" stroke="#ef4444" strokeWidth={2} dot={false} name="Keluar" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                Belum ada data arus kas
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Pendapatan per Sumber" subtitle="Breakdown booking" />
          <div className="h-56 flex items-center">
            {revenueBySource.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={revenueBySource} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {revenueBySource.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full text-center text-sm text-slate-400">Belum ada pembayaran</div>
            )}
          </div>
        </Card>
      </div>

      {alerts.length > 0 && (
        <Card>
          <CardHeader title="Alert Keuangan" subtitle="Perhatian diperlukan" />
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-xl border',
                  alert.type === 'danger' && 'bg-rose-50 border-rose-200',
                  alert.type === 'warning' && 'bg-amber-50 border-amber-200',
                  alert.type === 'info' && 'bg-sky-50 border-sky-200'
                )}
              >
                <AlertIcon type={alert.type} />
                <div>
                  <p className="font-semibold text-sm text-slate-800">{alert.title}</p>
                  <p className="text-xs text-slate-600">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
