"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Info, ChevronRight } from "lucide-react";
import type { MudharabahInput, MudharabahResult } from "@/types/bagi-hasil";
import { calculateMudharabah } from "@/lib/calculators/mudharabah";
import { STORAGE_KEYS, saveToStorage, loadFromStorage } from "@/lib/localStorage";
import NisbahSlider from "@/components/bagi-hasil/shared/NisbahSlider";
import ModalInput from "@/components/bagi-hasil/shared/ModalInput";
import { cn } from "@/lib/cn";

const defaultInput: MudharabahInput = {
  jenisMudharabah: "muthlaqah",
  pihak: [
    { nama: "", peran: "shahibul_mal", jumlahModal: 0, nisbahKeuntungan: 60 },
    { nama: "", peran: "mudharib", jumlahModal: 0, nisbahKeuntungan: 40 },
  ],
  estimasiPendapatanUsaha: 0,
  periodeUsaha: 12,
  satuanPeriode: "bulan",
  batasanMuqayyadah: "",
  deskripsiUsaha: "",
};

interface Props {
  onResult: (result: MudharabahResult) => void;
}

export default function MudharabahCalculator({ onResult }: Props) {
  const [input, setInput] = useState<MudharabahInput>(defaultInput);

  useEffect(() => {
    const stored = loadFromStorage<MudharabahInput>(
      STORAGE_KEYS.mudharabahInput,
      defaultInput
    );
    setInput(stored);
  }, []);

  const updateInput = useCallback(<K extends keyof MudharabahInput>(
    key: K,
    value: MudharabahInput[K]
  ) => {
    setInput((prev) => {
      const next = { ...prev, [key]: value };
      saveToStorage(STORAGE_KEYS.mudharabahInput, next);
      return next;
    });
  }, []);

  const updatePihak = useCallback(
    (index: 0 | 1, field: string, value: string | number) => {
      setInput((prev) => {
        const newPihak = [...prev.pihak] as MudharabahInput["pihak"];
        newPihak[index] = { ...newPihak[index], [field]: value };
        const next = { ...prev, pihak: newPihak };
        saveToStorage(STORAGE_KEYS.mudharabahInput, next);
        return next;
      });
    },
    []
  );

  const handleNisbahChange = useCallback(
    (index: number, newNisbah: number) => {
      const clamped = Math.min(99, Math.max(1, newNisbah));
      const other = 100 - clamped;
      setInput((prev) => {
        const newPihak = [...prev.pihak] as MudharabahInput["pihak"];
        newPihak[index === 0 ? 0 : 1] = {
          ...newPihak[index === 0 ? 0 : 1],
          nisbahKeuntungan: clamped,
        };
        newPihak[index === 0 ? 1 : 0] = {
          ...newPihak[index === 0 ? 1 : 0],
          nisbahKeuntungan: other,
        };
        const next = { ...prev, pihak: newPihak };
        saveToStorage(STORAGE_KEYS.mudharabahInput, next);
        return next;
      });
    },
    []
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const result = calculateMudharabah(input);
      onResult(result);
    },
    [input, onResult]
  );

  const shahibul = input.pihak[0];
  const mudharib = input.pihak[1];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Jenis Mudharabah */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">
          Jenis Mudharabah
        </h3>
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          role="radiogroup"
          aria-label="Jenis Mudharabah"
        >
          {(
            [
              {
                val: "muthlaqah",
                label: "Muthlaqah",
                desc: "Tidak terikat — pengelola bebas mengelola usaha apapun yang halal",
              },
              {
                val: "muqayyadah",
                label: "Muqayyadah",
                desc: "Terikat — pemilik modal memberikan batasan jenis usaha tertentu",
              },
            ] as const
          ).map((opt) => (
            <label
              key={opt.val}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all",
                input.jenisMudharabah === opt.val
                  ? "border-green-500 bg-green-900/20"
                  : "border-slate-700 bg-slate-800 hover:border-slate-600"
              )}
            >
              <input
                type="radio"
                name="jenisMudharabah"
                value={opt.val}
                checked={input.jenisMudharabah === opt.val}
                onChange={() => updateInput("jenisMudharabah", opt.val)}
                className="mt-0.5 accent-green-500"
              />
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  {opt.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {input.jenisMudharabah === "muqayyadah" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5"
          >
            <label
              htmlFor="batasan-muqayyadah"
              className="text-sm font-medium text-slate-400"
            >
              Batasan yang Ditetapkan Pemilik Modal
            </label>
            <textarea
              id="batasan-muqayyadah"
              value={input.batasanMuqayyadah ?? ""}
              onChange={(e) =>
                updateInput("batasanMuqayyadah", e.target.value)
              }
              rows={2}
              placeholder="Contoh: Usaha hanya di bidang kuliner halal, tidak boleh ekspansi ke luar kota..."
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30 placeholder:text-slate-600 resize-none"
            />
          </motion.div>
        )}
      </div>

      {/* Data Pihak */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Data Pihak</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* Shahibul Mal */}
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Pihak 1</p>
                <p className="text-sm font-semibold text-green-400">
                  Shahibul Mal (Pemilik Modal)
                </p>
              </div>
              <span className="rounded-full bg-green-900/40 px-2.5 py-0.5 text-xs font-medium text-green-400">
                💰 Penyedia Modal
              </span>
            </div>
            <div>
              <label
                htmlFor="nama-shahibul"
                className="mb-1.5 block text-xs font-medium text-slate-400"
              >
                Nama / Label
              </label>
              <input
                id="nama-shahibul"
                type="text"
                value={shahibul.nama}
                onChange={(e) => updatePihak(0, "nama", e.target.value)}
                placeholder="Nama Shahibul Mal"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/30 placeholder:text-slate-600"
              />
            </div>
            <ModalInput
              label="Jumlah Modal"
              value={shahibul.jumlahModal}
              onChange={(v) => updatePihak(0, "jumlahModal", v)}
              helperText="Modal 100% dari Shahibul Mal"
              required
            />
          </div>

          {/* Mudharib */}
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Pihak 2</p>
                <p className="text-sm font-semibold text-blue-400">
                  Mudharib (Pengelola)
                </p>
              </div>
              <span className="rounded-full bg-blue-900/40 px-2.5 py-0.5 text-xs font-medium text-blue-400">
                💼 Pengelola
              </span>
            </div>
            <div>
              <label
                htmlFor="nama-mudharib"
                className="mb-1.5 block text-xs font-medium text-slate-400"
              >
                Nama / Label
              </label>
              <input
                id="nama-mudharib"
                type="text"
                value={mudharib.nama}
                onChange={(e) => updatePihak(1, "nama", e.target.value)}
                placeholder="Nama Mudharib"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/30 placeholder:text-slate-600"
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-400">
                Jumlah Modal
              </p>
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 px-3 py-2.5">
                <p className="text-sm font-tabular text-slate-500">
                  Rp 0{" "}
                  <span className="text-xs">(Mudharib tidak menyetor modal)</span>
                </p>
              </div>
            </div>
            <div>
              <label
                htmlFor="keahlian-mudharib"
                className="mb-1.5 block text-xs font-medium text-slate-400"
              >
                Keahlian / Kontribusi
              </label>
              <textarea
                id="keahlian-mudharib"
                value={input.deskripsiUsaha ?? ""}
                onChange={(e) => updateInput("deskripsiUsaha", e.target.value)}
                rows={2}
                placeholder="Jelaskan keahlian yang ditawarkan pengelola..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30 placeholder:text-slate-600 resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Nisbah */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">
          Nisbah Bagi Hasil
        </h3>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 space-y-3">
          <div className="flex items-start gap-2 rounded-xl bg-blue-950/40 border border-blue-900/40 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
            <p className="text-xs text-blue-300">
              Nisbah lazim dalam praktik adalah{" "}
              <strong>50:50 hingga 70:30</strong> tergantung tingkat risiko dan
              kontribusi masing-masing. Semakin tinggi kontribusi pengelola,
              semakin besar nisbahnya.
            </p>
          </div>
          <NisbahSlider
            pihak={[
              {
                nama: shahibul.nama || "Shahibul Mal",
                nisbah: shahibul.nisbahKeuntungan,
                color: "green",
              },
              {
                nama: mudharib.nama || "Mudharib",
                nisbah: mudharib.nisbahKeuntungan,
                color: "blue",
              },
            ]}
            onChange={handleNisbahChange}
          />
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-3">
            <p className="text-xs text-slate-400 font-medium mb-1">
              Ketentuan Kerugian:
            </p>
            <p className="text-xs text-slate-500">
              Kerugian finansial <strong className="text-red-400">100%</strong>{" "}
              ditanggung Shahibul Mal. Mudharib hanya menanggung kerugian waktu
              dan tenaga.
            </p>
          </div>
        </div>
      </div>

      {/* Estimasi Usaha */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">
          Estimasi Usaha
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ModalInput
            label="Estimasi Pendapatan per Periode"
            value={input.estimasiPendapatanUsaha}
            onChange={(v) => updateInput("estimasiPendapatanUsaha", v)}
            helperText="Estimasi keuntungan bersih yang akan dibagi"
            required
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-400">
              Periode Usaha
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                value={input.periodeUsaha}
                onChange={(e) =>
                  updateInput("periodeUsaha", parseInt(e.target.value, 10) || 1)
                }
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30"
              />
              <select
                value={input.satuanPeriode}
                onChange={(e) =>
                  updateInput(
                    "satuanPeriode",
                    e.target.value as "bulan" | "tahun"
                  )
                }
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500"
                aria-label="Satuan periode"
              >
                <option value="bulan">Bulan</option>
                <option value="tahun">Tahun</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Submit */}
      <motion.button
        type="submit"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-green py-4 text-base font-semibold text-white shadow-lg shadow-green-900/30 transition-shadow hover:shadow-green-900/50"
      >
        Hitung Bagi Hasil
        <ChevronRight className="h-5 w-5" />
      </motion.button>
    </form>
  );
}
