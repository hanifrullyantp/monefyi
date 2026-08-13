"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  Minus,
  Info,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import type { HartaWarisan } from "@/types/hitung-waris";
import { formatRupiah, parseRupiah, formatInputCurrency } from "@/lib/formatters";
import { cn } from "@/lib/cn";

interface HartaWarisanFormProps {
  harta: HartaWarisan;
  onUpdate: (harta: HartaWarisan) => void;
}

interface CurrencyInputProps {
  label: string;
  helperText: string;
  tooltip?: string;
  value: number;
  onChange: (value: number) => void;
  icon?: React.ReactNode;
  colorClass?: string;
}

function CurrencyInput({
  label,
  helperText,
  tooltip,
  value,
  onChange,
  icon,
  colorClass = "text-green-400",
}: CurrencyInputProps) {
  const [inputStr, setInputStr] = useState(() =>
    value > 0 ? formatInputCurrency(value.toString()) : ""
  );
  const [showTooltip, setShowTooltip] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    const num = raw ? parseInt(raw, 10) : 0;
    setInputStr(raw ? formatInputCurrency(raw) : "");
    onChange(num);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        {tooltip && (
          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onFocus={() => setShowTooltip(true)}
              onBlur={() => setShowTooltip(false)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              aria-label={`Info: ${label}`}
            >
              <Info className="w-3.5 h-3.5" />
            </button>
            {showTooltip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 rounded-xl bg-slate-700 border border-slate-600 text-xs text-slate-300 z-50 shadow-xl">
                {tooltip}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">
          {icon ?? "Rp"}
        </div>
        <input
          type="text"
          inputMode="numeric"
          value={inputStr}
          onChange={handleChange}
          placeholder="0"
          className={cn(
            "w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3.5 text-right font-semibold tabular-nums focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600/30 transition-all",
            colorClass
          )}
        />
      </div>
      <p className="text-xs text-slate-500 mt-1.5">{helperText}</p>
    </div>
  );
}

export function HartaWarisanForm({ harta, onUpdate }: HartaWarisanFormProps) {
  const update = useCallback(
    (field: keyof HartaWarisan, value: number) => {
      const updated = { ...harta, [field]: value };
      const hartaBersih = Math.max(
        0,
        updated.totalHarta - updated.hutangAlmarhum - updated.biayaJenazah
      );
      const wasiatMaks = hartaBersih / 3;
      const wasiatFinal = Math.min(updated.nilaiWasiat, wasiatMaks);
      onUpdate({ ...updated, hartaBersih, nilaiWasiat: wasiatFinal });
    },
    [harta, onUpdate]
  );

  const hartaBersih = Math.max(
    0,
    harta.totalHarta - harta.hutangAlmarhum - harta.biayaJenazah
  );
  const wasiatMaksimal = hartaBersih / 3;
  const hartaUntukWaris = Math.max(0, hartaBersih - harta.nilaiWasiat);
  const totalPotongan =
    harta.hutangAlmarhum + harta.biayaJenazah + harta.nilaiWasiat;
  const isOverBudget = totalPotongan > harta.totalHarta;
  const isWasiatOver = harta.nilaiWasiat > wasiatMaksimal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      id="form-harta"
      className="rounded-3xl border border-slate-700 bg-slate-800/50 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-700 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
        >
          <DollarSign className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-xs text-green-400 font-semibold tracking-wider uppercase mb-0.5">
            Step 1
          </div>
          <h3 className="text-xl font-semibold text-white">
            Data Harta Warisan
          </h3>
        </div>
      </div>

      {/* Form */}
      <div className="p-6 grid md:grid-cols-2 gap-6">
        <CurrencyInput
          label="Total Harta Peninggalan"
          helperText="Termasuk semua aset: properti, uang, kendaraan, perhiasan, dll"
          value={harta.totalHarta}
          onChange={(v) => update("totalHarta", v)}
          colorClass="text-green-400"
        />

        <CurrencyInput
          label="Hutang yang Harus Dilunasi"
          helperText="Hutang dilunasi SEBELUM harta dibagi kepada ahli waris"
          tooltip="Hutang termasuk: pinjaman bank, utang pribadi, mahar yang belum dibayar, biaya rumah sakit, dll. Wajib dilunasi sebelum pembagian."
          value={harta.hutangAlmarhum}
          onChange={(v) => update("hutangAlmarhum", v)}
          colorClass="text-red-400"
        />

        <CurrencyInput
          label="Biaya Tajhiz (Perawatan Jenazah)"
          helperText="Biaya kafan, pemakaman, dll (jika belum dibayar)"
          value={harta.biayaJenazah}
          onChange={(v) => update("biayaJenazah", v)}
          colorClass="text-amber-400"
        />

        <CurrencyInput
          label="Wasiat (jika ada)"
          helperText={`Maksimal 1/3 dari harta bersih (${formatRupiah(wasiatMaksimal)})`}
          tooltip="Wasiat tidak boleh melebihi 1/3 harta bersih dan tidak boleh untuk ahli waris. Jika melebihi, otomatis disesuaikan ke batas maksimal."
          value={harta.nilaiWasiat}
          onChange={(v) => update("nilaiWasiat", v)}
          colorClass="text-purple-400"
        />
      </div>

      {/* Warnings */}
      {isWasiatOver && (
        <div className="mx-6 mb-4 p-3 rounded-xl border border-amber-700 bg-amber-900/20 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-300">
            Wasiat melebihi 1/3 harta bersih. Akan otomatis disesuaikan ke{" "}
            {formatRupiah(wasiatMaksimal)}.
          </p>
        </div>
      )}

      {isOverBudget && (
        <div className="mx-6 mb-4 p-3 rounded-xl border border-red-700 bg-red-900/20 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-300">
            Total kewajiban melebihi harta. Harta untuk waris = Rp 0. Ahli
            waris tidak menanggung sisa hutang kecuali secara sukarela.
          </p>
        </div>
      )}

      {/* Summary calculation */}
      <div className="mx-6 mb-6 p-4 rounded-2xl bg-slate-900/70 border border-slate-700">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Ringkasan Kalkulasi
        </h4>
        <div className="space-y-2">
          {[
            {
              label: "Total Harta",
              value: harta.totalHarta,
              color: "text-white",
              prefix: "",
            },
            {
              label: "Hutang Almarhum",
              value: harta.hutangAlmarhum,
              color: "text-red-400",
              prefix: "−",
            },
            {
              label: "Biaya Jenazah",
              value: harta.biayaJenazah,
              color: "text-amber-400",
              prefix: "−",
            },
            {
              label: "Wasiat",
              value: harta.nilaiWasiat,
              color: "text-purple-400",
              prefix: "−",
            },
          ].map((row) => (
            <div key={row.label} className="flex justify-between items-center">
              <span className="text-sm text-slate-400 flex items-center gap-1">
                {row.prefix && (
                  <span className={`font-bold ${row.color}`}>
                    {row.prefix}
                  </span>
                )}
                {row.label}
              </span>
              <span className={`text-sm font-semibold tabular-nums ${row.color}`}>
                {formatRupiah(row.value)}
              </span>
            </div>
          ))}
          <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between items-center">
            <div className="flex items-center gap-1">
              <ChevronRight className="w-4 h-4 text-green-400" />
              <span className="text-sm font-semibold text-white">
                Harta untuk Waris
              </span>
            </div>
            <span className="text-xl font-bold tabular-nums text-green-400">
              {formatRupiah(hartaUntukWaris)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
