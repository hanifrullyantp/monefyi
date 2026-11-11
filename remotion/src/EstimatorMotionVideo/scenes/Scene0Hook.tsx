import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AlertTriangle, ShieldAlert, Sparkles } from "lucide-react";
import { BrandLockup } from "../components/BrandMark";
import { FacelessVendor } from "../components/FacelessCharacters";

export const Scene0Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isReels = height > width;
  const isSquare = height === width;

  // Animations
  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const badgeSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  const charSpring = spring({
    frame: frame - 15,
    fps,
    config: { damping: 12, stiffness: 90 },
  });

  const iconSpring = spring({
    frame: frame - 25,
    fps,
    config: { damping: 10, stiffness: 90 },
  });

  const pulse = Math.sin(frame / 6) * 0.08 + 1;

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between items-center text-white select-none ${
        isReels ? "py-16 px-8" : isSquare ? "py-10 px-8" : "py-14 px-12"
      }`}
    >
      {/* Top Header */}
      <div className="w-full flex justify-between items-center z-10">
        <BrandLockup size={isReels ? 46 : 40} />
        <div className="flex items-center gap-2 bg-emerald-950/70 border border-emerald-500/40 px-4 py-1.5 rounded-full text-xs font-semibold text-emerald-300">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Survei & Estimasi Pro</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full my-auto flex flex-col items-center text-center z-10 max-w-[960px]">
        {/* Warning Badge */}
        <div
          style={{
            transform: `scale(${badgeSpring})`,
            opacity: interpolate(badgeSpring, [0, 1], [0, 1]),
          }}
          className="inline-flex items-center gap-2.5 bg-red-500/15 border-2 border-red-500/50 px-6 py-2.5 rounded-full mb-6 shadow-xl shadow-red-500/20"
        >
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="text-red-300 font-black tracking-wider text-xs sm:text-sm uppercase">
            Peringatan Kontraktor & Bengkel Las / Interior
          </span>
        </div>

        {/* Big Impact Title */}
        <div
          style={{
            transform: `scale(${interpolate(titleSpring, [0, 1], [0.88, 1])}) translateY(${interpolate(
              titleSpring,
              [0, 1],
              [30, 0]
            )}px)`,
            opacity: interpolate(titleSpring, [0, 1], [0, 1]),
          }}
          className="space-y-3"
        >
          <div
            className={`font-black tracking-tight text-white/90 ${
              isReels ? "text-5xl sm:text-6xl" : isSquare ? "text-4xl" : "text-5xl"
            }`}
          >
            3 HAL YANG
          </div>
          <div
            className={`font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-amber-400 leading-none ${
              isReels ? "text-8xl sm:text-9xl" : isSquare ? "text-7xl" : "text-8xl"
            }`}
            style={{
              filter: "drop-shadow(0 0 45px rgba(239, 68, 68, 0.55))",
            }}
          >
            HARAM
          </div>
          <div
            className={`font-black tracking-tight text-white/95 ${
              isReels ? "text-4xl sm:text-5xl" : isSquare ? "text-3xl" : "text-4xl"
            }`}
          >
            KAMU LAKUKAN SAAT SURVEI
          </div>
        </div>

        {/* Faceless Character & Shield Graphic in Reels / Square */}
        <div className="mt-8 flex items-center justify-center gap-8 relative">
          {/* Faceless Vendor Character */}
          <div
            style={{
              transform: `scale(${charSpring})`,
              opacity: interpolate(charSpring, [0, 1], [0, 1]),
            }}
          >
            <FacelessVendor
              pose="scratch_head"
              scale={isReels ? 1.15 : isSquare ? 0.85 : 0.95}
            />
          </div>

          {/* Glowing Shield Alert */}
          <div
            style={{
              transform: `scale(${iconSpring * pulse})`,
              opacity: interpolate(iconSpring, [0, 1], [0, 1]),
            }}
            className="relative flex items-center justify-center"
          >
            <div className="absolute w-36 h-36 rounded-full bg-red-500/25 blur-2xl" />
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-red-600 to-rose-900 border-2 border-red-400/50 flex items-center justify-center shadow-2xl">
              <ShieldAlert className="w-12 h-12 sm:w-14 sm:h-14 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom hint */}
      <div className="text-xs font-semibold text-emerald-400/60 tracking-widest uppercase z-10">
        Estimator by Monefyi • Rahasia Anti Boncos & Anti Rugi
      </div>
    </div>
  );
};
