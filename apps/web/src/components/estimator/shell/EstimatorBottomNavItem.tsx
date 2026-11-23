import type { LucideIcon } from 'lucide-react';
import { Lock } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  label: string;
  active: boolean;
  locked?: boolean;
  onClick: () => void;
};

export default function EstimatorBottomNavItem({
  icon: Icon,
  label,
  active,
  locked = false,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 transition-all duration-200 rounded-xl active:scale-95 ${
        active ? 'bg-emerald-50' : 'hover:bg-slate-50'
      }`}
    >
      {active && (
        <span className="absolute -top-0.5 w-1 h-1 rounded-full bg-emerald-600" aria-hidden />
      )}
      <Icon className={`w-5 h-5 ${active ? 'text-emerald-600' : 'text-slate-400'}`} />
      <span
        className={`text-[10px] flex items-center gap-0.5 ${
          active ? 'font-bold text-emerald-700' : 'font-semibold text-slate-500'
        }`}
      >
        {label}
        {locked && <Lock className="w-2.5 h-2.5" />}
      </span>
    </button>
  );
}
