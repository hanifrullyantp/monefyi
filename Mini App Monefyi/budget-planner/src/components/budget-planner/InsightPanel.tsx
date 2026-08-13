"use client";

import { motion } from "framer-motion";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Info,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  PiggyBank,
  ShoppingBag,
  Shield,
  Heart,
  Star,
  CheckCircle2,
  BarChart2,
  AlertCircle,
} from "lucide-react";
import type { BudgetInsight } from "@/types/budget-planner";
import { cn } from "@/lib/cn";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  AlertTriangle,
  CheckCircle,
  Info,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  PiggyBank,
  ShoppingBag,
  Shield,
  Heart,
  Star,
  CheckCircle2,
  BarChart: BarChart2,
  AlertCircle,
  Sparkles,
};

const TIPE_CONFIG = {
  positif: {
    border: "border-green-700/50",
    bg: "bg-green-900/20",
    badge: "text-green-400 bg-green-900/40 border-green-700/50",
    label: "Bagus",
    iconColor: "text-green-400",
  },
  negatif: {
    border: "border-red-700/50",
    bg: "bg-red-900/20",
    badge: "text-red-400 bg-red-900/40 border-red-700/50",
    label: "Perhatian",
    iconColor: "text-red-400",
  },
  netral: {
    border: "border-slate-700",
    bg: "bg-slate-800",
    badge: "text-slate-400 bg-slate-700 border-slate-600",
    label: "Info",
    iconColor: "text-slate-400",
  },
  saran: {
    border: "border-amber-700/50",
    bg: "bg-amber-900/20",
    badge: "text-amber-400 bg-amber-900/40 border-amber-700/50",
    label: "Saran",
    iconColor: "text-amber-400",
  },
};

interface InsightPanelProps {
  insights: BudgetInsight[];
}

export function InsightPanel({ insights }: InsightPanelProps) {
  if (insights.length === 0) return null;

  return (
    <section
      className="rounded-3xl border border-slate-700 bg-slate-800/30 p-6 md:p-8 space-y-5"
      aria-label="Insight Keuangan"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Sparkles size={20} className="text-green-400" />
        <div>
          <h2 className="text-lg font-semibold text-white">
            Insight Keuangan Anda
          </h2>
          <p className="text-sm text-slate-400">
            Analisis otomatis berdasarkan budget Anda
          </p>
        </div>
      </div>

      {/* Insights grid */}
      <div className="grid gap-3 md:grid-cols-2">
        {insights.map((insight, i) => {
          const config = TIPE_CONFIG[insight.tipe];
          const Icon = ICON_MAP[insight.icon] ?? Info;
          const isUrgent = insight.tipe === "negatif" && i === 0;

          return (
            <motion.div
              key={`${insight.judul}-${i}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: i * 0.08,
                ...(isUrgent && {
                  type: "spring",
                  stiffness: 300,
                }),
              }}
              className={cn(
                "rounded-2xl border p-4 space-y-2",
                config.border,
                config.bg
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1">
                  <Icon size={18} className={cn("shrink-0 mt-0.5", config.iconColor)} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm leading-snug">
                      {insight.judul}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {insight.pesan}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border",
                    config.badge
                  )}
                >
                  {config.label}
                </span>
              </div>

              {insight.aksi && (
                <p className="text-xs font-medium text-green-400 pl-7">
                  → {insight.aksi}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
