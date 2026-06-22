import type { LucideIcon } from 'lucide-react';

interface MetricMiniCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'primary';
  trend?: 'up' | 'down' | 'neutral';
}

const toneStyles = {
  default: 'bg-slate-50 border-slate-100',
  success: 'bg-emerald-50 border-emerald-100',
  warning: 'bg-amber-50 border-amber-100',
  danger: 'bg-rose-50 border-rose-100',
  primary: 'bg-emerald-50 border-emerald-100',
};

const valueTone = {
  default: 'text-slate-900',
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-rose-700',
  primary: 'text-emerald-700',
};

export default function MetricMiniCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'default',
  trend,
}: MetricMiniCardProps) {
  const trendChar = trend === 'up' ? '↑' : trend === 'down' ? '↓' : trend === 'neutral' ? '→' : null;

  return (
    <div className={`rounded-xl border p-3 ${toneStyles[tone]}`}>
      {Icon && <Icon className="w-4 h-4 text-slate-600 mb-1" />}
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`text-lg font-black font-mono leading-tight mt-0.5 ${valueTone[tone]}`}>
        {value}
        {trendChar && (
          <span className="text-xs ml-0.5 font-sans">{trendChar}</span>
        )}
      </div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
