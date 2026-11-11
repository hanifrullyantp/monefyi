import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  Coins,
  Calculator,
} from "lucide-react";
import { BrandLockup } from "../components/BrandMark";
import { FacelessCustomer, FacelessVendor } from "../components/FacelessCharacters";

export const Scene3FilterHarga: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isReels = height > width;
  const isSquare = height === width;

  // Local Phases:
  // Phase 0 (0 - 240): Dua Langkah (1. Tanya Kebutuhan, 2. Langsung Beri Harga)
  // Phase 1 (240 - 325): Harga Adalah Saringan Paling Halus
  // Phase 2 (325 - 707): Otomatis Menyaring (Yang Belum Cukup Mundur / Yang Siap Minta Survei Tanpa Tersinggung)
  // Phase 3 (707 - 945): Jangan Tanya "Punya Uang Segini Tidak?", Tunjukkan Rincian!
  const activePhase =
    frame < 240 ? 0 : frame < 325 ? 1 : frame < 707 ? 2 : 3;

  const step1Spring = spring({ frame: frame - 40, fps, config: { damping: 12, stiffness: 120 } });
  const step2Spring = spring({ frame: frame - 120, fps, config: { damping: 12, stiffness: 120 } });
  const compareSpring = spring({ frame: frame - 715, fps, config: { damping: 12, stiffness: 110 } });

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
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>SARINGAN HARGA ELEGAN</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full my-auto flex flex-col items-center text-center z-10 max-w-[1000px]">
        {/* Phase Pill Badge */}
        <div className="inline-flex items-center gap-2.5 bg-emerald-500/20 border-2 border-emerald-400/60 px-5 py-2 rounded-full mb-3 shadow-xl">
          <Calculator className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-300 font-black tracking-wider text-xs sm:text-sm uppercase">
            {activePhase === 0 && "CARA MENYARING: 2 LANGKAH PRAKTIS"}
            {activePhase === 1 && "SARINGAN PALING HALUS & ELEGAN"}
            {activePhase === 2 && "CALON PEMBELI MEMUTUSKAN SENDIRI"}
            {activePhase === 3 && "ETIKA PROFESIONAL: RINCIAN VS UANG"}
          </span>
        </div>

        {/* Phase 0: 2 Langkah */}
        {activePhase === 0 && (
          <div className="space-y-3 w-full">
            <h1
              className={`font-black tracking-tight text-white ${
                isReels ? "text-5xl sm:text-6xl" : isSquare ? "text-4xl" : "text-5xl"
              }`}
            >
              LALU BAGAIMANA
            </h1>
            <h2
              className={`font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-green-300 ${
                isReels ? "text-6xl sm:text-7xl" : isSquare ? "text-5xl" : "text-6xl"
              }`}
            >
              CARA MENYARINGNYA?
            </h2>

            <div
              className={`grid ${
                isReels ? "grid-cols-1 gap-4 mt-6 max-w-md mx-auto" : "grid-cols-2 gap-6 mt-6 max-w-2xl mx-auto"
              }`}
            >
              {/* Step 1 */}
              <div
                style={{
                  transform: `scale(${step1Spring}) translateY(${interpolate(step1Spring, [0, 1], [30, 0])}px)`,
                  opacity: interpolate(step1Spring, [0, 1], [0, 1]),
                }}
                className="bg-slate-900/80 border-2 border-emerald-500/60 rounded-3xl p-5 text-left flex items-start gap-4 shadow-xl"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/40">
                  1
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-emerald-400">LANGKAH PERTAMA</div>
                  <div className="text-xl font-black text-white mt-0.5">Tanyakan Kebutuhannya</div>
                  <div className="text-xs text-slate-300 mt-1 font-medium">
                    Ukuran, model, bahan, & lokasi pengerjaan
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div
                style={{
                  transform: `scale(${step2Spring}) translateY(${interpolate(step2Spring, [0, 1], [30, 0])}px)`,
                  opacity: interpolate(step2Spring, [0, 1], [0, 1]),
                }}
                className="bg-gradient-to-br from-[#0B2E24] to-[#064E3B] border-2 border-emerald-400 rounded-3xl p-5 text-left flex items-start gap-4 shadow-2xl shadow-emerald-500/30"
              >
                <div className="w-12 h-12 rounded-2xl bg-white text-emerald-800 font-black text-xl flex items-center justify-center shrink-0 shadow-lg">
                  2
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-emerald-200">LANGKAH KEDUA</div>
                  <div className="text-xl font-black text-white mt-0.5">Langsung Beri Harga!</div>
                  <div className="text-xs text-emerald-200 mt-1 font-medium">
                    Kirim estimasi transparan tanpa berbelit-belit
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase 1: Harga Adalah Saringan Paling Halus */}
        {activePhase === 1 && (
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border-2 border-emerald-400/50 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30">
              <Coins className="w-10 h-10 text-emerald-400 animate-bounce" />
            </div>
            <h1
              className={`font-black tracking-tight text-white leading-tight ${
                isReels ? "text-5xl sm:text-6xl" : isSquare ? "text-4xl" : "text-5xl"
              }`}
            >
              HARGA ADALAH
            </h1>
            <h2
              className={`font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-emerald-300 to-teal-200 ${
                isReels ? "text-6xl sm:text-7xl" : isSquare ? "text-5xl" : "text-6xl"
              }`}
              style={{ filter: "drop-shadow(0 0 40px rgba(16, 185, 129, 0.5))" }}
            >
              SARINGAN PALING HALUS
            </h2>
            <p className="text-emerald-300 font-black text-xl sm:text-2xl pt-2">
              Biar angka riil yang berbicara, tanpa perlu interogasi canggung!
            </p>
          </div>
        )}

        {/* Phase 2: Yang Belum Cukup Mundur / Yang Siap Minta Survei */}
        {activePhase === 2 && (
          <div className="space-y-3 w-full">
            <h2
              className={`font-black tracking-tight text-white ${
                isReels ? "text-4xl sm:text-5xl" : isSquare ? "text-3xl" : "text-4xl"
              }`}
            >
              KAMU TIDAK PERLU TANYA SOAL UANG
            </h2>

            <div
              className={`grid ${
                isReels ? "grid-cols-1 gap-4 mt-4 max-w-md mx-auto" : "grid-cols-2 gap-6 mt-4 max-w-2xl mx-auto"
              }`}
            >
              {/* Box A: Dana Belum Cukup */}
              <div className="bg-slate-900/80 border border-slate-700/80 rounded-3xl p-4 text-left flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-black">
                  ℹ️
                </div>
                <div>
                  <div className="text-xs font-black text-amber-300 uppercase">DANA BELUM CUKUP</div>
                  <div className="text-base font-black text-white mt-0.5">Mundur dengan Sendirinya</div>
                  <p className="text-xs text-slate-300 mt-1">
                    Atau jadi paham spesifikasi mana yang perlu disesuaikan & dikurangi.
                  </p>
                </div>
              </div>

              {/* Box B: Dana Siap */}
              <div className="bg-emerald-950/80 border-2 border-emerald-500/80 rounded-3xl p-4 text-left flex items-start gap-3.5 shadow-xl shadow-emerald-500/20">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 font-black">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-black text-emerald-300 uppercase">DANA SUDAH SIAP</div>
                  <div className="text-base font-black text-white mt-0.5">Langsung Minta Survei!</div>
                  <p className="text-xs text-emerald-100 mt-1 font-bold">
                    Tanpa ada yang merasa tersinggung atau diremehkan!
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-center gap-6">
              <FacelessCustomer pose="pleased" scale={0.85} />
              <FacelessVendor pose="confident" scale={0.85} />
            </div>
          </div>
        )}

        {/* Phase 3: Contrast - Jangan Tanya "Bapak Punya Uang Segini Tidak?", Tunjukkan Rincian! */}
        {activePhase === 3 && (
          <div
            style={{
              transform: `scale(${interpolate(compareSpring, [0, 1], [0.92, 1])})`,
              opacity: interpolate(compareSpring, [0, 1], [0, 1]),
            }}
            className="space-y-4 w-full"
          >
            <div
              className={`grid ${
                isReels ? "grid-cols-1 gap-4 max-w-md mx-auto" : "grid-cols-2 gap-6 max-w-3xl mx-auto"
              }`}
            >
              {/* Bad approach */}
              <div className="bg-red-950/50 border-2 border-red-500/60 rounded-3xl p-5 text-left space-y-2 shadow-xl">
                <div className="flex items-center gap-2 text-red-400 font-black text-xs uppercase tracking-wider">
                  <XCircle className="w-4 h-4 text-red-500" /> JANGAN PERNAH TANYA INI
                </div>
                <div className="text-xl font-black text-red-200">
                  "Bapak punya uang segini tidak?"
                </div>
                <p className="text-xs text-red-300/80">
                  Menyinggung perasaan customer, terkesan meremehkan dan tidak profesional.
                </p>
              </div>

              {/* Good approach */}
              <div className="bg-emerald-950/70 border-2 border-emerald-400 rounded-3xl p-5 text-left space-y-2 shadow-2xl shadow-emerald-500/30">
                <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> SOLUSI ESTIMATOR
                </div>
                <div className="text-xl font-black text-emerald-200">
                  Cukup Tunjukkan Rincian!
                </div>
                <p className="text-xs text-emerald-100 font-medium">
                  Supaya customer langsung tahu persis berapa anggaran yang perlu disiapkan.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center pt-2">
              <FacelessVendor pose="confident" scale={0.9} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
