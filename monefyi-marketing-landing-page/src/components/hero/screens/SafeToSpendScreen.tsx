import React from 'react';
import { Calendar, Wallet, TrendingUp } from 'lucide-react';

export function SafeToSpendScreen(): React.ReactElement {
  return (
    <div className="p-4 h-full bg-slate-950 flex flex-col">
      {/* Status badge */}
      <div className="flex justify-center">
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-500/20 border border-green-500/40 text-xs font-bold text-green-400 tracking-widest uppercase">
          ON TRACK
        </span>
      </div>

      {/* Amount */}
      <div className="text-center mt-4">
        <p className="text-4xl font-extrabold text-white">Rp 78.000</p>
        <p className="text-sm text-slate-400 mt-1">aman dipakai hari ini</p>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-800 my-4" />

      {/* Info rows */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2.5">
          <Calendar size={14} className="text-slate-400 flex-shrink-0" />
          <span className="text-sm text-slate-300">12 hari lagi gajian</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Wallet size={14} className="text-slate-400 flex-shrink-0" />
          <span className="text-sm text-slate-300">Sisa: Rp 936.000</span>
        </div>
      </div>

      {/* Prediction */}
      <div className="mt-4 bg-slate-800/50 border border-slate-700 rounded-xl p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <TrendingUp size={12} className="text-green-400" />
          <span className="text-[10px] text-slate-500">Prediksi akhir bulan</span>
        </div>
        <p className="text-sm font-semibold text-green-400">Surplus Rp 340.000</p>
      </div>
    </div>
  );
}
