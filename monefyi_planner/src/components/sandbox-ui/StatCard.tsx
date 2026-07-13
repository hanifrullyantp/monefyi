import type { LucideIcon } from 'lucide-react';
import Sparkline from './Sparkline';

type Props = {
  label: string;
  value: string;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  onClick?: () => void;
  sparkData?: number[];
  barPct?: number;
  barLabel?: string;
  barVariant?: 'danger' | 'success' | 'primary';
  subLabel?: string;
  badge?: React.ReactNode;
};

export default function StatCard({
  label, value, icon: Icon, iconBg = 'bg-slate-50', iconColor = 'text-slate-600',
  onClick, sparkData, barPct, barLabel, barVariant = 'danger', subLabel, badge,
}: Props) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`surface-card surface-card-hover p-4 text-left w-full ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
        </div>
        {badge}
      </div>
      <div className="text-lg font-black text-slate-900 mb-2">{value}</div>
      {sparkData && sparkData.length >= 2 && (
        <div className="mb-2"><Sparkline data={sparkData} color="primary" /></div>
      )}
      {barPct != null && (
        <div className="h-5 bg-slate-100 rounded-md overflow-hidden mb-1.5">
          <div
            className={`h-full rounded-md flex items-center justify-center text-white text-[10px] font-bold min-w-[4rem] ${
              barVariant === 'success' ? 'bg-emerald-500' : barVariant === 'primary' ? 'bg-blue-500' : 'bg-rose-500'
            }`}
            style={{ width: `${Math.max(barPct, barLabel ? 20 : 0)}%` }}
          >
            {barLabel}
          </div>
        </div>
      )}
      {subLabel && <p className="text-xs text-slate-500">{subLabel}</p>}
    </Wrapper>
  );
}
