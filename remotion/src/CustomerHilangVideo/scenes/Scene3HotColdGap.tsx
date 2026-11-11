import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AlertTriangle, Brain, Flame, HelpCircle, Snowflake, Thermometer } from "lucide-react";
import { BrandLockup } from "../../EstimatorMotionVideo/components/BrandMark";
import { FacelessVendor } from "../../EstimatorMotionVideo/components/FacelessCharacters";

export const Scene3HotColdGap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isReels = height > width;
  const isSquare = height === width;

  const enterSpring = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const conceptSpring = spring({ frame: frame - 120, fps, config: { damping: 12, stiffness: 110 } });
  const coldColumnSpring = spring({ frame: frame - 250, fps, config: { damping: 12, stiffness: 120 } });

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between items-center text-white select-none ${
        isReels ? "pt-16 pb-28 px-8" : isSquare ? "pt-10 pb-24 px-8" : "pt-12 pb-24 px-12"
      }`}
    >
      {/* Header */}
      <div className="w-full flex justify-between items-center z-10">
        <BrandLockup size={isReels ? 48 : 40} />
        <div className="bg-rose-500/20 border-2 border-rose-500/50 px-4 py-2 rounded-full text-xs font-black uppercase text-rose-300">
          FAKTA PSIKOLOGI CLOSING
        </div>
      </div>

      {/* Main Container */}
      <div
        style={{
          transform: `scale(${interpolate(enterSpring, [0, 1], [0.93, 1])})`,
          opacity: interpolate(enterSpring, [0, 1], [0, 1]),
        }}
        className="w-full max-w-[1020px] my-auto flex flex-col items-center gap-6 z-10"
      >
        {/* Core Diagnosis Alert */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="inline-flex items-center gap-2 bg-red-500/20 border-2 border-red-500/50 px-6 py-2 rounded-full shadow-lg shadow-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-300 font-black text-xs sm:text-sm uppercase tracking-wider">
              Bukan Salah Kualitas Kerjamu
            </span>
          </div>

          <h2
            className={`font-black tracking-tight leading-tight ${
              isReels ? "text-4xl sm:text-5xl" : isSquare ? "text-3xl sm:text-4xl" : "text-4xl"
            }`}
          >
            Masalahnya: <span className="text-red-400">Harga Datang Terlambat!</span>
          </h2>
        </div>

        {/* Big Concept Card: Hot-Cold Empathy Gap */}
        <div
          style={{
            transform: `scale(${interpolate(conceptSpring, [0, 1], [0.95, 1])})`,
            opacity: interpolate(conceptSpring, [0, 1], [0, 1]),
          }}
          className="w-full bg-[#0E1B17] border-2 border-white/15 rounded-3xl p-6 shadow-2xl space-y-5"
        >
          {/* Header of Concept */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/15">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center">
                <Brain className="w-5 h-5 text-purple-300" />
              </div>
              <div className="text-left">
                <div className="text-xs font-black text-purple-300 uppercase tracking-wider">
                  Hukum Perilaku Pembeli
                </div>
                <div className="text-lg sm:text-xl font-black text-white">
                  Hot-Cold Empathy Gap
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-full text-xs font-bold text-white/80">
              <Thermometer className="w-4 h-4 text-amber-400" />
              Pergeseran Emosi Keputusan
            </div>
          </div>

          {/* Dual Columns: Hot vs Cold */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Hot State */}
            <div className="bg-gradient-to-br from-amber-950/50 to-[#1A120A] border-2 border-amber-500/50 rounded-2xl p-5 space-y-2.5 text-left shadow-lg">
              <div className="flex items-center gap-2 text-amber-400 font-black text-sm uppercase">
                <Flame className="w-5 h-5 text-amber-400" />
                Saat Emosi Masih Panas (Survei)
              </div>
              <div className="text-xs sm:text-sm text-white/90 leading-relaxed">
                Orang memutuskan dengan <strong>perasaan & imajinasi impian</strong>. Kesepakatan terasa sangat mudah dan optimis.
              </div>
              <div className="bg-amber-500/20 text-amber-300 px-3 py-1.5 rounded-xl text-xs font-black inline-block">
                Tingkat Closing Tertinggi 🔥
              </div>
            </div>

            {/* Cold State */}
            <div
              style={{
                opacity: interpolate(coldColumnSpring, [0, 1], [0.4, 1]),
              }}
              className="bg-gradient-to-br from-blue-950/50 to-[#0A121A] border-2 border-blue-500/50 rounded-2xl p-5 space-y-2.5 text-left shadow-lg"
            >
              <div className="flex items-center gap-2 text-blue-400 font-black text-sm uppercase">
                <Snowflake className="w-5 h-5 text-blue-400" />
                Saat Sudah Dingin (Di Rumah)
              </div>
              <div className="text-xs sm:text-sm text-white/90 leading-relaxed">
                Sulit mengingat lagi sebesar apa semangatnya tadi. Keputusan yang tadi gampang berubah jadi <strong>meragukan & cari murah</strong>.
              </div>
              <div className="bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-xl text-xs font-black inline-block">
                Rentan Ghosting & Boncos ❄️
              </div>
            </div>
          </div>
        </div>

        {/* Faceless Vendor */}
        <div className="flex items-center gap-4">
          <FacelessVendor pose="scratch_head" scale={isReels ? 1.15 : 0.95} />
          <div className="bg-emerald-950/70 border border-emerald-500/40 p-3.5 rounded-2xl text-xs sm:text-sm text-white/90 text-left max-w-[500px]">
            <span className="font-black text-emerald-400 block mb-0.5">
              Kunci Utama Kontraktor Sukses:
            </span>
            Jangan biarkan emosi calon customer dingin sebelum angka penawaran resmi keluar!
          </div>
        </div>
      </div>
    </div>
  );
};

