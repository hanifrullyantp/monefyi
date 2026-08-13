// src/components/debt/MotivationTracker.tsx
"use client";

import { motion } from "framer-motion";
import { Skull, Award, MapPin } from "lucide-react";
import type { PayoffResult } from "@/types";
import { formatCurrency } from "@/lib/formatters";

interface MotivationTrackerProps {
  result: PayoffResult;
  totalTerlunasi?: number;
}

const MILESTONES = [
  { percent: 25, label: "Momentum!" },
  { percent: 50, label: "Setengah jalan!" },
  { percent: 75, label: "Hampir sampai!" },
];

export function MotivationTracker({
  result,
  totalTerlunasi = 0,
}: MotivationTrackerProps) {
  const totalHutang = result.totalHutangAwal;
  const sisaHutang = Math.max(0, totalHutang - totalTerlunasi);
  const progressPercent = totalHutang > 0 ? (totalTerlunasi / totalHutang) * 100 : 0;

  // For new users just starting, show the plan's starting point
  const displayProgress = Math.min(100, Math.max(0, progressPercent || 2));

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-3xl p-6">
      <h3 className="text-base font-bold text-white mb-5">
        Perjalanan Bebas Hutang
      </h3>

      {/* Main progress bar with icons */}
      <div className="flex items-center gap-4 mb-4">
        {/* Left: debt icon */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center">
            <Skull size={20} className="text-red-400" />
          </div>
          <span className="text-xs text-red-400 font-medium">Hutang</span>
        </div>

        {/* Progress bar */}
        <div className="flex-1 relative">
          {/* Milestone labels above */}
          <div className="flex justify-between mb-2 relative h-5">
            {MILESTONES.map((m) => (
              <div
                key={m.percent}
                className="absolute text-center"
                style={{ left: `${m.percent}%`, transform: "translateX(-50%)" }}
              >
                <span
                  className={
                    displayProgress >= m.percent
                      ? "text-xs text-emerald-400 font-medium"
                      : "text-xs text-slate-600"
                  }
                >
                  {m.label}
                </span>
              </div>
            ))}
          </div>

          {/* Bar */}
          <div className="relative h-5 rounded-full overflow-hidden bg-slate-700/50">
            <motion.div
              initial={{ width: "2%" }}
              animate={{ width: `${displayProgress}%` }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
              className="h-full rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #10b981 100%)",
              }}
            />

            {/* Milestone dots */}
            {MILESTONES.map((m) => (
              <div
                key={m.percent}
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-slate-600 bg-slate-700"
                style={{ left: `${m.percent}%`, transform: "translate(-50%, -50%)" }}
              />
            ))}

            {/* Current position marker */}
            {displayProgress > 2 && displayProgress < 98 && (
              <motion.div
                initial={{ left: "2%" }}
                animate={{ left: `${displayProgress}%` }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              >
                <div className="relative">
                  <MapPin size={14} className="text-white drop-shadow-lg" />
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded-md">
                    Di sini
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Labels below */}
          <div className="flex justify-between mt-1">
            <span className="text-xs text-red-400">0%</span>
            <span className="text-xs text-emerald-400">100% BEBAS!</span>
          </div>
        </div>

        {/* Right: freedom icon */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <Award size={20} className="text-amber-400" />
          </div>
          <span className="text-xs text-amber-400 font-medium">Bebas</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-700/40">
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-1">Sudah lunas</p>
          <p className="text-sm font-bold text-emerald-400 tabular-nums">
            {formatCurrency(totalTerlunasi)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-1">Sisa hutang</p>
          <p className="text-sm font-bold text-red-400 tabular-nums">
            {formatCurrency(sisaHutang)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-1">Progress</p>
          <p className="text-sm font-bold text-white tabular-nums">
            {displayProgress.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}
