"use client";

import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle } from "lucide-react";
import type { PembagianPihak } from "@/types/bagi-hasil";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/cn";

const PARTY_COLORS = [
  { bg: "bg-green-900/30", border: "border-green-800/40", text: "text-green-400", badge: "bg-green-900/40" },
  { bg: "bg-blue-900/30", border: "border-blue-800/40", text: "text-blue-400", badge: "bg-blue-900/40" },
  { bg: "bg-amber-900/30", border: "border-amber-800/40", text: "text-amber-400", badge: "bg-amber-900/40" },
  { bg: "bg-purple-900/30", border: "border-purple-800/40", text: "text-purple-400", badge: "bg-purple-900/40" },
  { bg: "bg-teal-900/30", border: "border-teal-800/40", text: "text-teal-400", badge: "bg-teal-900/40" },
];

interface NisbahResultCardProps {
  pembagian: PembagianPihak[];
  totalModal?: number;
  estimasiPendapatan: number;
  label?: string;
  catatanKerugian?: string;
}

export default function NisbahResultCard({
  pembagian,
  totalModal,
  estimasiPendapatan,
  label = "Estimasi Pembagian Keuntungan",
  catatanKerugian,
}: NisbahResultCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-green-400" />
        <h3 className="text-lg font-semibold text-slate-100">{label}</h3>
      </div>

      {totalModal !== undefined && totalModal > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3">
          <span className="text-sm text-slate-400">Total Modal</span>
          <span className="font-tabular text-sm font-semibold text-slate-100">
            {formatCurrency(totalModal)}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border border-green-800/30 bg-green-950/30 px-4 py-3">
        <span className="text-sm text-slate-400">Estimasi Pendapatan</span>
        <span className="font-tabular text-sm font-bold text-green-400">
          {formatCurrency(estimasiPendapatan)}
        </span>
      </div>

      <div className="space-y-3">
        {pembagian.map((p, i) => {
          const colors = PARTY_COLORS[i % PARTY_COLORS.length];
          return (
            <motion.div
              key={p.nama}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={cn(
                "rounded-2xl border p-4 space-y-2",
                colors.bg,
                colors.border
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn("text-sm font-semibold", colors.text)}>
                    {p.nama}
                  </p>
                  <p className="text-xs text-slate-500">{p.peran}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-sm font-bold tabular-nums",
                    colors.badge,
                    colors.text
                  )}
                >
                  {formatPercent(p.persentaseKeuntungan)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Keuntungan</span>
                <span
                  className={cn(
                    "font-tabular text-base font-bold",
                    colors.text
                  )}
                >
                  {formatCurrency(p.keuntunganRupiah)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full rounded-full bg-slate-700/50">
                <motion.div
                  className={cn("h-full rounded-full", colors.bg.replace("/30", ""))}
                  initial={{ width: 0 }}
                  animate={{ width: `${p.persentaseKeuntungan}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                  style={{ backgroundColor: undefined }}
                />
              </div>

              {/* Kerugian */}
              {p.persentaseKerugian > 0 && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-700/30">
                  <span className="text-xs text-slate-500">Tanggung Kerugian</span>
                  <span className="text-xs font-medium text-red-400 tabular-nums">
                    {formatPercent(p.persentaseKerugian)}
                    {p.kerugianRupiah > 0 && ` (${formatCurrency(p.kerugianRupiah)})`}
                  </span>
                </div>
              )}
              {p.persentaseKerugian === 0 && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-700/30">
                  <span className="text-xs text-slate-500">Tanggungan Kerugian</span>
                  <span className="text-xs font-medium text-slate-500">
                    Waktu & Tenaga
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {catatanKerugian && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-950/30 border border-amber-900/30 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-xs text-amber-300">{catatanKerugian}</p>
        </div>
      )}
    </motion.div>
  );
}
