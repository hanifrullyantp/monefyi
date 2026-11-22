import { useState, useEffect, useId } from 'react';
import { Loader2, ExternalLink, ShieldCheck, Trash2 } from 'lucide-react';
import {
  AI_PROVIDERS,
  getActiveModel,
  getProviderMeta,
  isAIProxyEnabled,
  loadAIConfig,
  maskApiKey,
  saveAIConfig,
  testAIConnection,
  type AIConfig,
  type AIProviderId,
} from '../../services/aiProviderService';
import {
  deleteAIProviderKeyFromAccount,
  hydrateAIConfigFromAccount,
  persistAIConfigToAccount,
} from '../../services/aiConfigSync';
import { useAppStore } from '../../store/appStore';
import { showToast } from '../../store/uiStore';

export default function AIProviderPanel() {
  const uid = useId();
  const userId = useAppStore(s => s.user?.id);
  const proxyEnabled = isAIProxyEnabled();
  const [config, setConfig] = useState<AIConfig>(() => loadAIConfig());
  const [testing, setTesting] = useState(false);
  const [deletingKey, setDeletingKey] = useState(false);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (userId) {
      hydrateAIConfigFromAccount(userId)
        .then(remote => {
          if (remote) setConfig(remote);
        })
        .catch(() => undefined);
    }
  }, [userId]);

  const provider = config.activeProvider;
  const meta = getProviderMeta(provider);
  const sessionKey = config.keys[provider]?.trim() || '';
  const hasProxyKey = proxyEnabled && Boolean(config.configuredProviders?.includes(provider));
  const hasSessionKey = Boolean(sessionKey);
  const maskedHint = sessionKey ? maskApiKey(sessionKey) : config.keyHints?.[provider];
  const hasAnyKeyForProvider = hasProxyKey || hasSessionKey;

  const update = (patch: Partial<AIConfig>) => setConfig(c => ({ ...c, ...patch }));

  const buildSanitizedAfterProxySave = (src: AIConfig): AIConfig => {
    const nextConfigured = new Set<AIProviderId>(src.configuredProviders ?? []);
    const nextHints: Partial<Record<AIProviderId, string>> = { ...(src.keyHints ?? {}) };
    for (const p of AI_PROVIDERS) {
      const k = src.keys[p.id]?.trim();
      if (k) {
        nextConfigured.add(p.id);
        nextHints[p.id] = maskApiKey(k);
      }
    }
    return {
      ...src,
      keys: {},
      configuredProviders: Array.from(nextConfigured),
      keyHints: nextHints,
    };
  };

  const save = async () => {
    saveAIConfig(config);
    if (userId) {
      try {
        await persistAIConfigToAccount(userId, config);
        if (proxyEnabled) {
          const sanitized = buildSanitizedAfterProxySave(config);
          saveAIConfig(sanitized);
          setConfig(sanitized);
        }
      } catch {
        showToast('Tersimpan di sesi ini; sinkron akun gagal. Coba lagi.', 'error');
        return;
      }
    }
    showToast(
      userId
        ? proxyEnabled
          ? 'Konfigurasi AI disimpan & key diamankan di proxy terenkripsi'
          : 'Konfigurasi AI disimpan ke akun (key hanya di sesi aman)'
        : 'Konfigurasi AI disimpan untuk sesi ini',
      'success',
    );
  };

  const test = async () => {
    let targetConfig = config;
    saveAIConfig(config);
    if (userId) {
      try {
        await persistAIConfigToAccount(userId, config);
        if (proxyEnabled) {
          targetConfig = buildSanitizedAfterProxySave(config);
          saveAIConfig(targetConfig);
          setConfig(targetConfig);
        }
      } catch {
        // Tetap coba test dengan konfigurasi lokal saat ini
      }
    }
    setTesting(true);
    setTestMsg(await testAIConnection(targetConfig));
    setTesting(false);
  };

  const handleDeleteKey = async (targetProvider: AIProviderId) => {
    setDeletingKey(true);
    const nextKeys = { ...config.keys };
    delete nextKeys[targetProvider];
    const nextHints = { ...(config.keyHints ?? {}) };
    delete nextHints[targetProvider];
    const nextConfigured = (config.configuredProviders ?? []).filter(id => id !== targetProvider);

    const nextConfig: AIConfig = {
      ...config,
      keys: nextKeys,
      keyHints: Object.keys(nextHints).length > 0 ? nextHints : undefined,
      configuredProviders: nextConfigured.length > 0 ? nextConfigured : undefined,
    };

    setConfig(nextConfig);
    saveAIConfig(nextConfig);
    setTestMsg(null);

    if (userId) {
      try {
        await deleteAIProviderKeyFromAccount(userId, targetProvider, nextConfig);
      } catch {
        showToast('Key lokal dihapus, tetapi gagal menghapus dari server.', 'error');
        setDeletingKey(false);
        return;
      }
    }

    setDeletingKey(false);
    showToast(`API key ${getProviderMeta(targetProvider).label} dihapus`, 'success');
  };

  return (
    <div className="space-y-4 border-t pt-6">
      <div>
        <h4 className="font-semibold text-slate-800">AI Manager — Provider & API Key</h4>
        <p className="text-xs text-slate-500">
          {proxyEnabled
            ? 'Mode Proxy Terenkripsi aktif: API key dikirim aman ke server terenkripsi (Edge Function) dan tidak disimpan di browser.'
            : 'Mode Sesi Aman aktif: API key hanya disimpan di memori sesi tab ini (sessionStorage) dan tidak pernah ditulis ke penyimpanan permanen browser.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {AI_PROVIDERS.map(p => {
          const isConfigured =
            Boolean(config.keys[p.id]?.trim()) ||
            (proxyEnabled && Boolean(config.configuredProviders?.includes(p.id)));
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => { update({ activeProvider: p.id as AIProviderId }); setTestMsg(null); }}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold border ${provider === p.id ? 'bg-emerald-600 text-white border-emerald-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {p.label}{isConfigured ? ' ✓' : ''}
            </button>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor={`${uid}-api-key`} className="text-xs font-semibold text-slate-600">API Key {meta.label}</label>
            {hasAnyKeyForProvider && (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" />
                  {hasProxyKey ? 'Proxy Terenkripsi' : 'Tersimpan di sesi aman'}
                </span>
                {maskedHint && (
                  <span className="text-[11px] font-mono text-slate-500" data-testid="ai-key-hint">
                    {maskedHint}
                  </span>
                )}
              </div>
            )}
          </div>
          <input
            id={`${uid}-api-key`}
            name={`aiApiKey_${provider}`}
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={config.keys[provider] || ''}
            onChange={e => update({ keys: { ...config.keys, [provider]: e.target.value } })}
            placeholder={
              hasProxyKey && !sessionKey
                ? `Key aktif di proxy (${maskedHint || 'terenkripsi'}) — isi untuk mengganti`
                : meta.keyHint
            }
            className="w-full mt-1 px-3 py-2 rounded-xl border text-sm font-mono"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
            <a href={meta.keyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-700">
              Dapatkan key <ExternalLink className="w-3 h-3" />
            </a>
            {(hasAnyKeyForProvider || Boolean(maskedHint)) && (
              <button
                type="button"
                disabled={deletingKey}
                onClick={() => void handleDeleteKey(provider)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" />
                Hapus Key
              </button>
            )}
          </div>
        </div>
        <div>
          <label htmlFor={`${uid}-model-select`} className="text-xs font-semibold text-slate-600">Model</label>
          <select
            id={`${uid}-model-select`}
            name="aiModel"
            value={meta.models.some(m => m.id === getActiveModel(config)) ? getActiveModel(config) : '__custom'}
            onChange={e => update({ models: { ...config.models, [provider]: e.target.value === '__custom' ? '' : e.target.value } })}
            className="w-full mt-1 px-3 py-2 rounded-xl border text-sm"
          >
            {meta.models.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            <option value="__custom">Kustom…</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-custom-model`} className="text-xs font-semibold text-slate-600">ID model kustom (opsional)</label>
          <input
            id={`${uid}-custom-model`}
            name="aiCustomModel"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={config.models[provider] || ''}
            onChange={e => update({ models: { ...config.models, [provider]: e.target.value } })}
            placeholder={meta.models[0].id}
            className="w-full mt-1 px-3 py-2 rounded-xl border text-sm font-mono"
          />
        </div>
        <div>
          <label htmlFor={`${uid}-execution-mode`} className="text-xs font-semibold text-slate-600">Mode eksekusi Manager</label>
          <select
            id={`${uid}-execution-mode`}
            name="aiExecutionMode"
            value={config.executionMode}
            onChange={e => update({ executionMode: e.target.value as AIConfig['executionMode'] })}
            className="w-full mt-1 px-3 py-2 rounded-xl border text-sm"
          >
            <option value="review">Selalu minta persetujuan</option>
            <option value="auto">Auto-pilot (aksi rutin langsung jalan)</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-auto-limit`} className="text-xs font-semibold text-slate-600">Batas auto-eksekusi (Rp)</label>
          <input
            id={`${uid}-auto-limit`}
            name="aiAutoLimit"
            type="number"
            autoComplete="off"
            spellCheck={false}
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

