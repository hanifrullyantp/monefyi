"use client";

import { Receipt } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/60">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0">
            <Receipt size={18} className="text-blue-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white leading-none truncate">
              Kalkulator Gaji &amp; PPh21
            </h1>
            <p className="text-xs text-slate-500 leading-none mt-0.5">
              Extra Bonus Monefyi · Versi Lite
            </p>
          </div>
        </div>
        <a
          href="https://monefyi.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-green-400 hover:text-green-300 shrink-0"
        >
          monefyi.com
        </a>
      </div>
    </header>
  );
}
