import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Flame, Snowflake, Sparkles, TrendingDown, Users, CheckCircle, Clock } from "lucide-react";
import { BrandLockup } from "../../EstimatorMotionVideo/components/BrandMark";
import { FacelessCustomer, FacelessVendor } from "../../EstimatorMotionVideo/components/FacelessCharacters";

export const Scene2EmosiDapur: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isReels = height > width;
  const isSquare = height === width;

  // Phase transition: 0-264 (Phase 1: Dapur Impian/Emosi Tinggi), 264-591 (Phase 2: Pulang/Bandingkan Vendor)
  const isPhase2 = frame >= 264;

  const enterSpring = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const phase2Spring = spring({ frame: frame - 264, fps, config: { damping: 14, stiffness: 100 } });

  // Emosi meter value
  const emotionLevel = interpolate(
    frame,
    [0, 180, 264, 450],
    [90, 100, 95, 30],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
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
        <div
          className={`border-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider ${
            isPhase2
              ? "bg-blue-500/20 border-blue-400/50 text-blue-300"
              : "bg-amber-500/20 border-amber-400/50 text-amber-300"
          }`}
        >
          {isPhase2 ? "KONDISI SETELAH PULANG" : "KONDISI SAAT SURVEI"}
        </div>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          transform: `scale(${interpolate(enterSpring, [0, 1], [0.94, 1])})`,
          opacity: interpolate(enterSpring, [0, 1], [0, 1]),
        }}
        className="w-full max-w-[1020px] my-auto flex flex-col items-center gap-6 z-10"
      >
        {/* Step Badge & Dynamic Title */}
        <div className="flex flex-col items-center text-center gap-2">
          <div
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs sm:text-sm font-black border ${
              isPhase2
                ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                : "bg-amber-500/20 border-amber-500/40 text-amber-300"
            }`}
          >
            {isPhase2 ? (
              <>
                <Snowflake className="w-4 h-4 text-blue-400" />
                <span>Emosi Menjadi Tenang & Mulai Kritis</span>
              </>
            ) : (
              <>
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Emosi 100% Membayangkan Impian</span>
              </>
            )}
          </div>

          <h2
            className={`font-black tracking-tight leading-tight ${
              isReels ? "text-4xl sm:text-5xl" : isSquare ? "text-3xl sm:text-4xl" : "text-4xl"
            }`}
          >
            {isPhase2 ? (
              <>
                Mulai Berpikir Ulang & <span className="text-blue-400">Bandingkan Vendor</span>
              </>
            ) : (
              <>
                Membayangkan <span className="text-amber-400">Dapur Impiannya</span>
              </>
            )}
          </h2>

          <p className="text-white/80 font-medium text-sm sm:text-base max-w-[700px]">
            {isPhase2
              ? "Perasaan mulai tenang. Calon klien mulai cari perbandingan, dan harga pertama yang didengar jadi patokan!"
              : "Perasaan lagi tinggi! Di momen survei ini, keputusan gampang banget diambil dengan hati."}
          </p>
        </div>

        {/* Dynamic Display: Visual Comparison */}
        <div
          className={`w-full flex items-center justify-center ${
            isReels ? "flex-col gap-6" : "flex-row gap-8"
          }`}
        >
          {/* Card / Demonstration Box */}
          <div className="flex-1 w-full bg-[#0E1B17] border-2 border-white/15 rounded-3xl p-6 shadow-2xl space-y-4 max-w-[560px]">
            {/* Emosi Meter Indicator */}
            <div className="space-y-1.5 pb-3 border-b border-white/10">
              <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider">
                <span className="text-white/70">Tingkat Emosi & Keputusan</span>
                <span
                  className={
                    emotionLevel > 60
                      ? "text-amber-400 font-black"
                      : "text-blue-400 font-black"
                  }
                >
                  {Math.round(emotionLevel)}% ({emotionLevel > 60 ? "Panas & Siap Beli" : "Dingin & Ragu"})
                </span>
              </div>
              <div className="w-full h-3.5 bg-white/10 rounded-full overflow-hidden p-0.5">
                <div
                  style={{ width: `${emotionLevel}%` }}
                  className={`h-full rounded-full ${
                    emotionLevel > 60
                      ? "bg-gradient-to-r from-amber-500 to-rose-500"
                      : "bg-gradient-to-r from-blue-500 to-indigo-500"
                  }`}
                />
              </div>
            </div>

            {!isPhase2 ? (
              /* Phase 1 View: Dapur Impian Card */
              <div className="space-y-3">
                <div className="bg-[#132A22] border border-emerald-500/40 rounded-2xl p-4 flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
                    <Sparkles className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">Kitchen Set Idaman</div>
                    <div className="text-xs text-white/70">
                      Finishing Duco Glossy, Top Table Marmer, Kabinet Tertata Rapi
                    </div>
                  </div>
                </div>

                <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3.5 text-xs sm:text-sm text-amber-200">
                  <span className="font-black text-amber-400 block mb-0.5">
                    "Kapan bisa mulai kerja mas? Cocok banget ini!"
                  </span>
                  Momen emas closing berada di puncaknya saat di hadapan customer.
                </div>
              </div>
            ) : (
              /* Phase 2 View: Bandingkan Vendor Lain */
              <div
                style={{
                  transform: `scale(${interpolate(phase2Spring, [0, 1], [0.95, 1])})`,
                }}
                className="space-y-2.5"
              >
                <div className="text-xs font-black text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-400" /> Penawaran yang Masuk ke Customer:
                </div>

                <div className="bg-blue-950/40 border-2 border-blue-500/50 p-3 rounded-2xl flex justify-between items-center text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-400" />
                    <div>
                      <span className="font-bold text-white block">Vendor B (Kirim Cepat)</span>
                      <span className="text-[11px] text-blue-300 font-semibold">Kirim 1 Jam Setelah Survei</span>
                    </div>
                  </div>
                  <div className="font-mono font-black text-blue-300 text-sm sm:text-base">
                    Rp 2.800.000/m
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl flex justify-between items-center text-xs sm:text-sm opacity-60">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <div>
                      <span className="font-bold text-white block">Vendor Anda</span>
                      <span className="text-[11px] text-amber-300">Belum Kirim (Masih Nunggu Besok)</span>
                    </div>
                  </div>
                  <div className="font-mono font-black text-white/60">
                    Menunggu...
                  </div>
                </div>

                <div className="bg-amber-500/20 border border-amber-500/40 p-2.5 rounded-xl text-center text-xs text-amber-300 font-black">
                  Harga Pertama yang Dia Dengar = Jadi Patokan!
                </div>
              </div>
            )}
          </div>

          {/* Faceless Character representing state */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <FacelessCustomer
              pose={isPhase2 ? "skeptical" : "pleased"}
              scale={isReels ? 1.2 : isSquare ? 1.05 : 1.15}
            />
            <span
              className={`text-xs font-black uppercase mt-2 border px-3 py-1 rounded-full ${
                isPhase2
                  ? "bg-blue-950/70 border-blue-500/40 text-blue-300"
                  : "bg-emerald-950/70 border-emerald-500/40 text-emerald-300"
              }`}
            >
              {isPhase2 ? "Customer Mulai Ragu" : "Customer Sangat Antusias"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

