"use client";

import { motion } from "framer-motion";
import { TrendingUp, AlertOctagon, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { HasilAhliWaris } from "@/types/hitung-waris";
import { formatRupiah, formatPecahan, formatPersentase } from "@/lib/formatters";
import { cn } from "@/lib/cn";

interface AhliWarisCardProps {
  hasil: HasilAhliWaris;
  index: number;
}

const golonganLabel: Record<string, string> = {
  ashabul_furudh: "Ashabul Furudh",
  ashabah: "Ashabah",
  dzawil_arham: "Dzawil Arham",
};

const golonganColor: Record<string, string> = {
  ashabul_furudh: "text-green-400 border-green-700 bg-green-900/20",
  ashabah: "text-blue-400 border-blue-700 bg-blue-900/20",
  dzawil_arham: "text-purple-400 border-purple-700 bg-purple-900/20",
};

export function AhliWarisCard({ hasil, index }: AhliWarisCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const isTerhijab = hasil.status === "terhijab_hirman";

  if (isTerhijab) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.07 }}
        className="rounded-2xl border border-red-900/50 bg-red-950/10 p-4 opacity-80"
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-red-950/50 border border-red-900/50 flex items-center justify-center flex-shrink-0">
            <AlertOctagon className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-slate-300">
                {hasil.namaDisplay}
              </h4>
              {hasil.jumlahOrang > 1 && (
                <span className="text-xs text-slate-500">
                  ({hasil.jumlahOrang} orang)
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full text-xs border border-red-700/50 text-red-400 bg-red-950/30">
                Terhijab
              </span>
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-500 font-semibold mb-2">
          Tidak mendapat bagian
        </p>

        <button
          type="button"
          onClick={() => setShowDetail(!showDetail)}
          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          {showDetail ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
          {showDetail ? "Sembunyikan" : "Lihat alasan"}
        </button>

        {showDetail && hasil.alasanHijab && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 rounded-xl bg-red-950/30 border border-red-900/30"
          >
            <p className="text-xs text-slate-400 leading-relaxed">
              {hasil.alasanHijab}
            </p>
          </motion.div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="rounded-2xl border border-green-800/40 bg-slate-800/70 p-4 hover:border-green-700/60 transition-all"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #065f46 0%, #022c22 100%)" }}
        >
          <TrendingUp className="w-4 h-4 text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-white">{hasil.namaDisplay}</h4>
            {hasil.jumlahOrang > 1 && (
              <span className="text-xs text-slate-500">
                ({hasil.jumlahOrang} orang)
              </span>
            )}
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-xs border",
                golonganColor[hasil.golongan] ?? "text-slate-400 border-slate-700"
              )}
            >
              {golonganLabel[hasil.golongan] ?? hasil.golongan}
            </span>
          </div>
        </div>
      </div>

      {/* Bagian */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-slate-500 mb-1">Bagian</p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-green-400">
              {hasil.golongan === "ashabah" && hasil.pembilang === 1 && hasil.penyebut === 1
                ? "Sisa"
                : formatPecahan(hasil.pembilang, hasil.penyebut)}
            </span>
            <span className="text-sm text-slate-400">
              ({formatPersentase(hasil.persentase)})
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-700 rounded-full mb-4 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, hasil.persentase)}%` }}
          transition={{ duration: 0.8, delay: index * 0.07 + 0.3 }}
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, #10b981 0%, #059669 100%)" }}
        />
      </div>

      {/* Nilai */}
      <div className="border-t border-slate-700 pt-3">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs text-slate-500 mb-1">Total Nilai</p>
            <p className="text-2xl font-bold text-green-400 tabular-nums">
              {formatRupiah(hasil.nilaiTotal)}
            </p>
            {hasil.jumlahOrang > 1 && (
              <p className="text-xs text-slate-400 mt-1 tabular-nums">
                Per orang: {formatRupiah(hasil.nilaiPerOrang)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-blue-400 font-semibold">
          {hasil.dasarHukum}
        </span>
        <button
          type="button"
          onClick={() => setShowDetail(!showDetail)}
          className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
        >
          {showDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Detail
        </button>
      </div>

      {showDetail && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3 p-3 rounded-xl bg-slate-900/60 border border-slate-700 overflow-hidden"
        >
          <p className="text-xs text-slate-400 leading-relaxed">
            {hasil.penjelasan}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
