// src/components/debt/DebtTimeline.tsx
"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import type { PayoffResult } from "@/types";
import { formatCurrency } from "@/lib/formatters";

interface DebtTimelineProps {
  result: PayoffResult;
}

export function DebtTimeline({ result }: DebtTimelineProps) {
  const { jadwal, urutanPelunasan, bulanUntukLunas } = result;

  // Build per-debt timeline data
  const debtData = urutanPelunasan.map((nama, idx) => {
    const lunasBulan = jadwal.find((m) => m.hutangLunasBulanIni.includes(nama));
    const startBulan =
      idx === 0
        ? 1
        : (() => {
            const prevNama = urutanPelunasan[idx - 1];
            const prevLunas = jadwal.findIndex((m) =>
              m.hutangLunasBulanIni.includes(prevNama)
            );
            return prevLunas + 2;
          })();

    const lunasBulanKe = lunasBulan?.bulanKe ?? bulanUntukLunas;
    const totalSisa = lunasBulan?.detailPerHutang.find((d) => d.debtNama === nama)?.sisaSetelah ?? 0;

    return {
      nama,
      lunasBulanKe,
      lunasTanggal: lunasBulan?.tanggal ?? result.tanggalLunas,
      widthPercent: (lunasBulanKe / bulanUntukLunas) * 100,
      order: idx + 1,
    };
  });

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-3xl overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-700/40">
        <h3 className="text-base font-bold text-white">Urutan Pelunasan</h3>
        <p className="text-sm text-slate-400 mt-1">
          Setiap hutang lunas satu per satu — bola salju menggelinding!
        </p>
      </div>

      <div className="p-6 overflow-x-auto">
        <div className="min-w-[600px] flex flex-col gap-4">
          {/* Timeline header */}
          <div className="flex items-center gap-4 text-xs text-slate-500 pb-2 border-b border-slate-700/40">
            <div className="w-8 text-center">#</div>
            <div className="w-36 flex-shrink-0">Hutang</div>
            <div className="flex-1">Timeline pelunasan</div>
            <div className="w-28 text-right">Lunas</div>
          </div>

          {/* Debt rows */}
          {debtData.map((debt, idx) => (
            <motion.div
              key={debt.nama}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              className="flex items-center gap-4"
            >
              {/* Order number */}
              <div className="w-8 flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <span className="text-xs font-bold text-emerald-400">{debt.order}</span>
                </div>
              </div>

              {/* Name */}
              <div className="w-36 flex-shrink-0">
                <p className="text-sm font-medium text-white truncate">{debt.nama}</p>
                <p className="text-xs text-slate-500">Bulan ke-{debt.lunasBulanKe}</p>
              </div>

              {/* Progress bar */}
              <div className="flex-1 relative">
                <div className="h-7 rounded-xl overflow-hidden bg-slate-800/60">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: `${debt.widthPercent}%` }}
                    transition={{ delay: idx * 0.15 + 0.3, duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-xl flex items-center justify-end pr-3 relative overflow-hidden"
                    style={{
                      background: `linear-gradient(90deg, rgba(239,68,68,0.8) 0%, rgba(245,158,11,0.8) 50%, rgba(16,185,129,0.9) 100%)`,
                      minWidth: "60px",
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-white" />
                      <span className="text-xs font-bold text-white whitespace-nowrap">
                        LUNAS
                      </span>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Date */}
              <div className="w-28 flex-shrink-0 text-right">
                <p className="text-sm font-semibold text-emerald-400">{debt.lunasTanggal}</p>
              </div>
            </motion.div>
          ))}

          {/* Timeline scale */}
          <div className="flex items-center gap-4 mt-2 pt-2 border-t border-slate-700/30">
            <div className="w-8" />
            <div className="w-36 flex-shrink-0" />
            <div className="flex-1 flex justify-between text-xs text-slate-600">
              <span>Bulan 1</span>
              <span>Bulan {Math.round(bulanUntukLunas / 2)}</span>
              <span>Bulan {bulanUntukLunas}</span>
            </div>
            <div className="w-28" />
          </div>
        </div>
      </div>
    </div>
  );
}
