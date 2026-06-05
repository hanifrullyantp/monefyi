import { motion } from 'framer-motion';
import {
  Landmark, Scale, TrendingUp, Banknote, Wallet, Gauge,
} from 'lucide-react';
import { formatFinanceRupiah } from '../../lib/financeV2Calc';
import type { FinanceKpis } from '../../types/financeV2';

interface Props {
  kpis: FinanceKpis;
}

export default function FinanceKpiCards({ kpis }: Props) {
  const cards = [
    {
      label: 'Total Aktiva',
      value: formatFinanceRupiah(kpis.totalAktiva),
      icon: Landmark,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Total Pasiva',
      value: formatFinanceRupiah(kpis.totalPasiva),
      icon: Scale,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: 'Net Worth',
      value: formatFinanceRupiah(kpis.netWorth),
      icon: TrendingUp,
      color: kpis.netWorth >= 0 ? 'text-emerald-600' : 'text-rose-600',
      bg: kpis.netWorth >= 0 ? 'bg-emerald-50' : 'bg-rose-50',
    },
    {
      label: 'Laba Periode',
      value: formatFinanceRupiah(kpis.labaPeriode),
      icon: Banknote,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Cash Flow (Kas)',
      value: formatFinanceRupiah(kpis.cashFlow),
      icon: Wallet,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
    },
    {
      label: 'Quick Ratio',
      value: kpis.quickRatio != null ? kpis.quickRatio.toFixed(2) : '—',
      icon: Gauge,
      color: 'text-slate-600',
      bg: 'bg-slate-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="bg-white rounded-2xl border border-slate-100 p-4"
        >
          <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-2`}>
            <card.icon className={`w-4 h-4 ${card.color}`} />
          </div>
          <div className="text-xs text-slate-500">{card.label}</div>
          <div className={`font-black text-lg ${card.color}`}>{card.value}</div>
        </motion.div>
      ))}
    </div>
  );
}
