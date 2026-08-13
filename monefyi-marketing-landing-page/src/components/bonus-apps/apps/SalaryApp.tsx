import React, { useState, useMemo } from 'react';
import { ptkpOptions, getPTKPCategory, getTERRate, PTKPStatus } from '../../../data/tax-tables';
import { AppInputCurrency } from '../shared/AppInputCurrency';
import { AppSelect } from '../shared/AppSelect';
import { AppToggle } from '../shared/AppToggle';
import { AppResultCard } from '../shared/AppResultCard';
import { formatRupiah } from '../../../lib/formatters';

export function SalaryApp() {
  const [gaji, setGaji] = useState(10000000);
  const [tunjangan, setTunjangan] = useState(0);
  const [ptkp, setPtkp] = useState<PTKPStatus>('TK/0');
  const [bpjs, setBpjs] = useState(true);
  const [npwp, setNpwp] = useState(true);

  const results = useMemo(() => {
    const bruto = gaji + tunjangan;
    const category = getPTKPCategory(ptkp);
    let rate = getTERRate(bruto, category);
    
    let pph21 = bruto * rate;
    if (!npwp) pph21 *= 1.2;

    let totalBPJS = 0;
    let bpjsKes = 0;
    let jht = 0;
    let jp = 0;

    if (bpjs) {
      const dasarKes = Math.min(bruto, 12000000);
      bpjsKes = dasarKes * 0.01;
      jht = bruto * 0.02;
      const dasarJP = Math.min(bruto, 9559600);
      jp = dasarJP * 0.01;
      totalBPJS = bpjsKes + jht + jp;
    }

    const thp = bruto - pph21 - totalBPJS;

    return {
      bruto,
      pph21,
      rate,
      bpjsKes,
      jht,
      jp,
      totalBPJS,
      thp
    };
  }, [gaji, tunjangan, ptkp, bpjs, npwp]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AppInputCurrency label="Gaji Pokok" value={gaji} onChange={setGaji} />
        <AppInputCurrency label="Tunjangan Tetap" value={tunjangan} onChange={setTunjangan} />
      </div>

      <AppSelect
        label="Status PTKP"
        value={ptkp}
        onChange={(v) => setPtkp(v as PTKPStatus)}
        options={ptkpOptions.map(o => ({ value: o.value, label: o.label }))}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
        <AppToggle label="Ikut BPJS" active={bpjs} onChange={setBpjs} description="Kesehatan (1%), JHT (2%), JP (1%)" />
        <AppToggle label="Punya NPWP" active={npwp} onChange={setNpwp} description="Tarif pajak normal" />
      </div>

      <AppResultCard
        label="Take-Home Pay (Gaji Bersih)"
        value={results.thp}
        prefix="Rp "
        variant="success"
        className="py-6"
      />

      <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
        <div className="px-4 py-3 bg-slate-700/50 border-b border-slate-600 flex justify-between items-center">
          <span className="text-xs font-bold text-white uppercase tracking-wider">Estimasi Slip Gaji</span>
          <span className="text-[10px] text-slate-400">PMK 168/2023 (TER)</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Gaji Pokok</span>
              <span className="text-white">{formatRupiah(gaji)}</span>
            </div>
            {tunjangan > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Tunjangan</span>
                <span className="text-white">{formatRupiah(tunjangan)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-700">
              <span className="text-slate-300">Total Bruto</span>
              <span className="text-white">{formatRupiah(results.bruto)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">PPh 21 (TER {(results.rate * 100).toFixed(2)}%)</span>
              <span className="text-red-400">-{formatRupiah(results.pph21)}</span>
            </div>
            {bpjs && (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">BPJS Kesehatan (1%)</span>
                  <span className="text-red-400">-{formatRupiah(results.bpjsKes)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">JHT (2%)</span>
                  <span className="text-red-400">-{formatRupiah(results.jht)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">JP (1%)</span>
                  <span className="text-red-400">-{formatRupiah(results.jp)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-700">
              <span className="text-slate-300">Total Potongan</span>
              <span className="text-red-400">-{formatRupiah(results.pph21 + results.totalBPJS)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
