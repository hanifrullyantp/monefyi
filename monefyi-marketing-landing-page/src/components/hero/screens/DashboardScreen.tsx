import React from 'react';
import { TrendingUp, TrendingDown, Coffee, Car, Utensils } from 'lucide-react';

export function DashboardScreen(): React.ReactElement {
  return (
    <div className="p-4 space-y-3 h-full bg-slate-950 overflow-hidden">
      {/* Header */}
      <div>
        <p className="text-xs text-slate-500">Cash Flow Agu 2026</p>
        <p className="text-xl font-bold text-white">Rp 2.461.000</p>
      </div>

      {/* Mini cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-900 rounded-xl p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} className="text-green-400" />
            <span className="text-[10px] text-slate-400">Pemasukan</span>
          </div>
          <p className="text-sm font-semibold text-green-400">Rp 5.000.000</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown size={12} className="text-red-400" />
            <span className="text-[10px] text-slate-400">Pengeluaran</span>
          </div>
          <p className="text-sm font-semibold text-red-400">Rp 2.539.000</p>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] text-slate-500">51% terpakai</span>
          <span className="text-[10px] text-slate-500">Sisa 49%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full w-[51%] rounded-full bg-gradient-to-r from-red-500 to-green-500" />
        </div>
      </div>

      {/* Safe to spend */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
        <p className="text-[10px] text-slate-400 mb-0.5">Aman pakai hari ini</p>
        <p className="text-lg font-bold text-green-400">Rp 78.000</p>
      </div>

      {/* Transactions */}
      <div className="space-y-2">
        {[
          { icon: Coffee, name: 'Kopi Kenangan', amount: '-Rp 30.000' },
          { icon: Car, name: 'Grab', amount: '-Rp 22.000' },
          { icon: Utensils, name: 'ShopeeFood', amount: '-Rp 55.000' },
        ].map((t, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                <t.icon size={12} className="text-slate-400" />
              </div>
              <span className="text-xs text-white">{t.name}</span>
            </div>
            <span className="text-xs text-red-400 font-medium">{t.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
