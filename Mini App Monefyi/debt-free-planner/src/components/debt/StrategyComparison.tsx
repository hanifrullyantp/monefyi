// src/components/debt/StrategyComparison.tsx
"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { StrategyComparison as StrategyComparisonType } from "@/types";
import { formatCurrency, formatMonths } from "@/lib/formatters";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

interface StrategyComparisonProps {
  comparison: StrategyComparisonType;
  currentStrategy: string;
  onApply: (strategy: "snowball" | "avalanche") => void;
}

export function StrategyComparison({
  comparison,
  currentStrategy,
  onApply,
}: StrategyComparisonProps) {
  const { snowball, avalanche, minimumOnly, rekomendasi } = comparison;

  const columns = [
    {
      key: "minimum",
      label: "Bayar Minimum",
      result: minimumOnly,
      isRecommended: false,
      isBest: false,
      color: "red",
      bgClass: "bg-red-950/20",
      borderClass: "border-red-800/30",
    },
    {
      key: "snowball",
      label: "Snowball",
      result: snowball,
      isRecommended: rekomendasi === "snowball",
      isBest: snowball.totalBungaDibayar <= avalanche.totalBungaDibayar,
      color: "amber",
      bgClass: "bg-amber-950/20",
      borderClass: "border-amber-700/30",
    },
    {
      key: "avalanche",
      label: "Avalanche",
      result: avalanche,
      isRecommended: rekomendasi === "avalanche",
      isBest: avalanche.totalBungaDibayar <= snowball.totalBungaDibayar,
      color: "emerald",
      bgClass: "bg-emerald-950/20",
      borderClass: "border-emerald-700/30",
    },
  ];

  const metrics = [
    { label: "Durasi", format: (r: typeof minimumOnly) => formatMonths(r.bulanUntukLunas) },
    { label: "Total Bayar", format: (r: typeof minimumOnly) => formatCurrency(r.totalDibayar) },
    { label: "Total Bunga", format: (r: typeof minimumOnly) => formatCurrency(r.totalBungaDibayar) },
    {
      label: "Hemat vs Minimum",
      format: (r: typeof minimumOnly) =>
        r.hematBunga && r.hematBunga > 0
          ? formatCurrency(r.hematBunga)
          : "—",
    },
  ];

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-3xl overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-700/40">
        <h3 className="text-base font-bold text-white">Bandingkan Strategi</h3>
        <p className="text-sm text-slate-400 mt-1">
          Rekomendasi: <span className="text-emerald-400 font-semibold">{comparison.alasanRekomendasi}</span>
        </p>
      </div>

      <div className="p-6 overflow-x-auto">
        <div className="min-w-[500px]">
          {/* Column headers */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="text-xs text-slate-500 font-medium">Metrik</div>
            {columns.map((col) => (
              <div
                key={col.key}
                className={cn(
                  "relative text-center p-3 rounded-xl border",
                  col.bgClass,
                  col.borderClass
                )}
              >
                {col.isRecommended && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                    <span className="px-2 py-0.5 text-xs font-bold bg-amber-500 text-black rounded-full whitespace-nowrap">
                      REKOMENDASI
                    </span>
                  </div>
                )}
                {col.isBest && !col.isRecommended && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                    <span className="px-2 py-0.5 text-xs font-bold bg-emerald-600 text-white rounded-full whitespace-nowrap">
                      PALING HEMAT
                    </span>
                  </div>
                )}
                <p className="font-bold text-white text-sm mt-1">{col.label}</p>
              </div>
            ))}
          </div>

          {/* Metrics rows */}
          {metrics.map((metric, idx) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="grid grid-cols-4 gap-2 mb-2"
            >
              <div className="flex items-center text-xs text-slate-400 font-medium py-2">
                {metric.label}
              </div>
              {columns.map((col) => (
                <div
                  key={col.key}
                  className={cn(
                    "text-center py-2.5 px-2 rounded-xl text-sm font-mono tabular-nums",
                    col.isRecommended
                      ? "bg-emerald-500/10 text-emerald-300 font-bold"
                      : col.key === "minimum"
                      ? "bg-red-950/20 text-red-300"
                      : "bg-slate-800/40 text-slate-300"
                  )}
                >
                  {metric.format(col.result)}
                </div>
              ))}
            </motion.div>
          ))}

          {/* Urutan lunas */}
          <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-700/40">
            <div className="text-xs text-slate-400 font-medium py-2">
              Hutang 1st lunas
            </div>
            {columns.map((col) => (
              <div
                key={col.key}
                className={cn(
                  "text-center py-2.5 px-2 rounded-xl text-xs",
                  col.isRecommended
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "bg-slate-800/40 text-slate-400"
                )}
              >
                {col.result.urutanPelunasan[0] ?? "—"}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 pb-6 flex flex-wrap gap-3">
        {["snowball", "avalanche"].map((s) => (
          <Button
            key={s}
            variant={currentStrategy === s ? "primary" : "outline"}
            size="sm"
            onClick={() => onApply(s as "snowball" | "avalanche")}
            leftIcon={currentStrategy === s ? <Check size={14} /> : undefined}
          >
            Terapkan {s === "snowball" ? "Snowball" : "Avalanche"}
          </Button>
        ))}
      </div>
    </div>
  );
}
