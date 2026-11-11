import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Sparkles, TrendingUp, Sliders, ShieldCheck, Share2 } from "lucide-react";
import { BrandLockup } from "../components/BrandMark";
import { ExactEstimatorApp } from "../components/ExactEstimatorApp";
import { FacelessVendor } from "../components/FacelessCharacters";

export const Scene5EstimatorSolution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isReels = height > width;
  const isSquare = height === width;

  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  // Phases:
  // Phase 1 (0 - 160): Dashboard - Setiap Item & Modal Tercatat
  // Phase 2 (160 - 340): Editor - Ganti Ukuran & Spek, Total Berubah Realtime
  // Phase 3 (340 - 480): Batas Aman Diskon - Tahu Batas Aman Nego
  // Phase 4 (480 - 625): WhatsApp + PDF + TTD Digital
  const activePhase =
    frame < 160 ? 1 : frame < 340 ? 2 : frame < 480 ? 3 : 4;

  const phaseMeta = {
    1: {
      badge: "TRANSPARANSI DATA SURVEI",
      title: "Di Estimator, Setiap Item Tercatat",
      desc: "Modal riil & estimasi profit 36% langsung terlihat di setiap proyek.",
      icon: TrendingUp,
      highlight: "Nilai Proyek Rp 33jt • Est. Profit Rp 12jt",
    },
    2: {
      badge: "HITUNGAN REALTIME DI LAPANGAN",
      title: "Ganti Ukuran? Total Langsung Berubah!",
      desc: "Ukuran kabinet 3.8m jadi 4.5m, sistem langsung menghitung otomatis akurat.",
      icon: Sliders,
      highlight: "Ukuran 3.8m → 4.5m (Total: Rp 35.032.000)",
    },
    3: {
      badge: "BENTENG NEGOSIASI ANTI RUGI",
      title: "Tahu Batas Aman: Memberi Tanpa Merugi",
      desc: "Ketahui batas toleransi diskon agar modal dan upah tidak tekor.",
      icon: ShieldCheck,
      highlight: "Batas Diskon Maks: Rp 2jt (Profit Tetap Rp 10.6jt)",
    },
    4: {
      badge: "EKSPOR PROFESIONAL 1-KLIK",
      title: "Kirim WhatsApp + PDF + Tanda Tangan",
      desc: "Surat penawaran resmi berstempel digital terkirim saat survei berlangsung.",
      icon: Share2,
      highlight: "PDF Resmi + Tanda Tangan Digital Otomatis",
    },
  }[activePhase];

  const IconComponent = phaseMeta.icon;

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between items-center text-white select-none ${
        isReels ? "pt-14 pb-28 px-6" : isSquare ? "pt-8 pb-22 px-8" : "pt-10 pb-22 px-12"
      }`}
    >
      {/* Top Header */}
      <div className="w-full flex justify-between items-center z-20">
        <BrandLockup size={isReels ? 48 : 42} />
        <div className="bg-emerald-500/20 border-2 border-emerald-400/60 px-4 py-2 rounded-full text-xs font-black text-emerald-300 flex items-center gap-2 shadow-lg shadow-emerald-500/30">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>MONEFYI ESTIMATOR</span>
        </div>
      </div>

      {/* Main Container */}
      <div
        style={{
          transform: `scale(${interpolate(enterSpring, [0, 1], [0.94, 1])})`,
          opacity: interpolate(enterSpring, [0, 1], [0, 1]),
        }}
        className={`w-full my-auto flex z-10 ${
          isReels
            ? "flex-col items-center gap-4"
            : "flex-row items-center justify-around gap-6 max-w-[1400px]"
        }`}
      >
        {/* Dynamic Headings & Giant Highlight Pill */}
        <div
          className={`flex flex-col ${
            isReels ? "items-center text-center w-full max-w-[850px]" : "max-w-[480px] text-left"
          } space-y-2.5`}
        >
          {/* Phase Badge */}
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 border-2 border-emerald-400/50 px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase text-emerald-300">
            <IconComponent className="w-4 h-4 text-emerald-400" />
            <span>{phaseMeta.badge}</span>
          </div>

          <h2
            className={`font-black tracking-tight text-white leading-tight ${
              isReels ? "text-4xl sm:text-5xl" : isSquare ? "text-3xl sm:text-4xl" : "text-4xl"
            }`}
          >
            {phaseMeta.title}
          </h2>

          <p className="text-white/80 text-sm sm:text-base font-medium max-w-[650px]">
            {phaseMeta.desc}
          </p>

          {/* Big Punchy Highlight Pill */}
          <div className="pt-1">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500/30 via-teal-500/20 to-emerald-500/30 border-2 border-emerald-400 px-5 py-2 rounded-2xl shadow-xl shadow-emerald-500/25">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping mr-1" />
              <span className="text-sm sm:text-base font-black text-emerald-300 font-mono tracking-tight">
                {phaseMeta.highlight}
              </span>
            </div>
          </div>

          {/* Faceless Vendor standing beside text in Landscape/Square */}
          {!isReels && (
            <div className="pt-3 flex items-center gap-4">
              <FacelessVendor pose="confident" scale={0.95} />
              <div className="bg-emerald-950/80 border border-emerald-500/40 p-3.5 rounded-2xl text-xs sm:text-sm text-white/90">
                <span className="font-black text-emerald-400 block mb-0.5">
                  Survei Nyata di Lapangan
                </span>
                Data tersimpan rapi, harga langsung terhitung di depan customer.
              </div>
            </div>
          )}
        </div>

        {/* Real App Showcase */}
        <div className="relative flex items-center justify-center">
          {/* In Square and Landscape: Show both Dashboard & Editor if room permits, or focused exact phone */}
          {!isReels && !isSquare ? (
            /* Landscape: Dual Phone Display (Left: Dashboard, Right: Editor) */
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="text-[11px] font-black uppercase text-emerald-400 mb-1.5 text-center tracking-wider">
                  1. Dashboard Estimasi
                </div>
                <ExactEstimatorApp
                  sceneFrame={frame}
                  view="dashboard"
                  scale={0.78}
                />
              </div>

              <div className="relative">
                <div className="text-[11px] font-black uppercase text-emerald-400 mb-1.5 text-center tracking-wider">
                  2. Mengisi & Hitung Realtime
                </div>
                <ExactEstimatorApp
                  sceneFrame={frame}
                  view="editor"
                  scale={0.78}
                />
              </div>
            </div>
          ) : (
            /* Reels (9:16) & Square (1:1): Large, Focused, Animated Single Phone */
            <div className="relative">
              <ExactEstimatorApp
                sceneFrame={frame}
                view="auto"
                scale={isReels ? 1.08 : 0.88}
              />

              {/* Vendor standing proudly in Reels */}
              {isReels && (
                <div className="absolute -right-10 -bottom-8 z-30 pointer-events-none">
                  <FacelessVendor pose="confident" scale={0.95} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
