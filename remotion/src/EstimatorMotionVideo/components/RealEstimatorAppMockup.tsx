import React from "react";
import { interpolate, spring, useVideoConfig } from "remotion";
import {
  CheckCircle2,
  FileText,
  MessageCircle,
  PenTool,
  Send,
  ShieldCheck,
  Sliders,
  TrendingUp,
  Wifi,
  Battery,
} from "lucide-react";
import { BrandMark } from "./BrandMark";

export const RealEstimatorAppMockup: React.FC<{
  sceneFrame: number;
  scale?: number;
}> = ({ sceneFrame, scale = 1 }) => {
  const { fps } = useVideoConfig();

  const sliderAnim = spring({
    frame: sceneFrame - 210,
    fps,
    config: { damping: 14, stiffness: 90 },
  });

  const sheetAnim = spring({
    frame: sceneFrame - 360,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const waModalAnim = spring({
    frame: sceneFrame - 490,
    fps,
    config: { damping: 12, stiffness: 110 },
  });

  const area = Math.round(interpolate(sliderAnim, [0, 1], [28, 38]));
  const baseCost = Math.round(interpolate(sliderAnim, [0, 1], [13330000, 17850000]));
  const profit = Math.round(interpolate(sliderAnim, [0, 1], [4670000, 6150000]));
  const totalPrice = baseCost + profit;

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "center center",
      }}
      className="relative w-[410px] h-[800px] bg-[#0E1513] rounded-[48px] p-3.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border-[6px] border-[#2A3B35] flex flex-col overflow-hidden text-white font-sans select-none"
    >
      {/* Outer Metallic Rim Highlight */}
      <div className="absolute inset-0 rounded-[42px] border border-white/15 pointer-events-none" />

      {/* Screen Inner Frame */}
      <div className="relative w-full h-full bg-[#0B1210] rounded-[38px] flex flex-col overflow-hidden">
        {/* Dynamic Island / Notch */}
        <div className="w-full pt-3 px-6 flex justify-between items-center text-xs font-bold text-white/80 z-30">
          <span>09:41</span>
          <div className="w-24 h-5 bg-black rounded-full flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse mr-2" />
            <div className="w-2 h-2 rounded-full bg-neutral-800" />
          </div>
          <div className="flex items-center gap-1.5 text-white/80">
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4" />
          </div>
        </div>

        {/* Estimator App Top Nav */}
        <div className="px-5 pt-3 pb-3 bg-[#0F1B17] border-b border-emerald-900/40 flex justify-between items-center z-20">
          <div className="flex items-center gap-3">
            <BrandMark size={32} />
            <div>
              <div className="text-sm font-black text-white flex items-center gap-1.5">
                Estimator <span className="text-[10px] bg-emerald-500/25 text-emerald-400 px-2 py-0.5 rounded font-black border border-emerald-500/40">PRO</span>
              </div>
              <div className="text-xs text-white/60">Proyek Kanopi Alderon & Pagar</div>
            </div>
          </div>
          <div className="text-xs font-extrabold bg-emerald-500/10 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full">
            EST-2026/08
          </div>
        </div>

        {/* Scrollable App Body Content */}
        <div className="flex-1 overflow-hidden p-4 space-y-3 relative">
          {/* Client Header Card */}
          <div className="bg-[#121F1B] border border-emerald-500/20 rounded-2xl p-3.5 flex justify-between items-center">
            <div>
              <div className="text-[11px] font-black text-emerald-400 uppercase tracking-wider">
                Klien Survei
              </div>
              <div className="text-sm font-black text-white">Bpk. Hendra Gunawan</div>
              <div className="text-[11px] text-white/60">Pondok Indah, Jakarta Selatan</div>
            </div>
            <span className="text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-lg font-black">
              Aktif
            </span>
          </div>

          {/* Realtime Margin & Price Summary Card */}
          <div className="bg-gradient-to-br from-[#142A22] to-[#0D1C17] border-2 border-emerald-500/60 rounded-2xl p-4 shadow-xl shadow-emerald-500/15">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Transparansi Modal & Untung
              </span>
              <span className="text-[10px] bg-emerald-500 text-black px-2.5 py-0.5 rounded-full font-black">
                REALTIME
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/10">
              <div className="bg-black/40 p-2.5 rounded-xl border border-white/10">
                <div className="text-[10px] text-white/60 font-bold uppercase">Modal Material & Jasa</div>
                <div className="text-base font-black font-mono text-white mt-0.5">
                  Rp {baseCost.toLocaleString("id-ID")}
                </div>
              </div>
              <div className="bg-emerald-950/70 p-2.5 rounded-xl border border-emerald-500/50">
                <div className="text-[10px] text-emerald-300 font-extrabold uppercase">Untung Bersih (26%)</div>
                <div className="text-base font-black font-mono text-emerald-400 mt-0.5">
                  Rp {profit.toLocaleString("id-ID")}
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/15 flex justify-between items-center">
              <span className="text-xs sm:text-sm font-bold text-white/80">Total Penawaran Klien:</span>
              <span className="text-lg font-black font-mono text-emerald-300">
                Rp {totalPrice.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Dynamic Slider (Spec / Size Change in Phase 2) */}
          <div className="bg-[#121F1B] border border-white/10 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-white/90 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-400" /> Ukuran Luas Kanopi:
              </span>
              <span className="text-xs sm:text-sm font-mono font-black text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/40">
                {area} m²
              </span>
            </div>
            <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div
                style={{ width: `${interpolate(sliderAnim, [0, 1], [40, 85])}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
              />
            </div>
            <div className="text-[10px] text-white/50 italic flex justify-between">
              <span>Customer minta tambah panjang</span>
              <span className="text-emerald-400 font-bold">Auto-Recalculate ✓</span>
            </div>
          </div>

          {/* Itemized Table Breakdown */}
          <div className="bg-[#121F1B] border border-white/10 rounded-2xl p-3.5 space-y-2">
            <div className="text-[11px] font-black text-white/60 uppercase tracking-wider mb-1 flex justify-between items-center">
              <span>Item Material & Upah</span>
              <span className="text-emerald-400 text-[10px]">4 Item Terhitung</span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-xl">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-white/90 font-semibold">Besi Hollow Galvanis 4x4</span>
                </div>
                <span className="font-mono font-bold text-white/90">Rp 3.360.000</span>
              </div>

              <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-xl">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-white/90 font-semibold">Atap Alderon ({area} m²)</span>
                </div>
                <span className="font-mono font-bold text-white/90">
                  Rp {(area * 215000).toLocaleString("id-ID")}
                </span>
              </div>

              <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-xl">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-white/90 font-semibold">Upah Tukang & Fabrikasi</span>
                </div>
                <span className="font-mono font-bold text-white/90">Rp 2.800.000</span>
              </div>
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-md">
              <Send className="w-3.5 h-3.5" /> Kirim WA
            </button>
            <button className="bg-white/10 text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 border border-white/10">
              <FileText className="w-3.5 h-3.5 text-emerald-400" /> Surat PDF
            </button>
          </div>

          {/* Phase 3 Overlay: Batas Aman Diskon Sheet */}
          {sceneFrame > 350 && (
            <div
              style={{
                transform: `translateY(${interpolate(
                  sheetAnim,
                  [0, 1],
                  [280, 0]
                )}px)`,
                opacity: interpolate(sheetAnim, [0, 1], [0, 1]),
              }}
              className="absolute left-2 right-2 bottom-2 bg-gradient-to-b from-[#142620] to-[#0A1713] border-2 border-emerald-400 p-4 rounded-3xl shadow-2xl z-40 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-black text-white">
                    Batas Aman Negosiasi
                  </span>
                </div>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  Anti Rugi
                </span>
              </div>
              <div className="text-xs text-white/80 mb-3">
                Saat customer menawar, sistem menjaga agar margin tidak jebol:
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-emerald-500/30 flex justify-between items-center mb-2">
                <span className="text-xs text-white/70 font-semibold">Diskon Maksimal:</span>
                <span className="text-sm font-mono font-black text-amber-400">Rp 1.500.000</span>
              </div>
              <div className="bg-emerald-950/70 p-3 rounded-xl border border-emerald-500/50 flex justify-between items-center">
                <span className="text-xs text-emerald-300 font-extrabold">Margin Bersih Tetap:</span>
                <span className="text-sm font-mono font-black text-emerald-400">Rp 3.170.000 (20%)</span>
              </div>
            </div>
          )}

          {/* Phase 4 Overlay: WhatsApp Share & PDF Modal */}
          {sceneFrame > 480 && (
            <div
              style={{
                transform: `scale(${waModalAnim})`,
                opacity: interpolate(waModalAnim, [0, 1], [0, 1]),
              }}
              className="absolute inset-3 bg-black/90 backdrop-blur-md rounded-3xl p-5 flex flex-col justify-between z-50 border-2 border-emerald-500/50"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#25D366] flex items-center justify-center mx-auto mb-2 shadow-lg shadow-[#25D366]/40">
                  <MessageCircle className="w-7 h-7 text-black" />
                </div>
                <div className="text-center font-black text-base text-white">
                  Kirim Penawaran ke WhatsApp
                </div>
                <div className="text-center text-xs text-white/70 mt-1">
                  Kirim rincian lengkap ke Bpk. Hendra Gunawan
                </div>

                {/* PDF Document Preview Card */}
                <div className="mt-4 bg-white text-slate-900 rounded-2xl p-4 shadow-lg space-y-2 text-left">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                    <span className="text-xs font-black text-emerald-800">MONEFYI ESTIMATOR</span>
                    <span className="text-[10px] text-slate-500 font-bold">PDF RESMI</span>
                  </div>
                  <div className="text-xs sm:text-sm font-black">Surat Penawaran Harga Kanopi</div>
                  <div className="text-xs text-slate-600">Total: Rp {totalPrice.toLocaleString("id-ID")}</div>
                  {/* Digital signature stamp */}
                  <div className="pt-2 flex items-center justify-end">
                    <div className="border border-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg text-[9px] text-emerald-800 font-black flex items-center gap-1.5 shadow-sm">
                      <PenTool className="w-3 h-3 text-emerald-700" /> TTD DIGITAL VALID
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#25D366] text-black font-black text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-xl">
                <Send className="w-4 h-4" /> Buka WhatsApp Sekarang
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
