// src/components/debt/InterestSavedCard.tsx
"use client";

import { motion } from "framer-motion";
import { PiggyBank, ArrowDown } from "lucide-react";
import type { PayoffResult } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import { useCountUp } from "@/hooks/useCountUp";

interface InterestSavedCardProps {
  result: PayoffResult;
  minimumResult: PayoffResult;
}

const ANALOGIES = [
  "1 tahun langganan streaming premium keluarga",
  "Liburan ke Bali untuk 2 orang",
  "Dana darurat 3 bulan pengeluaran",
  "DP motor baru",
  "Emas 10-20 gram",
  "Renovasi kamar tidur",
  "Investasi reksa dana untuk masa depan",
];

function CountUpValue({ target }: { target: number }) {
  const val = useCountUp(target, 2000, true);
  return (
    <span className="tabular-nums">
      {val.toLocaleString("id-ID")}
    </span>
  );
}

export function InterestSavedCard({
  result,
  minimumResult,
}: InterestSavedCardProps) {
  const saved = Math.max(
    0,
    minimumResult.totalBungaDibayar - result.totalBungaDibayar
  );
  const analogy = ANALOGIES[Math.floor(Math.random() * ANALOGIES.length)];

  if (saved <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="relative overflow-hidden rounded-3xl p-6"
      style={{
        background: "linear-gradient(135deg, #022c22 0%, #064e3b 80%)",
        border: "1px solid rgba(16,185,129,0.3)",
      }}
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />

      <div className="relative flex flex-col sm:flex-row items-start gap-6">
        {/* Icon */}
        <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
          <PiggyBank size={28} className="text-emerald-400" />
        </div>

        {/* Content */}
        <div className="flex-1">
          <p className="text-sm font-medium text-emerald-300 mb-1">
            Total bunga yang Anda HINDARI
          </p>
          <p className="text-4xl font-extrabold text-white mb-3">
            <span className="text-emerald-400">Rp </span>
            <CountUpValue target={saved} />
          </p>
          <p className="text-xs text-slate-400 mb-4">
            dibandingkan jika hanya membayar cicilan minimum
          </p>

          {/* Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-red-950/40 border border-red-800/30 rounded-xl p-3">
              <p className="text-xs text-red-400 mb-1">Bayar minimum saja</p>
              <p className="text-sm font-bold text-red-300 tabular-nums">
                {formatCurrency(minimumResult.totalBungaDibayar)}
              </p>
              <p className="text-xs text-red-500">total bunga</p>
            </div>
            <div className="flex items-center justify-center">
              <ArrowDown size={20} className="text-emerald-500 rotate-90" />
            </div>
            <div className="bg-emerald-950/40 border border-emerald-800/30 rounded-xl p-3">
              <p className="text-xs text-emerald-400 mb-1">Strategi Anda</p>
              <p className="text-sm font-bold text-emerald-300 tabular-nums">
                {formatCurrency(result.totalBungaDibayar)}
              </p>
              <p className="text-xs text-emerald-500">total bunga</p>
            </div>
          </div>

          {/* Analogy */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-amber-400 flex-shrink-0 mt-0.5">→</span>
            <p className="text-xs text-slate-300">
              Uang segini setara dengan:{" "}
              <span className="font-semibold text-white">{analogy}</span>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
