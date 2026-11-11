import React from "react";
import { interpolate, spring, useVideoConfig } from "remotion";
import {
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  MessageCircle,
  MoreVertical,
  PenTool,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Wifi,
  Battery,
  AlertCircle,
  ArrowUpDown,
  Sliders,
} from "lucide-react";
import { BrandMark } from "./BrandMark";

export interface ExactEstimatorAppProps {
  sceneFrame: number;
  view?: "auto" | "dashboard" | "editor";
  scale?: number;
  dashboardSwitchFrame?: number;
  sizeChangeFrame?: number;
  safeDiscountFrame?: number;
  waModalFrame?: number;
}

export const ExactEstimatorApp: React.FC<ExactEstimatorAppProps> = ({
  sceneFrame,
  view = "auto",
  scale = 1,
  dashboardSwitchFrame = 60,
  sizeChangeFrame = 90,
  safeDiscountFrame = 210,
  waModalFrame = 270,
}) => {
  const { fps } = useVideoConfig();

  const currentView =
    view === "auto" ? (sceneFrame < dashboardSwitchFrame ? "dashboard" : "editor") : view;

  // Animation for size change in Phase 2:
  const changeAnim = spring({
    frame: sceneFrame - sizeChangeFrame,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  // Size changes from 3.8m -> 4.5m
  const currentSize = interpolate(changeAnim, [0, 1], [3.8, 4.5]).toFixed(1);
  const item1Price = Math.round(parseFloat(currentSize) * 2900000);
  const baseOtherItems = 11020000 + 4872000 + 6090000; // 21,982,000
  const totalPrice = item1Price + baseOtherItems; // from 33,002,000 to ~35,032,000
  const profit = Math.round(totalPrice * 0.36);

  // Safe discount sheet anim
  const sheetAnim = spring({
    frame: sceneFrame - safeDiscountFrame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // WhatsApp share modal anim
  const waModalAnim = spring({
    frame: sceneFrame - waModalFrame,
    fps,
    config: { damping: 12, stiffness: 110 },
  });

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "center center",
      }}
      className="relative w-[430px] h-[860px] bg-[#0A120F] rounded-[52px] p-3.5 shadow-[0_30px_70px_-10px_rgba(0,0,0,0.9)] border-[6px] border-[#2A3F37] flex flex-col overflow-hidden text-slate-800 font-sans select-none"
    >
      {/* Outer Metallic Rim Highlight */}
      <div className="absolute inset-0 rounded-[46px] border border-white/20 pointer-events-none z-40" />

      {/* Screen Inner Frame */}
      <div className="relative w-full h-full bg-[#F4F6F5] rounded-[42px] flex flex-col overflow-hidden">
        {/* iOS Dynamic Island & Status Bar */}
        <div className="w-full pt-3 px-7 flex justify-between items-center text-xs font-black text-slate-700 bg-white z-30">
          <span>09:41</span>
          <div className="w-26 h-5 bg-black rounded-full flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 mr-2" />
            <div className="w-2 h-2 rounded-full bg-neutral-800" />
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4" />
          </div>
        </div>

        {/* ============================================================== */}
        {/* VIEW 1: DASHBOARD VIEW (Exact match to left screenshot)        */}
        {/* ============================================================== */}
        {currentView === "dashboard" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Bar */}
            <div className="px-5 py-3 bg-white border-b border-slate-200 flex justify-between items-center z-20">
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1 w-5 cursor-pointer">
                  <div className="w-5 h-0.5 bg-slate-800 rounded" />
                  <div className="w-5 h-0.5 bg-slate-800 rounded" />
                  <div className="w-3.5 h-0.5 bg-slate-800 rounded" />
                </div>
                <div className="flex items-center gap-2">
                  <BrandMark size={28} />
                  <span className="text-lg font-black tracking-tight text-slate-900">
                    Estimator
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-slate-700" />
                </div>
                <div className="w-9 h-9 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-black text-sm">
                  h
                </div>
              </div>
            </div>

            {/* Dashboard Scrollable Body */}
            <div className="flex-1 p-4 space-y-3.5 overflow-hidden">
              {/* Hero Banner: Estimasi Baru 30 Hari */}
              <div className="bg-gradient-to-r from-[#157F5F] to-[#0D5B43] rounded-3xl p-5 text-white shadow-lg flex justify-between items-center">
                <div>
                  <div className="text-xs font-black tracking-wider uppercase text-emerald-200">
                    ESTIMASI BARU • 30 HARI
                  </div>
                  <div className="text-3xl font-black mt-1">
                    18 <span className="text-sm font-semibold text-emerald-100">dari 50 total</span>
                  </div>
                </div>

                <div className="bg-white text-[#157F5F] px-4 py-2 rounded-2xl font-black text-xs flex items-center gap-1.5 shadow-md">
                  <Plus className="w-4 h-4" /> Baru
                </div>
              </div>

              {/* Row Metric Cards: Active & Leads */}
              <div className="grid grid-cols-2 gap-3">
                {/* Blue Card: Active */}
                <div className="bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-3xl p-4 text-white shadow-md flex flex-col justify-between h-[105px]">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black tracking-wider uppercase text-blue-200">
                      ACTIVE
                    </span>
                    <ChevronRight className="w-4 h-4 text-blue-200" />
                  </div>
                  <div>
                    <div className="text-2xl font-black">
                      3 <span className="text-xs font-medium text-blue-100">project</span>
                    </div>
                    <div className="text-sm font-extrabold text-blue-100 font-mono">
                      Rp 76jt
                    </div>
                  </div>
                </div>

                {/* Purple Card: Leads */}
                <div className="bg-gradient-to-br from-[#6B21A8] to-[#9333EA] rounded-3xl p-4 text-white shadow-md flex flex-col justify-between h-[105px]">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black tracking-wider uppercase text-purple-200">
                      LEADS
                    </span>
                    <ChevronRight className="w-4 h-4 text-purple-200" />
                  </div>
                  <div>
                    <div className="text-2xl font-black">
                      12 <span className="text-xs font-medium text-purple-100">project</span>
                    </div>
                    <div className="text-sm font-extrabold text-purple-100 font-mono">
                      Rp 235jt
                    </div>
                  </div>
                </div>
              </div>

              {/* Notice Banner */}
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <div className="text-xs font-bold text-red-800">
                    15 estimasi mandek lebih dari 60 hari
                  </div>
                </div>
                <span className="bg-[#DC2626] text-white px-3 py-1 rounded-xl text-xs font-black">
                  Rapikan
                </span>
              </div>

              {/* Section Header: Semua Estimasi */}
              <div className="flex justify-between items-center pt-1">
                <div className="text-sm font-black text-slate-900">
                  Semua estimasi • 50
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                    <Search className="w-4 h-4" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Highlighted Project Card: 4m pontianak (Novia) */}
              <div className="bg-white border-2 border-emerald-500/80 rounded-3xl p-4 shadow-xl space-y-3 relative">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-slate-900">4m pontianak</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                        Terbaru
                      </span>
                    </div>
                    <div className="text-xs font-medium text-slate-500 mt-0.5">
                      Novia • Update 4 hari lalu
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-black font-mono text-slate-900">
                      Rp 33jt
                    </div>
                    <div className="text-xs font-bold font-mono text-emerald-700">
                      Rp 12jt
                    </div>
                  </div>
                </div>

                {/* 3 Metric Columns */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                  <div>
                    <div className="text-[9px] font-black text-slate-500 uppercase">NILAI PROYEK</div>
                    <div className="text-sm font-black font-mono text-slate-900 mt-0.5">Rp 33jt</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-black text-emerald-700 uppercase">EST. PROFIT</div>
                    <div className="text-sm font-black font-mono text-emerald-700 mt-0.5">Rp 12jt</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-black text-slate-500 uppercase">MARGIN</div>
                    <div className="text-sm font-black font-mono text-slate-900 mt-0.5">36%</div>
                  </div>
                </div>

                {/* Tags & Action Buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                    EST-2026-050
                  </span>
                  <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                    Lead
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                    WA
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <div className="bg-[#10B981] text-white text-xs font-black py-2 rounded-xl text-center shadow-md">
                    Follow-up WA
                  </div>
                  <div className="bg-slate-100 text-slate-700 text-xs font-bold py-2 rounded-xl text-center">
                    Ubah status
                  </div>
                  <div className="bg-slate-100 text-slate-700 text-xs font-bold py-2 rounded-xl text-center">
                    Arsipkan
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: MENGISI ESTIMASI VIEW (Exact match to right screenshot) */}
        {/* ============================================================== */}
        {currentView === "editor" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Bar with EST ID */}
            <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex justify-between items-center z-20">
              <div className="flex items-center gap-2">
                <span className="text-slate-700 text-base font-bold">‹</span>
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black px-2.5 py-0.5 rounded-lg">
                  EST-2026-050
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-slate-700" />
                </div>
                <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-black text-xs">
                  h
                </div>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 p-3.5 space-y-3 overflow-hidden">
              {/* Grand Emerald Banner: 4m pontianak */}
              <div className="bg-gradient-to-br from-[#0F5B42] to-[#0B4230] rounded-3xl p-5 text-white shadow-xl space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="bg-black/40 px-2.5 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1">
                      Draft <ChevronDown className="w-3.5 h-3.5" />
                    </span>
                    <span className="bg-black/20 px-2.5 py-1 rounded-xl text-xs font-medium">
                      Sumber: WA
                    </span>
                  </div>
                  <MoreVertical className="w-4 h-4 text-white/80" />
                </div>

                <div>
                  <h3 className="text-2xl font-black tracking-tight">4m pontianak</h3>
                  <div className="text-xs font-medium text-emerald-200 mt-0.5">Novia</div>
                </div>

                {/* Big Stats: Nilai Proyek & Est Profit */}
                <div className="pt-2 border-t border-white/20 flex justify-between items-end">
                  <div>
                    <div className="text-[10px] font-black uppercase text-emerald-200 tracking-wider">
                      NILAI PROYEK
                    </div>
                    <div className="text-2xl font-black font-mono tracking-tight text-white mt-0.5">
                      Rp {totalPrice.toLocaleString("id-ID")}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] font-black uppercase text-emerald-200 tracking-wider">
                      EST. PROFIT
                    </div>
                    <div className="text-lg font-black font-mono text-emerald-300 mt-0.5">
                      Rp {Math.round(profit / 1000000)}jt • 36%
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-emerald-200/80 pt-1">
                  4 item • Update baru saja
                </div>
              </div>

              {/* Detail Project Accordion */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3 flex justify-between items-center shadow-sm">
                <span className="text-xs font-black text-slate-800">Detail Project</span>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </div>

              {/* Rincian Produk Section */}
              <div className="flex justify-between items-center pt-1">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  RINCIAN PRODUK
                </span>
                <div className="bg-[#10B981] text-white px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1 shadow-sm">
                  <Plus className="w-3.5 h-3.5" /> Tambah
                </div>
              </div>

              {/* Item 1 (Expanded with Live Inputs) */}
              <div className="bg-white border-2 border-emerald-500 rounded-2xl p-3.5 shadow-md space-y-2.5">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-[#10B981] flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 leading-tight">
                        Kabinet Atas — Kitchen
                      </div>
                      <div className="text-[10px] font-semibold text-slate-500">
                        {currentSize} m × Rp 2.900.000
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black font-mono text-slate-900">
                      Rp {item1Price.toLocaleString("id-ID")}
                    </span>
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {/* Input Fields Row */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
                  <div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase">Ukuran</div>
                    <div className="bg-slate-50 border-2 border-emerald-500 text-emerald-800 font-mono font-black text-xs py-1.5 px-2 rounded-lg text-center mt-0.5">
                      {currentSize}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase">Satuan</div>
                    <div className="bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs py-1.5 px-2 rounded-lg text-center mt-0.5 flex justify-between items-center">
                      <span>m</span> <ChevronDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase">Harga / Satuan</div>
                    <div className="bg-emerald-50 border border-emerald-400 text-emerald-900 font-mono font-black text-xs py-1.5 px-2 rounded-lg text-right mt-0.5">
                      2.900.000
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] pt-1">
                  <span className="text-red-500 font-bold flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Hapus item
                  </span>
                  <span className="text-emerald-700 font-black">Hitungan Realtime ✓</span>
                </div>
              </div>

              {/* Item 2: Kabinet Bawah */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-[#10B981] flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Kabinet Bawah — Kitchen</div>
                    <div className="text-[10px] text-slate-500">3,8 m × Rp 2.900.000</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold font-mono text-slate-900">Rp 11.020.000</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Item 3: Lemari Elektronik */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-[#10B981] flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Lemari Elektronik — Kitchen</div>
                    <div className="text-[10px] text-slate-500">1,68 m × Rp 2.900.000</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold font-mono text-slate-900">Rp 4.872.000</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Bottom Sticky Action Bar (Exact match to right screenshot) */}
            <div className="p-3.5 bg-[#0B4A33] border-t border-emerald-800 text-white flex justify-between items-center z-30 shadow-2xl">
              <div>
                <div className="text-[9px] font-black tracking-wider uppercase text-emerald-200">
                  TOTAL PENAWARAN
                </div>
                <div className="text-lg font-black font-mono tracking-tight text-white mt-0.5">
                  Rp {totalPrice.toLocaleString("id-ID")}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-white/15 border border-white/30 text-white px-3 py-2 rounded-xl text-xs font-black">
                  Pratinjau
                </div>
                <div className="bg-white text-[#0B4A33] px-3.5 py-2 rounded-xl text-xs font-black shadow-lg flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-[#10B981]" /> Kirim WA
                </div>
              </div>
            </div>

            {/* Phase 3 Overlay: Batas Aman Diskon Sheet */}
            {sceneFrame >= safeDiscountFrame && sceneFrame < waModalFrame && (
              <div
                style={{
                  transform: `translateY(${interpolate(
                    sheetAnim,
                    [0, 1],
                    [280, 0]
                  )}px)`,
                  opacity: interpolate(sheetAnim, [0, 1], [0, 1]),
                }}
                className="absolute left-2.5 right-2.5 bottom-2 bg-gradient-to-b from-[#142620] to-[#0A1713] border-2 border-emerald-400 p-4 rounded-3xl shadow-2xl z-40 text-white"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm font-black text-white">Batas Aman Negosiasi</span>
                  </div>
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    Anti Rugi
                  </span>
                </div>
                <div className="text-xs text-white/80 mb-3">
                  Saat customer menawar, margin dijaga ketat agar tidak boncos:
                </div>
                <div className="bg-black/40 p-3 rounded-xl border border-emerald-500/30 flex justify-between items-center mb-2">
                  <span className="text-xs text-white/70 font-semibold">Batas Diskon Maks:</span>
                  <span className="text-sm font-mono font-black text-amber-400">Rp 2.000.000</span>
                </div>
                <div className="bg-emerald-950/70 p-3 rounded-xl border border-emerald-500/50 flex justify-between items-center">
                  <span className="text-xs text-emerald-300 font-extrabold">Margin Bersih Tetap:</span>
                  <span className="text-sm font-mono font-black text-emerald-400">Rp 10.600.000 (31%)</span>
                </div>
              </div>
            )}

            {/* Phase 4 Overlay: WhatsApp Share & Official PDF Modal */}
            {sceneFrame >= waModalFrame && (
              <div
                style={{
                  transform: `scale(${waModalAnim})`,
                  opacity: interpolate(waModalAnim, [0, 1], [0, 1]),
                }}
                className="absolute inset-3 bg-[#07130F] rounded-3xl p-5 flex flex-col justify-between z-50 border-2 border-emerald-500/50 text-white shadow-2xl"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#25D366] flex items-center justify-center mx-auto mb-2 shadow-lg shadow-[#25D366]/40">
                    <MessageCircle className="w-7 h-7 text-black" />
                  </div>
                  <div className="text-center font-black text-base text-white">
                    Kirim Penawaran ke WhatsApp
                  </div>
                  <div className="text-center text-xs text-white/70 mt-1">
                    Kirim rincian lengkap ke Novia (4m pontianak)
                  </div>

                  {/* PDF Document Preview Card */}
                  <div className="mt-4 bg-white text-slate-900 rounded-2xl p-4 shadow-lg space-y-2 text-left">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black text-emerald-800">MONEFYI ESTIMATOR</span>
                      <span className="text-[10px] text-slate-500 font-bold">PDF RESMI</span>
                    </div>
                    <div className="text-xs sm:text-sm font-black">Surat Penawaran: 4m pontianak</div>
                    <div className="text-xs text-slate-600">Total: Rp {totalPrice.toLocaleString("id-ID")}</div>
                    {/* Digital signature stamp */}
                    <div className="pt-2 flex items-center justify-end">
                      <div className="border border-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg text-[9px] text-emerald-800 font-black flex items-center gap-1.5 shadow-sm">
                        <PenTool className="w-3 h-3 text-emerald-700" /> TTD DIGITAL OTOMATIS
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
        )}
      </div>
    </div>
  );
};
