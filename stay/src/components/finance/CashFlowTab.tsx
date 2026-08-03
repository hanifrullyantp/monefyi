import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Card, { CardHeader } from '../ui/Card';
import { useFinanceStore } from '../../store/financeStore';
import { useAppStore } from '../../store/appStore';
import { buildCashFlowStatement, buildDailyCashFlow, forecastCashFlow } from '../../services/finance/cashFlowService';
import { getCurrentPeriod } from '../../lib/financeCalc';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../utils/cn';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

function Section({ title, items, total, totalLabel }: {
  title: string;
  items: { label: string; amount: number }[];
  total: number;
  totalLabel: string;
}) {
  return (
    <div className="mb-6">
      <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">{title}</h4>
      {items.map((item) => (
        <div key={item.label} className="flex justify-between py-1.5 text-sm border-b border-slate-50">
          <span className="text-slate-600">{item.label}</span>
          <span className={cn('tabular-nums font-medium', item.amount < 0 ? 'text-rose-600' : 'text-emerald-600')}>
            {formatCurrency(item.amount)}
          </span>
        </div>
      ))}
      <div className="flex justify-between py-2 font-bold text-sm mt-1">
        <span>{totalLabel}</span>
        <span className={cn('tabular-nums', total < 0 ? 'text-rose-600' : 'text-slate-800')}>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

export default function CashFlowTab() {
  const accounts = useFinanceStore((s) => s.accounts);
  const journalEntries = useFinanceStore((s) => s.journalEntries);
  const journalLines = useFinanceStore((s) => s.journalLines);
  const { bookings } = useAppStore();
  const { month, year } = getCurrentPeriod();

  const cf = useMemo(
    () => buildCashFlowStatement(accounts, journalEntries, journalLines, month, year),
    [accounts, journalEntries, journalLines, month, year]
  );

  const dailyFlow = useMemo(
    () => buildDailyCashFlow(journalEntries, journalLines, accounts, 30),
    [journalEntries, journalLines, accounts]
  );

  const forecast = useMemo(() => {
    const avgInflow = dailyFlow.length ? dailyFlow.reduce((s, d) => s + d.inflow, 0) / dailyFlow.length : 500_000;
    const avgOutflow = dailyFlow.length ? dailyFlow.reduce((s, d) => s + d.outflow, 0) / dailyFlow.length : 300_000;
    const pipelineInflow = bookings
      .filter((b) => ['confirmed', 'checked_in'].includes(b.status))
      .reduce((s, b) => s + (b.totalAmount - b.paidAmount), 0) / 30;
    return forecastCashFlow(
      cf.closingCash,
      Array(30).fill(avgInflow + pipelineInflow),
      Array(30).fill(avgOutflow)
    );
  }, [dailyFlow, cf.closingCash, bookings]);

  const negativeForecast = forecast.some((f) => f.balance < 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Laporan Arus Kas" subtitle={`${month}/${year}`} />
          <div className="px-4 pb-4">
            <Section title="Arus Kas dari Operasi" items={cf.operating} total={cf.netOperating} totalLabel="Net Kas Operasi" />
            <Section title="Arus Kas dari Investasi" items={cf.investing} total={cf.netInvesting} totalLabel="Net Kas Investasi" />
            <Section title="Arus Kas dari Pendanaan" items={cf.financing} total={cf.netFinancing} totalLabel="Net Kas Pendanaan" />

            <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-2 mt-4">
              <div className="flex justify-between text-sm"><span>Perubahan Kas Bersih</span><span className="font-bold">{formatCurrency(cf.netChange)}</span></div>
              <div className="flex justify-between text-sm"><span>Saldo Kas Awal</span><span>{formatCurrency(cf.openingCash)}</span></div>
              <div className="flex justify-between font-black border-t border-white/20 pt-2">
                <span>Saldo Kas Akhir</span>
                <span>{formatCurrency(cf.closingCash)}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Saldo Akhir per Akun Kas" />
          <div className="px-4 pb-4 divide-y divide-slate-50">
            {cf.cashByAccount.map((a) => (
              <div key={a.name} className="flex justify-between py-3 text-sm">
                <span className="text-slate-600">{a.name}</span>
                <span className="font-bold tabular-nums">{formatCurrency(a.balance)}</span>
              </div>
            ))}
            <div className="flex justify-between py-3 font-black text-sm">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(cf.closingCash)}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Arus Kas Harian (30 hari)" subtitle="Kas masuk vs keluar" />
        <div className="h-56 px-2 pb-4">
          {dailyFlow.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyFlow}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(8)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Line type="monotone" dataKey="inflow" stroke="#10b981" strokeWidth={2} dot={false} name="Masuk" />
                <Line type="monotone" dataKey="outflow" stroke="#ef4444" strokeWidth={2} dot={false} name="Keluar" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-sm text-slate-400 pt-20">Belum ada data</p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Prediksi Arus Kas 30 Hari" subtitle="Berdasarkan booking pipeline & beban tetap" />
        {negativeForecast && (
          <div className="mx-4 mb-2 flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            Kas diprediksi minus dalam 30 hari ke depan — segera atur arus kas!
          </div>
        )}
        <div className="h-56 px-2 pb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecast}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} label={{ value: 'Hari', position: 'insideBottom', offset: -5, fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} dot={false} name="Saldo" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
