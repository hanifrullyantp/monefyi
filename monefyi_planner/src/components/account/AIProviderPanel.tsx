import { useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import {
  AI_PROVIDERS,
  getActiveModel,
  getProviderMeta,
  loadAIConfig,
  saveAIConfig,
  testAIConnection,
  type AIConfig,
  type AIProviderId,
} from '../../services/aiProviderService';
import { showToast } from '../../store/uiStore';

export default function AIProviderPanel() {
  const [config, setConfig] = useState<AIConfig>(() => loadAIConfig());
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; message: string } | null>(null);

  const provider = config.activeProvider;
  const meta = getProviderMeta(provider);
  const update = (patch: Partial<AIConfig>) => setConfig(c => ({ ...c, ...patch }));

  const save = () => {
    saveAIConfig(config);
    showToast('Konfigurasi AI disimpan', 'success');
  };

  const test = async () => {
    saveAIConfig(config);
    setTesting(true);
    setTestMsg(await testAIConnection(config));
    setTesting(false);
  };

  return (
    <div className="space-y-4 border-t pt-6">
      <div>
        <h4 className="font-semibold text-slate-800">AI Manager — Provider & API Key</h4>
        <p className="text-xs text-slate-500">Key disimpan di browser ini saja dan dipakai langsung ke provider pilihan Anda.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {AI_PROVIDERS.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => { update({ activeProvider: p.id as AIProviderId }); setTestMsg(null); }}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold border ${provider === p.id ? 'bg-emerald-600 text-white border-emerald-600' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {p.label}{config.keys[p.id]?.trim() ? ' ✓' : ''}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-500">API Key {meta.label}</label>
          <input
            type="password"
            autoComplete="off"
            value={config.keys[provider] || ''}
            onChange={e => update({ keys: { ...config.keys, [provider]: e.target.value } })}
            placeholder={meta.keyHint}
            className="w-full mt-1 px-3 py-2 rounded-xl border text-sm font-mono"
          />
          <a href={meta.keyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-700 mt-1">
            Dapatkan key <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Model</label>
          <select
            value={meta.models.some(m => m.id === getActiveModel(config)) ? getActiveModel(config) : '__custom'}
            onChange={e => update({ models: { ...config.models, [provider]: e.target.value === '__custom' ? '' : e.target.value } })}
            className="w-full mt-1 px-3 py-2 rounded-xl border text-sm"
          >
            {meta.models.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            <option value="__custom">Kustom…</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">ID model kustom (opsional)</label>
          <input
            value={config.models[provider] || ''}
            onChange={e => update({ models: { ...config.models, [provider]: e.target.value } })}
            placeholder={meta.models[0].id}
            className="w-full mt-1 px-3 py-2 rounded-xl border text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Mode eksekusi Manager</label>
          <select
            value={config.executionMode}
            onChange={e => update({ executionMode: e.target.value as AIConfig['executionMode'] })}
            className="w-full mt-1 px-3 py-2 rounded-xl border text-sm"
          >
            <option value="review">Selalu minta persetujuan</option>
            <option value="auto">Auto-pilot (aksi rutin langsung jalan)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Batas auto-eksekusi (Rp)</label>
          <input
            type="number"
            min={0}
            value={config.autoLimit}
            onChange={e => update({ autoLimit: Math.max(0, Number(e.target.value) || 0) })}
            className="w-full mt-1 px-3 py-2 rounded-xl border text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold">Simpan</button>
        <button type="button" onClick={test} disabled={testing} className="px-4 py-2 border rounded-xl text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50">
          {testing && <Loader2 className="w-4 h-4 animate-spin" />} Tes Koneksi
        </button>
        {testMsg && <span className={`text-xs ${testMsg.ok ? 'text-emerald-700' : 'text-rose-600'}`}>{testMsg.message}</span>}
      </div>
    </div>
  );
}

