import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Sparkles, Sliders, Share2, CheckCircle2 } from "lucide-react";
import { BrandLockup } from "../components/BrandMark";
import { ExactEstimatorApp } from "../components/ExactEstimatorApp";
import { FacelessVendor } from "../components/FacelessCharacters";

export const Scene4EstimatorSolution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isReels = height > width;
  const isSquare = height === width;

  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  // Phases in Scene 4 (0 to 470):
  // Phase 1 (0 - 175): Tulis Kebutuhan dari Chat, Isi Ukuran & Langsung Terhitung
  // Phase 2 (175 - 300): Kirim Lewat WA Pakai Template + Batas Aman Diskon + PDF & TTD Otomatis
  // Phase 3 (300 - 470): Keputusan Jadi Cepat, Hasil Akurat, Semua Orang Nyaman
  const activePhase = frame < 175 ? 1 : frame < 300 ? 2 : 3;

  const phaseMeta = {
    1: {
      badge: "HITUNGAN REALTIME DI ESTIMATOR",
      title: "Isi Ukuran, Langsung Terhitung!",
      desc: "Tulis kebutuhan dari chat WA, nominal estimasi & profit otomatis terakumulasi.",
      icon: Sliders,
      highlight: "Ukuran 3.8m → 4.5m • Realtime Update",
    },
    2: {
      badge: "KIRIM VIA WHATSAPP & PDF RESMI",
      title: "PDF Resmi + Tanda Tangan Digital",
      desc: "Lengkap dengan template chat dan kontrol batas aman diskon anti-rugi.",
      icon: Share2,
      highlight: "Surat Penawaran Resmi + Stempel Digital",
    },
    3: {
      badge: "HASIL AKURAT & SEMUA NYAMAN",
      title: "Keputusan Cepat, Hasil Akurat!",
      desc: "Customer senang dapat kepastian transparan, bisnismu aman & menguntungkan.",
      icon: CheckCircle2,
      highlight: "100% Nyaman Tanpa Nego Boncos",
    },
  }[activePhase];

  const IconComponent = phaseMeta.icon;

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between items-center text-white select-none ${
        isReels ? "pt-14 pb-28 px-6" : isSquare ? "pt-8 pb-20 px-8" : "pt-10 pb-20 px-12"
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
              isReels ? "text-4xl sm:text-5xl" : isSquare ? "text-3xl" : "text-4xl"
            }`}
          >
            {phaseMeta.title}
          </h2>

          <p
            className={`text-slate-300 font-bold ${
              isReels ? "text-sm sm:text-base max-w-lg" : "text-sm"
            }`}
          >
            {phaseMeta.desc}
          </p>

          {/* Glowing Highlight Card */}
          <div className="bg-gradient-to-r from-emerald-950/80 to-[#0A261D] border-2 border-emerald-400/80 rounded-2xl px-5 py-2.5 shadow-xl shadow-emerald-500/20 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-200 font-mono font-black text-xs sm:text-sm tracking-wide">
              {phaseMeta.highlight}
            </span>
          </div>

          {/* Faceless Vendor on side/bottom */}
          <div className={`pt-2 ${isReels ? "hidden" : "block"}`}>
            <FacelessVendor pose="confident" scale={0.9} />
          </div>
        </div>

        {/* Real Smartphone App Mockup */}
        <div className="relative shrink-0 flex items-center justify-center">
          <ExactEstimatorApp
            sceneFrame={frame}
            view="auto"
            dashboardSwitchFrame={50}
            sizeChangeFrame={90}
            safeDiscountFrame={190}
            waModalFrame={260}
            scale={isReels ? 1.08 : isSquare ? 0.92 : 1.02}
          />

          {/* In Reels: Show confident character beside/overlayed */}
          {isReels && activePhase === 3 && (
            <div className="absolute -bottom-6 -right-6 z-40 filter drop-shadow-2xl">
              <FacelessVendor pose="confident" scale={0.78} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
