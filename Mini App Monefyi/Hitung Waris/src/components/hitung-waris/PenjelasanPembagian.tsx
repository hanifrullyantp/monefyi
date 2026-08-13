"use client";

import { motion } from "framer-motion";
import { FileText, ChevronRight } from "lucide-react";
import type { HasilPembagianWaris } from "@/types/hitung-waris";
import {
  formatRupiah,
  formatPecahan,
  formatPersentase,
} from "@/lib/formatters";
import { cn } from "@/lib/cn";

interface PenjelasanPembagianProps {
  hasil: HasilPembagianWaris;
}

export function PenjelasanPembagian({ hasil }: PenjelasanPembagianProps) {
  const hartaUntukWaris = Math.max(
    0,
    hasil.harta.hartaBersih - hasil.harta.nilaiWasiat
  );
  const yangMendapat = hasil.hasilPerAhliWaris.filter(
    (h) => h.status === "mendapat_bagian"
  );
  const yangTerhijab = hasil.hasilPerAhliWaris.filter(
    (h) => h.status === "terhijab_hirman"
  );

  const steps = [
    {
      no: 1,
      judul: "Hitung Harta Bersih",
      konten: (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { label: "Total Harta", value: hasil.harta.totalHarta, color: "text-white" },
              { label: "− Hutang Almarhum", value: hasil.harta.hutangAlmarhum, color: "text-red-400" },
              { label: "− Biaya Jenazah", value: hasil.harta.biayaJenazah, color: "text-amber-400" },
              { label: "− Wasiat", value: hasil.harta.nilaiWasiat, color: "text-purple-400" },
            ].map((r) => (
              <div key={r.label} className="flex justify-between gap-2 py-1 border-b border-slate-700/50">
                <span className="text-slate-400 text-xs">{r.label}</span>
                <span className={cn("text-xs font-semibold tabular-nums", r.color)}>
                  {formatRupiah(r.value)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-1">
            <span className="text-sm font-semibold text-white flex items-center gap-1">
              <ChevronRight className="w-4 h-4 text-green-400" />
              Harta untuk Waris
            </span>
            <span className="text-xl font-bold text-green-400 tabular-nums">
              {formatRupiah(hartaUntukWaris)}
            </span>
          </div>
        </div>
      ),
    },
    {
      no: 2,
      judul: "Identifikasi Ahli Waris",
      konten: (
        <div className="space-y-2">
          {yangMendapat.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-400 mb-1.5">
                ✓ Mendapat Bagian ({yangMendapat.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {yangMendapat.map((h) => (
                  <span
                    key={h.jenis}
                    className="px-2 py-1 rounded-lg text-xs bg-green-900/30 border border-green-700/50 text-green-300"
                  >
                    {h.namaDisplay}
                    {h.jumlahOrang > 1 && ` (${h.jumlahOrang})`}
                  </span>
                ))}
              </div>
            </div>
          )}
          {yangTerhijab.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-400 mb-1.5">
                ✕ Terhijab ({yangTerhijab.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {yangTerhijab.map((h) => (
                  <span
                    key={h.jenis}
                    className="px-2 py-1 rounded-lg text-xs bg-red-900/20 border border-red-800/50 text-red-400"
                  >
                    {h.namaDisplay}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      no: 3,
      judul: "Bagian Setiap Ahli Waris",
      konten: (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 pr-4 text-slate-400 font-semibold">
                  Ahli Waris
                </th>
                <th className="text-center py-2 pr-4 text-slate-400 font-semibold">
                  Bagian
                </th>
                <th className="text-center py-2 pr-4 text-slate-400 font-semibold">
                  Persen
                </th>
                <th className="text-right py-2 text-slate-400 font-semibold">
                  Nilai
                </th>
              </tr>
            </thead>
            <tbody>
              {yangMendapat.map((h) => (
                <tr
                  key={h.jenis}
                  className="border-b border-slate-800/50 hover:bg-slate-700/20"
                >
                  <td className="py-2 pr-4 text-slate-200">
                    {h.namaDisplay}
                    {h.jumlahOrang > 1 && (
                      <span className="text-slate-500 ml-1">
                        ×{h.jumlahOrang}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-center text-green-400 font-semibold">
                    {h.golongan === "ashabah" && h.pembilang === 1 && h.penyebut === 1
                      ? "Sisa"
                      : formatPecahan(h.pembilang, h.penyebut)}
                  </td>
                  <td className="py-2 pr-4 text-center text-slate-300 tabular-nums">
                    {formatPersentase(h.persentase)}
                  </td>
                  <td className="py-2 text-right text-green-400 font-semibold tabular-nums">
                    {formatRupiah(h.nilaiTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="py-2 pr-4 text-slate-400 font-semibold text-xs">
                  Total
                </td>
                <td className="py-2 pr-4 text-center text-white font-bold text-xs tabular-nums">
                  {formatPersentase(hasil.totalPersentase)}
                </td>
                <td className="py-2 text-right text-green-400 font-bold text-xs tabular-nums">
                  {formatRupiah(hartaUntukWaris)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ),
    },
    {
      no: 4,
      judul: `Metode Penyelesaian: ${hasil.metode.toUpperCase() === "AUL" ? "'Aul" : hasil.metode.charAt(0).toUpperCase() + hasil.metode.slice(1)}`,
      konten: (
        <div className="space-y-3">
          <p className="text-sm text-slate-400 leading-relaxed">
            {hasil.penjelasanMetode}
          </p>
          {hasil.metode === "aul" && (
            <div className="p-3 rounded-xl bg-amber-900/20 border border-amber-700/50">
              <p className="text-xs text-amber-300">
                <span className="font-semibold">Faktor 'Aul: </span>
                Total bagian furudh = {((hasil.aulFaktor ?? 1) * 100).toFixed(2)}%.
                Semua bagian dikurangi proporsional hingga total = 100%.
              </p>
            </div>
          )}
          {hasil.metode === "radd" && (
            <div className="p-3 rounded-xl bg-blue-900/20 border border-blue-700/50">
              <p className="text-xs text-blue-300">
                <span className="font-semibold">Radd: </span>
                Sisa harta dikembalikan ke ahli waris furudh (kecuali suami/istri)
                secara proporsional.
              </p>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-3xl border border-slate-700 bg-slate-800/50 overflow-hidden"
    >
      <div className="p-6 border-b border-slate-700 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1e3a5f 100%)" }}
        >
          <FileText className="w-5 h-5 text-blue-300" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-white">
            Penjelasan Langkah Demi Langkah
          </h3>
          <p className="text-sm text-slate-400">
            Cara kalkulasi faraid dilakukan
          </p>
        </div>
      </div>

      <div className="p-6">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-700" />

          <div className="space-y-6">
            {steps.map((step) => (
              <motion.div
                key={step.no}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: step.no * 0.1 }}
                className="relative pl-10"
              >
                {/* Step number */}
                <div className="absolute left-0 w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center z-10">
                  <span className="text-xs font-bold text-white">
                    {step.no}
                  </span>
                </div>

                {/* Content */}
                <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                  <h4 className="text-sm font-semibold text-white mb-3">
                    {step.judul}
                  </h4>
                  {step.konten}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
