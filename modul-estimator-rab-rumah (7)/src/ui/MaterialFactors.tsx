import { useState } from 'react';
import { BookOpen, ChevronRight, SlidersHorizontal } from 'lucide-react';
import type { MaterialFactorRow, SpecGroupKey, SpecLevel } from '../data/types';
import { DEFAULT_MATERIAL_FACTORS, materialFactorsFor, SPEC_GROUPS, SPEC_LABEL, SPEC_ORDER } from '../data/spec';
import { useEstimator } from './context';
import { Button, Field, Modal, inputClass } from './components';

export function MaterialFactors() {
  const { state, updateSettings, toast } = useEstimator();
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<SpecGroupKey>('lantai');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [source, setSource] = useState('');
  const [calibrated, setCalibrated] = useState(false);
  const [error, setError] = useState('');
  const load = (g: SpecGroupKey, row = materialFactorsFor(state.settings, g)) => {
    setGroup(g); setFields(Object.fromEntries(SPEC_ORDER.map(l => [l, String(row.factors[l])])));
    setSource(row.source); setCalibrated(row.calibrated); setError('');
  };
  const save = () => {
    const factors = Object.fromEntries(SPEC_ORDER.map(l => [l, Number(fields[l].replace(',', '.'))])) as Record<SpecLevel, number>;
    const row: MaterialFactorRow = { factors, source: source.trim(), calibrated };
    try {
      const materialFactors = { ...state.settings.materialFactors, [group]: row };
      materialFactorsFor({ materialFactors }, group);
      if (SPEC_ORDER.some((l, i) => i > 0 && factors[l] < factors[SPEC_ORDER[i - 1]])) throw new Error('Faktor tingkat berikutnya tidak boleh lebih rendah.');
      if (!row.source) throw new Error('Isi sumber atau catatan faktor terlebih dahulu.');
      updateSettings({ materialFactors }); setOpen(false); toast('Faktor bahan disimpan', 'Upah dan sewa alat tidak ikut berubah.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Faktor tidak valid.'); }
  };
  return <>
    <button className="flex w-full items-center gap-4 rounded-2xl border border-line bg-white p-5 text-left lg:col-span-2" onClick={() => { load(group); setOpen(true); }}>
      <span className="rounded-xl bg-emerald-50 p-3 text-accent"><SlidersHorizontal size={20} /></span>
      <span className="flex-1"><strong className="block text-sm">Faktor harga bahan</strong><span className="mt-1 block text-xs text-muted">Atur faktor tiap tingkat spesifikasi, terpisah untuk setiap kelompok pekerjaan.</span></span><ChevronRight size={17} />
    </button>
    <Modal open={open} onClose={() => setOpen(false)} title="Faktor harga bahan" description="Hanya harga bahan yang disesuaikan. Upah, alat, dan volume tetap berasal dari analisis pekerjaan."
      footer={<div className="flex flex-wrap justify-end gap-2"><Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button><Button onClick={save}>Simpan faktor</Button></div>}>
      <div className="space-y-4">
        <Field label="Kelompok pekerjaan" htmlFor="factor-group"><select id="factor-group" className={inputClass} value={group} onChange={e => load(e.target.value as SpecGroupKey)}>{SPEC_GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">{SPEC_ORDER.map(l => <Field key={l} label={SPEC_LABEL[l]} htmlFor={`factor-${l}`}><input id={`factor-${l}`} className={inputClass} inputMode="decimal" value={fields[l] ?? ''} onChange={e => setFields(v => ({ ...v, [l]: e.target.value }))} /></Field>)}</div>
        <Field label="Sumber pembanding" htmlFor="factor-source"><input id="factor-source" className={inputClass} value={source} onChange={e => setSource(e.target.value)} /></Field>
        <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" className="accent-emerald-700" checked={calibrated} onChange={e => setCalibrated(e.target.checked)} /> Saya telah mengalibrasi faktor dengan data pembanding tersebut.</label>
        <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><BookOpen size={16} />{calibrated ? 'Persetujuan ini hanya berlaku untuk faktor kelompok terpilih, bukan verifikasi seluruh katalog.' : 'CONTOH: faktor belum dikalibrasi, bukan koefisien resmi.'}</p>
        {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
        <Button variant="ghost" onClick={() => load(group, DEFAULT_MATERIAL_FACTORS[group])}>Muat faktor contoh</Button>
      </div>
    </Modal>
  </>;
}