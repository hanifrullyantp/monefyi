// src/components/debt/ResultsDashboard.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar, Clock, Banknote, TrendingDown, Copy, Check,
} from "lucide-react";
import type {
  PayoffResult,
  StrategyComparison,
  DebtCoachInsight,
  PayoffStrategy,
} from "@/types";
import { FreedomDateCard } from "./FreedomDateCard";
import { MotivationTracker } from "./MotivationTracker";
import { DebtTimeline } from "./DebtTimeline";
import { DebtFreeChart } from "./DebtFreeChart";
import { StrategyComparison as StrategyComparisonComponent } from "./StrategyComparison";
import { PayoffSchedule } from "./PayoffSchedule";
import { InterestSavedCard } from "./InterestSavedCard";
import { MilestoneCards } from "./MilestoneCards";
import { ActionRecommendations } from "./ActionRecommendations";
import { DebtCoachAI } from "./DebtCoachAI";
import { ResultCard } from "@/components/ui/ResultCard";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatMonths } from "@/lib/formatters";

interface ResultsDashboardProps {
  result: PayoffResult;
  comparison: StrategyComparison;
  insights: DebtCoachInsight[];
  currentStrategy: PayoffStrategy;
  monthlyAllocation: number;
  onApplyStrategy: (s: PayoffStrategy) => void;
  onExport: () => string;
}

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
}

export function ResultsDashboard({
  result,
  comparison,
  insights,
  currentStrategy,
  monthlyAllocation,
  onApplyStrategy,
  onExport,
}: ResultsDashboardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = onExport();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Section header */}
      <FadeIn delay={0}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">Hasil Rencana Bebas Hutang</h2>
            <p className="text-slate-400 text-sm mt-1">
              Strategi:{" "}
              <span className="text-emerald-400 font-semibold capitalize">
                {currentStrategy === "snowball"
                  ? "Metode Snowball"
                  : currentStrategy === "avalanche"
                  ? "Metode Avalanche"
                  : "Urutan Custom"}
              </span>
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            leftIcon={copied ? <Check size={14} /> : <Copy size={14} />}
          >
            {copied ? "Tersalin!" : "Salin Ringkasan"}
          </Button>
        </div>
      </FadeIn>

      {/* Freedom date card */}
      <FadeIn delay={0.1}>
        <FreedomDateCard result={result} />
      </FadeIn>

      {/* KPI Cards */}
      <FadeIn delay={0.2}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ResultCard
            title="Bebas Hutang"
            value={result.tanggalLunas}
            icon={<Calendar size={16} />}
            variant="highlight"
            subtitle="tanggal target lunas"
          />
          <ResultCard
            title="Durasi"
            value={formatMonths(result.bulanUntukLunas)}
            icon={<Clock size={16} />}
            variant="default"
            subtitle={`${result.bulanUntukLunas} bulan`}
          />
          <ResultCard
            title="Total Bunga"
            value={formatCurrency(result.totalBungaDibayar)}
            icon={<TrendingDown size={16} />}
            variant="warning"
            subtitle="total bunga dibayar"
          />
          <ResultCard
            title="Total Dibayar"
            value={formatCurrency(result.totalDibayar)}
            icon={<Banknote size={16} />}
            variant="default"
            subtitle="pokok + bunga"
          />
        </div>
      </FadeIn>

      {/* Interest Saved */}
      {result.hematBunga && result.hematBunga > 0 && (
        <FadeIn delay={0.25}>
          <InterestSavedCard result={result} minimumResult={comparison.minimumOnly} />
        </FadeIn>
      )}

      {/* Motivation tracker */}
      <FadeIn delay={0.3}>
        <MotivationTracker result={result} totalTerlunasi={0} />
      </FadeIn>

      {/* Timeline */}
      <FadeIn delay={0.35}>
        <DebtTimeline result={result} />
      </FadeIn>

      {/* Chart */}
      <FadeIn delay={0.4}>
        <DebtFreeChart
          strategyResult={result}
          minimumResult={comparison.minimumOnly}
        />
      </FadeIn>

      {/* Strategy comparison */}
      <FadeIn delay={0.45}>
        <StrategyComparisonComponent
          comparison={comparison}
          currentStrategy={currentStrategy}
          onApply={onApplyStrategy}
        />
      </FadeIn>

      {/* Payoff schedule */}
      <FadeIn delay={0.5}>
        <PayoffSchedule result={result} />
      </FadeIn>

      {/* Milestones */}
      <FadeIn delay={0.55}>
        <MilestoneCards result={result} />
      </FadeIn>

      {/* Action recommendations */}
      <FadeIn delay={0.6}>
        <ActionRecommendations
          result={result}
          monthlyAllocation={monthlyAllocation}
        />
      </FadeIn>

      {/* Coach AI */}
      <FadeIn delay={0.65}>
        <DebtCoachAI insights={insights} />
      </FadeIn>
    </div>
  );
}
