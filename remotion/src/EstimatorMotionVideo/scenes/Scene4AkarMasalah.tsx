import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Eye, KeyRound } from "lucide-react";
import { BrandLockup } from "../components/BrandMark";
import { FacelessVendor } from "../components/FacelessCharacters";

export const Scene4AkarMasalah: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isReels = height > width;
  const isSquare = height === width;

  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  const revealSpring = spring({
    frame: frame - 35,
    fps,
    config: { damping: 12, stiffness: 120 },
  });

  const blurAmount = interpolate(revealSpring, [0, 1], [14, 0]);

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between items-center text-white select-none ${
        isReels ? "pt-16 pb-28 px-8" : isSquare ? "pt-10 pb-24 px-8" : "pt-12 pb-24 px-12"
      }`}
    >
      {/* Header */}
      <div className="w-full flex justify-between items-center z-10">
        <BrandLockup size={isReels ? 48 : 40} />
        <div className="bg-emerald-500/20 border-2 border-emerald-500/50 px-4 py-2 rounded-full text-xs font-black tracking-wider uppercase text-emerald-300">
          AKAR MASALAH
        </div>
      </div>

      {/* Main Container */}
      <div
        style={{
          transform: `scale(${interpolate(enterSpring, [0, 1], [0.92, 1])})`,
          opacity: interpolate(enterSpring, [0, 1], [0, 1]),
        }}
        className="w-full max-w-[1020px] my-auto flex flex-col items-center text-center gap-7 z-10"
      >
        <div className="inline-flex items-center gap-2.5 bg-white/10 border border-white/20 px-6 py-2 rounded-full text-sm font-black text-white/90">
          <KeyRound className="w-4 h-4 text-emerald-400" />
          <span>Fakta Di Lapangan</span>
        </div>

        <div
          className={`font-black text-white/80 ${
            isReels ? "text-3xl sm:text-4xl" : isSquare ? "text-2xl sm:text-3xl" : "text-3xl"
          }`}
        >
          Ketiganya punya satu akar masalah:
        </div>

        {/* Revealed Quote Card */}
        <div
          style={{
            filter: `blur(${blurAmount}px)`,
            transform: `scale(${interpolate(revealSpring, [0, 1], [0.92, 1])})`,
          }}
          className="relative bg-gradient-to-b from-[#11231D] to-[#0A1612] border-2 border-emerald-400/80 p-8 sm:p-12 rounded-3xl shadow-2xl shadow-emerald-500/30 max-w-[900px] w-full"
        >
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/50 border-2 border-white/20">
            <Eye className="w-7 h-7 text-black font-black" />
          </div>

          <h1
            className={`font-black tracking-tight leading-snug text-white mt-2 ${
              isReels ? "text-4xl sm:text-5xl" : isSquare ? "text-3xl sm:text-4xl" : "text-4xl"
            }`}
          >
            "Kamu <span className="text-emerald-400 text-glow-emerald">belum melihat angkanya</span> saat kamu <span className="underline decoration-emerald-400 decoration-4 underline-offset-8">paling butuh</span>."
          </h1>

          <p className="text-white/70 text-base sm:text-lg mt-5 font-medium max-w-[750px] mx-auto">
            Tanpa visibilitas modal riil di kantongmu saat survei, setiap keputusan harga adalah spekulasi.
          </p>
        </div>

        {/* Faceless Vendor */}
        <div className="mt-1">
          <FacelessVendor pose="scratch_head" scale={isReels ? 1.2 : 1.0} />
        </div>
      </div>
    </div>
  );
};
