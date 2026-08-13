"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet, LayoutGrid } from "lucide-react";
import type { BudgetPlan } from "@/types/budget-planner";
import { formatCurrency, formatPercent, getProgressColor } from "@/lib/formatters";
import { cn } from "@/lib/cn";

interface BudgetSummaryProps {
  plan: BudgetPlan;
}

export function BudgetSummary({ plan }: BudgetSummaryProps) {
  const pctTerpakai =
    plan.totalAlokasi > 0
      ? (plan.totalTerpakai / plan.totalAlokasi) * 100
      : 0;
  const sisaPositif = plan.sisa >= 0;
  const progressColor = getProgressColor(pctTerpakai);

  return (
    <div className="space-y-4">
      {/* Total Penghasilan */}
      <div className="rounded-2xl border border-green-800/40 bg-green-900/10 p-5 text-center">
        <p className="text-xs text-slate-400 mb-1">Total Penghasilan</p>
        <p className="text-3xl font-bold text-white tabular-nums">
          {formatCurrency(plan.totalPenghasilan)}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border border-slate-700 bg-slate-800/50 p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={14} className="text-blue-400" />
            <p className="text-xs text-slate-400">Dialokasikan</p>
          </div>
          <p className="text-lg font-bold text-blue-400 tabular-nums">
            {formatCurrency(plan.totalAlokasi)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-slate-700 bg-slate-800/50 p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-green-400" />
            <p className="text-xs text-slate-400">Terpakai</p>
          </div>
          <p
            className={cn(
              "text-lg font-bold tabular-nums",
              plan.totalTerpakai > plan.totalAlokasi
                ? "text-red-400"
                : "text-green-400"
            )}
          >
            {formatCurrency(plan.totalTerpakai)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={cn(
            "rounded-xl border p-4",
            sisaPositif
              ? "border-green-800/40 bg-green-900/10"
              : "border-red-800/40 bg-red-900/10"
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            {sisaPositif ? (
              <TrendingUp size={14} className="text-green-400" />
            ) : (
              <TrendingDown size={14} className="text-red-400" />
            )}
            <p className="text-xs text-slate-400">Sisa Budget</p>
          </div>
          <p
            className={cn(
              "text-lg font-bold tabular-nums",
              sisaPositif ? "text-green-400" : "text-red-400"
            )}
          >
            {sisaPositif ? "" : "-"}
            {formatCurrency(Math.abs(plan.sisa))}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-slate-700 bg-slate-800/50 p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <LayoutGrid size={14} className="text-slate-400" />
            <p className="text-xs text-slate-400">Kategori</p>
          </div>
          <p className="text-lg font-bold text-white">
            {plan.kategori.length}
          </p>
        </motion.div>
      </div>

      {/* Overall progress */}
      {plan.totalTerpakai > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-400">Progress Keseluruhan</p>
            <p className="text-xs font-medium text-slate-300">
              {formatPercent(pctTerpakai, 0)}
            </p>
          </div>
          <div
            className="h-3 bg-slate-700 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.min(pctTerpakai, 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress keseluruhan: ${formatPercent(pctTerpakai, 0)}`}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(pctTerpakai, 100)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={cn("h-full rounded-full", progressColor)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
