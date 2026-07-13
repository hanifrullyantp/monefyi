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
    <div className="sticky bottom-0 z-10 flex gap-2 p-4 bg-white/80 backdrop-blur-lg shadow-[0_-4px_20px_rgba(15,23,42,0.05)] -mx-4 md:-mx-6 mt-6 rounded-t-2xl">
      {actions.map((a, i) => (
        <button
          key={i}
          type="button"
          onClick={a.onClick}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold ${
            a.variant === 'primary'
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
          }`}
        >
          {a.icon}
          {a.label}
        </button>
      ))}
    </div>
  );
}
