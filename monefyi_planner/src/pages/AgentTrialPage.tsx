import { useMemo, useState } from 'react';
import { SOP_CATALOG } from '../../../agent-core/src/sopData';
import { buildContextPack, emptyProfile, parametersFromProfile, type ModelTier } from '../../../agent-core/src/profile';
import { previewWizard } from '../../../agent-core/src/profileWizard';
import { routeCatatBiaya } from '../../../agent-core/src/sop';

const SAMPLE_ANSWERS = {
  zona_waktu: 'Asia/Jakarta',
  ambang_biaya: '2500000',
  dp_minimum: '30',
  istilah_lokal: 'sak = zak',
  catatan: 'tukang borongan dibayar mingguan',
};

/** Pratinjau keputusan dari profil lokal. Tidak menulis database. */
export default function AgentTrialPage() {
  const [scenario, setScenario] = useState('beli semen 10 sak 65000');
  const [sopId, setSopId] = useState('catat_biaya');
  const [tier, setTier] = useState<ModelTier>('rendah');
  const profile = useMemo(() => {
    const built = previewWizard(SAMPLE_ANSWERS);
    return 'version' in built ? built : emptyProfile();
  }, []);
  const sop = SOP_CATALOG.find((item) => item.id === sopId) ?? SOP_CATALOG[0];
  const routed = routeCatatBiaya(scenario);
  const parameters = parametersFromProfile(sop, profile);
  const pack = buildContextPack({ profile, sop, role: 'owner', tier });

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Uji agen</h1>
        <p className="text-sm text-slate-500">Keputusan dari profil contoh. Tidak ada data yang ditulis.</p>
      </div>
      <label className="block text-sm font-semibold text-slate-700">
        Skenario
        <textarea
          className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"
          rows={3}
          value={scenario}
          onChange={(event) => setScenario(event.target.value)}
        />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-sm font-semibold text-slate-700">
          SOP
          <select className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm" value={sopId} onChange={(event) => setSopId(event.target.value)}>
            {SOP_CATALOG.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Tier model
          <select className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm" value={tier} onChange={(event) => setTier(event.target.value as ModelTier)}>
            <option value="rendah">rendah</option>
            <option value="menengah">menengah</option>
            <option value="tinggi">tinggi</option>
          </select>
        </label>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm space-y-2">
        <p>Versi profil: {profile.version}</p>
        <p>Teks biaya: {routed ? `${routed.sop} · ${routed.item} · Rp ${routed.total.toLocaleString('id-ID')}` : 'bukan perintah biaya'}</p>
        <p>{parameters.ok ? `Ambang konfirmasi: Rp ${parameters.parameters.ambang_konfirmasi_rupiah?.toLocaleString('id-ID') ?? '—'}` : parameters.error.fix_hint}</p>
        <p>Token paket: {pack.tokens} / {pack.tokenBudget}</p>
      </div>
    </div>
  );
}
