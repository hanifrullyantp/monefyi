"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, ChevronDown, Trash2, Save, Eye, Calendar } from "lucide-react";
import type { RiwayatItem } from "@/types/budget-planner";
import {
  formatCurrency,
  formatPercent,
  getStatusLabel,
  getStatusAlokasi,
} from "@/lib/formatters";
import { loadFromStorage, removeFromStorage, saveToStorage, STORAGE_KEYS } from "@/lib/localStorage";
import { cn } from "@/lib/cn";

interface RiwayatBudgetProps {
  onSave: () => void;
  onLoad?: (riwayat: RiwayatItem) => void;
}

function getMonthName(bulan: string, tahun: number): string {
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const monthIdx = parseInt(bulan, 10) - 1;
  return `${months[monthIdx] ?? bulan} ${tahun}`;
}

export function RiwayatBudget({ onSave, onLoad }: RiwayatBudgetProps) {
  const [open, setOpen] = useState(false);
  const [riwayat, setRiwayat] = useState<RiwayatItem[]>([]);
  const [justSaved, setJustSaved] = useState(false);

  const loadRiwayat = () => {
    const data = loadFromStorage<RiwayatItem[]>(STORAGE_KEYS.HISTORY, []);
    setRiwayat(data);
  };

  useEffect(() => {
    if (open) loadRiwayat();
  }, [open]);

  const handleDelete = (id: string) => {
    const updated = riwayat.filter((r) => r.id !== id);
    setRiwayat(updated);
    saveToStorage(STORAGE_KEYS.HISTORY, updated);
  };

  const handleClearAll = () => {
    setRiwayat([]);
    removeFromStorage(STORAGE_KEYS.HISTORY);
  };

  const handleSave = () => {
    onSave();
    setJustSaved(true);
    setTimeout(() => {
      setJustSaved(false);
      loadRiwayat();
    }, 1500);
  };

  const statusColorMap: Record<string, string> = {
    aman: "text-green-400 bg-green-900/30 border-green-700/50",
    perhatian: "text-amber-400 bg-amber-900/30 border-amber-700/50",
    waspada: "text-orange-400 bg-orange-900/30 border-orange-700/50",
    batas: "text-red-400 bg-red-900/30 border-red-700/50",
    overspend: "text-red-400 bg-red-900/40 border-red-600/70",
  };

  return (
    <section className="rounded-3xl border border-slate-700 bg-slate-800/30">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-6 md:p-8 text-left"
        aria-expanded={open}
        aria-label="Lihat riwayat budget"
      >
        <div className="flex items-center gap-3">
          <History size={18} className="text-slate-400" />
          <div>
            <p className="font-semibold text-white">Riwayat Budget</p>
            <p className="text-sm text-slate-400">
              Simpan dan lihat budget bulan-bulan sebelumnya
            </p>
          </div>
        </div>
        <ChevronDown
          size={18}
          className={cn(
            "text-slate-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 md:px-8 md:pb-8 border-t border-slate-700 space-y-4">
              {/* Save button */}
              <div className="pt-4 flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  {riwayat.length} budget tersimpan (maks. 12)
                </p>
                <button
                  onClick={handleSave}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                    justSaved
                      ? "bg-green-500 text-white"
                      : "bg-green-600 hover:bg-green-500 text-white"
                  )}
                >
                  <Save size={14} />
                  {justSaved ? "Tersimpan! ✓" : "Simpan Budget Bulan Ini"}
                </button>
              </div>

              {/* Empty state */}
              {riwayat.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <Calendar size={32} className="text-slate-600 mx-auto" />
                  <p className="text-slate-400 font-medium">
                    Belum ada riwayat budget.
                  </p>
                  <p className="text-sm text-slate-500">
                    Simpan budget bulan ini untuk memulai riwayat.
                  </p>
                </div>
              ) : (
                <>
                  {/* Riwayat list */}
                  <div className="space-y-3">
                    {riwayat.map((r, i) => {
                      const status = getStatusAlokasi(r.persentaseTerpakai);
                      const statusClass =
                        statusColorMap[status] ?? statusColorMap.aman ?? "";

                      return (
                        <motion.div
                          key={r.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-white text-sm">
                                {getMonthName(r.bulan, r.tahun)}
                              </p>
                              <p className="text-xs text-slate-400">
                                Penghasilan: {formatCurrency(r.totalPenghasilan)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                                  statusClass
                                )}
                              >
                                {getStatusLabel(status)}
                              </span>
                              {onLoad && (
                                <button
                                  onClick={() => onLoad(r)}
                                  className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
                                  aria-label="Lihat detail riwayat"
                                >
                                  <Eye size={12} />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(r.id)}
                                className="p-1.5 rounded-lg bg-slate-700 hover:bg-red-900/50 text-slate-400 hover:text-red-400 transition-colors"
                                aria-label="Hapus riwayat"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Mini progress */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">
                                Terpakai: {formatCurrency(r.totalTerpakai)}
                              </span>
                              <span className="text-xs text-slate-500">
                                {formatPercent(r.persentaseTerpakai, 0)}
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  status === "aman" && "bg-green-500",
                                  status === "perhatian" && "bg-amber-500",
                                  status === "waspada" && "bg-orange-500",
                                  (status === "batas" || status === "overspend") &&
                                    "bg-red-500"
                                )}
                                style={{
                                  width: `${Math.min(r.persentaseTerpakai, 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Clear all */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleClearAll}
                      className="text-xs text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      Hapus semua riwayat
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
