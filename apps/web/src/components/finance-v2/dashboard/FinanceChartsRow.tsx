import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  Line, ComposedChart, PieChart, Pie, Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import type { JournalEntry } from '../../../types/financeV2';
import type { NeracaData } from './types';
import { formatFinanceRupiah } from '../../../lib/financeV2Calc';
import { formatRupiah } from '../../../utils/projectUi';
import { neracaColors } from './neracaColors';

const AKTIVA_SLICES = [
  { key: 'kas' as const, label: 'Kas', color: '#F59E0B' },
  { key: 'piutang' as const, label: 'Piutang', color: '#FBBF24' },
  { key: 'stok' as const, label: 'Stok', color: '#FCD34D' },
  { key: 'propertiPeralatan' as const, label: 'Properti', color: '#FDE68A' },
  { key: 'praBayar' as const, label: 'Pra Bayar', color: '#FEF3C7' },
];

const ROUTES: Record<string, string> = {
  Kas: '/app/finance-v2/kas',
  Piutang: '/app/finance-v2/piutang',
  Stok: '/app/finance-v2/stok',
  Properti: '/app/finance-v2/aset',
  'Pra Bayar': '/app/finance-v2/prabayar',
};

interface Props {
  neraca: NeracaData;
  entries: JournalEntry[];
  loading?: boolean;
}

export default function FinanceChartsRow({ neraca, entries, loading }: Props) {
  const navigate = useNavigate();
  const [range, setRange] = useState<7 | 30 | 90>(30);

  const cashData = useMemo(() => {
    const days = range;
    const now = new Date();
    const buckets: Record<string, { date: string; inflow: number; outflow: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = {
        date: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        inflow: 0,
        outflow: 0,
      };
    }
    for (const e of entries) {
      if (e.reference_type === 'transfer') continue;
      const key = e.entry_date;
      if (!buckets[key]) continue;
      if (e.reference_type === 'project_income' || e.reference_type === 'manual') {
        buckets[key].inflow += e.total_amount;
      } else {
        buckets[key].outflow += e.total_amount;
      }
    }
    return Object.values(buckets).map(b => ({
      ...b,
      net: b.inflow - b.outflow,
    }));
  }, [entries, range]);

  const composition = useMemo(() => {
    const total = AKTIVA_SLICES.reduce((s, sl) => s + (neraca[sl.key] || 0), 0);
    return AKTIVA_SLICES
      .map(sl => ({
        name: sl.label,
        value: neraca[sl.key],
        fill: sl.color,
        pct: total > 0 ? Math.round((neraca[sl.key] / total) * 100) : 0,
      }))
      .filter(s => s.value > 0);
  }, [neraca]);

  const totalAktiva = composition.reduce((s, c) => s + c.value, 0);

  if (loading) {
    return (
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 h-64 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="lg:col-span-2 h-64 rounded-2xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="grid lg:grid-cols-5 gap-4"
    >
      <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 p-4 md:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="font-bold text-slate-800">Arus Kas — Masuk vs Keluar</h3>
            <p className="text-xs text-slate-600 italic">Transfer antar kas tidak dihitung</p>
          </div>
          <div className="flex gap-1">
            {([7, 30, 90] as const).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setRange(d)}
                className={`px-2 py-1 rounded-lg text-xs font-bold ${range === d ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}
              >
                {d}h
              </button>
            ))}
          </div>
        </div>
        {cashData.some(d => d.inflow || d.outflow) ? (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={cashData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatRupiah(Number(v))} width={56} />
              <Tooltip formatter={(v) => formatFinanceRupiah(Number(v))} />
              <Bar dataKey="inflow" fill="#22C55E" name="Masuk" radius={[2, 2, 0, 0]} />
              <Bar dataKey="outflow" fill="#EF4444" name="Keluar" radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="net" stroke="#3B82F6" strokeWidth={2} name="Net" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-600 italic py-12 text-center">Belum ada transaksi pada periode ini.</p>
        )}
      </div>

      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-4 md:p-5">
        <h3 className="font-bold text-slate-800 mb-1">Komposisi Aset</h3>
        <p className="text-xs text-slate-600 mb-2">Klik slice untuk detail</p>
        {composition.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={composition}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={72}
                onClick={(_, i) => {
                  const name = composition[i]?.name;
                  if (name && ROUTES[name]) navigate(ROUTES[name]);
                }}
                style={{ cursor: 'pointer' }}
              >
                {composition.map(entry => (
                  <Cell key={entry.name} fill={entry.fill} stroke={neracaColors.headerAktiva.zone} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatFinanceRupiah(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-600 italic py-12 text-center">Belum ada komposisi aktiva.</p>
        )}
        <div className="text-center -mt-2">
          <div className="text-xs text-slate-500">Total Aset</div>
          <div className="font-black text-amber-800">{formatRupiah(totalAktiva)}</div>
        </div>
        <ul className="mt-2 space-y-1 text-[10px] text-slate-600">
          {composition.map(c => (
            <li key={c.name} className="flex justify-between">
              <span>{c.name}</span>
              <span>{c.pct}% · {formatRupiah(c.value)}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
