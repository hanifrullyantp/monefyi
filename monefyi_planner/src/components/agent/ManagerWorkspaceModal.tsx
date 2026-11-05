import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Send, X, Settings2, Check, Ban, ExternalLink } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { loadAIConfig, getActiveModel, getProviderMeta, hasActiveKey, testAIConnection } from '../../services/aiProviderService';
import { hydrateAIConfigFromAccount } from '../../services/aiConfigSync';
import AIProviderPanel from '../account/AIProviderPanel';
import {
  DIVISIONS,
  buildContextPack,
  executeAgentAction,
  runManagerTurn,
  type AgentAction,
  type ContextPack,
  type DivisionId,
  type ManagerEnv,
  type ManagerTurn,
} from '../../services/managerAgentService';

interface ChatItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  turn?: ManagerTurn;
}

const QUICK_PROMPTS = [
  'Briefing kondisi semua proyek hari ini',
  'Proyek mana yang paling berisiko rugi?',
  'Ada kasbon yang perlu diputuskan?',
  'Simulasi: kalau harga material naik 10%, dampaknya?',
];

export default function ManagerWorkspaceModal({
  onClose,
  onSwitchToQuick,
}: {
  onClose: () => void;
  onSwitchToQuick?: () => void;
}) {
  const navigate = useNavigate();
  const { user, tenant, projects, refreshData, setCommandModalOpen } = useAppStore() as ReturnType<typeof useAppStore> & {
    refreshData?: () => Promise<void>;
  };
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [configVersion, setConfigVersion] = useState(0);
  const [testingConn, setTestingConn] = useState(false);
  const [connMsg, setConnMsg] = useState('');
  const [connOk, setConnOk] = useState<boolean | null>(null);
  const ctxRef = useRef<ContextPack | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const config = useMemo(() => loadAIConfig(), [configVersion, showKeyConfig]);

  const env: ManagerEnv | null = useMemo(() => {
    if (!user || !tenant) return null;
    return {
      userId: user.id,
      orgId: tenant.id,
      userName: user.name,
      projects,
      currentProject: null,
      onNavigate: path => navigate(path),
      onRefreshProjects: async () => { await refreshData?.(); },
    };
  }, [user, tenant, projects, navigate, refreshData]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items, busy]);

  useEffect(() => {
    if (!user?.id) return;
    void hydrateAIConfigFromAccount(user.id).then(() => setConfigVersion(v => v + 1));
  }, [user?.id]);

  const patchAction = (turnId: string, actionId: string, patch: Partial<AgentAction>) =>
    setItems(cur => cur.map(it =>
      it.id !== turnId || !it.turn ? it : {
        ...it,
        turn: { ...it.turn, actions: it.turn.actions.map(a => a.id === actionId ? { ...a, ...patch } : a) },
      }));

  const runAction = async (turnId: string, action: AgentAction) => {
    if (!env || !ctxRef.current) return;
    patchAction(turnId, action.id, { status: 'running' });
    const res = await executeAgentAction(action, ctxRef.current, env);
    patchAction(turnId, action.id, {
      status: res.ok ? 'done' : 'failed',
      resultMessage: res.message,
      navigateTo: res.navigateTo,
    });
    if (res.ok) ctxRef.current = null; // paksa snapshot baru berikutnya
  };

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || busy || !env) return;
    setError('');
    setInput('');
    const userItem: ChatItem = { id: `u-${Date.now()}`, role: 'user', content: msg };
    setItems(cur => [...cur, userItem]);
    setBusy(true);
    try {
      const ctx = ctxRef.current ?? (await buildContextPack(env));
      ctxRef.current = ctx;
      const history = items.map(i => ({ role: i.role, content: i.content }));
      const turn = await runManagerTurn(ctx, history, msg, config);
      const turnId = `a-${Date.now()}`;
      setItems(cur => [...cur, { id: turnId, role: 'assistant', content: turn.reply, turn }]);
      // Auto-eksekusi aksi risiko rendah
      for (const a of turn.actions.filter(x => !x.needsApproval)) {
        await runAction(turnId, a);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghubungi AI');
    } finally {
      setBusy(false);
    }
  };

  const keyReady = hasActiveKey(config);
  const meta = getProviderMeta(config.activeProvider);

  const runConnectionTest = async () => {
    setTestingConn(true);
    setConnMsg('');
    setConnOk(null);
    const result = await testAIConnection(config);
    setConnMsg(result.message);
    setConnOk(result.ok);
    setTestingConn(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-2xl h-[92vh] sm:h-[80vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <header className="px-4 py-3 border-b flex items-center gap-3">
          <div className="text-2xl">👔</div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-slate-800 text-sm">Ruang General Manager</h2>
            <p className="text-[11px] text-slate-500 truncate">
              {keyReady ? `${meta.label} · ${getActiveModel(config)} · ${config.executionMode === 'auto' ? 'Auto-pilot' : 'Minta persetujuan'}` : 'API key belum diisi'}
            </p>
          </div>
          <button
            type="button"
            title="Tes koneksi AI"
            disabled={testingConn || !keyReady}
            className="text-xs px-2.5 py-1.5 rounded-xl border inline-flex items-center gap-1 font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            onClick={() => void runConnectionTest()}
          >
            {testingConn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Tes AI
          </button>
          <button
            type="button"
            title="Konfigurasi API Key & Model AI"
            className={`text-xs px-2.5 py-1.5 rounded-xl border inline-flex items-center gap-1 font-semibold ${
              showKeyConfig ? 'bg-emerald-600 text-white border-emerald-600' : 'text-slate-600 hover:bg-slate-100'
            }`}
            onClick={() => {
              setShowKeyConfig(v => !v);
              setConfigVersion(v => v + 1);
            }}
          >
            <Settings2 className="w-3.5 h-3.5" /> API Key
          </button>
          <button
            type="button"
            title="Perintah cepat"
            className="text-xs px-2.5 py-1.5 rounded-xl border text-slate-600 hover:bg-slate-50"
            onClick={() => {
              if (onSwitchToQuick) onSwitchToQuick();
              else {
                onClose();
                setCommandModalOpen(true);
              }
            }}
          >
            ⚡ Cepat
          </button>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </header>

        {showKeyConfig && (
          <div className="px-4 py-3 border-b bg-slate-50/80 max-h-[55vh] overflow-y-auto">
            <AIProviderPanel />
          </div>
        )}

        <div className="flex gap-1.5 px-4 py-2 overflow-x-auto border-b bg-slate-50">
          {(Object.keys(DIVISIONS) as DivisionId[]).map(d => (
            <span key={d} className="shrink-0 text-[11px] px-2 py-1 rounded-full bg-white border text-slate-600" title={DIVISIONS[d].role}>
              {DIVISIONS[d].emoji} {DIVISIONS[d].label}
            </span>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Halo, saya GM Anda. Ngobrol, minta analisis, atau perintahkan pekerjaan — saya akan delegasikan ke divisi yang tepat.
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map(q => (
                  <button key={q} type="button" onClick={() => send(q)}
                    className="text-xs px-3 py-1.5 rounded-full border border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                    {q}
                  </button>
                ))}
              </div>
              {!keyReady && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  Belum ada API key. Briefing dasar tetap jalan; untuk diskusi & eksekusi, isi key di Pengaturan → AI & API Key.
                </p>
              )}
            </div>
          )}

          {items.map(it => (
            <div key={it.id} className={it.role === 'user' ? 'flex justify-end' : 'space-y-2'}>
              {it.role === 'user' ? (
                <div className="max-w-[85%] bg-emerald-600 text-white text-sm px-3 py-2 rounded-2xl rounded-br-sm whitespace-pre-wrap">{it.content}</div>
              ) : (
                <>
                  <div className="max-w-[92%] bg-slate-100 text-slate-800 text-sm px-3 py-2 rounded-2xl rounded-bl-sm whitespace-pre-wrap">{it.content}</div>
                  {it.turn?.delegations.map((d, i) => (
                    <div key={i} className="text-xs text-slate-600 pl-2 border-l-2 border-emerald-300">
                      <strong>{DIVISIONS[d.division].emoji} {DIVISIONS[d.division].label}:</strong> {d.note}
                    </div>
                  ))}
                  {it.turn?.actions.map(a => (
                    <div key={a.id} className="rounded-xl border p-3 text-sm bg-white">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] text-slate-500">{DIVISIONS[a.division].emoji} {DIVISIONS[a.division].label}</p>
                          <p className="font-semibold text-slate-800">{a.summary}</p>
                        </div>
                        <span className={`text-[11px] font-semibold ${a.status === 'done' ? 'text-emerald-600' : a.status === 'failed' ? 'text-rose-600' : 'text-slate-500'}`}>
                          {a.status === 'done' ? 'Selesai' : a.status === 'failed' ? 'Gagal' : a.status === 'running' ? 'Berjalan…' : a.status === 'rejected' ? 'Dibatalkan' : 'Menunggu'}
                        </span>
                      </div>
                      {a.resultMessage && <p className="text-xs text-slate-600 mt-1">{a.resultMessage}</p>}
                      {a.status === 'pending' && (
                        <div className="mt-2 flex gap-2">
                          <button type="button" onClick={() => runAction(it.id, a)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white">
                            <Check className="w-3 h-3" /> Eksekusi
                          </button>
                          <button type="button" onClick={() => patchAction(it.id, a.id, { status: 'rejected' })}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border text-slate-600">
                            <Ban className="w-3 h-3" /> Batal
                          </button>
                        </div>
                      )}
                      {a.status === 'failed' && (
                        <button type="button" onClick={() => runAction(it.id, a)} className="mt-2 text-xs font-semibold text-emerald-700">Coba lagi</button>
                      )}
                      {a.navigateTo && a.status === 'done' && (
                        <button type="button" onClick={() => { onClose(); navigate(a.navigateTo!); }}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <ExternalLink className="w-3 h-3" /> Buka
                        </button>
                      )}
                    </div>
                  ))}
                  {it.turn && it.turn.actions.filter(a => a.status === 'pending').length > 1 && (
                    <button type="button"
                      onClick={async () => { for (const a of it.turn!.actions.filter(x => x.status === 'pending')) await runAction(it.id, a); }}
                      className="text-xs font-semibold text-emerald-700">
                      Eksekusi semua
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
          {busy && <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> GM sedang berpikir…</div>}
          {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}
          <div ref={bottomRef} />
        </div>

        {connMsg && (
          <p className={`px-4 pb-1 text-xs ${connOk ? 'text-emerald-700' : 'text-rose-600'}`}>{connMsg}</p>
        )}
        <form className="p-3 border-t flex gap-2 items-center" onSubmit={e => { e.preventDefault(); void send(input); }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Tanya, diskusi, atau perintahkan GM…"
            className="flex-1 px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button type="button" disabled={testingConn || !keyReady} onClick={() => void runConnectionTest()}
            className="px-2.5 py-2.5 rounded-xl border text-xs font-semibold text-slate-600 disabled:opacity-50 shrink-0">
            Tes
          </button>
          <button type="submit" disabled={busy || !input.trim()} className="px-4 rounded-xl bg-emerald-600 text-white disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </motion.div>
  );
}

