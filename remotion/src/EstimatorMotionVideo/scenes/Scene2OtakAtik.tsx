import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Calculator, MessageSquare, ShieldX, HelpCircle } from "lucide-react";
import { BrandLockup } from "../components/BrandMark";
import { FacelessCustomer, FacelessVendor } from "../components/FacelessCharacters";

export const Scene2OtakAtik: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isReels = height > width;
  const isSquare = height === width;

  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  const chatSpring = spring({
    frame: frame - 50,
    fps,
    config: { damping: 12, stiffness: 110 },
  });

  const panicSpring = spring({
    frame: frame - 160,
    fps,
    config: { damping: 10, stiffness: 90 },
  });

  const doubtSpring = spring({
    frame: frame - 260,
    fps,
    config: { damping: 12, stiffness: 120 },
  });

  const trustLossSpring = spring({
    frame: frame - 360,
    fps,
    config: { damping: 15, stiffness: 90 },
  });

  const trustPercent = Math.max(
    15,
    Math.round(interpolate(trustLossSpring, [0, 1], [100, 20]))
  );

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between items-center text-white select-none ${
        isReels ? "pt-16 pb-28 px-8" : isSquare ? "pt-10 pb-24 px-8" : "pt-12 pb-24 px-12"
      }`}
    >
      {/* Header */}
      <div className="w-full flex justify-between items-center z-10">
        <BrandLockup size={isReels ? 48 : 40} />
        <div className="bg-amber-500/20 border-2 border-amber-500/50 px-4 py-2 rounded-full text-xs font-black tracking-wider uppercase text-amber-300">
          KESALAHAN FATAL #2
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          transform: `scale(${interpolate(enterSpring, [0, 1], [0.94, 1])})`,
          opacity: interpolate(enterSpring, [0, 1], [0, 1]),
        }}
        className="w-full max-w-[1020px] my-auto flex flex-col items-center gap-6 z-10"
      >
        {/* Title */}
        <div className="flex flex-col items-center text-center gap-2.5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center font-black text-3xl shadow-xl shadow-amber-500/40 border border-amber-300/30">
            02
          </div>
          <h2
            className={`font-black tracking-tight text-white leading-tight ${
              isReels ? "text-5xl sm:text-6xl" : isSquare ? "text-4xl sm:text-5xl" : "text-5xl"
            }`}
          >
            Salah <span className="text-amber-400">Memberi Harga</span>
          </h2>
          <p
            className={`text-white/80 font-medium ${
              isReels ? "text-xl max-w-[750px]" : "text-base sm:text-lg max-w-[650px]"
            }`}
          >
            Customer mulai otak-atik spesifikasi... hitunganmu malah meleset.
          </p>
        </div>

        {/* Characters Encounter Row */}
        <div className="w-full flex justify-between items-center px-6 max-w-[850px]">
          <div className="flex flex-col items-center">
            <FacelessCustomer pose="skeptical" scale={isReels ? 1.15 : isSquare ? 0.95 : 1.05} />
            <span className="text-xs font-black text-blue-400 mt-2 uppercase tracking-wider bg-blue-950/60 border border-blue-500/40 px-3 py-0.5 rounded-full">
              Customer
            </span>
          </div>

          <div className="flex flex-col items-center text-center px-4">
            <span className="text-3xl font-black text-amber-400 text-glow-amber">VS</span>
            <span className="text-xs font-bold text-white/50 uppercase tracking-widest mt-1">Negosiasi</span>
          </div>

          <div className="flex flex-col items-center">
            <FacelessVendor pose={frame > 220 ? "panicking" : "scratch_head"} scale={isReels ? 1.15 : isSquare ? 0.95 : 1.05} />
            <span className="text-xs font-black text-emerald-400 mt-2 uppercase tracking-wider bg-emerald-950/60 border border-emerald-500/40 px-3 py-0.5 rounded-full">
              Kontraktor
            </span>
          </div>
        </div>

        {/* Customer Interaction Dialogue Card */}
        <div className="w-full bg-[#0E1B17] border-2 border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
          {/* Customer Chat Bubble */}
          <div
            style={{
              transform: `scale(${chatSpring})`,
              opacity: interpolate(chatSpring, [0, 1], [0, 1]),
            }}
            className="flex items-start gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl"
          >
            <div className="w-11 h-11 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-xs font-black text-blue-300 mb-1 uppercase tracking-wider">
                Customer Tanya Saat Survei:
              </div>
              <div className="text-base sm:text-lg font-bold text-white leading-snug">
                "Mas, kalau kisi-kisinya diganti kayu solid & tebal plat ditambah, jadi berapa totalnya?"
              </div>
            </div>
          </div>

          {/* Calculator Panic */}
          {frame > 140 && (
            <div
              style={{
                transform: `scale(${panicSpring})`,
                opacity: interpolate(panicSpring, [0, 1], [0, 1]),
              }}
              className="p-4 rounded-2xl bg-amber-950/50 border-2 border-amber-500/50 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Calculator className="w-7 h-7 text-amber-400 shrink-0" />
                <div className="text-left">
                  <div className="text-xs font-black text-amber-300 uppercase tracking-wider">
                    Hitungan Manual Tanpa Rumus Pasti
                  </div>
                  <div className="text-xs sm:text-sm text-white/90">
                    Menebak-nebak harga di depan calon klien...
                  </div>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400 flex items-center gap-1.5">
                Rp ??? <HelpCircle className="w-5 h-5 text-amber-400" />
              </div>
            </div>
          )}

          {/* Customer Reaction */}
          {frame > 240 && (
            <div
              style={{
                transform: `scale(${doubtSpring})`,
                opacity: interpolate(doubtSpring, [0, 1], [0, 1]),
              }}
              className="p-4 rounded-2xl bg-red-950/60 border-2 border-red-500/60 flex items-center gap-3.5 text-left"
            >
              <ShieldX className="w-7 h-7 text-red-400 shrink-0" />
              <div>
                <div className="text-xs font-black text-red-400 uppercase tracking-wider">
                  Reaksi Customer
                </div>
                <div className="text-base sm:text-lg font-black text-white">
                  "Kok jadinya jauh lebih mahal?! Angkanya bener nggak nih?"
                </div>
              </div>
            </div>
          )}

          {/* Trust Gauge */}
          <div className="pt-3 border-t border-white/15 space-y-2">
            <div className="flex justify-between items-center text-xs sm:text-sm font-black uppercase">
              <span className="text-white/70">Kepercayaan Customer</span>
              <span className={trustPercent < 50 ? "text-red-400 font-black" : "text-emerald-400"}>
                {trustPercent}% (Rusak Karena 1 Angka Ragu)
              </span>
            </div>
            <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden p-0.5">
              <div
                style={{ width: `${trustPercent}%` }}
                className={`h-full rounded-full ${
                  trustPercent < 50 ? "bg-gradient-to-r from-red-600 to-amber-500 shadow-lg" : "bg-emerald-500"
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
