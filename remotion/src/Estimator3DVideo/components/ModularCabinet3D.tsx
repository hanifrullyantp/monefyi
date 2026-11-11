import React from "react";
import { interpolate, spring, useVideoConfig } from "remotion";

export interface ModularCabinet3DProps {
  sceneFrame: number;
  scale?: number;
}

export const ModularCabinet3D: React.FC<ModularCabinet3DProps> = ({
  sceneFrame,
  scale = 1,
}) => {
  const { fps } = useVideoConfig();

  const stretchSpring = spring({
    frame: Math.max(0, sceneFrame - 15),
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  // Width expands from 260px -> 340px (representing 3.8m -> 4.5m)
  const currentWidth = interpolate(stretchSpring, [0, 1], [250, 330]);
  const sizeLabel = interpolate(stretchSpring, [0, 1], [3.8, 4.5]).toFixed(1);

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformStyle: "preserve-3d",
      }}
      className="relative flex flex-col items-center select-none"
    >
      {/* Dimension Label Badge Above */}
      <div
        style={{
          transform: "translateZ(30px)",
        }}
        className="mb-3 bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 px-3.5 py-1 rounded-full text-xs font-mono font-black shadow-lg"
      >
        Ukuran: {sizeLabel} meter 📐
      </div>

      {/* 3D Cabinet Isometric Box */}
      <div
        style={{
          width: `${currentWidth}px`,
          height: "170px",
          transformStyle: "preserve-3d",
          transform: "rotateX(20deg) rotateY(-25deg)",
        }}
        className="relative bg-gradient-to-br from-[#7C4A27] via-[#5C3215] to-[#3E1F0A] rounded-2xl border-2 border-[#A2673B] shadow-[0_25px_50px_rgba(0,0,0,0.8)] flex flex-col justify-between p-3.5 transition-all duration-150"
      >
        {/* Top Countertop Surface (Simulated marble) */}
        <div
          style={{
            transform: "translateZ(20px)",
          }}
          className="w-full h-8 bg-gradient-to-r from-slate-200 via-white to-slate-300 rounded-lg shadow-md flex items-center justify-between px-3 border border-slate-300"
        >
          <span className="text-[9px] font-black font-mono text-slate-800">SOLID SURFACE MARBLE</span>
          <div className="w-8 h-4 rounded-sm bg-slate-400 border border-slate-500" />
        </div>

        {/* Cabinet Door Sections (Expandable) */}
        <div className="flex-1 mt-2 grid grid-cols-3 gap-2">
          <div className="bg-[#4A2610] rounded-lg border border-[#8C5329] p-2 flex flex-col justify-between">
            <div className="w-1.5 h-6 bg-amber-200/80 rounded-full mx-auto" />
            <span className="text-[8px] text-amber-200/60 text-center font-bold">Rak 1</span>
          </div>
          <div className="bg-[#4A2610] rounded-lg border border-[#8C5329] p-2 flex flex-col justify-between">
            <div className="w-1.5 h-6 bg-amber-200/80 rounded-full mx-auto" />
            <span className="text-[8px] text-amber-200/60 text-center font-bold">Rak 2</span>
          </div>
          <div className="bg-[#4A2610] rounded-lg border border-emerald-400/80 p-2 flex flex-col justify-between shadow-lg">
            <div className="w-1.5 h-6 bg-emerald-300 rounded-full mx-auto" />
            <span className="text-[8px] text-emerald-300 text-center font-black">+ Extra</span>
          </div>
        </div>

        {/* Bottom Kickplate */}
        <div className="w-full h-3 bg-black/60 rounded mt-1 border-t border-black/80" />
      </div>

      {/* Realtime Calculation Pill Below */}
      <div
        style={{
          transform: "translateZ(20px)",
        }}
        className="mt-3 bg-[#0A1A14] border border-emerald-400/50 rounded-xl px-4 py-1.5 text-center text-xs font-black text-white shadow-md"
      >
        Subtotal:{" "}
        <span className="text-emerald-300 font-mono">
          Rp {(Math.round(parseFloat(sizeLabel) * 2900000)).toLocaleString("id-ID")}
        </span>
      </div>
    </div>
  );
};
