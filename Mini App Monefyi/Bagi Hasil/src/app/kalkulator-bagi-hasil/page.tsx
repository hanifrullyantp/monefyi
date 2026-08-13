"use client";

import { useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { JenisAkad, MudharabahResult, MusyarakahResult, PertanianResult } from "@/types/bagi-hasil";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useToast } from "@/hooks/useToast";
import { STORAGE_KEYS } from "@/lib/localStorage";

// Components
import HeroSection from "@/components/bagi-hasil/HeroSection";
import AkadSelector from "@/components/bagi-hasil/AkadSelector";
import DalilCard from "@/components/bagi-hasil/DalilCard";
import PanduanAkad from "@/components/bagi-hasil/PanduanAkad";
import KomparatorAkad from "@/components/bagi-hasil/KomparatorAkad";
import DisclaimerSection from "@/components/bagi-hasil/DisclaimerSection";
import Toast from "@/components/bagi-hasil/Toast";

// Akad Calculators
import MudharabahCalculator from "@/components/bagi-hasil/akad/MudharabahCalculator";
import MusyarakahCalculator from "@/components/bagi-hasil/akad/MusyarakahCalculator";
import MuzaraahCalculator from "@/components/bagi-hasil/akad/MuzaraahCalculator";
import MukhabarahCalculator from "@/components/bagi-hasil/akad/MukhabarahCalculator";
import MusaqahCalculator from "@/components/bagi-hasil/akad/MusaqahCalculator";

// Results
import NisbahResultCard from "@/components/bagi-hasil/results/NisbahResultCard";
import PembagianChart from "@/components/bagi-hasil/results/PembagianChart";
import SkenarioTable from "@/components/bagi-hasil/results/SkenarioTable";
import RingkasanAkad from "@/components/bagi-hasil/results/RingkasanAkad";
import { BonusLiteBanner } from "@/components/shared/BonusLiteBanner";
import { LifetimeBonusCTA } from "@/components/shared/LifetimeBonusCTA";

import { formatCurrency } from "@/lib/formatters";
import { getAkadById } from "@/lib/akad-data";
import { cn } from "@/lib/cn";

type AnyResult = MudharabahResult | MusyarakahResult | PertanianResult | null;

function isMudharabahResult(r: AnyResult): r is MudharabahResult {
  return r !== null && "validasiNisbah" in r && "ringkasanAkad" in r;
}

function isMusyarakahResult(r: AnyResult): r is MusyarakahResult {
  return r !== null && "distribusiModal" in r;
}

function isPertanianResult(r: AnyResult): r is PertanianResult {
  return r !== null && "nilaiPanenBersih" in r;
}

function getSectionTitle(akad: JenisAkad): string {
  const titles: Record<JenisAkad, string> = {
    mudharabah: "Kalkulator Mudharabah",
    musyarakah: "Kalkulator Musyarakah",
    muzaraah: "Kalkulator Muzara'ah",
    mukhabarah: "Kalkulator Mukhabarah",
    musaqah: "Kalkulator Musaqah",
  };
  return titles[akad];
}

export default function KalkulatorBagiHasilPage() {
  const [activeAkad, setActiveAkad] = useLocalStorage<JenisAkad>(
    STORAGE_KEYS.activeAkad,
    "mudharabah"
  );
  const [result, setResult] = useState<AnyResult>(null);
  const { toasts, addToast, removeToast } = useToast();

  const calculatorRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const panduanRef = useRef<HTMLDivElement>(null);

  const handleAkadSelect = useCallback(
    (akad: JenisAkad) => {
      setActiveAkad(akad);
      setResult(null);
    },
    [setActiveAkad]
  );

  const handleResult = useCallback(
    (r: AnyResult) => {
      setResult(r);
      // Check for validation errors
      if (isMudharabahResult(r) && !r.validasiNisbah.valid) {
        r.validasiNisbah.pesan.forEach((msg) => addToast(msg, "error"));
        return;
      }
      if (isMusyarakahResult(r) && !r.validasiNisbah.valid) {
        r.validasiNisbah.pesan.forEach((msg) => addToast(msg, "error"));
        return;
      }
      addToast("Kalkulasi berhasil! Lihat hasil di bawah.", "success");
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    },
    [addToast]
  );

  const handleStartClick = useCallback(() => {
    calculatorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleLearnClick = useCallback(() => {
    panduanRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const akadInfo = getAkadById(activeAkad);

  // Build ringkasan props from result
  const buildRingkasanProps = () => {
    if (!result || !akadInfo) return null;

    const dalilUtama = akadInfo.dalil[0]?.referensi ?? "";

    if (isMudharabahResult(result)) {
      return {
        jenisAkad: activeAkad,
        namaAkad: akadInfo.nama,
        namaArab: akadInfo.namaArab,
        pihak: result.pembagian.map((p) => ({
          nama: p.nama,
          peran: p.peran,
          modal: activeAkad === "mudharabah" && p.persentaseKerugian === 100 ? result.totalModal : undefined,
          nisbahKeuntungan: p.persentaseKeuntungan,
          nisbahKerugian: p.persentaseKerugian,
        })),
        nisbah: {
          pihak: result.pembagian.map((p) => ({
            nama: p.nama,
            persen: p.persentaseKeuntungan,
            rupiah: p.keuntunganRupiah,
          })),
        },
        estimasi: result.estimasiPendapatan,
        skenarioData: result.skenario.map((s) => ({
          label: s.label,
          pihak: s.pembagianPerPihak,
        })),
        ketentuan: akadInfo.kerugianDitanggung,
        dalilUtama,
        totalModal: result.totalModal,
      };
    }

    if (isMusyarakahResult(result)) {
      return {
        jenisAkad: activeAkad,
        namaAkad: akadInfo.nama,
        namaArab: akadInfo.namaArab,
        pihak: result.pembagian.map((p) => ({
          nama: p.nama,
          peran: p.peran,
          modal: undefined,
          nisbahKeuntungan: p.persentaseKeuntungan,
          nisbahKerugian: p.persentaseKerugian,
        })),
        nisbah: {
          pihak: result.pembagian.map((p) => ({
            nama: p.nama,
            persen: p.persentaseKeuntungan,
            rupiah: p.keuntunganRupiah,
          })),
        },
        estimasi: result.estimasiPendapatan,
        skenarioData: result.skenario.map((s) => ({
          label: s.label,
          pihak: s.pembagianPerPihak,
        })),
        ketentuan: result.catatanKerugian,
        dalilUtama,
        totalModal: result.totalModal,
      };
    }

    if (isPertanianResult(result)) {
      const isPertanian = ["muzaraah", "mukhabarah", "musaqah"].includes(activeAkad);
      if (!isPertanian) return null;
      return {
        jenisAkad: activeAkad,
        namaAkad: akadInfo.nama,
        namaArab: akadInfo.namaArab,
        pihak: [
          {
            nama: result.skenario[1]?.pembagianPerPihak[0]?.nama ?? "Pemilik",
            peran: "Pemilik",
            nisbahKeuntungan: result.pembagianPemilik.persentase,
            nisbahKerugian: result.pembagianPemilik.persentase,
          },
          {
            nama: result.skenario[1]?.pembagianPerPihak[1]?.nama ?? "Penggarap",
            peran: "Penggarap",
            nisbahKeuntungan: result.pembagianPenggarap.persentase,
            nisbahKerugian: result.pembagianPenggarap.persentase,
          },
        ],
        nisbah: {
          pihak: [
            { nama: result.skenario[1]?.pembagianPerPihak[0]?.nama ?? "Pemilik", persen: result.pembagianPemilik.persentase, rupiah: result.pembagianPemilik.rupiah },
            { nama: result.skenario[1]?.pembagianPerPihak[1]?.nama ?? "Penggarap", persen: result.pembagianPenggarap.persentase, rupiah: result.pembagianPenggarap.rupiah },
          ],
        },
        estimasi: result.estimasiNilaiPanen,
        skenarioData: result.skenario.map((s) => ({
          label: s.label,
          pihak: s.pembagianPerPihak,
        })),
        ketentuan: result.catatanAkad,
        dalilUtama,
        totalModal: 0,
      };
    }

    return null;
  };

  const ringkasanProps = buildRingkasanProps();

  return (
    <main className="min-h-screen bg-slate-950">
      {/* Hero */}
      <HeroSection onStartClick={handleStartClick} onLearnClick={handleLearnClick} />

      <div className="mx-auto max-w-6xl px-4 py-12 space-y-16">
        <BonusLiteBanner appId="bagi-hasil" />

        {/* Akad Selector */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <AkadSelector activeAkad={activeAkad} onSelect={handleAkadSelect} />
        </motion.div>

        {/* Calculator */}
        <motion.div
          ref={calculatorRef}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="scroll-mt-8"
        >
          <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-slate-100">
                {getSectionTitle(activeAkad)}
              </h2>
              {akadInfo && (
                <p
                  lang="ar"
                  className="font-amiri text-base text-green-600 mt-0.5"
                >
                  {akadInfo.namaArab}
                </p>
              )}
              <p className="mt-1 text-sm text-slate-500">
                Isi form berikut untuk menghitung estimasi bagi hasil
              </p>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeAkad}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {activeAkad === "mudharabah" && (
                  <MudharabahCalculator
                    onResult={(r) => handleResult(r)}
                  />
                )}
                {activeAkad === "musyarakah" && (
                  <MusyarakahCalculator
                    onResult={(r) => handleResult(r)}
                  />
                )}
                {activeAkad === "muzaraah" && (
                  <MuzaraahCalculator
                    onResult={(r) => handleResult(r)}
                  />
                )}
                {activeAkad === "mukhabarah" && (
                  <MukhabarahCalculator
                    onResult={(r) => handleResult(r)}
                  />
                )}
                {activeAkad === "musaqah" && (
                  <MusaqahCalculator
                    onResult={(r) => handleResult(r)}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              ref={resultRef}
              key="results"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="scroll-mt-8 space-y-6"
            >
              <h2 className="text-2xl font-semibold text-slate-100">
                Hasil Kalkulasi
              </h2>

              {/* Validation errors */}
              {(isMudharabahResult(result) && !result.validasiNisbah.valid) && (
                <div className="rounded-xl border border-red-800 bg-red-950/40 p-4">
                  <p className="text-sm font-semibold text-red-400 mb-2">
                    Kalkulasi tidak dapat dilakukan:
                  </p>
                  <ul className="space-y-1">
                    {result.validasiNisbah.pesan.map((msg, i) => (
                      <li key={i} className="text-xs text-red-300">• {msg}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(isMusyarakahResult(result) && !result.validasiNisbah.valid) && (
                <div className="rounded-xl border border-red-800 bg-red-950/40 p-4">
                  <p className="text-sm font-semibold text-red-400 mb-2">
                    Kalkulasi tidak dapat dilakukan:
                  </p>
                  <ul className="space-y-1">
                    {result.validasiNisbah.pesan.map((msg, i) => (
                      <li key={i} className="text-xs text-red-300">• {msg}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Main Results Grid */}
              {isMudharabahResult(result) && result.validasiNisbah.valid && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="space-y-6">
                    <NisbahResultCard
                      pembagian={result.pembagian}
                      totalModal={result.totalModal}
                      estimasiPendapatan={result.estimasiPendapatan}
                      catatanKerugian="Kerugian finansial ditanggung sepenuhnya oleh Shahibul Mal. Mudharib menanggung kerugian waktu dan tenaga."
                    />
                    <SkenarioTable skenario={result.skenario} />
                  </div>
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
                      <PembagianChart
                        pembagian={result.pembagian}
                        skenario={result.skenario}
                      />
                    </div>
                    {ringkasanProps && (
                      <RingkasanAkad
                        {...ringkasanProps}
                        onToast={addToast}
                      />
                    )}
                  </div>
                </div>
              )}

              {isMusyarakahResult(result) && result.validasiNisbah.valid && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="space-y-6">
                    <NisbahResultCard
                      pembagian={result.pembagian}
                      totalModal={result.totalModal}
                      estimasiPendapatan={result.estimasiPendapatan}
                      catatanKerugian={result.catatanKerugian}
                    />
                    {/* Distribusi Modal */}
                    {result.distribusiModal.length > 0 && (
                      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 space-y-3">
                        <p className="text-sm font-semibold text-slate-300">
                          Distribusi Modal
                        </p>
                        {result.distribusiModal.map((d, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-slate-400">{d.nama}</span>
                            <div className="text-right">
                              <p className="font-tabular font-semibold text-slate-200">
                                {formatCurrency(d.jumlah)}
                              </p>
                              <p className="text-xs text-slate-500">
                                {d.persentase.toFixed(1)}% dari total
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <SkenarioTable skenario={result.skenario} />
                  </div>
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
                      <PembagianChart
                        pembagian={result.pembagian}
                        skenario={result.skenario}
                      />
                    </div>
                    {ringkasanProps && (
                      <RingkasanAkad
                        {...ringkasanProps}
                        onToast={addToast}
                      />
                    )}
                  </div>
                </div>
              )}

              {isPertanianResult(result) && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="space-y-6">
                    {/* Pertanian Summary Cards */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-3 text-center">
                          <p className="text-xs text-slate-500 mb-1">Estimasi Nilai Panen</p>
                          <p className="font-tabular text-sm font-bold text-slate-100">
                            {formatCurrency(result.estimasiNilaiPanen)}
                          </p>
                        </div>
                        {result.biayaTotal > 0 && (
                          <div className="rounded-xl border border-red-900/30 bg-red-950/20 p-3 text-center">
                            <p className="text-xs text-slate-500 mb-1">Total Biaya</p>
                            <p className="font-tabular text-sm font-bold text-red-400">
                              {formatCurrency(result.biayaTotal)}
                            </p>
                          </div>
                        )}
                        <div className={cn(
                          "rounded-xl border p-3 text-center",
                          result.nilaiPanenBersih > 0
                            ? "border-green-800/40 bg-green-950/30"
                            : "border-red-900/30 bg-red-950/20"
                        )}>
                          <p className="text-xs text-slate-500 mb-1">Nilai Bersih</p>
                          <p className={cn(
                            "font-tabular text-sm font-bold",
                            result.nilaiPanenBersih > 0 ? "text-green-400" : "text-red-400"
                          )}>
                            {formatCurrency(result.nilaiPanenBersih)}
                          </p>
                        </div>
                      </div>

                      {/* Pembagian */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-green-800/30 bg-green-950/30 p-3">
                          <p className="text-xs text-slate-500 mb-1">
                            {result.skenario[1]?.pembagianPerPihak[0]?.nama ?? "Pemilik"}
                          </p>
                          <p className="font-tabular text-lg font-bold text-green-400">
                            {formatCurrency(result.pembagianPemilik.rupiah)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {result.pembagianPemilik.persentase}% nisbah
                          </p>
                        </div>
                        <div className="rounded-xl border border-blue-800/30 bg-blue-950/30 p-3">
                          <p className="text-xs text-slate-500 mb-1">
                            {result.skenario[1]?.pembagianPerPihak[1]?.nama ?? "Penggarap"}
                          </p>
                          <p className="font-tabular text-lg font-bold text-blue-400">
                            {formatCurrency(result.pembagianPenggarap.rupiah)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {result.pembagianPenggarap.persentase}% nisbah
                          </p>
                        </div>
                      </div>

                      {/* Catatan */}
                      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-3">
                        <p className="text-xs text-slate-500 italic">{result.catatanAkad}</p>
                      </div>
                    </div>

                    <SkenarioTable skenario={result.skenario} isPertanian />
                  </div>

                  <div className="space-y-6">
                    {result.skenario.length > 0 && (
                      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
                        <PembagianChart
                          pembagian={[
                            {
                              nama: result.skenario[1]?.pembagianPerPihak[0]?.nama ?? "Pemilik",
                              peran: "Pemilik",
                              keuntunganRupiah: result.pembagianPemilik.rupiah,
                              persentaseKeuntungan: result.pembagianPemilik.persentase,
                              kerugianRupiah: 0,
                              persentaseKerugian: result.pembagianPemilik.persentase,
                            },
                            {
                              nama: result.skenario[1]?.pembagianPerPihak[1]?.nama ?? "Penggarap",
                              peran: "Penggarap",
                              keuntunganRupiah: result.pembagianPenggarap.rupiah,
                              persentaseKeuntungan: result.pembagianPenggarap.persentase,
                              kerugianRupiah: 0,
                              persentaseKerugian: result.pembagianPenggarap.persentase,
                            },
                          ]}
                          skenario={result.skenario}
                        />
                      </div>
                    )}
                    {ringkasanProps && (
                      <RingkasanAkad
                        {...ringkasanProps}
                        onToast={addToast}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Disclaimer after result */}
              <div className="rounded-xl border border-amber-900/30 bg-amber-950/20 px-4 py-3">
                <p className="text-xs text-amber-400 italic text-center">
                  ⚠ Hasil di atas adalah simulasi dan estimasi. Angka aktual
                  dapat berbeda. Konsultasikan dengan ulama atau ahli hukum
                  Islam sebelum mengikatkan diri dalam akad.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dalil Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <DalilCard activeAkad={activeAkad} />
        </motion.div>

        {/* Panduan */}
        <motion.div
          ref={panduanRef}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="scroll-mt-8"
        >
          <PanduanAkad activeAkad={activeAkad} />
        </motion.div>

        {/* Komparator */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <KomparatorAkad activeAkad={activeAkad} onSelect={handleAkadSelect} />
        </motion.div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <LifetimeBonusCTA appId="bagi-hasil" className="mb-8" />
          <DisclaimerSection />
        </motion.div>
      </div>

      {/* Toast */}
      <Toast toasts={toasts} onRemove={removeToast} />
    </main>
  );
}
