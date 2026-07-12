import type { ReactNode } from 'react';

type Action = {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'outline';
};

type Props = {
  actions: Action[];
};

export default function BottomActionBar({ actions }: Props) {
  return (
    <div className="sticky bottom-0 z-10 flex gap-2 p-4 bg-white/95 backdrop-blur border-t border-slate-100 -mx-4 md:-mx-6 mt-6">
      {actions.map((a, i) => (
        <button
          key={i}
          type="button"
          onClick={a.onClick}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold ${
            a.variant === 'primary'
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {a.icon}
          {a.label}
        </button>
      ))}
    </div>
  );
}
