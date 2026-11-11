import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { HeartHandshake, Frown, XCircle, Clock, ZapOff } from "lucide-react";
import { BrandLockup } from "../components/BrandMark";
import { FacelessCustomer, FacelessVendor } from "../components/FacelessCharacters";

export const Scene3Tawaran: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isReels = height > width;
  const isSquare = height === width;

  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  const scaleTilt = Math.sin(frame / 12) * 5;

  const stampSpring = spring({
    frame: frame - 180,
    fps,
    config: { damping: 9, stiffness: 160 },
  });

  const cardsSpring = spring({
    frame: frame - 240,
    fps,
    config: { damping: 12, stiffness: 110 },
  });

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between items-center text-white select-none ${
        isReels ? "pt-16 pb-28 px-8" : isSquare ? "pt-10 pb-24 px-8" : "pt-12 pb-24 px-12"
      }`}
    >
      {/* Header */}
      <div className="w-full flex justify-between items-center z-10">
        <BrandLockup size={isReels ? 48 : 40} />
        <div className="bg-rose-500/20 border-2 border-rose-500/50 px-4 py-2 rounded-full text-xs font-black tracking-wider uppercase text-rose-300">
          KESALAHAN FATAL #3
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
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-red-800 flex items-center justify-center font-black text-3xl shadow-xl shadow-rose-500/40 border border-rose-300/30">
            03
          </div>
          <h2
            className={`font-black tracking-tight text-white leading-tight ${
              isReels ? "text-5xl sm:text-6xl" : isSquare ? "text-4xl sm:text-5xl" : "text-5xl"
            }`}
          >
            Salah <span className="text-rose-400">Menyikapi Tawaran</span>
          </h2>
          <p
            className={`text-white/80 font-medium ${
              isReels ? "text-xl max-w-[750px]" : "text-base sm:text-lg max-w-[650px]"
            }`}
          >
            Terlalu pelit customer kabur, terlalu tidak enakan margin habis.
          </p>
        </div>

        {/* Characters Encounter */}
        <div className="w-full flex justify-between items-center px-6 max-w-[850px]">
          <div className="flex flex-col items-center">
            <FacelessCustomer pose="bargaining" scale={isReels ? 1.15 : isSquare ? 0.95 : 1.05} />
            <span className="text-xs font-black text-amber-300 mt-2 uppercase bg-amber-950/60 border border-amber-500/40 px-3 py-0.5 rounded-full">
              Tawar Agresif
            </span>
          </div>

          <div className="flex flex-col items-center">
            <FacelessVendor pose="exhausted" scale={isReels ? 1.15 : isSquare ? 0.95 : 1.05} />
            <span className="text-xs font-black text-rose-400 mt-2 uppercase bg-rose-950/60 border border-rose-500/40 px-3 py-0.5 rounded-full">
              Tenaga Terkuras
            </span>
          </div>
        </div>

        {/* Dilemma Cards */}
        <div className="w-full bg-[#0E1B17] border-2 border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Terlalu Pelit */}
            <div
              style={{ transform: `rotate(${-scaleTilt}deg)` }}
              className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl flex flex-col items-center text-center gap-2"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                <Frown className="w-6 h-6 text-amber-400" />
              </div>
              <div className="text-base sm:text-lg font-black text-white">Terlalu Pelit</div>
              <div className="text-xs sm:text-sm text-white/70">
                Kaku tanpa solusi, customer langsung cari vendor lain.
              </div>
            </div>

            {/* Terlalu Tidak Enakan */}
            <div
              style={{ transform: `rotate(${scaleTilt}deg)` }}
              className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl flex flex-col items-center text-center gap-2"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center">
                <HeartHandshake className="w-6 h-6 text-rose-400" />
              </div>
              <div className="text-base sm:text-lg font-black text-white">Terlalu Tidak Enakan</div>
              <div className="text-xs sm:text-sm text-white/70">
                Asal iyakan potongan harga, modal sendiri nombok.
              </div>
            </div>
          </div>

          {/* Stamp "PROYEK KERJA BAKTI" */}
          {frame > 160 && (
            <div
              style={{
                transform: `scale(${interpolate(
                  stampSpring,
                  [0, 1],
                  [1.6, 1]
                )}) rotate(${interpolate(stampSpring, [0, 1], [-10, -2])}deg)`,
                opacity: interpolate(stampSpring, [0, 1], [0, 1]),
              }}
              className="border-4 border-red-500 bg-red-950/80 p-5 rounded-2xl text-center shadow-2xl shadow-red-500/50"
            >
              <div className="text-xs font-black text-red-300 tracking-widest uppercase">
                HASIL AKHIRNYA:
              </div>
              <div className="text-3xl sm:text-4xl font-black text-red-400 tracking-wider">
                PROYEK KERJA BAKTI!
              </div>
            </div>
          )}

          {/* 3 Badges: Sibuk, Capek, Untung = 0 */}
          {frame > 220 && (
            <div
              style={{
                transform: `scale(${cardsSpring})`,
                opacity: interpolate(cardsSpring, [0, 1], [0, 1]),
              }}
              className="grid grid-cols-3 gap-3 pt-2"
            >
              <div className="bg-red-500/15 border-2 border-red-500/30 p-3.5 rounded-2xl text-center">
                <Clock className="w-6 h-6 text-amber-400 mx-auto mb-1.5" />
                <div className="text-sm font-black text-white">SIBUK</div>
                <div className="text-xs text-white/60">Lembur siang malam</div>
              </div>

              <div className="bg-red-500/15 border-2 border-red-500/30 p-3.5 rounded-2xl text-center">
                <ZapOff className="w-6 h-6 text-rose-400 mx-auto mb-1.5" />
                <div className="text-sm font-black text-white">CAPEK</div>
                <div className="text-xs text-white/60">Tenaga terkuras</div>
              </div>

              <div className="bg-red-500/30 border-2 border-red-500 p-3.5 rounded-2xl text-center shadow-lg shadow-red-500/40">
                <XCircle className="w-6 h-6 text-red-400 mx-auto mb-1.5" />
                <div className="text-sm sm:text-base font-black text-red-400">UNTUNG = 0</div>
                <div className="text-xs text-red-200">Tidak ada sisa margin</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
