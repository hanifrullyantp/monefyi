import { ArrowLeft, MoreVertical, Minus, Plus, FileDown } from "lucide-react";

export function EstimatorMockup() {
  return (
    <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-100">
        <ArrowLeft className="w-5 h-5 text-slate-600 flex-shrink-0" />
        <span className="font-semibold text-slate-900 flex-1">Renovasi Bpk Andi</span>
        <MoreVertical className="w-5 h-5 text-slate-600 flex-shrink-0" />
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          ITEM PEKERJAAN
        </p>

        {/* Item 1 */}
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-slate-900">Bongkar keramik lama</p>
              <p className="text-xs text-slate-500">6 m²</p>
            </div>
            <p className="text-sm font-bold text-slate-900">Rp 2.500.000</p>
          </div>
        </div>

        {/* Item 2 — dengan stepper */}
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-sm text-slate-900">Keramik dinding premium</p>
            <p className="text-sm font-bold text-slate-900">Rp 2.800.000</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors">
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-sm font-semibold text-slate-900 px-2">8 m²</span>
            <button className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors">
              <Plus className="w-3 h-3" />
            </button>
            <span className="text-xs text-slate-500 ml-auto">Rp 350k/m²</span>
          </div>
        </div>

        {/* Item 3 */}
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-slate-900">Instalasi keran + shower</p>
              <p className="text-xs text-slate-500">1 set</p>
            </div>
            <p className="text-sm font-bold text-slate-900">Rp 1.800.000</p>
          </div>
        </div>

        {/* Add item */}
        <button className="w-full py-2.5 border border-dashed border-slate-300 rounded-xl text-sm text-slate-500 font-medium hover:border-emerald-400 hover:text-emerald-600 transition-colors">
          + Tambah Item
        </button>

        {/* Divider */}
        <div className="border-t border-slate-200 mt-4" />

        {/* Total */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm font-bold text-slate-700">TOTAL</span>
          <span className="text-xl font-bold text-emerald-600">Rp 24.500.000</span>
        </div>

        {/* Export button */}
        <button className="mt-4 bg-slate-900 text-white rounded-xl py-3 font-semibold text-sm w-full inline-flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
          <FileDown className="w-4 h-4" />
          Export PDF Penawaran
        </button>
      </div>
    </div>
  );
}
