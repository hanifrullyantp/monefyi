"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, ChevronDown, RotateCcw, AlertTriangle } from "lucide-react";
import type { BudgetPlan } from "@/types/budget-planner";
import { formatCurrency, parseNumberInput } from "@/lib/formatters";
import { cn } from "@/lib/cn";

interface PenyesuaianManualProps {
  plan: BudgetPlan;
  onUpdateAlokasi: (id: string, rupiah: number) => void;
  onReset: () => void;
}

export function PenyesuaianManual({
  plan,
  onUpdateAlokasi,
  onReset,
}: PenyesuaianManualProps) {
  const [open, setOpen] = useState(false);
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const totalAlokasi = plan.kategori.reduce((s, k) => s + k.rupiahAlokasi, 0);
  const selisih = plan.totalPenghasilan - totalAlokasi;
  const isOver = totalAlokasi > plan.totalPenghasilan;

  const handleInputChange = (id: string, raw: string) => {
    const numeric = parseNumberInput(raw);
    setInputs((prev) => ({
      ...prev,
      [id]: numeric > 0 ? numeric.toLocaleString("id-ID") : "",
    }));
    onUpdateAlokasi(id, numeric);
  };

  const getInputValue = (id: string, defaultVal: number): string => {
    if (id in inputs) return inputs[id];
    return defaultVal > 0 ? defaultVal.toLocaleString("id-ID") : "";
  };

  return (
    <section className="rounded-3xl border border-slate-700 bg-slate-800/30">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-6 md:p-8 text-left"
        aria-expanded={open}
        aria-label="Sesuaikan budget secara manual"
      >
        <div className="flex items-center gap-3">
          <Settings size={18} className="text-slate-400" />
          <div>
            <p className="font-semibold text-white">Sesuaikan Budget Manual</p>
            <p className="text-sm text-slate-400">
              Ubah alokasi setiap kategori sesuai kebutuhan Anda
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
            <div className="px-6 pb-6 md:px-8 md:pb-8 space-y-4 border-t border-slate-700">
              {/* Warning / status */}
              <div
                className={cn(
                  "mt-4 flex items-center justify-between p-3 rounded-xl border text-sm",
                  isOver
                    ? "border-red-700/50 bg-red-900/20 text-red-400"
                    : selisih === 0
                    ? "border-green-700/50 bg-green-900/20 text-green-400"
                    : "border-slate-700 bg-slate-800/50 text-slate-400"
                )}
              >
                <div className="flex items-center gap-2">
                  {isOver && <AlertTriangle size={14} />}
                  <span>
                    {isOver
                      ? `Alokasi melebihi penghasilan sebesar ${formatCurrency(
                          Math.abs(selisih)
                        )}`
                      : selisih === 0
                      ? "Semua penghasilan sudah teralokasikan ✓"
                      : `Sisa belum dialokasikan: ${formatCurrency(selisih)}`}
                  </span>
                </div>
                <span className="font-bold tabular-nums">
                  {formatCurrency(totalAlokasi)} / {formatCurrency(plan.totalPenghasilan)}
                </span>
              </div>

              {/* Sliders / inputs */}
              <div className="space-y-3">
                {plan.kategori.map((k) => {
                  const pct =
                    plan.totalPenghasilan > 0
                      ? (k.rupiahAlokasi / plan.totalPenghasilan) * 100
                      : 0;

                  return (
                    <div key={k.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor={`manual-${k.id}`}
                          className="text-sm font-medium text-white"
                        >
                          {k.nama}
                        </label>
                        <span className="text-xs text-slate-400">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={plan.totalPenghasilan}
                          step={50000}
                          value={k.rupiahAlokasi}
                          onChange={(e) =>
                            onUpdateAlokasi(k.id, parseInt(e.target.value, 10))
                          }
                          className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-slate-700 accent-green-500"
                          aria-label={`Slider alokasi ${k.nama}`}
                        />
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                            Rp
                          </span>
                          <input
                            id={`manual-${k.id}`}
                            type="text"
                            inputMode="numeric"
                            value={getInputValue(k.id, k.rupiahAlokasi)}
                            onChange={(e) =>
                              handleInputChange(k.id, e.target.value)
                            }
                            className="pl-7 pr-2 py-1.5 w-36 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-medium focus:outline-none focus:border-green-500 tabular-nums"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reset */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    setInputs({});
                    onReset();
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-colors text-sm"
                >
                  <RotateCcw size={14} />
                  Reset ke Default
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
