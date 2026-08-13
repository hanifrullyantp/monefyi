// src/hooks/useDebtPlanner.ts
"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  DebtItem,
  IncomeAllocation,
  PayoffStrategy,
  PayoffResult,
  StrategyComparison,
  UserProgress,
  DebtCoachInsight,
} from "@/types";
import { useLocalStorage } from "./useLocalStorage";
import {
  calculatePayoffSchedule,
  compareStrategies,
} from "@/lib/payoff-strategies";
import { generateDebtInsights } from "@/lib/debt-insights";
import { computeUrgency } from "@/lib/debt-calculator";
import { formatMonths, formatDate, getCurrentMonthYear } from "@/lib/formatters";

const DEFAULT_INCOME: IncomeAllocation = {
  penghasilanBersih: 0,
  alokasiBayarHutang: 0,
  persentaseAlokasi: 0,
  ekstraPembayaran: 0,
  bufferDanaDarurat: 0,
};

const DEFAULT_PROGRESS: UserProgress = {
  totalTerlunasi: 0,
  totalBungaDihindari: 0,
  hutangLunasCount: 0,
  bulanBerjalan: 0,
  targetBulan: 0,
  persentaseProgress: 0,
  streakBulan: 0,
};

export function useDebtPlanner() {
  const [debts, setDebts] = useLocalStorage<DebtItem[]>("debt_planner_debts", []);
  const [income, setIncome] = useLocalStorage<IncomeAllocation>(
    "debt_planner_income",
    DEFAULT_INCOME
  );
  const [strategy, setStrategyState] = useLocalStorage<PayoffStrategy>(
    "debt_planner_strategy",
    "avalanche"
  );
  const [progress, setProgress] = useLocalStorage<UserProgress>(
    "debt_planner_progress",
    DEFAULT_PROGRESS
  );

  const [currentResult, setCurrentResult] = useState<PayoffResult | null>(null);
  const [comparison, setComparison] = useState<StrategyComparison | null>(null);
  const [insights, setInsights] = useState<DebtCoachInsight[]>([]);
  const [isCalculated, setIsCalculated] = useState(false);

  const addDebt = useCallback(
    (data: Omit<DebtItem, "id" | "urgency" | "createdAt">) => {
      const newDebt: DebtItem = {
        ...data,
        id: Math.random().toString(36).slice(2),
        urgency: computeUrgency(data.bungaPerBulan),
        createdAt: new Date().toISOString(),
      };
      setDebts((prev) => [...prev, newDebt]);
    },
    [setDebts]
  );

  const editDebt = useCallback(
    (id: string, data: Partial<Omit<DebtItem, "id" | "createdAt">>) => {
      setDebts((prev) =>
        prev.map((d) => {
          if (d.id !== id) return d;
          const updated = { ...d, ...data };
          updated.urgency = computeUrgency(updated.bungaPerBulan);
          return updated;
        })
      );
    },
    [setDebts]
  );

  const removeDebt = useCallback(
    (id: string) => {
      setDebts((prev) => prev.filter((d) => d.id !== id));
      setIsCalculated(false);
    },
    [setDebts]
  );

  const reorderDebts = useCallback(
    (newOrder: DebtItem[]) => {
      setDebts(newOrder);
    },
    [setDebts]
  );

  const updateIncome = useCallback(
    (field: keyof IncomeAllocation, value: number) => {
      setIncome((prev) => {
        const updated = { ...prev, [field]: value };
        if (updated.penghasilanBersih > 0) {
          updated.persentaseAlokasi =
            (updated.alokasiBayarHutang / updated.penghasilanBersih) * 100;
        } else {
          updated.persentaseAlokasi = 0;
        }
        return updated;
      });
    },
    [setIncome]
  );

  const setStrategy = useCallback(
    (s: PayoffStrategy) => {
      setStrategyState(s);
    },
    [setStrategyState]
  );

  const hitung = useCallback(() => {
    if (debts.length === 0) return;

    const result = calculatePayoffSchedule(
      debts,
      income.alokasiBayarHutang,
      strategy,
      income.ekstraPembayaran
    );

    const comp = compareStrategies(
      debts,
      income.alokasiBayarHutang,
      income.ekstraPembayaran
    );

    const newInsights = generateDebtInsights(debts, income, result);

    const totalHutang = debts.reduce((s, d) => s + d.totalHutang, 0);
    const newProgress: UserProgress = {
      ...progress,
      targetBulan: result.bulanUntukLunas,
      persentaseProgress:
        totalHutang > 0 ? (progress.totalTerlunasi / totalHutang) * 100 : 0,
    };
    setProgress(newProgress);

    setCurrentResult(result);
    setComparison(comp);
    setInsights(newInsights);
    setIsCalculated(true);
  }, [debts, income, strategy, progress, setProgress]);

  const reset = useCallback(() => {
    setDebts([]);
    setIncome(DEFAULT_INCOME);
    setStrategyState("avalanche");
    setProgress(DEFAULT_PROGRESS);
    setCurrentResult(null);
    setComparison(null);
    setInsights([]);
    setIsCalculated(false);
  }, [setDebts, setIncome, setStrategyState, setProgress]);

  const exportRingkasan = useCallback((): string => {
    if (!currentResult) return "";
    const totalHutang = debts.reduce((s, d) => s + d.totalHutang, 0);
    const totalMinimum = debts.reduce((s, d) => s + d.cicilanMinimum, 0);
    const strategyLabel =
      strategy === "snowball"
        ? "Snowball"
        : strategy === "avalanche"
        ? "Avalanche"
        : "Custom";

    const lines: string[] = [
      "═══════════════════════════════════════",
      "RENCANA BEBAS HUTANG",
      "Dibuat dengan Bebas Hutang Planner",
      getCurrentMonthYear(),
      "═══════════════════════════════════════",
      "",
      "📊 RINGKASAN HUTANG:",
      `Total Hutang: Rp ${Math.round(totalHutang).toLocaleString("id-ID")}`,
      `Jumlah: ${debts.length} hutang`,
      `Cicilan Minimum: Rp ${Math.round(totalMinimum).toLocaleString("id-ID")}/bulan`,
      "",
      "💰 ALOKASI PEMBAYARAN:",
      `Penghasilan: Rp ${Math.round(income.penghasilanBersih).toLocaleString("id-ID")}`,
      `Alokasi hutang: Rp ${Math.round(income.alokasiBayarHutang).toLocaleString("id-ID")} (${income.persentaseAlokasi.toFixed(1)}%)`,
      `Ekstra pembayaran: Rp ${Math.round(income.ekstraPembayaran).toLocaleString("id-ID")}`,
      "",
      `🎯 STRATEGI: ${strategyLabel}`,
      "",
      "📅 HASIL:",
      `Tanggal Bebas Hutang: ${currentResult.tanggalLunas}`,
      `Durasi: ${formatMonths(currentResult.bulanUntukLunas)}`,
      `Total yang dibayar: Rp ${Math.round(currentResult.totalDibayar).toLocaleString("id-ID")}`,
      `Total bunga: Rp ${Math.round(currentResult.totalBungaDibayar).toLocaleString("id-ID")}`,
      `Hemat vs minimum: Rp ${Math.round(currentResult.hematBunga ?? 0).toLocaleString("id-ID")}`,
      "",
      "🔥 URUTAN PELUNASAN:",
    ];

    currentResult.urutanPelunasan.forEach((nama, idx) => {
      const monthPaid = currentResult.jadwal.find((m) =>
        m.hutangLunasBulanIni.includes(nama)
      );
      lines.push(
        `${idx + 1}. ${nama} - Lunas: ${monthPaid ? monthPaid.tanggal : "-"}`
      );
    });

    lines.push("");
    lines.push("⭐ MILESTONE:");

    const firstLunasMonth = currentResult.jadwal.find(
      (m) => m.hutangLunasBulanIni.length > 0
    );
    if (firstLunasMonth) {
      lines.push(`- Hutang pertama lunas: ${firstLunasMonth.tanggal}`);
    }

    const halfwayMonth = currentResult.jadwal.find(
      (m) =>
        m.totalSisaHutang <= currentResult.totalHutangAwal / 2
    );
    if (halfwayMonth) {
      lines.push(`- 50% hutang lunas: ${halfwayMonth.tanggal}`);
    }

    lines.push(`- BEBAS HUTANG: ${currentResult.tanggalLunas}`);
    lines.push("");
    lines.push("═══════════════════════════════════════");
    lines.push("Dibuat dengan Bebas Hutang Planner");
    lines.push("Kelola keuangan lebih baik di monefyi.com");
    lines.push("═══════════════════════════════════════");

    return lines.join("\n");
  }, [currentResult, debts, income, strategy]);

  return {
    debts,
    income,
    strategy,
    currentResult,
    comparison,
    insights,
    isCalculated,
    progress,
    addDebt,
    editDebt,
    removeDebt,
    reorderDebts,
    updateIncome,
    setStrategy,
    hitung,
    reset,
    exportRingkasan,
  };
}
