"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ChevronRight } from "lucide-react";
import type { MukhabarahInput, PertanianResult } from "@/types/bagi-hasil";
import { calculateMukhabarah } from "@/lib/calculators/mukhabarah";
import { STORAGE_KEYS, saveToStorage, loadFromStorage } from "@/lib/localStorage";
import NisbahSlider from "@/components/bagi-hasil/shared/NisbahSlider";
import ModalInput from "@/components/bagi-hasil/shared/ModalInput";

const defaultInput: MukhabarahInput = {
  namaPemilikLahan: "",
  namaPenggarap: "",
  luasLahan: 0,
  satuanLuas: "hektar",
  estimasiHasilPanen: 0,
  satuanHasil: "Kg",
  estimasiHargaPerSatuan: 0,
  biayaBenih: 0,
  biayaOperasionalLain: 0,
  nisbahPemilik: 50,
  nisbahPenggarap: 50,
  periodeMusim: 1,
  catatanAkad: "",
};

interface Props {
  onResult: (result: PertanianResult) => void;
}

export default function MukhabarahCalculator({ onResult }: Props) {
  const [input, setInput] = useState<MukhabarahInput>(defaultInput);

  useEffect(() => {
    const stored = loadFromStorage<MukhabarahInput>(STORAGE_KEYS.mukhabarahInput, defaultInput);
    setInput(stored);
  }, []);

  const update = useCallback(<K extends keyof MukhabarahInput>(key: K, value: MukhabarahInput[K]) => {
    setInput((prev) => {
      const next = { ...prev, [key]: value };
      saveToStorage(STORAGE_KEYS.mukhabarahInput, next);
      return next;
    });
  }, []);

  const handleNisbahChange = useCallback((index: number, newNisbah: number) => {
    const clamped = Math.min(99, Math.max(1, newNisbah));
    const other = 100 - clamped;
    setInput((prev) => {
      const next = {
        ...prev,
        nisbahPemilik: index === 0 ? clamped : other,
        nisbahPenggarap: index === 0 ? other : clamped,
      };
      saveToStorage(STORAGE_KEYS.mukhabarahInput, next);
      return next;
    });
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const result = calculateMukhabarah(input);
    onResult(result);
  }, [input, onResult]);

  const totalBiaya = input.biayaBenih + input.biayaOperasionalLain;
  const estimasiNilai = input.estimasiHasilPanen * input.estimasiHargaPerSatuan;
  const showWarning = estimasiNilai > 0 && totalBiaya > estimasiNilai;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Info Mukhabarah */}
      <div className="flex items-start gap-2 rounded-xl bg-emerald-950/40 border border-emerald-900/40 p-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        <p className="text-xs text-emerald-300">
          <strong>Mukhabarah:</strong> Benih disediakan oleh <strong>penggarap</strong>. Berbeda dengan Muzara&apos;ah di mana benih dari pemilik lahan.
        </p>
      </div>

      {/* Data Pihak */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Data Pihak</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* Pemilik Lahan */}
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 space-y-3">
            <div>
              <p className="text-xs text-slate-500">Pihak 1</p>
              <p className="text-sm font-semibold text-green-400">Pemilik Lahan</p>
              <p className="text-xs text-slate-500 mt-0.5">Menyediakan lahan saja</p>
            </div>
            <div>
              <label htmlFor="mk-nama-pemilik" className="mb-1.5 block text-xs font-medium text-slate-400">Nama</label>
              <input
                id="mk-nama-pemilik"
                type="text"
                value={input.namaPemilikLahan}
                onChange={(e) => update("namaPemilikLahan", e.target.value)}
                placeholder="Nama pemilik lahan"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30 placeholder:text-slate-600"
              />
            </div>
            <span className="inline-block rounded-full bg-slate-700/60 border border-slate-600 px-3 py-1 text-xs font-medium text-slate-400">
              🏡 Hanya Lahan
            </span>
          </div>

          {/* Penggarap */}
          <div className="rounded-2xl border border-emerald-900/30 bg-emerald-950/20 p-4 space-y-3">
            <div>
              <p className="text-xs text-slate-500">Pihak 2</p>
              <p className="text-sm font-semibold text-emerald-400">Penggarap</p>
              <p className="text-xs text-slate-500 mt-0.5">Menyediakan benih & tenaga</p>
            </div>
            <div>
              <label htmlFor="mk-nama-penggarap" className="mb-1.5 block text-xs font-medium text-slate-400">Nama</label>
              <input
                id="mk-nama-penggarap"
                type="text"
                value={input.namaPenggarap}
                onChange={(e) => update("namaPenggarap", e.target.value)}
                placeholder="Nama penggarap"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 placeholder:text-slate-600"
              />
            </div>
            <span className="inline-block rounded-full bg-emerald-900/40 border border-emerald-800 px-3 py-1 text-xs font-semibold text-emerald-400">
              🌱 Penyedia Benih (dari Penggarap)
            </span>
          </div>
        </div>
      </div>

      {/* Data Lahan & Panen */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Data Lahan & Panen</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="mk-luas" className="text-sm font-medium text-slate-400">Luas Lahan</label>
            <div className="flex gap-2">
              <input
                id="mk-luas"
                type="number" min="0" step="0.01"
                value={input.luasLahan || ""}
                onChange={(e) => update("luasLahan", parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500"
              />
              <select
                value={input.satuanLuas}
                onChange={(e) => update("satuanLuas", e.target.value as MukhabarahInput["satuanLuas"])}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500"
                aria-label="Satuan luas"
              >
                <option value="hektar">Hektar</option>
                <option value="are">Are</option>
                <option value="m2">m²</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="mk-musim" className="text-sm font-medium text-slate-400">Jumlah Musim</label>
            <input
              id="mk-musim"
              type="number" min="1"
              value={input.periodeMusim}
              onChange={(e) => update("periodeMusim", parseInt(e.target.value, 10) || 1)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="mk-panen" className="text-sm font-medium text-slate-400">Estimasi Hasil Panen</label>
            <div className="flex gap-2">
              <input
                id="mk-panen"
                type="number" min="0"
                value={input.estimasiHasilPanen || ""}
                onChange={(e) => update("estimasiHasilPanen", parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500"
              />
              <input
                type="text"
                value={input.satuanHasil}
                onChange={(e) => update("satuanHasil", e.target.value)}
                placeholder="Kg"
                className="w-20 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500"
                aria-label="Satuan hasil"
              />
            </div>
          </div>

          <ModalInput
            label="Estimasi Harga Jual per Satuan"
            value={input.estimasiHargaPerSatuan}
            onChange={(v) => update("estimasiHargaPerSatuan", v)}
            helperText={`Harga per ${input.satuanHasil || "Kg"}`}
            required
          />

          {/* Biaya Benih - khusus Mukhabarah */}
          <div className="space-y-1.5 relative">
            <div className="flex items-center gap-2">
              <label htmlFor="mk-biaya-benih" className="text-sm font-medium text-slate-400">Biaya Benih</label>
              <span className="rounded-full bg-emerald-900/40 border border-emerald-800 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                Tanggungan Penggarap
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 select-none">Rp</span>
              <input
                id="mk-biaya-benih"
                type="number" min="0"
                value={input.biayaBenih || ""}
                onChange={(e) => update("biayaBenih", parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full rounded-xl border border-emerald-800/40 bg-emerald-950/20 pl-9 pr-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>

          <ModalInput
            label="Biaya Operasional Lainnya"
            value={input.biayaOperasionalLain}
            onChange={(v) => update("biayaOperasionalLain", v)}
            helperText="Pupuk, pengairan, tenaga tambahan, dll"
          />
        </div>

        {/* Total biaya info */}
        <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5">
          <span className="text-sm text-slate-400">Total Biaya (Benih + Operasional)</span>
          <span className="font-tabular text-sm font-semibold text-slate-200">
            Rp {totalBiaya.toLocaleString("id-ID")}
          </span>
        </div>

        {showWarning && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-950/40 border border-amber-800/40 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-xs text-amber-300">
              Estimasi biaya melebihi hasil panen. Usaha ini berisiko merugi.
            </p>
          </div>
        )}
      </div>

      {/* Nisbah Hasil Panen */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Nisbah Hasil Panen</h3>
        <NisbahSlider
          pihak={[
            { nama: input.namaPemilikLahan || "Pemilik Lahan", nisbah: input.nisbahPemilik, color: "green" },
            { nama: input.namaPenggarap || "Penggarap", nisbah: input.nisbahPenggarap, color: "teal" },
          ]}
          onChange={handleNisbahChange}
        />
      </div>

      <motion.button
        type="submit"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-green py-4 text-base font-semibold text-white shadow-lg shadow-green-900/30"
      >
        Hitung Bagi Hasil Panen
        <ChevronRight className="h-5 w-5" />
      </motion.button>
    </form>
  );
}
