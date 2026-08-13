import React from 'react';
import { Target, Trophy } from 'lucide-react';

export function DebtScreen(): React.ReactElement {
  return (
    <div className="p-4 h-full bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Target size={14} className="text-green-400" />
        <p className="text-sm font-semibold text-white">Bebas Hutang</p>
      </div>

      {/* Debt items */}
      <div className="space-y-4 flex-1">
        {/* KPR */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-white font-medium">KPR</span>
            <span className="text-[10px] text-slate-500">Rp 180.000.000</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1">
            <div className="h-full w-[35%] rounded-full bg-gradient-to-r from-red-500 to-amber-500" />
          </div>
          <p className="text-[10px] text-slate-500">Lunas: Mar 2035</p>
        </div>

        {/* Motor */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-white font-medium">Motor</span>
            <span className="text-[10px] text-slate-500">Rp 8.000.000</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1">
            <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-amber-500 to-green-500" />
          </div>
          <p className="text-[10px] text-slate-500">Lunas: Sep 2026</p>
        </div>
      </div>

      {/* Achievement */}
      <div className="mt-3 bg-green-500/10 border border-green-500/30 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-1">
          <Trophy size={12} className="text-amber-400" />
          <span className="text-xs font-medium text-green-400">Sudah lunas: Rp 23.000.000</span>
        </div>
        <p className="text-[10px] text-slate-500">3 hutang berhasil dilunasi</p>
      </div>
    </div>
  );
}
