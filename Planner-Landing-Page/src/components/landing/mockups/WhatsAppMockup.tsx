import { FileText, FileDown, CheckCheck } from "lucide-react";

export function WhatsAppMockup() {
  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
      {/* WA Header */}
      <div className="bg-emerald-600 text-white px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-emerald-500 font-semibold flex items-center justify-center text-sm flex-shrink-0">
          BA
        </div>
        <div>
          <p className="font-semibold text-sm">Bpk Andi</p>
          <p className="text-xs text-emerald-100">online</p>
        </div>
      </div>

      {/* Body */}
      <div className="chat-pattern min-h-[380px] p-4 space-y-3">
        {/* Bubble klien */}
        <div className="max-w-[75%]">
          <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-sm">
            <p className="text-sm text-slate-700">
              Halo, mau tanya renovasi kamar mandi 2x3 kira-kira berapa
            </p>
            <p className="text-[10px] text-slate-400 mt-1">12:30 PM</p>
          </div>
        </div>

        {/* Bubble Anda */}
        <div className="max-w-[80%] ml-auto">
          <div className="bg-emerald-100 rounded-2xl rounded-tr-none p-3 shadow-sm">
            <p className="text-sm text-slate-700">Selamat siang Pak, untuk renovasi kamar mandi 2x3 dengan spek standar, estimasi:</p>
            <p className="font-bold text-slate-900 my-2 text-base">Rp 25.000.000 — Rp 35.000.000</p>
            
            {/* Attachment */}
            <div className="bg-white/70 rounded-lg p-2 mt-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-medium text-emerald-700">Lihat Rincian</span>
              </div>
              <div className="flex items-center gap-2">
                <FileDown className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-medium text-emerald-700">PDF Penawaran</span>
              </div>
            </div>

            <div className="flex items-center gap-1 justify-end mt-1">
              <p className="text-[10px] text-slate-500">12:32 PM</p>
              <CheckCheck className="w-3 h-3 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Bubble klien balasan */}
        <div className="max-w-[75%]">
          <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-sm">
            <p className="text-sm text-slate-700">Oke Pak, cocok budget saya. Bisa survei sabtu ini?</p>
            <p className="text-[10px] text-slate-400 mt-1">12:35 PM</p>
          </div>
        </div>
      </div>
    </div>
  );
}
