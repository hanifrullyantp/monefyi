import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Filter, Snowflake, Clock, Flame, ArrowDown } from "lucide-react";
import { BrandLockup } from "../components/BrandMark";
import { FacelessCustomer, FacelessVendor } from "../components/FacelessCharacters";

export const Scene2Funneling: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const isReels = height > width;
  const isSquare = height === width;

  // Local phases:
  // Phase 0: (0 - 277): Konsep Funneling & Lapis demi Lapis
  // Phase 1: (277 - 464): 1. DINGIN (Cuma tanya harga, dana belum ada)
  // Phase 2: (464 - 592): 2. HANGAT (Dana ada, tapi beli nanti)
  // Phase 3: (592 - 896): 3. PANAS (Dana ada, mau buat SEKARANG! Prioritas Utama!)
  const activePhase =
    frame < 277 ? 0 : frame < 464 ? 1 : frame < 592 ? 2 : 3;

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between items-center text-white select-none ${
        isReels ? "pt-16 pb-28 px-6" : isSquare ? "pt-10 pb-20 px-8" : "pt-12 pb-20 px-12"
      }`}
    >
      {/* Top Header */}
      <div className="w-full flex justify-between items-center z-20">
        <BrandLockup size={isReels ? 46 : 40} />
        <div className="bg-emerald-950/70 border border-emerald-500/40 px-4 py-1.5 rounded-full text-xs font-bold text-emerald-300 flex items-center gap-2 shadow-lg">
          <Filter className="w-3.5 h-3.5 text-emerald-400" />
          <span>FUNNELING METRICS</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full my-auto flex flex-col items-center text-center z-10 max-w-[1000px]">
        {/* Phase Pill Badge */}
        <div className="inline-flex items-center gap-2.5 bg-emerald-500/20 border-2 border-emerald-400/60 px-5 py-2 rounded-full mb-3 shadow-xl">
          <Filter className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-300 font-black tracking-wider text-xs sm:text-sm uppercase">
            {activePhase === 0 && "SARING CALON PEMBELI LAPIS DEMI LAPIS"}
            {activePhase === 1 && "KATEGORI 1: LEADS DINGIN"}
            {activePhase === 2 && "KATEGORI 2: LEADS HANGAT"}
            {activePhase === 3 && "KATEGORI 3: LEADS PANAS (PRIORITAS)"}
          </span>
        </div>

        {/* Dynamic Headings */}
        {activePhase === 0 && (
          <div className="space-y-2">
            <h1
              className={`font-black tracking-tight text-white ${
                isReels ? "text-5xl sm:text-6xl" : isSquare ? "text-4xl" : "text-5xl"
              }`}
            >
              KAMU BUTUH
            </h1>
            <h2
              className={`font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 ${
                isReels ? "text-7xl sm:text-8xl" : isSquare ? "text-6xl" : "text-7xl"
              }`}
              style={{ filter: "drop-shadow(0 0 35px rgba(16, 185, 129, 0.45))" }}
            >
              FUNNELING
            </h2>
            <p className="text-slate-300 font-bold text-base sm:text-xl max-w-xl mx-auto pt-1">
              Menyaring calon pembeli secara sistematis lapis demi lapis
            </p>
          </div>
        )}

        {activePhase === 1 && (
          <div className="space-y-2">
            <div className="inline-block bg-sky-500/20 text-sky-400 border border-sky-400/40 px-3 py-1 rounded-xl text-xs font-black">
              1. TEMPERATUR DINGIN ❄️
            </div>
            <h2
              className={`font-black tracking-tight text-sky-400 ${
                isReels ? "text-6xl sm:text-7xl" : isSquare ? "text-5xl" : "text-6xl"
              }`}
              style={{ filter: "drop-shadow(0 0 30px rgba(56, 189, 248, 0.4))" }}
            >
              CUMA TANYA HARGA
            </h2>
            <p className="text-slate-300 font-extrabold text-base sm:text-xl">
              Sekadar membandingkan • <span className="text-red-400">Dananya belum ada</span>
            </p>
          </div>
        )}

        {activePhase === 2 && (
          <div className="space-y-2">
            <div className="inline-block bg-amber-500/20 text-amber-400 border border-amber-400/40 px-3 py-1 rounded-xl text-xs font-black">
              2. TEMPERATUR HANGAT ⏳
            </div>
            <h2
              className={`font-black tracking-tight text-amber-400 ${
                isReels ? "text-6xl sm:text-7xl" : isSquare ? "text-5xl" : "text-6xl"
              }`}
              style={{ filter: "drop-shadow(0 0 30px rgba(245, 158, 11, 0.4))" }}
            >
              DANANYA ADA
            </h2>
            <p className="text-slate-300 font-extrabold text-base sm:text-xl">
              Tapi <span className="text-amber-300">belinya nanti</span> / sedang menimbang waktu
            </p>
          </div>
        )}

        {activePhase === 3 && (
          <div className="space-y-2">
            <div className="inline-block bg-red-500/20 text-red-400 border border-red-400/40 px-3 py-1 rounded-xl text-xs font-black animate-pulse">
              3. TEMPERATUR PANAS 🔥 (GOLDEN LEADS)
            </div>
            <h2
              className={`font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-amber-300 ${
                isReels ? "text-6xl sm:text-7xl" : isSquare ? "text-5xl" : "text-6xl"
              }`}
              style={{ filter: "drop-shadow(0 0 35px rgba(239, 68, 68, 0.5))" }}
            >
              PRIORITAS UTAMAMU!
            </h2>
            <p className="text-emerald-400 font-black text-lg sm:text-2xl">
              Dananya Siap & Mau Buat Sekarang! ⚡ Balas Cepat!
            </p>
          </div>
        )}

        {/* Funnel Visual Graphic Container */}
        <div
          className={`w-full mt-6 flex ${
            isReels ? "flex-col items-center gap-6" : "flex-row items-center justify-center gap-8"
          }`}
        >
          {/* Visual Funnel Stack (3 Tiers) */}
          <div className="w-full max-w-md flex flex-col items-center gap-3">
            {/* Tier 1: Cold */}
            <div
              className={`w-full transition-all duration-300 rounded-3xl p-4 flex items-center justify-between border-2 ${
                activePhase === 1
                  ? "bg-sky-950/80 border-sky-400 scale-105 shadow-[0_0_30px_rgba(56,189,248,0.3)]"
                  : "bg-slate-900/60 border-slate-700/60 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center">
                  <Snowflake className="w-6 h-6 text-sky-400" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-black text-sky-300">1. DINGIN (COLD)</div>
                  <div className="text-xs text-slate-300 font-medium">Cuma tanya • Membandingkan • Belum ada dana</div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold bg-sky-900/60 px-2.5 py-1 rounded-lg text-sky-200">
                Lapis 1
              </span>
            </div>

            <ArrowDown className="w-5 h-5 text-slate-600" />

            {/* Tier 2: Warm */}
            <div
              className={`w-[90%] transition-all duration-300 rounded-3xl p-4 flex items-center justify-between border-2 ${
                activePhase === 2
                  ? "bg-amber-950/80 border-amber-400 scale-105 shadow-[0_0_30px_rgba(245,158,11,0.3)]"
                  : "bg-slate-900/60 border-slate-700/60 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-400" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-black text-amber-300">2. HANGAT (WARM)</div>
                  <div className="text-xs text-slate-300 font-medium">Dana ada • Belinya nanti</div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold bg-amber-900/60 px-2.5 py-1 rounded-lg text-amber-200">
                Lapis 2
              </span>
            </div>

            <ArrowDown className="w-5 h-5 text-slate-600" />

            {/* Tier 3: Hot */}
            <div
              className={`w-[80%] transition-all duration-300 rounded-3xl p-4 flex items-center justify-between border-2 ${
                activePhase === 3
                  ? "bg-gradient-to-r from-red-950/90 to-orange-950/90 border-red-500 scale-105 shadow-[0_0_35px_rgba(239,68,68,0.4)]"
                  : "bg-slate-900/60 border-slate-700/60 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-400/40 flex items-center justify-center animate-pulse">
                  <Flame className="w-6 h-6 text-red-400" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-black text-red-300">3. PANAS (HOT LEADS)</div>
                  <div className="text-xs text-slate-200 font-bold">Dana siap • Mau buat sekarang!</div>
                </div>
              </div>
              <span className="text-xs font-mono font-black bg-red-600 text-white px-2.5 py-1 rounded-lg animate-bounce">
                CLOSING!
              </span>
            </div>
          </div>

          {/* Faceless Characters Acting Out The Stages */}
          <div className="flex items-end justify-center gap-4">
            {activePhase === 1 && (
              <div className="flex flex-col items-center">
                <FacelessCustomer pose="skeptical" scale={isReels ? 1 : 0.9} />
                <span className="mt-2 text-xs font-black bg-slate-800 text-sky-300 px-3 py-1 rounded-full border border-sky-400/40">
                  "Masih survei-survei dulu ya mas..."
                </span>
              </div>
            )}

            {activePhase === 2 && (
              <div className="flex flex-col items-center">
                <FacelessCustomer pose="bargaining" scale={isReels ? 1 : 0.9} />
                <span className="mt-2 text-xs font-black bg-slate-800 text-amber-300 px-3 py-1 rounded-full border border-amber-400/40">
                  "Ada dananya, tapi proyeknya bulan depan"
                </span>
              </div>
            )}

            {activePhase === 3 && (
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <FacelessCustomer pose="pleased" scale={isReels ? 0.95 : 0.85} />
                  <span className="mt-2 text-xs font-black bg-slate-800 text-emerald-300 px-3 py-1 rounded-full border border-emerald-400/40">
                    "Cocok! Segera survei & SPK ya!"
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <FacelessVendor pose="confident" scale={isReels ? 1 : 0.9} />
                  <span className="mt-2 text-xs font-black bg-emerald-600 text-white px-3 py-1 rounded-full shadow-lg">
                    Balas Cepat! Siap Kerjakan 👍
                  </span>
                </div>
              </div>
            )}

            {activePhase === 0 && (
              <div className="flex items-center gap-4">
                <FacelessCustomer pose="inquiring" scale={0.9} />
                <FacelessVendor pose="scratch_head" scale={0.9} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
