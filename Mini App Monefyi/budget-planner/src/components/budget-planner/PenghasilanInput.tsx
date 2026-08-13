"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, User, Calendar, Info, AlertTriangle, ChevronDown } from "lucide-react";
import type { ProfilKeuangan } from "@/types/budget-planner";
import { formatCurrency, parseNumberInput, getBracketPenghasilan, getCurrentMonth, formatMonth } from "@/lib/formatters";
import { cn } from "@/lib/cn";

interface PenghasilanInputProps {
  profil: ProfilKeuangan;
  onUpdate: (partial: Partial<ProfilKeuangan>) => void;
}

function CurrencyInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  helperText,
  required,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(
    value > 0 ? value.toLocaleString("id-ID") : ""
  );

  useEffect(() => {
    if (value > 0) {
      setDisplayValue(value.toLocaleString("id-ID"));
    } else {
      setDisplayValue("");
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const numeric = parseNumberInput(raw);
    setDisplayValue(numeric > 0 ? numeric.toLocaleString("id-ID") : "");
    onChange(numeric);
  };

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-300"
      >
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">
          Rp
        </span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder ?? "0"}
          aria-required={required}
          className={cn(
            "w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700",
            "text-white font-semibold tabular-nums text-lg",
            "placeholder:text-slate-600 placeholder:font-normal placeholder:text-base",
            "focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50",
            "transition-all duration-200"
          )}
        />
      </div>
      {helperText && (
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <Info size={10} className="shrink-0" />
          {helperText}
        </p>
      )}
    </div>
  );
}

export function PenghasilanInput({ profil, onUpdate }: PenghasilanInputProps) {
  const total = profil.penghasilanBulanan + profil.penghasilanTambahan;
  const bracket = getBracketPenghasilan(total);
  const isSmallIncome =
    profil.penghasilanBulanan > 0 && profil.penghasilanBulanan < 500_000;

  // Generate month options (current month + 11 next)
  const monthOptions: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -1; i <= 11; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const val = `${y}-${m}`;
    monthOptions.push({ value: val, label: formatMonth(val) });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-3xl border border-slate-700 bg-slate-800/50 p-5 md:p-8 space-y-6 overflow-hidden"
      id="step-1"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
          1
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">
            Masukkan Penghasilan Anda
          </h2>
          <p className="text-sm text-slate-400">
            Data ini hanya tersimpan di browser Anda
          </p>
        </div>
      </div>

      {/* Fields */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Nama */}
        <div className="space-y-2">
          <label
            htmlFor="nama-pengguna"
            className="block text-sm font-semibold text-slate-300"
          >
            <User size={16} className="inline mr-2 text-green-500" />
            Nama Panggilan
            <span className="text-slate-500 ml-2 text-xs font-normal">(opsional)</span>
          </label>
          <input
            id="nama-pengguna"
            type="text"
            value={profil.namaPengguna}
            onChange={(e) => onUpdate({ namaPengguna: e.target.value })}
            placeholder="Contoh: Budi"
            maxLength={30}
            className={cn(
              "w-full px-5 py-3.5 rounded-2xl bg-slate-900/60 border border-slate-700/50",
              "text-white placeholder:text-slate-600 font-medium",
              "focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10",
              "transition-all duration-300"
            )}
          />
        </div>

        {/* Bulan */}
        <div className="space-y-2">
          <label
            htmlFor="bulan-budget"
            className="block text-sm font-semibold text-slate-300"
          >
            <Calendar size={16} className="inline mr-2 text-green-500" />
            Untuk Bulan
          </label>
          <div className="relative">
            <select
              id="bulan-budget"
              value={profil.bulanAktif}
              onChange={(e) => onUpdate({ bulanAktif: e.target.value })}
              className={cn(
                "w-full px-5 py-3.5 rounded-2xl bg-slate-900/60 border border-slate-700/50 appearance-none",
                "text-white font-medium",
                "focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10",
                "transition-all duration-300 cursor-pointer"
              )}
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-slate-900">
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Currency inputs */}
      <div className="grid gap-4 md:grid-cols-2">
        <CurrencyInput
          id="penghasilan-utama"
          label="Gaji / Penghasilan Utama"
          value={profil.penghasilanBulanan}
          onChange={(val) => onUpdate({ penghasilanBulanan: val })}
          placeholder="Masukkan penghasilan utama"
          helperText="Gunakan penghasilan bersih (take-home pay) setelah pajak"
          required
        />
        <CurrencyInput
          id="penghasilan-tambahan"
          label="Penghasilan Tambahan"
          value={profil.penghasilanTambahan}
          onChange={(val) => onUpdate({ penghasilanTambahan: val })}
          placeholder="Freelance, bisnis, dll"
          helperText="Jika tidak tentu, masukkan rata-rata 3 bulan terakhir"
        />
      </div>

      {/* Warning for small income */}
      {isSmallIncome && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex items-start gap-3 rounded-xl border border-amber-700/50 bg-amber-900/20 p-4"
        >
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300">
            Penghasilan sangat kecil. Budget mungkin tidak optimal.
            Fokus pada kebutuhan paling mendasar.
          </p>
        </motion.div>
      )}

      {/* Total display */}
      {total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-green-800/40 bg-green-900/20 p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-green-400" />
              <span className="text-sm font-medium text-slate-300">
                Total Penghasilan Bulan Ini
              </span>
            </div>
            {profil.penghasilanTambahan > 0 && (
              <span className="text-xs text-green-400 bg-green-900/40 px-2 py-0.5 rounded-full">
                +{formatCurrency(profil.penghasilanTambahan)} tambahan
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-white tabular-nums">
            {formatCurrency(total)}
          </p>
          {bracket && (
            <p className="text-sm text-green-400 mt-2 flex items-center gap-1.5">
              <Info size={12} />
              {bracket}
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
