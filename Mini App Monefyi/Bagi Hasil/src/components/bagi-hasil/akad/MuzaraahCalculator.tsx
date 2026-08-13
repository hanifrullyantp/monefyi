"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ChevronRight } from "lucide-react";
import type { MuzaraahInput, PertanianResult } from "@/types/bagi-hasil";
import { calculateMuzaraah } from "@/lib/calculators/muzaraah";
import { STORAGE_KEYS, saveToStorage, loadFromStorage } from "@/lib/localStorage";
import NisbahSlider from "@/components/bagi-hasil/shared/NisbahSlider";
import ModalInput from "@/components/bagi-hasil/shared/ModalInput";

const defaultInput: MuzaraahInput = {
  namaPemilikLahan: "",
  namaPenggarap: "",
  luasLahan: 0,
  satuanLuas: "hektar",
  estimasiHasilPanen: 0,
  satuanHasil: "Kg",
  estimasiHargaPerSatuan: 0,
  biayaOperasional: 0,
  nisbahPemilik: 60,
  nisbahPenggarap: 40,
  periodeMusim: 1,
  catatanAkad: "",
};

interface Props {
  onResult: (result: PertanianResult) => void;
}

export default function MuzaraahCalculator({ onResult }: Props) {
  const [input, setInput] = useState<MuzaraahInput>(defaultInput);

  useEffect(() => {
    const stored = loadFromStorage<MuzaraahInput>(STORAGE_KEYS.muzaraahInput, defaultInput);
    setInput(stored);
  }, []);

  const update = useCallback(<K extends keyof MuzaraahInput>(key: K, value: MuzaraahInput[K]) => {
    setInput((prev) => {
      const next = { ...prev, [key]: value };
      saveToStorage(STORAGE_KEYS.muzaraahInput, next);
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
      saveToStorage(STORAGE_KEYS.muzaraahInput, next);
      return next;
    });
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const result = calculateMuzaraah(input);
    onResult(result);
  }, [input, onResult]);

  const estimasiNilai = input.estimasiHasilPanen * input.estimasiHargaPerSatuan;
  const showWarning = estimasiNilai > 0 && input.biayaOperasional > estimasiNilai;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Info Muzara'ah */}
      <div className="flex items-start gap-2 rounded-xl bg-amber-950/40 border border-amber-900/40 p-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p className="text-xs text-amber-300">
          <strong>Muzara&apos;ah:</strong> Benih disediakan oleh <strong>pemilik lahan</strong>. Pastikan biaya benih sudah termasuk dalam biaya operasional.
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
              <p className="text-xs text-slate-500 mt-0.5">Menyediakan lahan & benih</p>
            </div>
            <div>
              <label htmlFor="nama-pemilik" className="mb-1.5 block text-xs font-medium text-slate-400">Nama</label>
              <input
                id="nama-pemilik"
                type="text"
                value={input.namaPemilikLahan}
                onChange={(e) => update("namaPemilikLahan", e.target.value)}
                placeholder="Nama pemilik lahan"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30 placeholder:text-slate-600"
              />
            </div>
            <span className="inline-block rounded-full bg-green-900/40 border border-green-800 px-3 py-1 text-xs font-medium text-green-400">
              🌱 Penyedia Benih (dari Pemilik)
            </span>
          </div>

          {/* Penggarap */}
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 space-y-3">
            <div>
              <p className="text-xs text-slate-500">Pihak 2</p>
              <p className="text-sm font-semibold text-blue-400">Penggarap</p>
              <p className="text-xs text-slate-500 mt-0.5">Menyediakan tenaga & alat</p>
            </div>
            <div>
              <label htmlFor="nama-penggarap" className="mb-1.5 block text-xs font-medium text-slate-400">Nama</label>
              <input
                id="nama-penggarap"
                type="text"
                value={input.namaPenggarap}
                onChange={(e) => update("namaPenggarap", e.target.value)}
                placeholder="Nama penggarap"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30 placeholder:text-slate-600"
              />
            </div>
            <div>
              <label htmlFor="catatan-kontribusi" className="mb-1.5 block text-xs font-medium text-slate-400">Catatan Kontribusi (opsional)</label>
              <textarea
                id="catatan-kontribusi"
                value={input.catatanAkad ?? ""}
                onChange={(e) => update("catatanAkad", e.target.value)}
                rows={2}
                placeholder="Contoh: Tenaga, cangkul, traktor, dll"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30 placeholder:text-slate-600 resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Data Lahan & Panen */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Data Lahan & Panen</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Luas Lahan */}
          <div className="space-y-1.5">
            <label htmlFor="luas-lahan" className="text-sm font-medium text-slate-400">Luas Lahan</label>
            <div className="flex gap-2">
              <input
                id="luas-lahan"
                type="number"
                min="0"
                step="0.01"
                value={input.luasLahan || ""}
                onChange={(e) => update("luasLahan", parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30"
              />
              <select
                value={input.satuanLuas}
                onChange={(e) => update("satuanLuas", e.target.value as MuzaraahInput["satuanLuas"])}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500"
                aria-label="Satuan luas"
              >
                <option value="hektar">Hektar</option>
                <option value="are">Are</option>
                <option value="m2">m²</option>
              </select>
            </div>
          </div>

          {/* Jumlah Musim */}
          <div className="space-y-1.5">
            <label htmlFor="periode-musim" className="text-sm font-medium text-slate-400">Jumlah Musim / Periode</label>
            <input
              id="periode-musim"
              type="number"
              min="1"
              value={input.periodeMusim}
              onChange={(e) => update("periodeMusim", parseInt(e.target.value, 10) || 1)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30"
            />
          </div>

          {/* Estimasi Hasil Panen */}
          <div className="space-y-1.5">
            <label htmlFor="estimasi-panen" className="text-sm font-medium text-slate-400">Estimasi Hasil Panen</label>
            <div className="flex gap-2">
              <input
                id="estimasi-panen"
                type="number"
                min="0"
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
                aria-label="Satuan hasil panen"
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

          <ModalInput
            label="Biaya Operasional Total"
            value={input.biayaOperasional}
            onChange={(v) => update("biayaOperasional", v)}
            helperText="Pupuk, pengairan, panen, dll (termasuk benih dari pemilik)"
            className="md:col-span-2"
          />
        </div>

        {showWarning && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-950/40 border border-amber-800/40 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-xs text-amber-300">
              Estimasi biaya melebihi hasil panen. Usaha ini berisiko merugi berdasarkan estimasi Anda.
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
            { nama: input.namaPenggarap || "Penggarap", nisbah: input.nisbahPenggarap, color: "blue" },
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
