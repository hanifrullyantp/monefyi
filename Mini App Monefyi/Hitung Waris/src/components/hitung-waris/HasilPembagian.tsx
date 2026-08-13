"use client";

import { motion } from "framer-motion";
import {
  Award,
  Copy,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import type { HasilPembagianWaris } from "@/types/hitung-waris";
import { AhliWarisCard } from "./AhliWarisCard";
import { formatRupiah, formatTanggal } from "@/lib/formatters";
import { cn } from "@/lib/cn";

interface HasilPembagianProps {
  hasil: HasilPembagianWaris;
  onReset: () => void;
  onCopy?: () => void;
}

const metodeLabel: Record<string, { label: string; color: string }> = {
  normal: { label: "Normal", color: "text-green-400 border-green-700 bg-green-900/20" },
  aul: { label: "'Aul", color: "text-amber-400 border-amber-700 bg-amber-900/20" },
  radd: { label: "Radd", color: "text-blue-400 border-blue-700 bg-blue-900/20" },
  gharawain: { label: "Gharawain", color: "text-purple-400 border-purple-700 bg-purple-900/20" },
};

const insightColor: Record<string, string> = {
  info: "border-blue-700/50 bg-blue-900/20",
  perhatian: "border-amber-700/50 bg-amber-900/20",
  penting: "border-red-700/50 bg-red-900/20",
};

const insightTextColor: Record<string, string> = {
  info: "text-blue-300",
  perhatian: "text-amber-300",
  penting: "text-red-300",
};

export function HasilPembagian({
  hasil,
  onReset,
  onCopy,
}: HasilPembagianProps) {
  const { label: metodeText, color: metodeColor } =
    metodeLabel[hasil.metode] ?? { label: hasil.metode, color: "text-slate-400" };

  const yangMendapat = hasil.hasilPerAhliWaris.filter(
    (h) => h.status === "mendapat_bagian"
  );
  const yangTerhijab = hasil.hasilPerAhliWaris.filter(
    (h) => h.status === "terhijab_hirman"
  );

  const hartaUntukWaris = Math.max(
    0,
    hasil.harta.hartaBersih - hasil.harta.nilaiWasiat
  );

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
      id="hasil-pembagian"
      className="space-y-6"
    >
      {/* Header */}
      <div className="rounded-3xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
            >
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Hasil Pembagian Warisan
              </h2>
              <p className="text-sm text-slate-400">
                {formatTanggal(new Date().toISOString())}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "px-3 py-1.5 rounded-xl text-sm font-semibold border",
                metodeColor
              )}
            >
              Metode: {metodeText}
            </span>
            {onCopy && (
              <button
                onClick={onCopy}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors text-sm"
                aria-label="Salin ringkasan"
              >
                <Copy className="w-4 h-4" />
                Salin
              </button>
            )}
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-700/50 text-red-400 hover:bg-red-900/20 transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Baru
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 divide-x divide-slate-700">
          {[
            {
              label: "Total Harta",
              value: formatRupiah(hasil.harta.totalHarta),
              color: "text-white",
            },
            {
              label: "Harta Dibagi",
              value: formatRupiah(hartaUntukWaris),
              color: "text-green-400",
            },
            {
              label: "Ahli Waris",
              value: `${yangMendapat.length} mendapat${yangTerhijab.length > 0 ? `, ${yangTerhijab.length} terhijab` : ""}`,
              color: "text-slate-300",
            },
          ].map((stat) => (
            <div key={stat.label} className="p-5 text-center">
              <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
              <p className={cn("text-lg font-bold tabular-nums", stat.color)}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Metode penjelasan */}
        <div className="mx-6 mb-6 p-3 rounded-xl bg-slate-900/50 border border-slate-700">
          <p className="text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Metode: </span>
            {hasil.penjelasanMetode}
          </p>
        </div>

        {/* Error messages */}
        {hasil.pesanError.length > 0 && (
          <div className="mx-6 mb-6 space-y-2">
            {hasil.pesanError.map((pesan, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-3 rounded-xl border border-amber-700/50 bg-amber-900/20"
              >
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">{pesan}</p>
              </div>
            ))}
          </div>
        )}

        {/* Valid indicator */}
        {hasil.isValid && (
          <div className="mx-6 mb-6 flex items-center gap-2 p-3 rounded-xl border border-green-700/30 bg-green-950/20">
            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
            <p className="text-xs text-green-300">
              Kalkulasi tervalidasi — Total persentase:{" "}
              {hasil.totalPersentase.toFixed(4)}%
            </p>
          </div>
        )}
      </div>

      {/* Insights */}
      {hasil.insights.length > 0 && (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-white">
              Catatan & Insight
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {hasil.insights.map((insight, i) => (
              <div
                key={i}
                className={cn(
                  "p-4 rounded-xl border",
                  insightColor[insight.tipe] ?? "border-slate-700"
                )}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg flex-shrink-0">{insight.icon}</span>
                  <div>
                    <p
                      className={cn(
                        "text-sm font-semibold mb-1",
                        insightTextColor[insight.tipe] ?? "text-slate-300"
                      )}
                    >
                      {insight.judul}
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {insight.pesan}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ahli waris cards */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">
          Pembagian Per Ahli Waris
        </h3>

        {yangMendapat.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {yangMendapat.map((h, i) => (
              <AhliWarisCard key={h.jenis} hasil={h} index={i} />
            ))}
          </div>
        )}

        {yangTerhijab.length > 0 && (
          <>
            <h4 className="text-base font-semibold text-slate-400 mb-3">
              Yang Terhijab ({yangTerhijab.length})
            </h4>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {yangTerhijab.map((h, i) => (
                <AhliWarisCard key={h.jenis} hasil={h} index={i} />
              ))}
            </div>
          </>
        )}
      </div>
    </motion.section>
  );
}
