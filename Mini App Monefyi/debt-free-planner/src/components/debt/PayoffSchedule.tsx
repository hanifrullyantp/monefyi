// src/components/debt/PayoffSchedule.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import type { PayoffResult } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/cn";

interface PayoffScheduleProps {
  result: PayoffResult;
}

const PAGE_SIZE = 12;

export function PayoffSchedule({ result }: PayoffScheduleProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [view, setView] = useState<"monthly" | "yearly">("monthly");
  const [page, setPage] = useState(0);

  const { jadwal } = result;

  // Build yearly summary
  const yearlyJadwal = (() => {
    const byYear: Record<number, typeof jadwal> = {};
    jadwal.forEach((m) => {
      const year = Math.ceil(m.bulanKe / 12);
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(m);
    });
    return Object.entries(byYear).map(([year, months]) => ({
      year: parseInt(year),
      totalPembayaran: months.reduce((s, m) => s + m.totalPembayaran, 0),
      totalPokok: months.reduce((s, m) => s + m.totalPokokDibayar, 0),
      totalBunga: months.reduce((s, m) => s + m.totalBungaDibayar, 0),
      sisaAkhir: months[months.length - 1].totalSisaHutang,
      hutangLunas: months.flatMap((m) => m.hutangLunasBulanIni),
      bulanKe: months[months.length - 1].bulanKe,
      tanggal: `Tahun ${year}`,
    }));
  })();

  const displayData = view === "monthly" ? jadwal : yearlyJadwal;
  const totalPages = Math.ceil(displayData.length / PAGE_SIZE);
  const pageData = displayData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleViewChange = (v: "monthly" | "yearly") => {
    setView(v);
    setPage(0);
    setExpandedRow(null);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-700/40 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h3 className="text-base font-bold text-white">Jadwal Bulanan Detail</h3>
          <p className="text-sm text-slate-400 mt-1">
            Klik baris untuk lihat detail per hutang
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1">
          {(["monthly", "yearly"] as const).map((v) => (
            <button
              key={v}
              onClick={() => handleViewChange(v)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                view === v
                  ? "bg-emerald-500 text-white"
                  : "text-slate-400 hover:text-white"
              )}
            >
              {v === "monthly" ? "Bulanan" : "Tahunan"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-slate-700/40">
              <th className="text-left py-3 px-4 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                {view === "monthly" ? "Bulan" : "Tahun"}
              </th>
              <th className="text-right py-3 px-4 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Cicilan
              </th>
              <th className="text-right py-3 px-4 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Pokok
              </th>
              <th className="text-right py-3 px-4 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Bunga
              </th>
              <th className="text-right py-3 px-4 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Sisa
              </th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((item, idx) => {
              const isMonthly = view === "monthly";
              const monthItem = isMonthly ? (item as typeof jadwal[0]) : null;
              const yearItem = !isMonthly ? (item as typeof yearlyJadwal[0]) : null;

              const hasLunas =
                (monthItem?.hutangLunasBulanIni?.length ?? 0) > 0 ||
                (yearItem?.hutangLunas?.length ?? 0) > 0;

              const isLast =
                idx === pageData.length - 1 &&
                page === totalPages - 1;

              const rowKey = isMonthly
                ? (monthItem?.bulanKe ?? idx)
                : (yearItem?.year ?? idx);

              const isExpanded = expandedRow === rowKey;

              return (
                <AnimatePresence key={rowKey}>
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => {
                      if (isMonthly) setExpandedRow(isExpanded ? null : rowKey);
                    }}
                    className={cn(
                      "border-b border-slate-800/60 transition-colors",
                      hasLunas
                        ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                        : isLast
                        ? "bg-emerald-500/20"
                        : "hover:bg-white/2",
                      isMonthly && "cursor-pointer"
                    )}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {hasLunas && <Trophy size={14} className="text-emerald-400 flex-shrink-0" />}
                        <div>
                          <span className="text-sm text-slate-300">
                            {isMonthly ? monthItem?.tanggal : yearItem?.tanggal}
                          </span>
                          {hasLunas && (
                            <div className="text-xs text-emerald-400 font-medium">
                              {(monthItem?.hutangLunasBulanIni ?? yearItem?.hutangLunas ?? [])
                                .join(", ")}{" "}
                              LUNAS!
                            </div>
                          )}
                        </div>
                        {isMonthly && (
                          <span className="ml-1 text-slate-600">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-slate-300 tabular-nums font-mono">
                      {formatCurrency(isMonthly ? (monthItem?.totalPembayaran ?? 0) : (yearItem?.totalPembayaran ?? 0))}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-emerald-400 tabular-nums font-mono">
                      {formatCurrency(isMonthly ? (monthItem?.totalPokokDibayar ?? 0) : (yearItem?.totalPokok ?? 0))}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-red-400 tabular-nums font-mono">
                      {formatCurrency(isMonthly ? (monthItem?.totalBungaDibayar ?? 0) : (yearItem?.totalBunga ?? 0))}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-slate-300 tabular-nums font-mono">
                      {formatCurrency(isMonthly ? (monthItem?.totalSisaHutang ?? 0) : (yearItem?.sisaAkhir ?? 0))}
                    </td>
                  </motion.tr>

                  {/* Expanded detail */}
                  {isExpanded && isMonthly && monthItem && (
                    <tr className="bg-slate-800/30">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {monthItem.detailPerHutang
                            .filter((d) => !d.isLunas || d.totalBayar > 0)
                            .map((detail) => (
                              <div
                                key={detail.debtId}
                                className={cn(
                                  "p-2.5 rounded-xl text-xs border",
                                  detail.isLunas
                                    ? "bg-emerald-950/40 border-emerald-500/30"
                                    : "bg-slate-800/60 border-slate-700/30"
                                )}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-semibold text-white truncate">
                                    {detail.debtNama}
                                  </span>
                                  {detail.isLunas && (
                                    <span className="text-emerald-400 font-bold text-xs">LUNAS</span>
                                  )}
                                </div>
                                <div className="flex justify-between text-slate-400">
                                  <span>Bunga: {formatCurrency(detail.bungaBulan)}</span>
                                  <span>Sisa: {formatCurrency(detail.sisaSetelah)}</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-700/40 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Halaman {page + 1} dari {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={page === totalPages - 1}
              onClick={() => setPage(page + 1)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
