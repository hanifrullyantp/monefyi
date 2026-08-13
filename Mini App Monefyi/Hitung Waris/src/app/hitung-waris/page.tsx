"use client";

import { useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Scale } from "lucide-react";

import { HeroSection } from "@/components/hitung-waris/HeroSection";
import { PengantarFaraid } from "@/components/hitung-waris/PengantarFaraid";
import { HartaWarisanForm } from "@/components/hitung-waris/HartaWarisanForm";
import { AhliWarisForm } from "@/components/hitung-waris/AhliWarisForm";
import { HasilPembagian } from "@/components/hitung-waris/HasilPembagian";
import { HijabPanel } from "@/components/hitung-waris/HijabPanel";
import { PenjelasanPembagian } from "@/components/hitung-waris/PenjelasanPembagian";
import { WarisChart } from "@/components/hitung-waris/WarisChart";
import { DalilSection } from "@/components/hitung-waris/DalilSection";
import { SkenarioWaris } from "@/components/hitung-waris/SkenarioWaris";
import { RiwayatWaris } from "@/components/hitung-waris/RiwayatWaris";
import { GlossaryFaraid } from "@/components/hitung-waris/GlossaryFaraid";
import { DisclaimerSection } from "@/components/hitung-waris/DisclaimerSection";
import { ToastContainer } from "@/components/hitung-waris/Toast";
import { useWarisCalculator } from "@/hooks/useWarisCalculator";
import { useToast } from "@/hooks/useToast";
import { formatRupiah } from "@/lib/formatters";

function generateRingkasan(
  hasil: NonNullable<ReturnType<typeof useWarisCalculator>["hasil"]>
): string {
  const hartaUntukWaris = Math.max(
    0,
    hasil.harta.hartaBersih - hasil.harta.nilaiWasiat
  );
  const metodeLabel: Record<string, string> = {
    normal: "Normal",
    aul: "'Aul",
    radd: "Radd",
    gharawain: "Gharawain",
  };
  const tanggal = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const yangMendapat = hasil.hasilPerAhliWaris.filter(
    (h) => h.status === "mendapat_bagian"
  );
  const yangTerhijab = hasil.hasilPerAhliWaris.filter(
    (h) => h.status === "terhijab_hirman"
  );

  let text = `══════════════════════════════════════\n`;
  text += `RINGKASAN PEMBAGIAN WARIS ISLAMI\n`;
  text += `Monefyi — Hitung Waris\n`;
  text += `${tanggal}\n`;
  text += `══════════════════════════════════════\n`;
  text += `HARTA WARISAN:\n`;
  text += `Total Harta              : ${formatRupiah(hasil.harta.totalHarta)}\n`;
  text += `Hutang Almarhum          : ${formatRupiah(hasil.harta.hutangAlmarhum)}\n`;
  text += `Biaya Jenazah            : ${formatRupiah(hasil.harta.biayaJenazah)}\n`;
  text += `Wasiat                   : ${formatRupiah(hasil.harta.nilaiWasiat)}\n`;
  text += `─────────────────────────────────────\n`;
  text += `Harta untuk Dibagi       : ${formatRupiah(hartaUntukWaris)}\n`;
  text += `══════════════════════════════════════\n`;
  text += `PEMBAGIAN:\n`;

  for (const h of yangMendapat) {
    const namaPadded = h.namaDisplay.padEnd(22);
    const pecahan = `${h.pembilang}/${h.penyebut}`.padEnd(6);
    const persen = `${h.persentase.toFixed(2)}%`.padEnd(8);
    text += `${namaPadded} ${pecahan} ${persen} ${formatRupiah(h.nilaiTotal)}\n`;
    if (h.jumlahOrang > 1) {
      text += `  Per orang: ${formatRupiah(h.nilaiPerOrang)}\n`;
    }
  }

  if (yangTerhijab.length > 0) {
    text += `─────────────────────────────────────\n`;
    text += `TERHIJAB:\n`;
    for (const h of yangTerhijab) {
      text += `${h.namaDisplay} — Terhijab Hirman\n`;
    }
  }

  text += `══════════════════════════════════════\n`;
  text += `Metode: ${metodeLabel[hasil.metode] ?? hasil.metode}\n`;
  text += `Dasar: QS. An-Nisa: 11, 12, 176\n`;
  text += `══════════════════════════════════════\n`;
  text += `⚠ Hasil ini adalah simulasi kalkulasi\n`;
  text += `  faraid. Untuk kepastian hukum,\n`;
  text += `  konsultasikan dengan ulama atau\n`;
  text += `  Pengadilan Agama setempat.\n`;
  text += `══════════════════════════════════════`;

  return text;
}

export default function HitungWarisPage() {
  const {
    harta,
    ahliWaris,
    hasil,
    riwayat,
    isHitung,
    isLoading,
    setHarta,
    toggleAhliWaris,
    updateJumlahAhliWaris,
    hitung,
    reset,
    hapusRiwayat,
    muatRiwayat,
  } = useWarisCalculator();

  const { toasts, addToast, removeToast } = useToast();

  const formRef = useRef<HTMLDivElement>(null);
  const hasilRef = useRef<HTMLDivElement>(null);
  const dalilRef = useRef<HTMLDivElement>(null);

  const scrollTo = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleHitung = useCallback(() => {
    const adaSuami = ahliWaris.find((a) => a.jenis === "suami")?.isAda ?? false;
    const adaIstri = ahliWaris.find((a) => a.jenis === "istri")?.isAda ?? false;

    if (adaSuami && adaIstri) {
      addToast("Tidak bisa memilih suami dan istri sekaligus.", "error");
      return;
    }

    if (harta.totalHarta <= 0) {
      addToast("Masukkan total harta warisan terlebih dahulu.", "error");
      return;
    }

    const adaAhliWaris = ahliWaris.some((a) => a.isAda);
    if (!adaAhliWaris) {
      addToast("Pilih minimal satu ahli waris.", "error");
      return;
    }

    hitung();

    setTimeout(() => {
      hasilRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 600);
  }, [ahliWaris, harta.totalHarta, hitung, addToast]);

  const handleCopy = useCallback(() => {
    if (!hasil) return;
    const text = generateRingkasan(hasil);
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => addToast("Ringkasan berhasil disalin!", "success"))
        .catch(() => addToast("Gagal menyalin. Coba lagi.", "error"));
    }
  }, [hasil, addToast]);

  const handleReset = useCallback(() => {
    reset();
    addToast("Data kalkulasi telah direset.", "info");
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [reset, addToast]);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero */}
      <HeroSection
        onMulaiHitung={() => scrollTo(formRef)}
        onPelajari={() => scrollTo(dalilRef)}
      />

      {/* Pengantar */}
      <PengantarFaraid />

      {/* Form section */}
      <section className="py-16 bg-slate-950" ref={formRef}>
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl font-bold text-white mb-3">
              Kalkulator Waris Islam
            </h2>
            <p className="text-slate-400">
              Isi data harta dan ahli waris, lalu klik hitung untuk mendapatkan
              pembagian yang akurat
            </p>
          </motion.div>

          <div className="space-y-6">
            {/* Harta form */}
            <HartaWarisanForm harta={harta} onUpdate={setHarta} />

            {/* Ahli Waris form */}
            <AhliWarisForm
              ahliWaris={ahliWaris}
              onToggle={toggleAhliWaris}
              onUpdateJumlah={updateJumlahAhliWaris}
            />

            {/* Hitung button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-col sm:flex-row gap-4 justify-center pt-2"
            >
              <button
                type="button"
                onClick={handleHitung}
                disabled={isLoading}
                className="flex items-center justify-center gap-3 px-10 py-5 rounded-2xl font-bold text-xl text-white shadow-2xl hover:shadow-green-500/20 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: isLoading
                    ? "#334155"
                    : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Menghitung...
                  </>
                ) : (
                  <>
                    <Scale className="w-6 h-6" />
                    Hitung Pembagian Waris
                  </>
                )}
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Hasil section */}
      <AnimatePresence>
        {isHitung && hasil && (
          <section className="py-8 bg-slate-950" ref={hasilRef}>
            <div className="container mx-auto px-4 max-w-5xl space-y-8">
              <HasilPembagian
                hasil={hasil}
                onReset={handleReset}
                onCopy={handleCopy}
              />

              <HijabPanel hasilPerAhliWaris={hasil.hasilPerAhliWaris} />

              <PenjelasanPembagian hasil={hasil} />

              <WarisChart hasil={hasil} />

              <SkenarioWaris
                hartaAwal={harta}
                ahliWarisAwal={ahliWaris}
              />
            </div>
          </section>
        )}
      </AnimatePresence>

      {/* Dalil section */}
      <div ref={dalilRef} className="bg-slate-950">
        <div className="container mx-auto px-4 max-w-5xl">
          <DalilSection
            hasilPerAhliWaris={hasil?.hasilPerAhliWaris}
          />
        </div>
      </div>

      {/* Riwayat */}
      <section className="py-8 bg-slate-950">
        <div className="container mx-auto px-4 max-w-5xl">
          <RiwayatWaris
            riwayat={riwayat}
            onHapus={hapusRiwayat}
            onMuat={muatRiwayat}
          />
        </div>
      </section>

      {/* Glossary */}
      <div className="bg-slate-950">
        <div className="container mx-auto px-4 max-w-5xl">
          <GlossaryFaraid />
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-slate-950">
        <div className="container mx-auto px-4 max-w-5xl">
          <DisclaimerSection />
        </div>
      </div>

      {/* Sticky bottom bar (mobile) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 px-4 py-3 flex gap-3">
        <button
          type="button"
          onClick={handleReset}
          className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleHitung}
          disabled={isLoading}
          className="flex-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 flex-grow disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          }}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Scale className="w-4 h-4" />
          )}
          Hitung Waris
        </button>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
