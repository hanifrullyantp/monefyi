import React from 'react';
import { Sparkles, MessageSquare } from 'lucide-react';

export function MonevisorScreen(): React.ReactElement {
  return (
    <div className="p-4 h-full bg-slate-950 flex flex-col">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/20 text-green-400 text-xs font-bold">
            <Sparkles size={10} /> AI
          </span>
          <span className="text-lg font-bold gradient-text-green">Monevisor</span>
        </div>
        <p className="text-xs text-slate-500">Financial Coach kamu</p>
      </div>

      {/* Condition badge */}
      <div className="mt-4 w-full text-center bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2">
        <p className="text-sm font-bold text-green-400">KONDISI: AMAN</p>
      </div>

      {/* AI Message */}
      <div className="mt-3 bg-slate-800 border-l-[3px] border-l-green-500 rounded-r-xl p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <MessageSquare size={10} className="text-slate-400" />
          <span className="text-[10px] text-slate-400">Pesan AI</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Semua tagihan tetap sudah dibayar. Fokus jaga pengeluaran fleksibel minggu ini.
        </p>
      </div>

      {/* Recommendation */}
      <div className="mt-3 bg-green-500/5 border border-green-500/20 rounded-xl p-3">
        <p className="text-[10px] text-slate-500 mb-1">Rekomendasi Hari Ini</p>
        <p className="text-xs font-medium text-white">Sisihkan Rp 500rb ke Dana Darurat</p>
        <p className="text-[10px] text-green-400 mt-1">Target maju 2 bulan lebih cepat</p>
      </div>
    </div>
  );
}
