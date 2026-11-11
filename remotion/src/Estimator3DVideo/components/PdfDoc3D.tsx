import React from "react";
import { PenTool } from "lucide-react";
import { BrandMark } from "../../EstimatorMotionVideo/components/BrandMark";

export interface PdfDoc3DProps {
  scale?: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
}

export const PdfDoc3D: React.FC<PdfDoc3DProps> = ({
  scale = 1,
  rotX = 14,
  rotY = -12,
  rotZ = 2,
}) => {
  return (
    <div
      style={{
        transform: `scale(${scale}) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`,
        transformStyle: "preserve-3d",
      }}
      className="relative w-80 bg-white text-slate-800 rounded-2xl p-5 shadow-[0_30px_70px_rgba(0,0,0,0.85)] border border-slate-200 select-none"
    >
      {/* 3D Paper Thickness Layer Behind */}
      <div
        style={{
          transform: "translateZ(-8px)",
        }}
        className="absolute inset-0 bg-slate-300 rounded-2xl border border-slate-400"
      />

      {/* Top Letterhead */}
      <div className="flex justify-between items-center border-b-2 border-emerald-600 pb-2.5">
        <div className="flex items-center gap-2">
          <BrandMark size={26} />
          <div>
            <div className="text-xs font-black tracking-tight text-slate-900">MONEFYI ESTIMATOR</div>
            <div className="text-[8px] text-slate-500 font-bold">SURAT PENAWARAN HARGA RESMI</div>
          </div>
        </div>
        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-md">
          RESMI • PDF
        </span>
      </div>

      {/* Client Info */}
      <div className="pt-2.5 pb-2 text-left">
        <div className="text-[10px] text-slate-500 font-bold">Kepada Yth:</div>
        <div className="text-xs font-black text-slate-900">Ibu Novia — Pontianak</div>
        <div className="text-[9px] text-slate-600">Proyek: Kitchen Set Custom High-Pressure Laminate</div>
      </div>

      {/* Mini Table */}
      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 space-y-1.5 text-left">
        <div className="flex justify-between text-[9px] font-bold text-slate-500 border-b border-slate-200 pb-1">
          <span>DESKRIPSI ITEM</span>
          <span>TOTAL</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold text-slate-800">
          <span>Kabinet Atas 4.5m</span>
          <span className="font-mono">Rp 13.050.000</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold text-slate-800">
          <span>Kabinet Bawah Sink 3.8m</span>
          <span className="font-mono">Rp 11.020.000</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold text-slate-800">
          <span>Solid Surface Marble</span>
          <span className="font-mono">Rp 10.962.000</span>
        </div>
      </div>

      {/* Total Amount */}
      <div className="pt-3 flex justify-between items-center">
        <div>
          <div className="text-[8px] font-bold uppercase text-slate-400">TOTAL ESTIMASI</div>
          <div className="text-base font-black font-mono text-emerald-700">Rp 35.032.000</div>
        </div>

        {/* 3D Wax Seal / Digital Signature Stamp */}
        <div
          style={{
            transform: "translateZ(18px) rotate(-6deg)",
          }}
          className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-2 rounded-xl shadow-xl border-2 border-emerald-300 flex items-center gap-1.5"
        >
          <PenTool className="w-3.5 h-3.5 text-emerald-200" />
          <div className="text-left">
            <div className="text-[7px] font-black uppercase text-emerald-200">TERVERIFIKASI</div>
            <div className="text-[9px] font-black tracking-tight leading-none">TTD DIGITAL ✓</div>
          </div>
        </div>
      </div>
    </div>
  );
};
