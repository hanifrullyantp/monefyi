"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ChevronDown, Info, Plus, Minus, AlertCircle } from "lucide-react";
import type { AhliWarisInput, JenisAhliWaris } from "@/types/hitung-waris";
import { AHLI_WARIS_INFO } from "@/lib/waris-data";
import { cn } from "@/lib/cn";

interface AhliWarisFormProps {
  ahliWaris: AhliWarisInput[];
  onToggle: (jenis: JenisAhliWaris, isAda: boolean) => void;
  onUpdateJumlah: (jenis: JenisAhliWaris, jumlah: number) => void;
}

interface Group {
  label: string;
  items: JenisAhliWaris[];
}

const GROUPS: Group[] = [
  {
    label: "Pasangan",
    items: ["suami", "istri"],
  },
  {
    label: "Keturunan",
    items: [
      "anak_laki",
      "anak_perempuan",
      "cucu_laki_dari_anak_laki",
      "cucu_perempuan_dari_anak_laki",
    ],
  },
  {
    label: "Orang Tua & Kakek-Nenek",
    items: [
      "ayah",
      "ibu",
      "kakek",
      "nenek_dari_ibu",
      "nenek_dari_ayah",
    ],
  },
  {
    label: "Saudara",
    items: [
      "saudara_kandung_laki",
      "saudara_kandung_perempuan",
      "saudara_sebapak_laki",
      "saudara_sebapak_perempuan",
      "saudara_seibu_laki",
      "saudara_seibu_perempuan",
    ],
  },
];

interface AhliWarisItemProps {
  input: AhliWarisInput;
  onToggle: (jenis: JenisAhliWaris, isAda: boolean) => void;
  onUpdateJumlah: (jenis: JenisAhliWaris, jumlah: number) => void;
  isDisabled?: boolean;
  disabledReason?: string;
}

function AhliWarisItem({
  input,
  onToggle,
  onUpdateJumlah,
  isDisabled,
  disabledReason,
}: AhliWarisItemProps) {
  const [showInfo, setShowInfo] = useState(false);
  const info = AHLI_WARIS_INFO[input.jenis];

  const maxJumlah = info.maxJumlah ?? 99;
  const minJumlah = info.minJumlah ?? 1;

  return (
    <motion.div
      layout
      className={cn(
        "rounded-xl border p-3 transition-all duration-200",
        input.isAda
          ? "border-green-700/60 bg-green-950/20"
          : "border-slate-700 bg-slate-900/30",
        isDisabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          type="button"
          onClick={() => !isDisabled && onToggle(input.jenis, !input.isAda)}
          disabled={isDisabled}
          className={cn(
            "w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all",
            input.isAda
              ? "bg-green-500 border-green-500"
              : "border-slate-600 hover:border-green-600"
          )}
          aria-label={`${input.isAda ? "Hapus" : "Tambah"} ${info.namaDisplay}`}
          aria-checked={input.isAda}
          role="checkbox"
        >
          {input.isAda && (
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </button>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "text-sm font-medium truncate",
                input.isAda ? "text-white" : "text-slate-300"
              )}
            >
              {info.namaDisplay}
            </span>
            <button
              type="button"
              onClick={() => setShowInfo(!showInfo)}
              className="text-slate-500 hover:text-blue-400 transition-colors flex-shrink-0"
              aria-label={`Info tentang ${info.namaDisplay}`}
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Info tooltip */}
          <AnimatePresence>
            {showInfo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 p-2.5 rounded-lg bg-blue-950/50 border border-blue-800/50">
                  <p className="text-xs text-blue-300 font-semibold mb-1">
                    Bagian:
                  </p>
                  <p className="text-xs text-slate-300">{info.bagianDefault}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {info.kondisiMendapat}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {disabledReason && (
            <p className="text-xs text-amber-400 mt-1">{disabledReason}</p>
          )}
        </div>

        {/* Jumlah counter */}
        <AnimatePresence>
          {input.isAda && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5 flex-shrink-0"
            >
              <button
                type="button"
                onClick={() =>
                  onUpdateJumlah(input.jenis, Math.max(minJumlah, input.jumlah - 1))
                }
                disabled={input.jumlah <= minJumlah}
                className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 flex items-center justify-center transition-colors"
                aria-label={`Kurangi jumlah ${info.namaDisplay}`}
              >
                <Minus className="w-3 h-3 text-slate-300" />
              </button>
              <span className="w-8 text-center text-sm font-bold text-white tabular-nums">
                {input.jumlah}
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateJumlah(input.jenis, Math.min(maxJumlah, input.jumlah + 1))
                }
                disabled={input.jumlah >= maxJumlah}
                className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 flex items-center justify-center transition-colors"
                aria-label={`Tambah jumlah ${info.namaDisplay}`}
              >
                <Plus className="w-3 h-3 text-slate-300" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

interface AccordionGroupProps {
  label: string;
  items: JenisAhliWaris[];
  ahliWaris: AhliWarisInput[];
  onToggle: (jenis: JenisAhliWaris, isAda: boolean) => void;
  onUpdateJumlah: (jenis: JenisAhliWaris, jumlah: number) => void;
  adaSuami: boolean;
  adaIstri: boolean;
}

function AccordionGroup({
  label,
  items,
  ahliWaris,
  onToggle,
  onUpdateJumlah,
  adaSuami,
  adaIstri,
}: AccordionGroupProps) {
  const [open, setOpen] = useState(true);

  const activeCount = items.filter((jenis) => {
    const aw = ahliWaris.find((a) => a.jenis === jenis);
    return aw?.isAda;
  }).length;

  return (
    <div className="rounded-2xl border border-slate-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-slate-800/70 hover:bg-slate-800 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-200">{label}</span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-green-900/50 text-green-400 border border-green-700/50">
              {activeCount} dipilih
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-slate-400 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 grid sm:grid-cols-2 gap-2 bg-slate-900/30">
              {items.map((jenis) => {
                const aw = ahliWaris.find((a) => a.jenis === jenis);
                if (!aw) return null;

                let isDisabled = false;
                let disabledReason: string | undefined;

                if (jenis === "suami" && adaIstri) {
                  isDisabled = true;
                  disabledReason = "Tidak bisa bersama istri";
                }
                if (jenis === "istri" && adaSuami) {
                  isDisabled = true;
                  disabledReason = "Tidak bisa bersama suami";
                }

                return (
                  <AhliWarisItem
                    key={jenis}
                    input={aw}
                    onToggle={onToggle}
                    onUpdateJumlah={onUpdateJumlah}
                    isDisabled={isDisabled}
                    disabledReason={disabledReason}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AhliWarisForm({
  ahliWaris,
  onToggle,
  onUpdateJumlah,
}: AhliWarisFormProps) {
  const adaSuami = ahliWaris.find((a) => a.jenis === "suami")?.isAda ?? false;
  const adaIstri = ahliWaris.find((a) => a.jenis === "istri")?.isAda ?? false;

  const totalAktif = ahliWaris.filter((a) => a.isAda).length;
  const namaAktif = ahliWaris
    .filter((a) => a.isAda)
    .map((a) => AHLI_WARIS_INFO[a.jenis].namaDisplay)
    .join(", ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      id="form-ahli-waris"
      className="rounded-3xl border border-slate-700 bg-slate-800/50 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-700 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" }}
        >
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-xs text-purple-400 font-semibold tracking-wider uppercase mb-0.5">
            Step 2
          </div>
          <h3 className="text-xl font-semibold text-white">
            Data Ahli Waris
          </h3>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-3">
        {adaSuami && adaIstri && (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-red-700 bg-red-900/20">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-300">
              Almarhum hanya bisa berstatus suami atau istri, tidak keduanya.
              Pilih salah satu.
            </p>
          </div>
        )}

        {GROUPS.map((group) => (
          <AccordionGroup
            key={group.label}
            label={group.label}
            items={group.items}
            ahliWaris={ahliWaris}
            onToggle={onToggle}
            onUpdateJumlah={onUpdateJumlah}
            adaSuami={adaSuami}
            adaIstri={adaIstri}
          />
        ))}
      </div>

      {/* Preview aktif */}
      {totalAktif > 0 && (
        <div className="mx-5 mb-5 p-4 rounded-2xl bg-slate-900/70 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Ahli Waris Aktif
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-green-900/50 text-green-400 border border-green-700/50">
              {totalAktif} dipilih
            </span>
          </div>
          <p className="text-sm text-slate-300">{namaAktif}</p>
        </div>
      )}
    </motion.div>
  );
}
