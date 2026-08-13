// src/components/debt/DebtCoachAI.tsx
"use client";

import { motion } from "framer-motion";
import {
  Brain, AlertTriangle, Lightbulb, Trophy, Star,
  Zap, Target, TrendingUp, CreditCard, Mountain,
  Award, Rocket, ShieldAlert,
} from "lucide-react";
import type { DebtCoachInsight } from "@/types";
import { cn } from "@/lib/cn";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  AlertTriangle, Lightbulb, Trophy, Star, Zap, Target, TrendingUp,
  CreditCard, Mountain, Award, Rocket, ShieldAlert, Brain,
};

interface DebtCoachAIProps {
  insights: DebtCoachInsight[];
}

const tipeConfig = {
  warning: {
    border: "border-red-500/40",
    bg: "bg-red-950/30",
    iconBg: "bg-red-500/20",
    badge: "bg-red-500/20 text-red-400",
    label: "Peringatan",
  },
  tip: {
    border: "border-blue-500/40",
    bg: "bg-blue-950/20",
    iconBg: "bg-blue-500/20",
    badge: "bg-blue-500/20 text-blue-400",
    label: "Tips",
  },
  milestone: {
    border: "border-emerald-500/40",
    bg: "bg-emerald-950/20",
    iconBg: "bg-emerald-500/20",
    badge: "bg-emerald-500/20 text-emerald-400",
    label: "Milestone",
  },
  motivation: {
    border: "border-amber-500/40",
    bg: "bg-amber-950/20",
    iconBg: "bg-amber-500/20",
    badge: "bg-amber-500/20 text-amber-400",
    label: "Motivasi",
  },
};

const urgencyIconColor: Record<string, string> = {
  high: "text-red-400",
  medium: "text-amber-400",
  low: "text-emerald-400",
};

export function DebtCoachAI({ insights }: DebtCoachAIProps) {
  if (insights.length === 0) return null;

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-3xl overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-700/40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <Brain size={18} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Coach Insight</h3>
            <p className="text-xs text-slate-400">Analisis dan rekomendasi personal</p>
          </div>
        </div>
      </div>

      <div className="p-6 flex flex-col gap-3">
        {insights.map((insight, idx) => {
          const config = tipeConfig[insight.tipe];
          const Icon = ICON_MAP[insight.iconName] ?? Lightbulb;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                "p-4 rounded-2xl border",
                config.border,
                config.bg
              )}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className={cn(
                    "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border border-white/10",
                    config.iconBg
                  )}
                >
                  <Icon
                    size={18}
                    className={urgencyIconColor[insight.urgency]}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-bold text-white leading-snug">
                      {insight.judul}
                    </p>
                    <span
                      className={cn(
                        "flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full",
                        config.badge
                      )}
                    >
                      {config.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {insight.pesan}
                  </p>
                  {insight.aksi && (
                    <button className="mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                      → {insight.aksi}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
