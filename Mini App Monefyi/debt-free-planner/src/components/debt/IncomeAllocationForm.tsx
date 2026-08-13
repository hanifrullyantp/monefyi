// src/components/debt/IncomeAllocationForm.tsx
"use client";

import { AlertTriangle, Info } from "lucide-react";
import type { IncomeAllocation, DebtItem } from "@/types";
import { InputCurrency } from "@/components/ui/InputCurrency";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/cn";

interface IncomeAllocationFormProps {
  income: IncomeAllocation;
  debts: DebtItem[];
  onUpdate: (field: keyof IncomeAllocation, value: number) => void;
}

function getDTIStatus(percent: number): {
  label: string;
  color: string;
  barColor: "green" | "amber" | "red";
} {
  if (percent < 20) return { label: "Sehat", color: "text-emerald-400", barColor: "green" };
  if (percent < 30) return { label: "Ideal maksimal", color: "text-amber-400", barColor: "amber" };
  if (percent < 40) return { label: "Perhatian!", color: "text-orange-400", barColor: "amber" };
  return { label: "Berbahaya!", color: "text-red-400", barColor: "red" };
}

export function IncomeAllocationForm({
  income,
  debts,
  onUpdate,
}: IncomeAllocationFormProps) {
  const totalMinimum = debts.reduce((s, d) => s + d.cicilanMinimum, 0);
  const kekurangan = Math.max(0, totalMinimum - income.alokasiBayarHutang);
  const isKurang = income.alokasiBayarHutang > 0 && income.alokasiBayarHutang < totalMinimum && totalMinimum > 0;
  const isTerlalu = income.persentaseAlokasi > 50;
  const dtiStatus = getDTIStatus(income.persentaseAlokasi);

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-3xl overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-700/40">
        <h2 className="text-lg font-bold text-white">Alokasi Pembayaran Hutang</h2>
        <p className="text-sm text-slate-400 mt-1">
          Tentukan berapa yang bisa Anda sisihkan setiap bulan
        </p>
      </div>

      <div className="p-6 flex flex-col gap-5">
        <InputCurrency
          label="Penghasilan Bersih per Bulan"
          value={income.penghasilanBersih}
          onChange={(v) => onUpdate("penghasilanBersih", v)}
          helper="Take-home pay setelah pajak dan potongan"
        />

        <div>
          <InputCurrency
            label="Alokasi untuk Bayar Hutang"
            value={income.alokasiBayarHutang}
            onChange={(v) => onUpdate("alokasiBayarHutang", v)}
            helper="Berapa total yang Anda sediakan untuk semua cicilan?"
          />

          {/* DTI Visual */}
          {income.penghasilanBersih > 0 && income.alokasiBayarHutang > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/30">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400">
                  Persentase dari penghasilan
                </span>
                <span className={cn("text-xs font-bold tabular-nums", dtiStatus.color)}>
                  {income.persentaseAlokasi.toFixed(1)}% — {dtiStatus.label}
                </span>
              </div>
              <ProgressBar
                value={Math.min(100, income.persentaseAlokasi)}
                color={dtiStatus.barColor}
                height="sm"
                animated
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-slate-600">0%</span>
                <span className="text-xs text-emerald-600">30% ideal</span>
                <span className="text-xs text-red-600">50%+</span>
              </div>
            </div>
          )}
        </div>

        {/* Cicilan minimum info */}
        {totalMinimum > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
            <Info size={15} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-300">
              Total cicilan minimum semua hutang:{" "}
              <span className="font-bold tabular-nums">{formatCurrency(totalMinimum)}/bulan</span>
            </p>
          </div>
        )}

        {/* Warning: kurang dari minimum */}
        {isKurang && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-950/50 border border-red-500/40">
            <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-300">
                PERHATIAN: Alokasi kurang dari total cicilan minimum!
              </p>
              <p className="text-xs text-red-400 mt-1">
                Anda perlu minimal {formatCurrency(totalMinimum)} untuk cover semua cicilan.
                Kekurangan <span className="font-bold">{formatCurrency(kekurangan)}</span> akan
                menyebabkan denda dan bunga bertambah.
              </p>
            </div>
          </div>
        )}

        {/* Warning: terlalu tinggi */}
        {isTerlalu && !isKurang && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-950/30 border border-amber-500/30">
            <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-300">Alokasi sangat tinggi</p>
              <p className="text-xs text-amber-400 mt-1">
                Pastikan masih ada dana untuk kebutuhan pokok dan dana darurat.
                Idealnya simpan minimal 10-20% penghasilan.
              </p>
            </div>
          </div>
        )}

        <InputCurrency
          label="Buffer Dana Darurat (opsional)"
          value={income.bufferDanaDarurat}
          onChange={(v) => onUpdate("bufferDanaDarurat", v)}
          helper="Sisakan dana darurat 1-3 bulan pengeluaran. Ini tidak dihitung dalam alokasi hutang."
        />
      </div>
    </div>
  );
}
