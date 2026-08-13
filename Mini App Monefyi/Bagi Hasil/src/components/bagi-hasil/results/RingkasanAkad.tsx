"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Copy, Save, Printer, CheckCircle } from "lucide-react";
import type { JenisAkad } from "@/types/bagi-hasil";
import { formatCurrency, formatPercent, generateRingkasanText, type PihakData, type NisbahData } from "@/lib/formatters";
import { saveToStorage, loadFromStorage, STORAGE_KEYS } from "@/lib/localStorage";
import type { RiwayatSimulasi } from "@/types/bagi-hasil";

interface RingkasanAkadProps {
  jenisAkad: JenisAkad;
  namaAkad: string;
  namaArab: string;
  pihak: PihakData[];
  nisbah: NisbahData;
  estimasi: number;
  skenarioData: { label: string; pihak: { nama: string; nilai: number }[] }[];
  ketentuan: string;
  dalilUtama: string;
  onToast: (msg: string, type: "success" | "error" | "info") => void;
  totalModal?: number;
}

export default function RingkasanAkad({
  jenisAkad,
  namaAkad,
  namaArab,
  pihak,
  nisbah,
  estimasi,
  skenarioData,
  ketentuan,
  dalilUtama,
  onToast,
  totalModal,
}: RingkasanAkadProps) {
  const [copied, setCopied] = useState(false);

  const ringkasanText = generateRingkasanText(
    jenisAkad,
    namaAkad,
    namaArab,
    pihak,
    nisbah,
    estimasi,
    skenarioData,
    ketentuan,
    dalilUtama
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(ringkasanText);
      setCopied(true);
      onToast("Ringkasan berhasil disalin ke clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast("Gagal menyalin. Coba salin secara manual.", "error");
    }
  }, [ringkasanText, onToast]);

  const handleSave = useCallback(() => {
    const riwayat = loadFromStorage<RiwayatSimulasi[]>(
      STORAGE_KEYS.history,
      []
    );
    const newEntry: RiwayatSimulasi = {
      id: `${Date.now()}`,
      tanggal: new Date().toISOString(),
      jenisAkad,
      ringkasan: `${namaAkad} — ${pihak.map((p) => p.nama).join(", ")}`,
      totalModal: totalModal ?? estimasi,
    };
    const updated = [newEntry, ...riwayat].slice(0, 5);
    saveToStorage(STORAGE_KEYS.history, updated);
    onToast("Simulasi tersimpan ke riwayat!", "success");
  }, [jenisAkad, namaAkad, pihak, totalModal, estimasi, onToast]);

  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") {
      window.print();
    }
  }, []);

  const tanggal = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-700 bg-slate-800/80 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-green px-6 py-4">
        <h3 className="text-lg font-bold text-white">
          Ringkasan Akad {namaAkad}
        </h3>
        <p className="text-sm text-green-100/80">{tanggal}</p>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Dasar Hukum */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">Dasar Hukum:</span>
          <span className="text-blue-400 font-medium">{dalilUtama}</span>
        </div>

        {/* Pihak */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-300">
            Pihak yang Bersepakat
          </p>
          {pihak.map((p, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-3 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-200">
                  {p.nama || `Pihak ${i + 1}`}
                </p>
                <span className="text-xs text-slate-500">{p.peran}</span>
              </div>
              {p.modal !== undefined && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Modal:</span>
                  <span className="text-slate-300 tabular-nums">
                    {formatCurrency(p.modal)}
                  </span>
                </div>
              )}
              {p.kontribusi && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Kontribusi:</span>
                  <span className="text-slate-300">{p.kontribusi}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Nisbah Laba:</span>
                <span className="text-green-400 font-semibold tabular-nums">
                  {formatPercent(p.nisbahKeuntungan)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Tanggungan Rugi:</span>
                <span className="text-red-400 tabular-nums">
                  {p.nisbahKerugian > 0
                    ? formatPercent(p.nisbahKerugian)
                    : "Waktu & Tenaga"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Estimasi */}
        <div className="rounded-xl border border-green-800/30 bg-green-950/30 p-3 space-y-2">
          <p className="text-sm font-semibold text-slate-300">
            Estimasi Bagi Hasil
          </p>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Total Estimasi Pendapatan:</span>
            <span className="font-tabular font-bold text-green-400">
              {formatCurrency(estimasi)}
            </span>
          </div>
          {nisbah.pihak.map((p, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-slate-400">{p.nama}:</span>
              <span className="font-tabular text-slate-200">
                {formatCurrency(p.rupiah)} ({formatPercent(p.persen)})
              </span>
            </div>
          ))}
        </div>

        {/* Ketentuan Kerugian */}
        <div className="rounded-xl border border-red-900/30 bg-red-950/20 p-3">
          <p className="text-xs font-semibold text-red-400 mb-1">
            Ketentuan Kerugian:
          </p>
          <p className="text-xs text-slate-400">{ketentuan}</p>
        </div>

        {/* Disclaimer */}
        <div className="rounded-xl border border-slate-700/30 bg-slate-900/30 p-3">
          <p className="text-xs text-slate-500 italic">
            ⚠ Hasil bersifat simulasi dan estimasi. Konsultasikan dengan ulama
            atau ahli hukum Islam. Akad sebaiknya dibuat secara tertulis.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 border-t border-slate-700 px-6 py-4 no-print">
        <motion.button
          onClick={handleCopy}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors"
          aria-label="Salin ringkasan akad"
        >
          {copied ? (
            <CheckCircle className="h-4 w-4 text-green-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "Tersalin!" : "Salin Ringkasan"}
        </motion.button>

        <motion.button
          onClick={handleSave}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 rounded-xl bg-green-900/40 border border-green-800/40 px-4 py-2.5 text-sm font-medium text-green-400 hover:bg-green-900/60 transition-colors"
          aria-label="Simpan ke riwayat"
        >
          <Save className="h-4 w-4" />
          Simpan ke Riwayat
        </motion.button>

        <motion.button
          onClick={handlePrint}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 rounded-xl bg-blue-900/40 border border-blue-800/40 px-4 py-2.5 text-sm font-medium text-blue-400 hover:bg-blue-900/60 transition-colors"
          aria-label="Cetak halaman"
        >
          <Printer className="h-4 w-4" />
          Cetak / Print
        </motion.button>
      </div>
    </motion.div>
  );
}
