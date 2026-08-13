"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart,
  Heart,
  Zap,
  Target,
  Mail,
  Check,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import type { MetodeBudget } from "@/types/budget-planner";
import { METODE_LIST } from "@/lib/budget-data";
import { cn } from "@/lib/cn";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICONS: Record<string, React.ComponentType<any>> = {
  PieChart,
  Heart,
  Zap,
  Target,
  Mail,
};

interface MetodeSelectorProps {
  selected: MetodeBudget;
  onSelect: (m: MetodeBudget) => void;
}

export function MetodeSelector({ selected, onSelect }: MetodeSelectorProps) {
  const [expanded, setExpanded] = useState<MetodeBudget | null>(selected);
  const selectedMetode = METODE_LIST.find((m) => m.id === selected);

  const handleSelect = (id: MetodeBudget) => {
    onSelect(id);
    setExpanded(id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="rounded-3xl border border-slate-700 bg-slate-800/50 p-5 md:p-8 space-y-6 overflow-hidden"
      id="step-2"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
          2
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">
            Pilih Metode Budget
          </h2>
          <p className="text-sm text-slate-400">
            Geser untuk melihat semua metode
          </p>
        </div>
      </div>

      {/* Method cards — horizontal scroll on mobile */}
      <div className="flex gap-4 overflow-x-auto pb-6 px-1 -mx-1 snap-x snap-mandatory md:grid md:grid-cols-5 md:overflow-visible md:pb-0">
        {METODE_LIST.map((metode) => {
          const Icon = ICONS[metode.icon] ?? PieChart;
          const isActive = selected === metode.id;

          return (
            <motion.button
              key={metode.id}
              onClick={() => handleSelect(metode.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={cn(
                "relative shrink-0 w-44 md:w-auto snap-center flex flex-col gap-3 p-4 rounded-2xl border text-left",
                "transition-all duration-200 cursor-pointer",
                isActive
                  ? "border-green-500 bg-green-900/20"
                  : "border-slate-700 bg-slate-800/40 hover:border-green-600/50"
              )}
              aria-pressed={isActive}
              aria-label={`Pilih metode ${metode.nama}`}
            >
              {/* Checkmark */}
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
                >
                  <Check size={12} className="text-white" />
                </motion.div>
              )}

              {/* Icon */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${metode.warna}20`, border: `1px solid ${metode.warna}40` }}
              >
                <Icon size={18} style={{ color: metode.warna }} />
              </div>

              {/* Name */}
              <div>
                <p className="font-semibold text-white text-sm">{metode.nama}</p>
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${metode.warna}20`,
                    color: metode.warna,
                  }}
                >
                  {metode.tag}
                </span>
              </div>

              {/* Mini allocation bar */}
              <div className="space-y-1">
                {metode.alokasi.slice(0, 3).map((alloc) => (
                  <div key={alloc.label} className="flex items-center gap-1.5">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${alloc.persentase}%`,
                        maxWidth: "80%",
                        backgroundColor: alloc.warna,
                      }}
                    />
                    <span className="text-[9px] text-slate-400">
                      {alloc.persentase}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Description */}
              <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
                {metode.deskripsi}
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {selectedMetode && (
          <motion.div
            key={selectedMetode.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-5 space-y-4">
              <button
                onClick={() =>
                  setExpanded(expanded === selectedMetode.id ? null : selectedMetode.id)
                }
                className="w-full flex items-center justify-between text-left"
                aria-expanded={expanded === selectedMetode.id}
              >
                <div>
                  <h3 className="font-semibold text-white">
                    Detail Metode {selectedMetode.nama}
                  </h3>
                  <p className="text-sm text-slate-400">
                    Cocok untuk: {selectedMetode.cocokUntuk}
                  </p>
                </div>
                {expanded === selectedMetode.id ? (
                  <ChevronUp size={16} className="text-slate-400" />
                ) : (
                  <ChevronDown size={16} className="text-slate-400" />
                )}
              </button>

              <AnimatePresence>
                {expanded === selectedMetode.id && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {/* Allocation breakdown */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Alokasi
                      </p>
                      <div className="space-y-2">
                        {selectedMetode.alokasi.map((alloc) => (
                          <div key={alloc.label} className="flex items-center gap-3">
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: alloc.warna }}
                            />
                            <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${alloc.persentase}%` }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: alloc.warna }}
                              />
                            </div>
                            <span className="text-sm font-medium text-white w-10 text-right">
                              {alloc.persentase}%
                            </span>
                            <span className="text-sm text-slate-400 min-w-24">
                              {alloc.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Kelebihan & Kekurangan */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-green-400 uppercase tracking-wider flex items-center gap-1">
                          <ThumbsUp size={10} />
                          Kelebihan
                        </p>
                        <ul className="space-y-1">
                          {selectedMetode.kelebihan.map((k) => (
                            <li key={k} className="text-sm text-slate-300 flex items-start gap-2">
                              <span className="text-green-400 mt-0.5 shrink-0">✓</span>
                              {k}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-red-400 uppercase tracking-wider flex items-center gap-1">
                          <ThumbsDown size={10} />
                          Kekurangan
                        </p>
                        <ul className="space-y-1">
                          {selectedMetode.kekurangan.map((k) => (
                            <li key={k} className="text-sm text-slate-300 flex items-start gap-2">
                              <span className="text-red-400 mt-0.5 shrink-0">✗</span>
                              {k}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
