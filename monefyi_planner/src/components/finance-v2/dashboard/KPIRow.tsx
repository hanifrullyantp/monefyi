import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, AlertCircle, ArrowLeftRight } from 'lucide-react';
import CurrencyDisplay from './shared/CurrencyDisplay';
import { SkeletonKpiRow } from './shared/SkeletonNeraca';

interface KpiItem {
  id: string;
  icon: typeof Wallet;
  label: string;
  sublabel: string;
  value: number;
  trend: string;
  trendUp: boolean;
  color: string;
  bg: string;
  route: string;
}

interface Props {
  kasBebas: number;
  labaBersih: number;
  totalHutang: number;
  arusKasNet: number;
  loading?: boolean;
}

export default function KPIRow({ kasBebas, labaBersih, totalHutang, arusKasNet, loading }: Props) {
  const navigate = useNavigate();

  if (loading) return <SkeletonKpiRow />;

  const items: KpiItem[] = [
    {
      id: 'kas',
      icon: Wallet,
      label: 'Kas Bebas',
      sublabel: 'Uang siap dipakai',
      value: kasBebas,
      trend: '▲ +5%',
      trendUp: true,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      route: '/app/finance-v2/kas',
    },
    {
      id: 'laba',
      icon: TrendingUp,
      label: 'Laba Bersih',
      sublabel: 'Keuntungan periode',
      value: labaBersih,
      trend: '▲ +12%',
      trendUp: true,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      route: '/app/finance-v2/laporan',
    },
    {
      id: 'hutang',
      icon: AlertCircle,
      label: 'Total Hutang',
      sublabel: 'Kewajiban harus bayar',
      value: totalHutang,
      trend: '▼ -3%',
      trendUp: false,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      route: '/app/finance-v2/hutang',
    },
    {
      id: 'arus',
      icon: ArrowLeftRight,
      label: 'Arus Kas',
      sublabel: '30 hari terakhir',
      value: arusKasNet,
      trend: arusKasNet >= 0 ? '▲ Positif' : '▼ Negatif',
      trendUp: arusKasNet >= 0,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      route: '/app/finance-v2/laporan',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item, i) => (
        <motion.button
          key={item.id}
          type="button"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.35 }}
          onClick={() => navigate(item.route)}
          className="text-left bg-white rounded-2xl border border-slate-100 p-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
        >
          <div className={`w-8 h-8 rounded-xl ${item.bg} flex items-center justify-center mb-2`}>
            <item.icon className={`w-4 h-4 ${item.color}`} />
          </div>
          <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{item.label}</div>
          <div className={`text-xl md:text-2xl font-black ${item.color} mt-0.5`}>
            <CurrencyDisplay value={item.value} variant="short" animate emptyAsDash={false} />
          </div>
          <div className="text-[10px] text-slate-400 italic mt-0.5">{item.sublabel}</div>
          <div className={`text-[10px] font-bold mt-1 ${item.trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
            {item.trend}
          </div>
        </motion.button>
      ))}
    </div>
  );
}
