"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Info, ChevronRight, AlertTriangle } from "lucide-react";
import type { MusaqahInput, PertanianResult } from "@/types/bagi-hasil";
import { calculateMusaqah } from "@/lib/calculators/musaqah";
import { STORAGE_KEYS, saveToStorage, loadFromStorage } from "@/lib/localStorage";
import NisbahSlider from "@/components/bagi-hasil/shared/NisbahSlider";
import ModalInput from "@/components/bagi-hasil/shared/ModalInput";

const defaultInput: MusaqahInput = {
  namaPemilikKebun: "",
  namaPengelola: "",
  jenisTanaman: "",
  jumlahPohonAtauLahan: 0,
  satuanKebun: "pohon",
  estimasiHasilPanen: 0,
  satuanHasil: "Kg",
  estimasiHargaPerSatuan: 0,
  nisbahPemilik: 60,
  nisbahPengelola: 40,
  periodePerawatan: 12,
  satuanPeriode: "bulan",
  catatanAkad: "",
};

interface Props {
  onResult: (result: PertanianResult) => void;
}

export default function MusaqahCalculator({ onResult }: Props) {
  const [input, setInput] = useState<MusaqahInput>(defaultInput);

  useEffect(() => {
    const stored = loadFromStorage<MusaqahInput>(STORAGE_KEYS.musaqahInput, defaultInput);
    setInput(stored);
  }, []);

  const update = useCallback(<K extends keyof MusaqahInput>(key: K, value: MusaqahInput[K]) => {
    setInput((prev) => {
      const next = { ...prev, [key]: value };
      saveToStorage(STORAGE_KEYS.musaqahInput, next);
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
        nisbahPengelola: index === 0 ? other : clamped,
      };
      saveToStorage(STORAGE_KEYS.musaqahInput, next);
      return next;
    });
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const result = calculateMusaqah(input);
    onResult(result);
  }, [input, onResult]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Info Musaqah */}
      <div className="flex items-start gap-2 rounded-xl bg-teal-950/40 border border-teal-900/40 p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
        <p className="text-xs text-teal-300">
          <strong>Musaqah:</strong> Perawatan tanaman yang <strong>sudah ada</strong>. Tidak ada biaya benih. Pengelola berhak atas persentase panen sebagai imbalan perawatan.
        </p>
      </div>

      {/* Data Pihak */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Data Pihak</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* Pemilik Kebun */}
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 space-y-3">
            <div>
              <p className="text-xs text-slate-500">Pihak 1</p>
              <p className="text-sm font-semibold text-green-400">Pemilik Kebun</p>
            </div>
            <div>
              <label htmlFor="ms-nama-pemilik" className="mb-1.5 block text-xs font-medium text-slate-400">Nama</label>
              <input
                id="ms-nama-pemilik"
                type="text"
                value={input.namaPemilikKebun}
                onChange={(e) => update("namaPemilikKebun", e.target.value)}
                placeholder="Nama pemilik kebun"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30 placeholder:text-slate-600"
              />
            </div>
            <div>
              <label htmlFor="ms-jenis-tanaman" className="mb-1.5 block text-xs font-medium text-slate-400">Jenis Tanaman</label>
              <input
                id="ms-jenis-tanaman"
                type="text"
                value={input.jenisTanaman}
                onChange={(e) => update("jenisTanaman", e.target.value)}
                placeholder="Contoh: Kurma, Mangga, Kelapa Sawit"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30 placeholder:text-slate-600"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label htmlFor="ms-jumlah" className="mb-1.5 block text-xs font-medium text-slate-400">Jumlah</label>
                <input
                  id="ms-jumlah"
                  type="number" min="0"
                  value={input.jumlahPohonAtauLahan || ""}
                  onChange={(e) => update("jumlahPohonAtauLahan", parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500"
                />
              </div>
              <div className="w-28">
                <label htmlFor="ms-satuan-kebun" className="mb-1.5 block text-xs font-medium text-slate-400">Satuan</label>
                <input
                  id="ms-satuan-kebun"
                  type="text"
                  value={input.satuanKebun}
                  onChange={(e) => update("satuanKebun", e.target.value)}
                  placeholder="pohon"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500"
                />
              </div>
            </div>
          </div>

          {/* Pengelola */}
          <div className="rounded-2xl border border-teal-900/30 bg-teal-950/20 p-4 space-y-3">
            <div>
              <p className="text-xs text-slate-500">Pihak 2</p>
              <p className="text-sm font-semibold text-teal-400">Pengelola / Perawat</p>
            </div>
            <div>
              <label htmlFor="ms-nama-pengelola" className="mb-1.5 block text-xs font-medium text-slate-400">Nama</label>
              <input
                id="ms-nama-pengelola"
                type="text"
                value={input.namaPengelola}
                onChange={(e) => update("namaPengelola", e.target.value)}
                placeholder="Nama pengelola"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 placeholder:text-slate-600"
              />
            </div>
            <div>
              <label htmlFor="ms-deskripsi" className="mb-1.5 block text-xs font-medium text-slate-400">Deskripsi Pekerjaan Perawatan</label>
              <textarea
                id="ms-deskripsi"
                value={input.catatanAkad ?? ""}
                onChange={(e) => update("catatanAkad", e.target.value)}
                rows={3}
                placeholder="Penyiraman, pemupukan, pemangkasan, pengawasan hama, dll"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 placeholder:text-slate-600 resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Estimasi Panen */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Estimasi Panen</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="ms-estimasi-panen" className="text-sm font-medium text-slate-400">Estimasi Hasil Panen per Periode</label>
            <div className="flex gap-2">
              <input
                id="ms-estimasi-panen"
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
            label="Estimasi Harga per Satuan"
            value={input.estimasiHargaPerSatuan}
            onChange={(v) => update("estimasiHargaPerSatuan", v)}
            helperText={`Harga per ${input.satuanHasil || "Kg"}`}
            required
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-400">Periode Perawatan</label>
            <div className="flex gap-2">
              <input
                type="number" min="1"
                value={input.periodePerawatan}
                onChange={(e) => update("periodePerawatan", parseInt(e.target.value, 10) || 1)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500"
              />
              <select
                value={input.satuanPeriode}
                onChange={(e) => update("satuanPeriode", e.target.value as "bulan" | "tahun")}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500"
                aria-label="Satuan periode"
              >
                <option value="bulan">Bulan</option>
                <option value="tahun">Tahun</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-blue-950/40 border border-blue-900/40 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
          <p className="text-xs text-blue-300">
            Dalam musaqah, tidak ada biaya benih karena tanaman sudah ada. Pembagian langsung dari estimasi nilai panen.
          </p>
        </div>
      </div>

      {/* Nisbah Panen */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Nisbah Panen</h3>
        <NisbahSlider
          pihak={[
            { nama: input.namaPemilikKebun || "Pemilik Kebun", nisbah: input.nisbahPemilik, color: "green" },
            { nama: input.namaPengelola || "Pengelola", nisbah: input.nisbahPengelola, color: "teal" },
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
        Hitung Bagi Hasil Kebun
        <ChevronRight className="h-5 w-5" />
      </motion.button>
    </form>
  );
}
