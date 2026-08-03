import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import Card, { CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import { useFinanceStore } from '../../store/financeStore';
import { buildIncomeStatementFromJournals, buildProfitTrend } from '../../services/finance/incomeStatementService';
import { formatCurrency } from '../../utils/format';
import { exportToCsv } from '../../utils/analytics';
import { getCurrentPeriod } from '../../lib/financeCalc';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { cn } from '../../utils/cn';

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#14b8a6'];

function LineItem({ label, amount, bold, indent }: { label: string; amount: number; bold?: boolean; indent?: boolean }) {
  return (
    <div className={cn('flex justify-between py-2 border-b border-slate-50', indent && 'pl-4', bold && 'font-bold bg-slate-50 px-2 rounded-lg')}>
      <span className={cn('text-sm', bold ? 'text-slate-800' : 'text-slate-600')}>{label}</span>
      <span className={cn('text-sm tabular-nums', amount < 0 ? 'text-rose-600' : bold ? 'text-slate-800' : 'text-slate-700')}>
        {formatCurrency(amount)}
      </span>
    </div>
  );
}

export default function IncomeStatementTab() {
  const accounts = useFinanceStore((s) => s.accounts);
  const journalEntries = useFinanceStore((s) => s.journalEntries);
  const journalLines = useFinanceStore((s) => s.journalLines);
  const { month, year } = getCurrentPeriod();
  const [periodMonth, setPeriodMonth] = useState(month);
  const [periodYear, setPeriodYear] = useState(year);

  const stmt = useMemo(
    () => buildIncomeStatementFromJournals(accounts, journalEntries, journalLines, periodMonth, periodYear),
    [accounts, journalEntries, journalLines, periodMonth, periodYear]
  );

  const trend = useMemo(
    () => buildProfitTrend(accounts, journalEntries, journalLines, 12),
    [accounts, journalEntries, journalLines]
  );

  const handleExport = () => {
    exportToCsv(
      `laba-rugi-${periodYear}-${periodMonth}.csv`,
      ['Item', 'Jumlah'],
      [
        ...stmt.revenue.map((r) => [r.label, String(r.amount)]),
        ['Total Pendapatan', String(stmt.totalRevenue)],
        ...stmt.operatingExpenses.map((e) => [e.label, String(e.amount)]),
        ['Laba Bersih', String(stmt.netProfit)],
      ]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={periodMonth}
          onChange={(e) => setPeriodMonth(Number(e.target.value))}
          className="px-3 py-2 rounded-xl border text-sm"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2000, i).toLocaleDateString('id-ID', { month: 'long' })}
            </option>
          ))}
        </select>
        <select
          value={periodYear}
          onChange={(e) => setPeriodYear(Number(e.target.value))}
          className="px-3 py-2 rounded-xl border text-sm"
        >
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-3 w-3 mr-1" /> Export
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Laporan Laba Rugi" subtitle={`Periode ${periodMonth}/${periodYear}`} />
            <div className="px-4 pb-4">
              <p className="text-xs font-bold uppercase text-emerald-600 mb-2">Pendapatan</p>
              {stmt.revenue.map((r) => <LineItem key={r.label} label={r.label} amount={r.amount} indent />)}
              <LineItem label="Total Pendapatan" amount={stmt.totalRevenue} bold />

              {stmt.cogs.length > 0 && (
                <>
                  <p className="text-xs font-bold uppercase text-amber-600 mt-4 mb-2">Harga Pokok</p>
                  {stmt.cogs.map((c) => <LineItem key={c.label} label={c.label} amount={c.amount} indent />)}
                  <LineItem label="Total HPP" amount={stmt.totalCogs} bold />
                  <LineItem label="Laba Kotor" amount={stmt.grossProfit} bold />
                </>
              )}

              <p className="text-xs font-bold uppercase text-rose-600 mt-4 mb-2">Beban Operasional</p>
              {stmt.operatingExpenses.map((e) => <LineItem key={e.label} label={e.label} amount={e.amount} indent />)}
              <LineItem label="Total Beban Operasional" amount={stmt.totalOperatingExpenses} bold />
              <LineItem label="Laba Operasional" amount={stmt.operatingProfit} bold />

              <LineItem label="Laba Sebelum Pajak" amount={stmt.profitBeforeTax} bold />
              <LineItem label="Pajak" amount={-stmt.tax} indent />
              <div className="mt-4 p-4 bg-emerald-600 rounded-2xl text-white flex justify-between">
                <span className="font-black">LABA BERSIH</span>
                <span className="font-black tabular-nums">{formatCurrency(stmt.netProfit)}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Rasio Profitabilitas" />
            <div className="px-4 pb-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span>Margin Laba Kotor</span>
                <span className="font-bold">{stmt.grossMargin}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Margin Laba Bersih</span>
                <span className="font-bold">{stmt.netMargin}%</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Expense Ratio" />
            <div className="h-48 px-2">
              {stmt.operatingExpenses.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stmt.operatingExpenses} dataKey="amount" nameKey="label" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                      {stmt.operatingExpenses.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-400 text-center pt-16">Belum ada beban</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="Tren Laba Bersih 12 Bulan" />
        <div className="h-56 px-2 pb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
