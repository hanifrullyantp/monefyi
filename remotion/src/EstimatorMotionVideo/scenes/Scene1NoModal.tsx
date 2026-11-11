import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ArrowDownRight, CheckCircle2, Send, XCircle, AlertTriangle } from "lucide-react";
import { BrandLockup } from "../components/BrandMark";
import { FacelessVendor } from "../components/FacelessCharacters";

export const Scene1NoModal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isReels = height > width;
  const isSquare = height === width;

  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  const itemMissed = frame > 80;
  const profitLost = frame > 140;
  const sentAlert = frame > 200;

  const item3Spring = spring({
    frame: frame - 80,
    fps,
    config: { damping: 12, stiffness: 120 },
  });

  const profitDrop = spring({
    frame: frame - 140,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const alertSpring = spring({
    frame: frame - 200,
    fps,
    config: { damping: 12, stiffness: 140 },
  });

  const currentProfit = profitLost
    ? Math.round(interpolate(profitDrop, [0, 1], [2500000, -350000]))
    : 2500000;

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between items-center text-white select-none ${
        isReels ? "pt-16 pb-28 px-8" : isSquare ? "pt-10 pb-24 px-8" : "pt-12 pb-24 px-12"
      }`}
    >
      {/* Header */}
      <div className="w-full flex justify-between items-center z-10">
        <BrandLockup size={isReels ? 48 : 40} />
        <div className="bg-red-500/20 border-2 border-red-500/50 px-4 py-2 rounded-full text-xs font-black tracking-wider uppercase text-red-300">
          KESALAHAN FATAL #1
        </div>
      </div>

      {/* Main Container */}
      <div
        style={{
          transform: `scale(${interpolate(enterSpring, [0, 1], [0.94, 1])})`,
          opacity: interpolate(enterSpring, [0, 1], [0, 1]),
        }}
        className="w-full max-w-[1020px] my-auto flex flex-col items-center gap-6 z-10"
      >
        {/* Step Badge & Title */}
        <div className="flex flex-col items-center text-center gap-2.5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center font-black text-3xl shadow-xl shadow-red-500/40 border border-red-300/30">
            01
          </div>
          <h2
            className={`font-black tracking-tight text-white leading-tight ${
              isReels ? "text-5xl sm:text-6xl" : isSquare ? "text-4xl sm:text-5xl" : "text-5xl"
            }`}
          >
            Hitung Harga <span className="text-red-400">Tanpa Modal</span>
          </h2>
          <p
            className={`text-white/80 font-medium ${
              isReels ? "text-xl max-w-[750px]" : "text-base sm:text-lg max-w-[650px]"
            }`}
          >
            Hanya mengira-ngira harga borongan tanpa hitung rincian biaya riil.
          </p>
        </div>

        {/* Content Area: Card + Vendor */}
        <div
          className={`w-full flex items-center ${
            isReels
              ? "flex-col gap-6"
              : "flex-row justify-between gap-8"
          }`}
        >
          {/* Survey Card (Large, High-Contrast, Thumb-friendly) */}
          <div className="flex-1 w-full bg-[#0E1B17]/95 border-2 border-white/15 rounded-3xl p-6 sm:p-7 backdrop-blur-2xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/15">
              <span className="text-xs sm:text-sm font-black text-white/70 uppercase tracking-wider">
                Daftar Kebutuhan Material Survei
              </span>
              <span className="text-xs bg-red-500/25 border border-red-500/40 text-red-300 px-3 py-1 rounded-full font-black uppercase">
                Rawan Boncos
              </span>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-white/5 px-4 py-3.5 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <span className="font-bold text-base sm:text-lg text-white">
                    Besi Hollow 4x4 Galvanis (8 btg)
                  </span>
                </div>
                <span className="font-mono font-black text-base sm:text-lg text-emerald-300">
                  Rp 1.920.000
                </span>
              </div>

              <div className="flex justify-between items-center bg-white/5 px-4 py-3.5 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <span className="font-bold text-base sm:text-lg text-white">
                    Plat Strip & Engsel Bubut
                  </span>
                </div>
                <span className="font-mono font-black text-base sm:text-lg text-emerald-300">
                  Rp 650.000
                </span>
              </div>

              {/* Missed Item */}
              <div
                style={{
                  transform: itemMissed ? `scale(${item3Spring})` : "scale(1)",
                }}
                className={`flex justify-between items-center px-4 py-3.5 rounded-2xl border-2 transition-all duration-300 ${
                  itemMissed
                    ? "bg-red-500/20 border-red-500 shadow-xl shadow-red-500/30"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  {itemMissed ? (
                    <XCircle className="w-6 h-6 text-red-400 shrink-0 animate-bounce" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  )}
                  <div>
                    <div className="font-bold text-base sm:text-lg text-white">
                      Cat Epoxy + Ongkir Truk
                    </div>
                    {itemMissed && (
                      <div className="text-xs text-red-300 font-black uppercase flex items-center gap-1.5 mt-0.5">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        1 Item Ini Terlewat Dihitung!
                      </div>
                    )}
                  </div>
                </div>
                <span
                  className={`font-mono font-black text-base sm:text-lg ${
                    itemMissed ? "text-red-400 line-through" : "text-white/90"
                  }`}
                >
                  Rp 1.450.000
                </span>
              </div>
            </div>

            {/* Profit Bar */}
            <div
              className={`p-5 rounded-2xl border-2 transition-all duration-500 flex justify-between items-center ${
                profitLost
                  ? "bg-red-950/60 border-red-500 shadow-xl"
                  : "bg-emerald-950/60 border-emerald-500/60"
              }`}
            >
              <div>
                <div className="text-xs font-black text-white/70 uppercase tracking-wider">
                  Margin Untung Bersih
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {profitLost && <ArrowDownRight className="w-8 h-8 text-red-400 shrink-0" />}
                  <div
                    className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                      profitLost ? "text-red-400 animate-pulse" : "text-emerald-400"
                    }`}
                  >
                    {currentProfit < 0
                      ? `-Rp ${Math.abs(currentProfit).toLocaleString("id-ID")}`
                      : `+Rp ${currentProfit.toLocaleString("id-ID")}`}
                  </div>
                </div>
              </div>

              <div
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider ${
                  profitLost ? "bg-red-500 text-white animate-bounce shadow-lg" : "bg-emerald-500/20 text-emerald-300"
                }`}
              >
                {profitLost ? "UNTUNGMU HILANG!" : "PROFIT AMAN"}
              </div>
            </div>
          </div>

          {/* Faceless Vendor Character (Large & Integrated) */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <FacelessVendor
              pose={profitLost ? "panicking" : "scratch_head"}
              scale={isReels ? 1.2 : isSquare ? 1.05 : 1.15}
            />
          </div>
        </div>

        {/* WhatsApp Sent Alert */}
        {sentAlert && (
          <div
            style={{
              transform: `scale(${alertSpring})`,
              opacity: interpolate(alertSpring, [0, 1], [0, 1]),
            }}
            className="w-full bg-emerald-950/90 border-2 border-emerald-400/60 p-4 rounded-2xl flex items-center justify-between shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg">
                <Send className="w-5 h-5 text-black" />
              </div>
              <div className="text-left">
                <div className="text-sm font-black text-emerald-300">
                  Harga Sudah Terlanjur Dikirim ke Klien!
                </div>
                <div className="text-xs sm:text-sm text-white/90">
                  Baru sadar rugi setelah tagihan toko besi datang...
                </div>
              </div>
            </div>
            <span className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg font-black uppercase tracking-wider">
              Sudah Terlambat!
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
