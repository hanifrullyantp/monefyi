"use client";

import { useMemo, useState } from "react";
import {
  ptkpOptions,
  getPTKPCategory,
  getTERRate,
  type PTKPStatus,
} from "@/lib/tax-tables";
import { formatCurrency } from "@/lib/formatters";
import { InputCurrency } from "@/components/ui/InputCurrency";
import { cn } from "@/lib/cn";

function Toggle({
  label,
  description,
  active,
  onChange,
}: {
  label: string;
  description: string;
  active: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      className={cn(
        "w-full text-left rounded-xl border px-4 py-3 transition-colors",
        active
          ? "border-emerald-500/50 bg-emerald-500/10"
          : "border-slate-700 bg-slate-800/40 hover:border-slate-600"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-white">{label}</span>
        <span
          className={cn(
            "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
            active ? "bg-emerald-500 text-slate-900" : "bg-slate-700 text-slate-400"
          )}
        >
          {active ? "Ya" : "Tidak"}
        </span>
      </div>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </button>
  );
}

export function SalaryCalculator() {
  const [gaji, setGaji] = useState(10_000_000);
  const [tunjangan, setTunjangan] = useState(0);
  const [ptkp, setPtkp] = useState<PTKPStatus>("TK/0");
  const [bpjs, setBpjs] = useState(true);
  const [npwp, setNpwp] = useState(true);

  const results = useMemo(() => {
    const bruto = gaji + tunjangan;
    const category = getPTKPCategory(ptkp);
    const rate = getTERRate(bruto, category);

    let pph21 = bruto * rate;
    if (!npwp) pph21 *= 1.2;

    let bpjsKes = 0;
    let jht = 0;
    let jp = 0;

    if (bpjs) {
      bpjsKes = Math.min(bruto, 12_000_000) * 0.01;
      jht = bruto * 0.02;
      jp = Math.min(bruto, 9_559_600) * 0.01;
    }

    const totalBPJS = bpjsKes + jht + jp;
    const thp = bruto - pph21 - totalBPJS;

    return { bruto, pph21, rate, bpjsKes, jht, jp, totalBPJS, thp };
  }, [gaji, tunjangan, ptpk, bpjs, npwp]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputCurrency label="Gaji Pokok" value={gaji} onChange={setGaji} />
        <InputCurrency
          label="Tunjangan Tetap"
          value={tunjangan}
          onChange={setTunjangan}
          helper="Tunjangan yang rutin setiap bulan"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-300 mb-1 block">Status PTKP</label>
        <select
          value={ptkp}
          onChange={(e) => setPtkp(e.target.value as PTKPStatus)}
          className="w-full bg-slate-800/80 border border-slate-600/60 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
          {ptkpOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Toggle
          label="Ikut BPJS"
          active={bpjs}
          onChange={setBpjs}
          description="Kesehatan (1%), JHT (2%), JP (1%)"
        />
        <Toggle
          label="Punya NPWP"
          active={npwp}
          onChange={setNpwp}
          description="Tanpa NPWP, PPh21 +20%"
        />
      </div>

      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
          Take-Home Pay (Gaji Bersih)
        </p>
        <p className="text-3xl md:text-4xl font-black text-white tabular-nums">
          {formatCurrency(results.thp)}
        </p>
      </div>

      <div className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-800/50">
        <div className="px-4 py-3 bg-slate-700/50 border-b border-slate-600 flex justify-between items-center">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Estimasi Slip Gaji
          </span>
          <span className="text-[10px] text-slate-400">PMK 168/2023 (TER)</span>
        </div>
        <div className="p-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Total Bruto</span>
            <span className="text-white tabular-nums">{formatCurrency(results.bruto)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">
              PPh 21 (TER {(results.rate * 100).toFixed(2)}%)
            </span>
            <span className="text-red-400 tabular-nums">-{formatCurrency(results.pph21)}</span>
          </div>
          {bpjs && (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">BPJS Kesehatan</span>
                <span className="text-red-400 tabular-nums">-{formatCurrency(results.bpjsKes)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">JHT</span>
                <span className="text-red-400 tabular-nums">-{formatCurrency(results.jht)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">JP</span>
                <span className="text-red-400 tabular-nums">-{formatCurrency(results.jp)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between pt-2 border-t border-slate-700 font-bold">
            <span className="text-slate-300">Gaji Bersih</span>
            <span className="text-emerald-400 tabular-nums">{formatCurrency(results.thp)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
