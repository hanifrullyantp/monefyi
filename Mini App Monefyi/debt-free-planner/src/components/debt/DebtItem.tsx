// src/components/debt/DebtItem.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  GripVertical, Trash2, ChevronDown, ChevronUp, Info, AlertTriangle,
  CreditCard, Banknote, ShoppingBag, Home, Car, Smartphone,
  Building2, Users, Heart, MoreHorizontal,
} from "lucide-react";
import type { DebtItem as DebtItemType, DebtType } from "@/types";
import { DEBT_TYPES_INFO } from "@/lib/debt-calculator";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InputCurrency } from "@/components/ui/InputCurrency";
import { InputPercent } from "@/components/ui/InputPercent";
import { InputText } from "@/components/ui/InputText";
import { InputNumber } from "@/components/ui/InputNumber";
import { SelectInput } from "@/components/ui/SelectInput";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/cn";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  CreditCard, Banknote, ShoppingBag, Home, Car, Smartphone,
  Building2, Users, Heart, MoreHorizontal,
};

const DEBT_TYPE_OPTIONS = Object.entries(DEBT_TYPES_INFO).map(([value, info]) => ({
  value,
  label: info.label,
}));

interface DebtItemProps {
  debt: DebtItemType;
  onUpdate: (id: string, data: Partial<DebtItemType>) => void;
  onRemove: (id: string) => void;
  index: number;
}

export function DebtItem({ debt, onUpdate, onRemove, index }: DebtItemProps) {
  const [isExpanded, setIsExpanded] = useState(index === 0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const info = DEBT_TYPES_INFO[debt.jenis];
  const Icon = ICON_MAP[info?.icon] ?? MoreHorizontal;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!debt.nama.trim()) errs.nama = "Nama hutang wajib diisi";
    if (debt.totalHutang <= 0) errs.totalHutang = "Total hutang harus lebih dari 0";
    if (debt.cicilanMinimum <= 0) errs.cicilanMinimum = "Cicilan minimum harus lebih dari 0";
    if (debt.cicilanMinimum > debt.totalHutang)
      errs.cicilanMinimum = "Cicilan tidak boleh melebihi total hutang";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleUpdate = <K extends keyof DebtItemType>(field: K, value: DebtItemType[K]) => {
    onUpdate(debt.id, { [field]: value });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const urgencyLabel: Record<string, string> = {
    kritis: "Kritis",
    tinggi: "Tinggi",
    sedang: "Sedang",
    rendah: "Rendah",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0">
          <GripVertical size={18} />
        </div>

        <div
          className={cn(
            "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center",
            debt.urgency === "kritis" ? "bg-red-500/20" :
            debt.urgency === "tinggi" ? "bg-red-800/20" :
            debt.urgency === "sedang" ? "bg-amber-500/20" :
            "bg-blue-500/20"
          )}
        >
          <Icon
            size={18}
            className={
              debt.urgency === "kritis" ? "text-red-400" :
              debt.urgency === "tinggi" ? "text-red-300" :
              debt.urgency === "sedang" ? "text-amber-400" :
              "text-blue-400"
            }
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm truncate">
              {debt.nama || "Hutang Baru"}
            </span>
            <Badge variant="urgency" urgency={debt.urgency} dot>
              {urgencyLabel[debt.urgency]}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-slate-500">{info?.label}</span>
            {debt.totalHutang > 0 && (
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {formatCurrency(debt.totalHutang)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Hapus "${debt.nama}"?`)) onRemove(debt.id);
            }}
            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 size={15} />
          </button>
          <div className="text-slate-500">
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </div>

      {/* Body */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="px-4 pb-4 border-t border-slate-700/40"
        >
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputText
              label="Nama Hutang"
              value={debt.nama}
              onChange={(e) => handleUpdate("nama", e.target.value)}
              placeholder="Cth: KTA BCA, Kartu Kredit Mandiri"
              error={errors.nama}
            />

            <SelectInput
              label="Jenis Hutang"
              value={debt.jenis}
              onChange={(v) => {
                const jenis = v as DebtType;
                handleUpdate("jenis", jenis);
                if (DEBT_TYPES_INFO[jenis]?.bungaTipikal > 0 && debt.bungaPerBulan === 0) {
                  handleUpdate("bungaPerBulan", DEBT_TYPES_INFO[jenis].bungaTipikal);
                }
              }}
              options={DEBT_TYPE_OPTIONS}
            />

            <InputCurrency
              label="Total Sisa Hutang"
              value={debt.totalHutang}
              onChange={(v) => handleUpdate("totalHutang", v)}
              error={errors.totalHutang}
              helper="Sisa pokok hutang saat ini"
            />

            <InputPercent
              label="Bunga per Bulan (%)"
              value={debt.bungaPerBulan}
              onChange={(v) => handleUpdate("bungaPerBulan", v)}
              min={0}
              max={50}
              step={0.01}
              helper={`Tipikal ${info?.label}: ${info?.bungaTipikal}%/bulan`}
            />

            <InputCurrency
              label="Cicilan Minimum per Bulan"
              value={debt.cicilanMinimum}
              onChange={(v) => handleUpdate("cicilanMinimum", v)}
              error={errors.cicilanMinimum}
            />

            <InputNumber
              label="Tenor Sisa (bulan)"
              value={debt.tenorSisa ?? 0}
              onChange={(v) => handleUpdate("tenorSisa", v || undefined)}
              suffix="bulan"
              min={0}
              placeholder="Opsional"
            />

            <div className="sm:col-span-2">
              <InputText
                label="Catatan (opsional)"
                value={debt.catatan ?? ""}
                onChange={(e) => handleUpdate("catatan", e.target.value || undefined)}
                placeholder="Nomor rekening, nama bank, dll"
              />
            </div>
          </div>

          {/* Tips */}
          {info?.tips && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <Info size={15} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-300">{info.tips}</p>
            </div>
          )}

          {/* Urgency warning */}
          {debt.urgency === "kritis" && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border-l-2 border-red-500">
              <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">
                Hutang berbunga sangat tinggi! Prioritaskan pelunasan segera.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
