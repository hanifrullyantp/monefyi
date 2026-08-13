"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Info, ChevronRight, AlertTriangle } from "lucide-react";
import type { MusyarakahInput, MusyarakahResult, PihakMusyarakah } from "@/types/bagi-hasil";
import { calculateMusyarakah } from "@/lib/calculators/musyarakah";
import { STORAGE_KEYS, saveToStorage, loadFromStorage } from "@/lib/localStorage";
import NisbahSlider from "@/components/bagi-hasil/shared/NisbahSlider";
import ModalInput from "@/components/bagi-hasil/shared/ModalInput";
import PihakInput from "@/components/bagi-hasil/shared/PihakInput";
import { cn } from "@/lib/cn";

const PARTY_COLORS = ["green", "blue", "amber", "purple", "teal"] as const;

function makeDefaultPihak(nama = ""): PihakMusyarakah {
  return { nama, jumlahModal: 0, persentaseModal: 0, nisbahKeuntungan: 0, nisbahKerugian: 0 };
}

const defaultInput: MusyarakahInput = {
  jenisMusyarakah: "inan",
  pihak: [makeDefaultPihak(), makeDefaultPihak()],
  estimasiPendapatanUsaha: 0,
  periodeUsaha: 12,
  satuanPeriode: "bulan",
  modeLababerbedaDariModal: false,
};

interface Props {
  onResult: (result: MusyarakahResult) => void;
}

export default function MusyarakahCalculator({ onResult }: Props) {
  const [input, setInput] = useState<MusyarakahInput>(defaultInput);

  useEffect(() => {
    const stored = loadFromStorage<MusyarakahInput>(
      STORAGE_KEYS.musyarakahInput,
      defaultInput
    );
    setInput(stored);
  }, []);

  const save = useCallback((next: MusyarakahInput) => {
    saveToStorage(STORAGE_KEYS.musyarakahInput, next);
  }, []);

  // Recalculate persentase modal & nisbah kerugian
  const recalcPersen = useCallback((pihak: PihakMusyarakah[]): PihakMusyarakah[] => {
    const total = pihak.reduce((s, p) => s + p.jumlahModal, 0);
    return pihak.map((p) => ({
      ...p,
      persentaseModal: total > 0 ? (p.jumlahModal / total) * 100 : 100 / pihak.length,
      nisbahKerugian: total > 0 ? (p.jumlahModal / total) * 100 : 100 / pihak.length,
    }));
  }, []);

  const distributeNisbahEqually = useCallback((pihak: PihakMusyarakah[], total: number): PihakMusyarakah[] => {
    const per = total / pihak.length;
    return pihak.map((p) => ({ ...p, nisbahKeuntungan: per }));
  }, []);

  const updateJenis = useCallback((jenis: MusyarakahInput["jenisMusyarakah"]) => {
    setInput((prev) => {
      const updatedPihak = recalcPersen(prev.pihak);
      // For mufawadhah, equalize all nisbah
      const finalPihak = jenis === "mufawadhah"
        ? distributeNisbahEqually(updatedPihak, 100)
        : updatedPihak;
      const next = { ...prev, jenisMusyarakah: jenis, pihak: finalPihak };
      save(next);
      return next;
    });
  }, [recalcPersen, distributeNisbahEqually, save]);

  const updatePihakNama = useCallback((index: number, nama: string) => {
    setInput((prev) => {
      const newPihak = prev.pihak.map((p, i) => i === index ? { ...p, nama } : p);
      const next = { ...prev, pihak: newPihak };
      save(next);
      return next;
    });
  }, [save]);

  const updatePihakModal = useCallback((index: number, modal: number) => {
    setInput((prev) => {
      const newPihak = prev.pihak.map((p, i) => i === index ? { ...p, jumlahModal: modal } : p);
      const recalc = recalcPersen(newPihak);
      // If not customizing nisbah, sync to modal proportion
      const finalPihak = !prev.modeLababerbedaDariModal
        ? recalc.map((p) => ({ ...p, nisbahKeuntungan: p.persentaseModal }))
        : recalc;
      const next = { ...prev, pihak: finalPihak };
      save(next);
      return next;
    });
  }, [recalcPersen, save]);

  const handleNisbahChange = useCallback((index: number, newNisbah: number) => {
    setInput((prev) => {
      const others = prev.pihak.filter((_, i) => i !== index);
      const sumOthers = others.reduce((s, p) => s + p.nisbahKeuntungan, 0);
      const clamped = Math.min(99, Math.max(1, newNisbah));
      const remaining = 100 - clamped;

      const newPihak = prev.pihak.map((p, i) => {
        if (i === index) return { ...p, nisbahKeuntungan: clamped };
        if (sumOthers === 0) return { ...p, nisbahKeuntungan: remaining / (prev.pihak.length - 1) };
        return { ...p, nisbahKeuntungan: (p.nisbahKeuntungan / sumOthers) * remaining };
      });

      // For mufawadhah: equalize
      const finalPihak = prev.jenisMusyarakah === "mufawadhah"
        ? distributeNisbahEqually(newPihak, 100)
        : newPihak;

      const next = { ...prev, pihak: finalPihak };
      save(next);
      return next;
    });
  }, [distributeNisbahEqually, save]);

  const toggleModeLaba = useCallback((mode: boolean) => {
    setInput((prev) => {
      let pihak = recalcPersen(prev.pihak);
      if (!mode) {
        pihak = pihak.map((p) => ({ ...p, nisbahKeuntungan: p.persentaseModal }));
      }
      const next = { ...prev, modeLababerbedaDariModal: mode, pihak };
      save(next);
      return next;
    });
  }, [recalcPersen, save]);

  const addPihak = useCallback(() => {
    setInput((prev) => {
      if (prev.pihak.length >= 5) return prev;
      const newPihak = [...prev.pihak, makeDefaultPihak()];
      const recalc = recalcPersen(newPihak).map((p) => ({
        ...p,
        nisbahKeuntungan: p.persentaseModal,
      }));
      const next = { ...prev, pihak: recalc };
      save(next);
      return next;
    });
  }, [recalcPersen, save]);

  const removePihak = useCallback((index: number) => {
    setInput((prev) => {
      if (prev.pihak.length <= 2) return prev;
      const newPihak = prev.pihak.filter((_, i) => i !== index);
      const recalc = recalcPersen(newPihak).map((p) => ({
        ...p,
        nisbahKeuntungan: p.persentaseModal,
      }));
      const next = { ...prev, pihak: recalc };
      save(next);
      return next;
    });
  }, [recalcPersen, save]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const result = calculateMusyarakah(input);
    onResult(result);
  }, [input, onResult]);

  const totalModal = input.pihak.reduce((s, p) => s + p.jumlahModal, 0);

  const jenisOptions = [
    { val: "inan" as const, label: "Inan", desc: "Modal tidak harus sama, laba bisa berbeda dari porsi modal" },
    { val: "mufawadhah" as const, label: "Mufawadhah", desc: "Modal sama, laba dibagi rata" },
    { val: "abdan" as const, label: "Abdan", desc: "Tanpa modal, kontribusi berupa keahlian/tenaga" },
    { val: "wujuh" as const, label: "Wujuh", desc: "Tanpa modal dan tenaga, kontribusi berupa reputasi/kepercayaan" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Jenis Musyarakah */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Jenis Musyarakah</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup">
          {jenisOptions.map((opt) => (
            <label
              key={opt.val}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all",
                input.jenisMusyarakah === opt.val
                  ? "border-green-500 bg-green-900/20"
                  : "border-slate-700 bg-slate-800 hover:border-slate-600"
              )}
            >
              <input
                type="radio"
                name="jenisMusyarakah"
                value={opt.val}
                checked={input.jenisMusyarakah === opt.val}
                onChange={() => updateJenis(opt.val)}
                className="mt-0.5 accent-green-500"
              />
              <div>
                <p className="text-sm font-semibold text-slate-200">{opt.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Data Pihak */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-200">Data Pihak</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              Total Modal:{" "}
              <strong className="text-slate-300 tabular-nums">
                Rp {totalModal.toLocaleString("id-ID")}
              </strong>
            </span>
            {input.pihak.length < 5 && (
              <button
                type="button"
                onClick={addPihak}
                className="flex items-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-green-700 hover:text-green-400 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Pihak
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {input.pihak.map((p, i) => (
            <PihakInput
              key={i}
              index={i}
              nama={p.nama}
              peran={`Mitra ${i + 1}`}
              jumlahModal={p.jumlahModal}
              onNamaChange={(nama) => updatePihakNama(i, nama)}
              onModalChange={input.jenisMusyarakah !== "abdan" ? (modal) => updatePihakModal(i, modal) : undefined}
              onRemove={() => removePihak(i)}
              canRemove={input.pihak.length > 2}
              showModal={input.jenisMusyarakah !== "abdan"}
              persentaseModal={p.persentaseModal}
              badgeText={PARTY_COLORS[i] ? PARTY_COLORS[i].toUpperCase() : undefined}
              badgeColor={i === 0 ? "green" : i === 1 ? "blue" : "amber"}
            />
          ))}
        </div>
      </div>

      {/* Nisbah Keuntungan */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-base font-semibold text-slate-200">Nisbah Keuntungan</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Ikuti porsi modal?</span>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={!input.modeLababerbedaDariModal}
                onChange={(e) => toggleModeLaba(!e.target.checked)}
                className="sr-only peer"
                aria-label="Ikuti porsi modal"
              />
              <div className="peer h-5 w-9 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-green-500 peer-checked:after:translate-x-full" />
            </label>
          </div>
        </div>

        {!input.modeLababerbedaDariModal && (
          <div className="flex items-start gap-2 rounded-xl bg-green-950/40 border border-green-900/40 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
            <p className="text-xs text-green-300">
              Nisbah keuntungan mengikuti porsi modal. Ini adalah pendapat yang paling berhati-hati dan dianjurkan.
            </p>
          </div>
        )}

        {input.modeLababerbedaDariModal && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-950/40 border border-amber-900/40 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-xs text-amber-300">
              Nisbah berbeda dari porsi modal dibolehkan jika ada pihak yang lebih aktif bekerja (Musyarakah Inan).
            </p>
          </div>
        )}

        <NisbahSlider
          pihak={input.pihak.map((p, i) => ({
            nama: p.nama || `Mitra ${i + 1}`,
            nisbah: p.nisbahKeuntungan,
            color: (["green", "blue", "amber", "purple", "teal"] as const)[i % 5],
          }))}
          onChange={handleNisbahChange}
          disabled={!input.modeLababerbedaDariModal}
        />

        {/* Nisbah Kerugian - always proportional */}
        <div className="rounded-xl border border-red-900/30 bg-red-950/20 p-3">
          <p className="text-xs font-semibold text-red-400 mb-1">⚠ Nisbah Kerugian (Tidak Dapat Diubah):</p>
          <p className="text-xs text-slate-500 mb-2">
            Kerugian WAJIB proporsional terhadap modal berdasarkan ijma&apos; ulama.
          </p>
          <div className="flex flex-wrap gap-2">
            {input.pihak.map((p, i) => (
              <span key={i} className="rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
                {p.nama || `Mitra ${i + 1}`}: {p.persentaseModal.toFixed(1)}%
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Estimasi Usaha */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Estimasi Usaha</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ModalInput
            label="Estimasi Pendapatan per Periode"
            value={input.estimasiPendapatanUsaha}
            onChange={(v) => setInput((prev) => { const n = { ...prev, estimasiPendapatanUsaha: v }; save(n); return n; })}
            helperText="Estimasi keuntungan bersih yang akan dibagi"
            required
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-400">Periode Usaha</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                value={input.periodeUsaha}
                onChange={(e) => setInput((prev) => { const n = { ...prev, periodeUsaha: parseInt(e.target.value, 10) || 1 }; save(n); return n; })}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30"
              />
              <select
                value={input.satuanPeriode}
                onChange={(e) => setInput((prev) => { const n = { ...prev, satuanPeriode: e.target.value as "bulan" | "tahun" }; save(n); return n; })}
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

      <motion.button
        type="submit"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-green py-4 text-base font-semibold text-white shadow-lg shadow-green-900/30"
      >
        Hitung Bagi Hasil
        <ChevronRight className="h-5 w-5" />
      </motion.button>
    </form>
  );
}
