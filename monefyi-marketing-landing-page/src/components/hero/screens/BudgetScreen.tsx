import React from 'react';
import { Home, ShoppingBag, PiggyBank, Heart } from 'lucide-react';

interface BudgetCategory {
  icon: React.FC<{ size?: number; className?: string }>;
  label: string;
  current: string;
  total: string;
  percent: number;
  color: string;
}

const categories: BudgetCategory[] = [
  { icon: Home, label: 'Kebutuhan', current: 'Rp 1.8jt', total: '2.5jt', percent: 72, color: 'bg-blue-500' },
  { icon: ShoppingBag, label: 'Keinginan', current: 'Rp 600rb', total: '1.5jt', percent: 40, color: 'bg-purple-500' },
  { icon: PiggyBank, label: 'Tabungan', current: 'Rp 500rb', total: '1jt', percent: 50, color: 'bg-green-500' },
  { icon: Heart, label: 'Sedekah', current: 'Rp 100rb', total: '500rb', percent: 20, color: 'bg-amber-500' },
];

export function BudgetScreen(): React.ReactElement {
  return (
    <div className="p-4 h-full bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="mb-3">
        <p className="text-sm font-semibold text-white">Budget Agustus</p>
        <p className="text-xs text-slate-500">Rp 5.000.000</p>
      </div>

      {/* Categories */}
      <div className="space-y-3 flex-1">
        {categories.map((cat, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
              <cat.icon size={12} className="text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-slate-300">{cat.label}</span>
                <span className="text-[10px] text-slate-500">{cat.current} / {cat.total}</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${cat.color}`} style={{ width: `${cat.percent}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-3 pt-3 border-t border-slate-800">
        <p className="text-sm text-green-400 font-medium">Sisa: Rp 1.000.000</p>
      </div>
    </div>
  );
}
