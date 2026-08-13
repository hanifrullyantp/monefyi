// src/components/debt/FreedomDateCard.tsx
"use client";

import { motion } from "framer-motion";
import { Award } from "lucide-react";
import type { PayoffResult } from "@/types";
import { formatMonths, formatDateLong } from "@/lib/formatters";
import { useCountUp } from "@/hooks/useCountUp";

interface FreedomDateCardProps {
  result: PayoffResult;
}

function CountUpMonths({ target }: { target: number }) {
  const val = useCountUp(target, 1500, true);
  return <span className="tabular-nums">{val}</span>;
}

export function FreedomDateCard({ result }: FreedomDateCardProps) {
  const dateLabel = formatDateLong(result.bulanUntukLunas);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", duration: 0.6, bounce: 0.3, delay: 0.2 }}
      className="relative overflow-hidden rounded-3xl p-8 text-center"
      style={{
        background: "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #065f46 100%)",
        boxShadow: "0 20px 60px -10px rgba(16,185,129,0.4)",
        border: "1px solid rgba(16,185,129,0.4)",
      }}
    >
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-emerald-500/20 blur-3xl rounded-full" />

      {/* Content */}
      <div className="relative">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", delay: 0.4, duration: 0.8 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 mb-4"
        >
          <Award size={32} className="text-amber-400" />
        </motion.div>

        {/* Label */}
        <p className="text-xs font-bold tracking-widest text-emerald-400 uppercase mb-2">
          Tanggal Bebas Hutang
        </p>

        {/* Big date */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-4xl md:text-5xl font-extrabold mb-3 gradient-text-gold"
        >
          {dateLabel}
        </motion.h2>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-emerald-300 text-base mb-6"
        >
          Dalam{" "}
          <span className="font-bold text-white">
            <CountUpMonths target={result.bulanUntukLunas} />
          </span>{" "}
          bulan dari sekarang
          {" "}({formatMonths(result.bulanUntukLunas)})
        </motion.p>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-emerald-700 mb-1.5">
            <span>Hari ini</span>
            <span>{dateLabel}</span>
          </div>
          <div className="relative h-3 rounded-full overflow-hidden bg-emerald-900/60">
            <motion.div
              initial={{ width: "5%" }}
              animate={{ width: "5%" }}
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #10b981 100%)",
              }}
            />
            {/* Current position marker */}
            <div className="absolute left-[5%] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-emerald-400 shadow-lg shadow-emerald-500/50" />
          </div>
        </div>

        {/* Celebration */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-sm text-emerald-300"
        >
          Anda akan bebas dari cicilan. Gaji full milik Anda!
        </motion.p>
      </div>
    </motion.div>
  );
}
