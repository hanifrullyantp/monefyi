"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  ShoppingBag,
  TrendingUp,
  Heart,
  CreditCard,
  Wallet,
  PiggyBank,
  ChevronDown,
  Pencil,
  Check,
  X,
  UtensilsCrossed,
  Car,
  Zap,
  MoreHorizontal,
  Star,
} from "lucide-react";
import type { KategoriItem, KategoriTipe } from "@/types/budget-planner";
import {
  formatCurrency,
  formatPercent,
  getProgressColor,
  getStatusAlokasi,
  getStatusLabel,
} from "@/lib/formatters";
import { parseNumberInput } from "@/lib/formatters";
import { cn } from "@/lib/cn";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Home,
  ShoppingBag,
  TrendingUp,
  Heart,
  CreditCard,
  Wallet,
  PiggyBank,
  UtensilsCrossed,
  Car,
  Zap,
  MoreHorizontal,
  Star,
};

const TIPE_BADGE: Record<KategoriTipe, { label: string; color: string; bg: string }> = {
  kebutuhan: { label: "Kebutuhan", color: "#60a5fa", bg: "#1e3a5f" },
  keinginan: { label: "Keinginan", color: "#a78bfa", bg: "#2e1065" },
  tabungan: { label: "Tabungan", color: "#34d399", bg: "#022c22" },
  investasi: { label: "Investasi", color: "#60a5fa", bg: "#1e3a5f" },
  sedekah: { label: "Sedekah/Zakat", color: "#fbbf24", bg: "#451a03" },
  hutang: { label: "Hutang/Donasi", color: "#f87171", bg: "#450a0a" },
};

interface KategoriCardProps {
  item: KategoriItem;
  totalPenghasilan: number;
  onUpdateAlokasi?: (id: string, rupiah: number) => void;
  onUpdateTerpakai?: (id: string, rupiah: number) => void;
  index?: number;
}

export function KategoriCard({
  item,
  totalPenghasilan,
  onUpdateAlokasi,
  onUpdateTerpakai,
  index = 0,
}: KategoriCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingAlokasi, setEditingAlokasi] = useState(false);
  const [editingTerpakai, setEditingTerpakai] = useState(false);
  const [alokasiInput, setAlokasiInput] = useState(
    item.rupiahAlokasi > 0 ? item.rupiahAlokasi.toLocaleString("id-ID") : ""
  );
  const [terpakaiInput, setTerpakaiInput] = useState(
    item.rupiahTerpakai > 0 ? item.rupiahTerpakai.toLocaleString("id-ID") : ""
  );

  const pct =
    item.rupiahAlokasi > 0
      ? Math.min((item.rupiahTerpakai / item.rupiahAlokasi) * 100, 110)
      : 0;
  const pctFromTotal =
    totalPenghasilan > 0
      ? (item.rupiahAlokasi / totalPenghasilan) * 100
      : item.persentaseDefault;

  const status = getStatusAlokasi(
    item.rupiahAlokasi > 0
      ? (item.rupiahTerpakai / item.rupiahAlokasi) * 100
      : 0
  );
  const badge = TIPE_BADGE[item.tipe];
  const Icon = ICON_MAP[item.icon] ?? Home;
  const progressColor = getProgressColor(pct);

  const handleSaveAlokasi = () => {
    const val = parseNumberInput(alokasiInput);
    onUpdateAlokasi?.(item.id, val);
    setEditingAlokasi(false);
  };

  const handleSaveTerpakai = () => {
    const val = parseNumberInput(terpakaiInput);
    onUpdateTerpakai?.(item.id, val);
    setEditingTerpakai(false);
  };

  const handleAlokasiInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const numeric = parseNumberInput(raw);
    setAlokasiInput(numeric > 0 ? numeric.toLocaleString("id-ID") : "");
  };

  const handleTerpakaiInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const numeric = parseNumberInput(raw);
    setTerpakaiInput(numeric > 0 ? numeric.toLocaleString("id-ID") : "");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="rounded-3xl border border-slate-700/50 bg-slate-800/40 p-6 space-y-5 glass-card premium-shadow transition-all duration-300 hover:bg-slate-800/60 hover:border-green-500/30"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${badge.color}20`, border: `1px solid ${badge.color}30` }}
          >
            <Icon size={18} style={{ color: badge.color }} />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">{item.nama}</p>
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: badge.bg, color: badge.color }}
            >
              {badge.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
              status === "aman" && "border-green-700/50 bg-green-900/30 text-green-400",
              status === "perhatian" && "border-amber-700/50 bg-amber-900/30 text-amber-400",
              status === "waspada" && "border-orange-700/50 bg-orange-900/30 text-orange-400",
              status === "batas" && "border-red-700/50 bg-red-900/30 text-red-400",
              status === "overspend" && "border-red-600/70 bg-red-900/50 text-red-400 animate-pulse"
            )}
          >
            {getStatusLabel(status)}
          </span>
        </div>
      </div>

      {/* Alokasi amount */}
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-xs text-slate-400 mb-1">Alokasi</p>
          {editingAlokasi ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={alokasiInput}
                  onChange={handleAlokasiInputChange}
                  className="pl-8 pr-2 py-1.5 w-36 rounded-lg bg-slate-700 border border-green-500 text-white text-sm font-semibold focus:outline-none tabular-nums"
                  autoFocus
                  aria-label="Edit alokasi"
                />
              </div>
              <button
                onClick={handleSaveAlokasi}
                className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
                aria-label="Simpan alokasi"
              >
                <Check size={12} className="text-white" />
              </button>
              <button
                onClick={() => {
                  setEditingAlokasi(false);
                  setAlokasiInput(
                    item.rupiahAlokasi > 0
                      ? item.rupiahAlokasi.toLocaleString("id-ID")
                      : ""
                  );
                }}
                className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center"
                aria-label="Batal edit alokasi"
              >
                <X size={12} className="text-white" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold text-white tabular-nums">
                {formatCurrency(item.rupiahAlokasi)}
              </p>
              {onUpdateAlokasi && (
                <button
                  onClick={() => {
                    setAlokasiInput(
                      item.rupiahAlokasi > 0
                        ? item.rupiahAlokasi.toLocaleString("id-ID")
                        : ""
                    );
                    setEditingAlokasi(true);
                  }}
                  className="opacity-50 hover:opacity-100 transition-opacity"
                  aria-label="Edit alokasi kategori"
                >
                  <Pencil size={12} className="text-slate-400" />
                </button>
              )}
            </div>
          )}
          <p className="text-xs text-slate-500 mt-0.5">
            {formatPercent(pctFromTotal, 0)} dari penghasilan
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-slate-400 mb-1">Terpakai</p>
          {editingTerpakai ? (
            <div className="flex items-center gap-2 justify-end">
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={terpakaiInput}
                  onChange={handleTerpakaiInputChange}
                  className="pl-8 pr-2 py-1.5 w-32 rounded-lg bg-slate-700 border border-blue-500 text-white text-sm font-semibold focus:outline-none tabular-nums"
                  autoFocus
                  aria-label="Edit terpakai"
                />
              </div>
              <button
                onClick={handleSaveTerpakai}
                className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center"
                aria-label="Simpan terpakai"
              >
                <Check size={12} className="text-white" />
              </button>
              <button
                onClick={() => {
                  setEditingTerpakai(false);
                  setTerpakaiInput(
                    item.rupiahTerpakai > 0
                      ? item.rupiahTerpakai.toLocaleString("id-ID")
                      : ""
                  );
                }}
                className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center"
                aria-label="Batal edit terpakai"
              >
                <X size={12} className="text-white" />
              </button>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 justify-end cursor-pointer group"
              onClick={() => {
                if (onUpdateTerpakai) {
                  setTerpakaiInput(
                    item.rupiahTerpakai > 0
                      ? item.rupiahTerpakai.toLocaleString("id-ID")
                      : ""
                  );
                  setEditingTerpakai(true);
                }
              }}
            >
              <p
                className={cn(
                  "text-lg font-semibold tabular-nums",
                  item.rupiahTerpakai > item.rupiahAlokasi
                    ? "text-red-400"
                    : "text-slate-300"
                )}
              >
                {formatCurrency(item.rupiahTerpakai)}
              </p>
              {onUpdateTerpakai && (
                <Pencil
                  size={12}
                  className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              )}
            </div>
          )}
          <p className="text-xs text-slate-500 mt-0.5">{formatPercent(pct, 0)} terpakai</p>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-2.5 bg-slate-700 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.min(pct, 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${item.nama}: ${formatPercent(pct, 0)} terpakai`}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.05 }}
          className={cn("h-full rounded-full transition-colors duration-500", progressColor)}
        />
      </div>

      {/* Expand sub-kategori */}
      {item.subKategori && item.subKategori.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between text-sm text-slate-400 hover:text-slate-300 transition-colors"
            aria-expanded={expanded}
            aria-label={`${expanded ? "Sembunyikan" : "Tampilkan"} sub-kategori ${item.nama}`}
          >
            <span className="text-xs">
              {item.subKategori.length} sub-kategori
            </span>
            <ChevronDown
              size={14}
              className={cn(
                "transition-transform duration-200",
                expanded && "rotate-180"
              )}
            />
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="border-t border-slate-700 pt-3 space-y-2">
                  {item.subKategori.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-900/40"
                    >
                      <span className="text-xs text-slate-300 flex-1">{sub.nama}</span>
                      <span className="text-xs font-medium text-slate-400 tabular-nums">
                        {formatCurrency(sub.rupiah)}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}
