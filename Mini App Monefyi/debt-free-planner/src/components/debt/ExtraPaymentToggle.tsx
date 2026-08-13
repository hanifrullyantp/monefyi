// src/components/debt/ExtraPaymentToggle.tsx
"use client";

import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import type { DebtItem, IncomeAllocation, PayoffStrategy } from "@/types";
import { calculatePayoffSchedule } from "@/lib/payoff-strategies";
import { formatCurrency, formatMonths } from "@/lib/formatters";
import { cn } from "@/lib/cn";

const PRESETS = [
  { label: "0", value: 0 },
  { label: "100rb", value: 100_000 },
  { label: "250rb", value: 250_000 },
  { label: "500rb", value: 500_000 },
  { label: "1jt", value: 1_000_000 },
  { label: "2jt", value: 2_000_000 },
];

interface ExtraPaymentToggleProps {
  income: IncomeAllocation;
  debts: DebtItem[];
  strategy: PayoffStrategy;
  onUpdate: (value: number) => void;
}

export function ExtraPaymentToggle({
  income,
  debts,
  strategy,
  onUpdate,
}: ExtraPaymentToggleProps) {
  const [simulation, setSimulation] = useState<{
    monthsSaved: number;
    interestSaved: number;
  } | null>(null);

  const currentExtra = income.ekstraPembayaran;

  useEffect(() => {
    if (debts.length === 0 || income.alokasiBayarHutang === 0) {
      setSimulation(null);
      return;
    }

    if (currentExtra === 0) {
      setSimulation(null);
      return;
    }

    const baseResult = calculatePayoffSchedule(
      debts,
      income.alokasiBayarHutang,
      strategy,
      0
    );
    const extraResult = calculatePayoffSchedule(
      debts,
      income.alokasiBayarHutang,
      strategy,
      currentExtra
    );

    setSimulation({
      monthsSaved: Math.max(0, baseResult.bulanUntukLunas - extraResult.bulanUntukLunas),
      interestSaved: Math.max(
        0,
        baseResult.totalBungaDibayar - extraResult.totalBungaDibayar
      ),
    });
  }, [currentExtra, debts, income.alokasiBayarHutang, strategy]);

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-3xl overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-700/40">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-emerald-400" />
          <h2 className="text-lg font-bold text-white">Simulasi Ekstra Pembayaran</h2>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Berapa yang bisa Anda tambah di atas cicilan minimum?
        </p>
      </div>

      <div className="p-6">
        {/* Preset chips */}
        <div className="flex flex-wrap gap-2 mb-5">
          {PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => onUpdate(preset.value)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                currentExtra === preset.value
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700/50"
              )}
            >
              +{preset.label}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-sm text-slate-400 flex-shrink-0">Custom:</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              Rp
            </span>
            <input
              type="number"
              value={currentExtra || ""}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10) || 0;
                onUpdate(val);
              }}
              placeholder="0"
              className="w-full bg-slate-800 border border-slate-600/50 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>

        {/* Simulation result */}
        {simulation && currentExtra > 0 && (
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30">
            <p className="text-sm font-semibold text-emerald-300 mb-2">
              Dengan ekstra {formatCurrency(currentExtra)}/bulan:
            </p>
            <div className="flex flex-col gap-1">
              {simulation.monthsSaved > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-sm">→</span>
                  <span className="text-sm text-slate-300">
                    Lunas{" "}
                    <span className="font-bold text-emerald-400">
                      {formatMonths(simulation.monthsSaved)}
                    </span>{" "}
                    lebih cepat
                  </span>
                </div>
              )}
              {simulation.interestSaved > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-sm">→</span>
                  <span className="text-sm text-slate-300">
                    Hemat bunga{" "}
                    <span className="font-bold text-emerald-400 tabular-nums">
                      {formatCurrency(simulation.interestSaved)}
                    </span>
                  </span>
                </div>
              )}
              {simulation.monthsSaved === 0 && simulation.interestSaved === 0 && (
                <p className="text-xs text-slate-400">
                  Tambahkan hutang dan alokasi untuk melihat simulasi.
                </p>
              )}
            </div>
          </div>
        )}

        {currentExtra === 0 && (
          <p className="text-xs text-slate-500 text-center">
            Pilih jumlah ekstra di atas untuk melihat dampaknya
          </p>
        )}
      </div>
    </div>
  );
}
