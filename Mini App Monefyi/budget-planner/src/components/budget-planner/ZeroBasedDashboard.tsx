"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Target,
  Check,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import type { ZeroBudgetState, KategoriTipe } from "@/types/budget-planner";
import { formatCurrency, parseNumberInput } from "@/lib/formatters";
import { cn } from "@/lib/cn";

const TIPE_OPTIONS: { value: KategoriTipe; label: string }[] = [
  { value: "kebutuhan", label: "Kebutuhan" },
  { value: "keinginan", label: "Keinginan" },
  { value: "tabungan", label: "Tabungan" },
  { value: "investasi", label: "Investasi" },
  { value: "sedekah", label: "Sedekah" },
  { value: "hutang", label: "Hutang" },
];

interface ZeroBasedDashboardProps {
  state: ZeroBudgetState;
  onUpdateAlokasi: (id: string, rupiah: number) => void;
  onAddKategori: (nama: string, tipe: KategoriTipe) => void;
  onRemoveKategori: (id: string) => void;
}

export function ZeroBasedDashboard({
  state,
  onUpdateAlokasi,
  onAddKategori,
  onRemoveKategori,
}: ZeroBasedDashboardProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNama, setNewNama] = useState("");
  const [newTipe, setNewTipe] = useState<KategoriTipe>("kebutuhan");
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [celebrate, setCelebrate] = useState(false);

  const handleInputChange = (id: string, raw: string) => {
    const numeric = parseNumberInput(raw);
    setInputValues((prev) => ({
      ...prev,
      [id]: numeric > 0 ? numeric.toLocaleString("id-ID") : "",
    }));
    onUpdateAlokasi(id, numeric);

    // Check if balanced after update
    if (Math.abs(state.sisaAlokasi - numeric) < 1) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 2000);
    }
  };

  const getInputVal = (id: string, defaultVal: number): string => {
    if (id in inputValues) return inputValues[id];
    return defaultVal > 0 ? defaultVal.toLocaleString("id-ID") : "";
  };

  const handleAdd = () => {
    if (!newNama.trim()) return;
    onAddKategori(newNama.trim(), newTipe);
    setNewNama("");
    setNewTipe("kebutuhan");
    setShowAddForm(false);
  };

  const isOver = state.sisaAlokasi < 0;
  const isBalanced = state.isBalanced;

  return (
    <div className="space-y-4">
      {/* Status counter */}
      <motion.div
        animate={
          celebrate
            ? { scale: [1, 1.05, 1], transition: { duration: 0.4 } }
            : {}
        }
        className={cn(
          "rounded-2xl border p-4 flex items-center justify-between",
          isBalanced
            ? "border-green-700/50 bg-green-900/20"
            : isOver
            ? "border-red-700/50 bg-red-900/20"
            : "border-amber-700/50 bg-amber-900/20"
        )}
        aria-live="polite"
      >
        <div className="flex items-center gap-3">
          {isBalanced ? (
            <Sparkles size={18} className="text-green-400" />
          ) : (
            <AlertTriangle
              size={18}
              className={isOver ? "text-red-400" : "text-amber-400"}
            />
          )}
          <div>
            <p
              className={cn(
                "font-semibold text-sm",
                isBalanced
                  ? "text-green-400"
                  : isOver
                  ? "text-red-400"
                  : "text-amber-400"
              )}
            >
              {isBalanced
                ? "Sempurna! Semua penghasilan sudah dialokasikan 🎉"
                : isOver
                ? `Alokasi melebihi penghasilan sebesar ${formatCurrency(
                    Math.abs(state.sisaAlokasi)
                  )}`
                : `${formatCurrency(state.sisaAlokasi)} lagi yang perlu dialokasikan`}
            </p>
            <p className="text-xs text-slate-400">
              Target: {formatCurrency(state.totalPenghasilan)} — Teralokasi:{" "}
              {formatCurrency(state.totalAlokasi)}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums">
            <span
              className={
                isBalanced
                  ? "text-green-400"
                  : isOver
                  ? "text-red-400"
                  : "text-amber-400"
              }
            >
              {isOver ? "-" : ""}
              {formatCurrency(Math.abs(state.sisaAlokasi))}
            </span>
          </p>
          <p className="text-xs text-slate-500">sisa</p>
        </div>
      </motion.div>

      {/* Category list */}
      <div className="space-y-2">
        {state.kategori.map((k) => (
          <motion.div
            key={k.id}
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-700 bg-slate-800/50"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{k.nama}</p>
              <p className="text-xs text-slate-500">{k.tipe}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={getInputVal(k.id, k.rupiahAlokasi)}
                  onChange={(e) => handleInputChange(k.id, e.target.value)}
                  className="pl-7 pr-2 py-1.5 w-36 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm font-medium focus:outline-none focus:border-green-500 tabular-nums"
                  aria-label={`Alokasi ${k.nama}`}
                />
              </div>

              {k.isCustom && (
                <button
                  onClick={() => onRemoveKategori(k.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                  aria-label={`Hapus kategori ${k.nama}`}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add category */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-2xl border border-dashed border-green-700/50 bg-green-900/10 space-y-3">
              <p className="text-sm font-medium text-white">Tambah Kategori Baru</p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="Nama kategori..."
                  className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-green-500 placeholder:text-slate-600"
                  aria-label="Nama kategori baru"
                />
                <select
                  value={newTipe}
                  onChange={(e) => setNewTipe(e.target.value as KategoriTipe)}
                  className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-green-500 cursor-pointer"
                  aria-label="Tipe kategori baru"
                >
                  {TIPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value} className="bg-slate-800">
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={!newNama.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Check size={14} />
                  Tambah
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-sm transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-slate-700 text-slate-400 hover:text-green-400 hover:border-green-700/50 transition-colors text-sm"
        >
          <Plus size={16} />
          Tambah Kategori
        </button>
      )}

      {/* Prinsip info */}
      <div className="flex items-center gap-2 p-3 rounded-xl border border-slate-700/50 bg-slate-900/30">
        <Target size={14} className="text-slate-500 shrink-0" />
        <p className="text-xs text-slate-500">
          Prinsip Zero-Based: Total Penghasilan − Total Alokasi = Rp 0.
          Setiap rupiah harus punya tujuan.
        </p>
      </div>
    </div>
  );
}
