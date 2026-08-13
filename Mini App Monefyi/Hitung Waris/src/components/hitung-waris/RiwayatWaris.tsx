"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChevronDown, Trash2, RotateCcw, Inbox } from "lucide-react";
import type { RiwayatWarisItem } from "@/types/hitung-waris";
import { formatRupiah, formatTanggal } from "@/lib/formatters";
import { cn } from "@/lib/cn";

interface RiwayatWarisProps {
  riwayat: RiwayatWarisItem[];
  onHapus: (id: string) => void;
  onMuat: (id: string) => void;
}

const metodeLabel: Record<string, string> = {
  normal: "Normal",
  aul: "'Aul",
  radd: "Radd",
  gharawain: "Gharawain",
};

const metodeColor: Record<string, string> = {
  normal: "text-green-400 border-green-700 bg-green-900/20",
  aul: "text-amber-400 border-amber-700 bg-amber-900/20",
  radd: "text-blue-400 border-blue-700 bg-blue-900/20",
  gharawain: "text-purple-400 border-purple-700 bg-purple-900/20",
};

export function RiwayatWaris({ riwayat, onHapus, onMuat }: RiwayatWarisProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-3xl border border-slate-700 bg-slate-800/50 overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between hover:bg-slate-800 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #334155 0%, #1e293b 100%)" }}
          >
            <Clock className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-left">
            <h3 className="text-xl font-semibold text-white">
              Riwayat Kalkulasi
            </h3>
            <p className="text-sm text-slate-400">
              {riwayat.length > 0
                ? `${riwayat.length} riwayat tersimpan (maks 10)`
                : "Belum ada riwayat"}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-slate-400 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 border-t border-slate-700">
              {riwayat.length === 0 ? (
                <div className="py-10 flex flex-col items-center gap-3 text-center">
                  <Inbox className="w-10 h-10 text-slate-600" />
                  <p className="text-sm text-slate-500">
                    Belum ada riwayat. Hitung waris dan hasilnya akan tersimpan
                    otomatis.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 mt-5">
                  {riwayat.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-slate-700 bg-slate-900/50 hover:bg-slate-900/70 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-white tabular-nums">
                            {formatRupiah(item.totalHarta)}
                          </span>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-xs border",
                              metodeColor[item.metode] ?? "text-slate-400 border-slate-700"
                            )}
                          >
                            {metodeLabel[item.metode] ?? item.metode}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-1">
                          {item.jumlahAhliWaris} ahli waris •{" "}
                          {formatTanggal(item.tanggal)}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {item.ringkasan}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => onMuat(item.id)}
                          className="p-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
                          aria-label="Muat riwayat ini"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onHapus(item.id)}
                          className="p-2 rounded-xl border border-red-900/50 text-red-500 hover:text-red-400 hover:border-red-700 transition-colors"
                          aria-label="Hapus riwayat ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
