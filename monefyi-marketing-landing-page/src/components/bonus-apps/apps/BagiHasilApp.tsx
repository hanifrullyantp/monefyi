import React, { useState, useMemo } from 'react';
import { Wallet, Briefcase, AlertTriangle, BookOpen, Plus, Trash2 } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { AppInputCurrency } from '../shared/AppInputCurrency';
import { AppSlider } from '../shared/AppSlider';
import { AppResultCard } from '../shared/AppResultCard';
import { AppInputNumber } from '../shared/AppInputNumber';
import { formatRupiah } from '../../../lib/formatters';

export function BagiHasilApp() {
  const [tab, setTab] = useState<'mudharabah' | 'musyarakah'>('mudharabah');

  return (
    <div className="space-y-6">
      <div className="flex p-1 bg-slate-800 rounded-xl">
        <button
          onClick={() => setTab('mudharabah')}
          className={cn(
            'flex-1 py-2 text-sm font-bold rounded-lg transition-all',
            tab === 'mudharabah' ? 'bg-gradient-to-r from-green-500 to-green-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'
          )}
        >
          Mudharabah
        </button>
        <button
          onClick={() => setTab('musyarakah')}
          className={cn(
            'flex-1 py-2 text-sm font-bold rounded-lg transition-all',
            tab === 'musyarakah' ? 'bg-gradient-to-r from-green-500 to-green-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'
          )}
        >
          Musyarakah
        </button>
      </div>

      {tab === 'mudharabah' ? <MudharabahForm /> : <MusyarakahForm />}
    </div>
  );
}

function MudharabahForm() {
  const [modal, setModal] = useState(10000000);
  const [untung, setUntung] = useState(2000000);
  const [nisbahPemilik, setNisbahPemilik] = useState(60);
  const [periode, setPeriode] = useState(12);

  const results = useMemo(() => {
    const nisbahPengelola = 100 - nisbahPemilik;
    const untungPemilik = untung * (nisbahPemilik / 100);
    const untungPengelola = untung * (nisbahPengelola / 100);
    return {
      pemilik: untungPemilik,
      pengelola: untungPengelola,
      totalPemilik: untungPemilik * periode,
      totalPengelola: untungPengelola * periode,
      nisbahPengelola
    };
  }, [untung, nisbahPemilik, periode]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AppInputCurrency label="Total Modal" value={modal} onChange={setModal} />
        <AppInputCurrency label="Estimasi Keuntungan/Bln" value={untung} onChange={setUntung} />
      </div>

      <div className="space-y-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
        <AppSlider
          label={`Nisbah: Pemilik (${nisbahPemilik}%) / Pengelola (${100 - nisbahPemilik}%)`}
          value={nisbahPemilik}
          onChange={setNisbahPemilik}
          min={10}
          max={90}
        />
        <AppInputNumber label="Periode (Bulan)" value={periode} onChange={setPeriode} min={1} max={120} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AppResultCard
          label="Bagian Pemilik Modal"
          value={results.pemilik}
          prefix="Rp "
          variant="highlight"
          className="relative overflow-hidden"
        />
        <AppResultCard
          label="Bagian Pengelola"
          value={results.pengelola}
          prefix="Rp "
          variant="success"
        />
      </div>

      <div className="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-4 flex gap-3">
        <AlertTriangle className="text-amber-500 flex-shrink-0" size={20} />
        <p className="text-xs text-slate-300 leading-relaxed">
          Jika terjadi kerugian bukan karena kelalaian pengelola, kerugian finansial ditanggung 100% oleh pemilik modal. Pengelola menanggung kerugian waktu dan tenaga.
        </p>
      </div>

      <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-4 flex gap-3">
        <BookOpen className="text-blue-500 flex-shrink-0" size={20} />
        <p className="text-xs text-slate-300 italic leading-relaxed">
          "Para ulama telah berijma' atas kebolehan mudharabah karena manusia membutuhkannya."
        </p>
      </div>
    </div>
  );
}

function MusyarakahForm() {
  const [pihak, setPihak] = useState([
    { id: '1', nama: 'Pihak 1', modal: 5000000, nisbah: 50 },
    { id: '2', nama: 'Pihak 2', modal: 5000000, nisbah: 50 },
  ]);
  const [untung, setUntung] = useState(2000000);
  const [customNisbah, setCustomNisbah] = useState(false);

  const totalModal = pihak.reduce((sum, p) => sum + p.modal, 0);

  const addPihak = () => {
    if (pihak.length < 3) {
      setPihak([...pihak, { id: Date.now().toString(), nama: `Pihak ${pihak.length + 1}`, modal: 0, nisbah: 0 }]);
    }
  };

  const removePihak = (id: string) => {
    if (pihak.length > 2) {
      setPihak(pihak.filter(p => p.id !== id));
    }
  };

  const updatePihak = (id: string, key: 'modal' | 'nama' | 'nisbah', value: any) => {
    setPihak(pihak.map(p => p.id === id ? { ...p, [key]: value } : p));
  };

  const results = useMemo(() => {
    return pihak.map(p => {
      const porsiModal = totalModal > 0 ? (p.modal / totalModal) * 100 : 0;
      const nisbahLaba = customNisbah ? p.nisbah : porsiModal;
      return {
        ...p,
        porsiModal,
        nisbahLaba,
        bagiHasil: untung * (nisbahLaba / 100)
      };
    });
  }, [pihak, untung, totalModal, customNisbah]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {pihak.map((p, idx) => (
          <div key={p.id} className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 relative">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Pihak {idx + 1}</span>
              {pihak.length > 2 && (
                <button onClick={() => removePihak(p.id)} className="text-red-400 hover:text-red-300">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AppInputCurrency label="Kontribusi Modal" value={p.modal} onChange={(v) => updatePihak(p.id, 'modal', v)} />
              {customNisbah && (
                <AppSlider label="Nisbah Laba (%)" value={p.nisbah} onChange={(v) => updatePihak(p.id, 'nisbah', v)} />
              )}
            </div>
          </div>
        ))}
        {pihak.length < 3 && (
          <button onClick={addPihak} className="w-full py-2 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-all flex items-center justify-center gap-2 text-sm font-medium">
            <Plus size={14} /> Tambah Pihak
          </button>
        )}
      </div>

      <AppInputCurrency label="Estimasi Keuntungan/Bln" value={untung} onChange={setUntung} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {results.map((r, i) => (
          <div key={r.id} className="p-4 bg-slate-800 border border-slate-700 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Hasil Pihak {i + 1}</span>
            <div className="text-lg font-bold text-green-400">{formatRupiah(r.bagiHasil)}</div>
            <div className="text-[10px] text-slate-500 mt-1">Nisbah: {r.nisbahLaba.toFixed(1)}%</div>
          </div>
        ))}
      </div>
      
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-4 flex gap-3">
        <BookOpen className="text-blue-500 flex-shrink-0" size={20} />
        <p className="text-xs text-slate-300 italic leading-relaxed">
          "Jika kamu mengadakan perserikatan dengan temanmu, maka bagilah keuntungan sesuai kesepakatan dan kerugian sesuai modal." (HR. Abdurrazzaq)
        </p>
      </div>
    </div>
  );
}
