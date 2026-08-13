"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Shuffle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { AhliWarisInput, JenisAhliWaris, HartaWarisan } from "@/types/hitung-waris";
import { AHLI_WARIS_INFO } from "@/lib/waris-data";
import { hitungWarisan } from "@/lib/waris/faraid-engine";
import { formatRupiah, formatPersentase } from "@/lib/formatters";
import { cn } from "@/lib/cn";

interface SkenarioWarisProps {
  hartaAwal: HartaWarisan;
  ahliWarisAwal: AhliWarisInput[];
}

export function SkenarioWaris({
  hartaAwal,
  ahliWarisAwal,
}: SkenarioWarisProps) {
  const [skenarioAhliWaris, setSkenarioAhliWaris] =
    useState<AhliWarisInput[]>(ahliWarisAwal);

  const hasilAwal = useMemo(
    () => hitungWarisan(hartaAwal, ahliWarisAwal),
    [hartaAwal, ahliWarisAwal]
  );

  const hasilSkenario = useMemo(
    () => hitungWarisan(hartaAwal, skenarioAhliWaris),
    [hartaAwal, skenarioAhliWaris]
  );

  const toggleItem = (jenis: JenisAhliWaris) => {
    setSkenarioAhliWaris((prev) =>
      prev.map((aw) =>
        aw.jenis === jenis ? { ...aw, isAda: !aw.isAda } : aw
      )
    );
  };

  const allItems = ahliWarisAwal;

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
          style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" }}
        >
          <Shuffle className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-white">
            Eksplorasi Skenario
          </h3>
          <p className="text-sm text-slate-400">
            Ubah ahli waris dan lihat perubahan pembagian secara real-time
          </p>
        </div>
      </div>

      <div className="p-6">
        {/* Toggle grid */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-slate-400 mb-3">
            Toggle Ahli Waris:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {allItems.map((aw) => {
              const skenarioItem = skenarioAhliWaris.find(
                (s) => s.jenis === aw.jenis
              );
              const isActive = skenarioItem?.isAda ?? false;
              const info = AHLI_WARIS_INFO[aw.jenis];

              return (
                <button
                  key={aw.jenis}
                  type="button"
                  onClick={() => toggleItem(aw.jenis)}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-medium border transition-all text-left",
                    isActive
                      ? "border-green-700/60 bg-green-900/20 text-green-300"
                      : "border-slate-700 bg-slate-900/30 text-slate-500 hover:border-slate-600 hover:text-slate-400"
                  )}
                >
                  {info.namaDisplay}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comparison */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Skenario Awal */}
          <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
            <h4 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">
              Skenario Awal
            </h4>
            <div className="space-y-2">
              {hasilAwal.hasilPerAhliWaris
                .filter((h) => h.status === "mendapat_bagian")
                .map((h) => (
                  <div key={h.jenis} className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                    <span className="text-xs text-slate-300">{h.namaDisplay}</span>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-green-400 tabular-nums">
                        {formatRupiah(h.nilaiTotal)}
                      </span>
                      <span className="text-xs text-slate-500 ml-2 tabular-nums">
                        {formatPersentase(h.persentase)}
                      </span>
                    </div>
                  </div>
                ))}
              {hasilAwal.hasilPerAhliWaris.filter((h) => h.status === "mendapat_bagian").length === 0 && (
                <p className="text-xs text-slate-500">Tidak ada ahli waris aktif</p>
              )}
            </div>
          </div>

          {/* Skenario Baru */}
          <div className="rounded-2xl border border-purple-700/40 bg-purple-950/10 p-4">
            <h4 className="text-sm font-semibold text-purple-400 mb-3 uppercase tracking-wider">
              Skenario Baru
            </h4>
            <div className="space-y-2">
              {hasilSkenario.hasilPerAhliWaris
                .filter((h) => h.status === "mendapat_bagian")
                .map((h) => {
                  const awalItem = hasilAwal.hasilPerAhliWaris.find(
                    (a) => a.jenis === h.jenis
                  );
                  const selisih = h.nilaiTotal - (awalItem?.nilaiTotal ?? 0);
                  const isNew = !awalItem || awalItem.nilaiTotal === 0;

                  return (
                    <div
                      key={h.jenis}
                      className={cn(
                        "flex justify-between items-center py-1.5 border-b border-purple-900/30",
                        isNew && "bg-purple-900/20 rounded-lg px-2"
                      )}
                    >
                      <div className="flex items-center gap-1">
                        {isNew && (
                          <span className="text-xs text-purple-400">✦</span>
                        )}
                        <span className="text-xs text-slate-300">{h.namaDisplay}</span>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className="text-xs font-semibold text-green-400 tabular-nums">
                          {formatRupiah(h.nilaiTotal)}
                        </span>
                        {!isNew && selisih !== 0 && (
                          <span
                            className={cn(
                              "text-xs flex items-center gap-0.5",
                              selisih > 0 ? "text-green-400" : "text-red-400"
                            )}
                          >
                            {selisih > 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : selisih < 0 ? (
                              <TrendingDown className="w-3 h-3" />
                            ) : (
                              <Minus className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              {hasilSkenario.hasilPerAhliWaris.filter((h) => h.status === "mendapat_bagian").length === 0 && (
                <p className="text-xs text-slate-500">Tidak ada ahli waris aktif</p>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-4 text-center">
          ✦ = Ahli waris baru dalam skenario ini
        </p>
      </div>
    </motion.section>
  );
}
