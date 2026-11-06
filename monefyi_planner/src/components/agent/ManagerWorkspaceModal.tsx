import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Loader2,
  Send,
  X,
  Settings2,
  Check,
  Ban,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Play,
  FolderKanban,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import {
  loadAIConfig,
  getActiveModel,
  getProviderMeta,
  hasActiveKey,
  resolveWorkingProvider,
  testAIConnection,
} from '../../services/aiProviderService';
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

type WorkPhase = 'idle' | 'context' | 'thinking' | 'executing';

const QUICK_PROMPTS = [
  'Briefing kondisi semua proyek hari ini',
  'Proyek mana yang paling berisiko rugi?',
  'Simulasi: kalau harga material naik 10%, dampaknya?',
  'Ada kasbon yang perlu diputuskan?',
  'Catat beli semen 10 sak @ 65rb lalu hadir 5 tukang hari ini',
];

const DIVISION_PROMPTS: Record<DivisionId, string> = {
  manager: 'Briefing kondisi semua proyek hari ini & prioritas kerja kita',
  project: 'Pak Raka, bagaimana progres fisik lapangan & jadwal kerja proyek saat ini?',
  finance: 'Bu Sinta, bagaimana posisi arus kas proyek, sisa RAP, dan termin klien?',
  estimator: 'Pak Dimas, simulasi kalau harga material naik 10% bagaimana dampaknya ke margin?',
  hr: 'Bu Nadia, cek daftar tim, kasbon yang menunggu, dan tugas aktif hari ini',
  purchasing: 'Pak Hendra, cek item harga material di database master pricelist kita',
};

export default function ManagerWorkspaceModal({
  onClose,
  onSwitchToQuick,
}: {
  onClose: () => void;
  onSwitchToQuick?: () => void;
}) {
  const navigate = useNavigate();
  const {
    user,
    tenant,
    projects,
    selectedProjectId,
    setSelectedProjectId,
    refreshData,
    setCommandModalOpen,
  } = useAppStore() as ReturnType<typeof useAppStore> & {
    refreshData?: () => Promise<void>;
  };

  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<WorkPhase>('idle');
  const [activeDivisions, setActiveDivisions] = useState<DivisionId[]>([]);
  const [error, setError] = useState('');
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [configVersion, setConfigVersion] = useState(0);
  const [testingConn, setTestingConn] = useState(false);
  const [connMsg, setConnMsg] = useState('');
  const [connOk, setConnOk] = useState<boolean | null>(null);

  const ctxRef = useRef<ContextPack | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const config = useMemo(() => loadAIConfig(), [configVersion, showKeyConfig]);

  const liveProjects = useMemo(
    () => projects.filter(p => p.status !== 'archived'),
    [projects],
  );

  const focusedProject = useMemo(
    () => liveProjects.find(p => p.id === selectedProjectId) || liveProjects[0] || null,
    [liveProjects, selectedProjectId],
  );

  const env: ManagerEnv | null = useMemo(() => {
    if (!user || !tenant) return null;
    return {
      userId: user.id,
      orgId: tenant.id,
      userName: user.name,
      projects,
      currentProject: focusedProject,
      onNavigate: path => navigate(path),
      onRefreshProjects: async () => {
        await refreshData?.();
      },
    };
  }, [user, tenant, projects, focusedProject, navigate, refreshData]);

  const busy = phase !== 'idle';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items, phase]);

  useEffect(() => {
    if (!user?.id) return;
    void hydrateAIConfigFromAccount(user.id).then(() => setConfigVersion(v => v + 1));
  }, [user?.id]);

  // Hitung berapa aksi selesai per divisi untuk indikator kerja nyata
  const divisionDoneCounts = useMemo(() => {
    const counts: Record<DivisionId, number> = {
      manager: 0,
      project: 0,
      finance: 0,
      estimator: 0,
      hr: 0,
      purchasing: 0,
    };
    for (const it of items) {
      if (!it.turn) continue;
      for (const a of it.turn.actions) {
        if (a.status === 'done') counts[a.division] = (counts[a.division] || 0) + 1;
      }
    }
    return counts;
  }, [items]);

  const patchAction = (turnId: string, actionId: string, patch: Partial<AgentAction>) =>
    setItems(cur =>
      cur.map(it =>
        it.id !== turnId || !it.turn
          ? it
          : {
            ...it,
            turn: {
              ...it.turn,
              actions: it.turn.actions.map(a => (a.id === actionId ? { ...a, ...patch } : a)),
            },
          },
      ),
    );

  const runAction = async (turnId: string, action: AgentAction) => {
    if (!env) return;
    const ctx = ctxRef.current ?? (await buildContextPack(env));
    ctxRef.current = ctx;
    setActiveDivisions(prev => (prev.includes(action.division) ? prev : [...prev, action.division]));
    patchAction(turnId, action.id, { status: 'running' });
    const res = await executeAgentAction(action, ctx, env);
    patchAction(turnId, action.id, {
      status: res.ok ? 'done' : 'failed',
      resultMessage: res.message,
      navigateTo: res.navigateTo,
    });
    setActiveDivisions(prev => prev.filter(d => d !== action.division));
    if (res.ok) ctxRef.current = null; // paksa snapshot baru pada giliran berikutnya
    return res;
  };

  // Susun history percakapan yang menyertakan aksi & hasil kerja agar AI punya memori penuh
  const buildRichHistory = () =>
    items.map(i => {
      if (i.role === 'user' || !i.turn) {
        return { role: i.role, content: i.content };
      }
      const actSummary = i.turn.actions
        .map(a => `[${a.division}/${a.type}: ${a.summary} -> ${a.status}${a.resultMessage ? ` (${a.resultMessage})` : ''}]`)
        .join('; ');
      return {
        role: 'assistant' as const,
        content: actSummary ? `${i.content}\n(Log Eksekusi Sistem: ${actSummary})` : i.content,
      };
    });

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || busy || !env) return;
    setError('');
    setInput('');
    const userItem: ChatItem = { id: `u-${Date.now()}`, role: 'user', content: msg };
    setItems(cur => [...cur, userItem]);

    // Cek apakah Owner mengetik konfirmasi ("ya", "setuju", "oke jalankan", "eksekusi semua") untuk aksi pending
    const isConfirmCommand = /^(?:ya|yes|ok|oke|siap|setuju|acc|jalankan|eksekusi(?:\s+semua)?|lanjut(?:kan)?)\b/i.test(msg) && msg.split(/\s+/).length <= 4;
    const pendingList: { turnId: string; action: AgentAction }[] = [];
    for (const it of items) {
      if (it.turn) {
        for (const a of it.turn.actions) {
          if (a.status === 'pending') pendingList.push({ turnId: it.id, action: a });
        }
      }
    }

    if (isConfirmCommand && pendingList.length > 0) {
      setPhase('executing');
      const results: string[] = [];
      for (const { turnId, action } of pendingList) {
        const r = await runAction(turnId, action);
        if (r) {
          results.push(`• ${DIVISIONS[action.division].emoji} **${DIVISIONS[action.division].headName}**: ${r.message}`);
        }
      }
      setItems(cur => [
        ...cur,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: `Siap Bos, seluruh **${pendingList.length} tugas** yang menunggu sudah langsung dieksekusi oleh masing-masing Kepala Divisi:\n${results.join('\n')}`,
          turn: {
            reply: '',
            delegations: [],
            actions: [],
            followUps: ['Briefing kondisi semua proyek hari ini', 'Cek sisa anggaran RAP proyek ini'],
          },
        },
      ]);
      setPhase('idle');
      return;
    }

    try {
      setPhase('context');
      const ctx = ctxRef.current ?? (await buildContextPack(env));
      ctxRef.current = ctx;

      setPhase('thinking');
      setActiveDivisions(['manager']);
      const history = buildRichHistory();
      const turn = await runManagerTurn(ctx, history, msg, config);

      const involvedDivs = [
        ...new Set<DivisionId>([
          ...turn.delegations.map(d => d.division),
          ...turn.actions.map(a => a.division),
        ]),
      ];
      setActiveDivisions(involvedDivs);

      const turnId = `a-${Date.now()}`;
      setItems(cur => [...cur, { id: turnId, role: 'assistant', content: turn.reply, turn }]);

      // Jalankan otomatis aksi yang tidak membutuhkan persetujuan manual
      const autoActions = turn.actions.filter(x => !x.needsApproval);
      if (autoActions.length > 0) {
        setPhase('executing');
        for (const a of autoActions) {
          await runAction(turnId, a);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghubungi AI');
    } finally {
      setActiveDivisions([]);
      setPhase('idle');
    }
  };

  const keyReady = hasActiveKey(config);
  const workingProvider = resolveWorkingProvider(config);
  const meta = getProviderMeta(workingProvider);

  const runConnectionTest = async () => {
    setTestingConn(true);
    setConnMsg('');
    setConnOk(null);
    const result = await testAIConnection(config);
    setConnMsg(result.message);
    setConnOk(result.ok);
    setTestingConn(false);
  };

  const lastAssistantTurn = [...items].reverse().find(i => i.role === 'assistant')?.turn;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-3xl h-[93vh] sm:h-[85vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl border border-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Ruang Komando GM */}
        <header className="px-4 py-3 border-b bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-xl shrink-0">
            👔
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-white text-sm truncate">General Manager & Tim Operasional</h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <span className={`w-1.5 h-1.5 rounded-full ${busy ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                {busy ? 'Sedang Bekerja' : config.executionMode === 'auto' ? 'Auto-Pilot Aktif' : 'Mode Review'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate mt-0.5">
              {keyReady
                ? `${meta.label} · ${getActiveModel(config, workingProvider)} · 5 Kepala Divisi Siap`
                : 'Mode Mesin Lokal Aktif (Isi API Key untuk diskusi LLM penuh)'}
            </p>
          </div>

          <button
            type="button"
            title="Tes koneksi AI"
            disabled={testingConn || !keyReady}
            className="text-xs px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 inline-flex items-center gap-1 font-semibold text-white disabled:opacity-40"
            onClick={() => void runConnectionTest()}
          >
            {testingConn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Tes AI
          </button>
          <button
            type="button"
            title="Konfigurasi API Key & Model AI"
            className={`text-xs px-2.5 py-1.5 rounded-xl border inline-flex items-center gap-1 font-semibold transition-colors ${showKeyConfig
                ? 'bg-emerald-500 text-white border-emerald-400'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
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
            title="Mode Input Cepat"
            className="text-xs px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold"
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
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {showKeyConfig && (
          <div className="px-4 py-3 border-b bg-slate-50 max-h-[55vh] overflow-y-auto">
            <AIProviderPanel />
          </div>
        )}

        {/* Bar Konteks Proyek & 5 Kepala Divisi Interaktif */}
        <div className="px-4 py-2 border-b bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {(Object.keys(DIVISIONS) as DivisionId[]).map(d => {
              const isWorking = activeDivisions.includes(d);
              const doneCount = divisionDoneCounts[d] || 0;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={busy}
                  onClick={() => void send(DIVISION_PROMPTS[d])}
                  title={`Klik untuk berkoordinasi dengan ${DIVISIONS[d].headName} — ${DIVISIONS[d].role}`}
                  className={`shrink-0 text-[11px] px-2.5 py-1 rounded-full border transition-all inline-flex items-center gap-1.5 ${isWorking
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm animate-pulse'
                      : 'bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 border-slate-200'
                    }`}
                >
                  <span>{DIVISIONS[d].emoji}</span>
                  <span className="font-semibold">{DIVISIONS[d].label}</span>
                  {doneCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {doneCount}✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {liveProjects.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 shrink-0">
              <FolderKanban className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px] font-medium text-slate-500">Fokus:</span>
              <select
                value={focusedProject?.id || ''}
                onChange={e => {
                  setSelectedProjectId(e.target.value || null);
                  ctxRef.current = null;
                }}
                className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {liveProjects.map((p, idx) => (
                  <option key={p.id} value={p.id}>
                    [P{idx + 1}] {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Area Percakapan & Orkestrasi Divisi */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
          {items.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg shrink-0">
                  👔
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">
                    Siap memimpin operasional hari ini, {user?.name || 'Bos'}!
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Saya mendampingi Anda bersama 5 Kepala Divisi: <strong>Pak Raka</strong> (Lapangan & RAP),{' '}
                    <strong>Bu Sinta</strong> (Keuangan & Kas), <strong>Pak Dimas</strong> (Estimator & QS),{' '}
                    <strong>Bu Nadia</strong> (HRD & Payroll), dan <strong>Pak Hendra</strong> (Purchasing). Anda bisa
                    berdiskusi santai, minta simulasi, atau memberikan beberapa perintah kerja sekaligus dalam satu
                    kalimat.
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Mulai Diskusi atau Perintah Kerja Lintas Divisi:
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void send(q)}
                      className="text-xs px-3 py-1.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 font-medium transition-colors text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {!keyReady && (
                <div className="flex items-center justify-between gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <span>
                    💡 Masukkan API Key (OpenRouter / Gemini / Groq / Claude / OpenAI) agar GM dapat menggunakan LLM
                    pilihan Anda.
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowKeyConfig(true)}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700"
                  >
                    Isi API Key
                  </button>
                </div>
              )}
            </div>
          )}

          {items.map(it => (
            <div key={it.id} className={it.role === 'user' ? 'flex justify-end' : 'space-y-2.5'}>
              {it.role === 'user' ? (
                <div className="max-w-[85%] bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-br-sm shadow-sm whitespace-pre-wrap">
                  {it.content}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {/* Balon Jawaban Utama General Manager */}
                  {it.content && (
                    <div className="bg-white border border-slate-200/90 text-slate-800 text-sm px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 mb-1">
                        <span>👔 General Manager</span>
                      </div>
                      <div className="whitespace-pre-wrap leading-relaxed">{it.content}</div>
                    </div>
                  )}

                  {/* Log Koordinasi Kepala Divisi */}
                  {it.turn && it.turn.delegations.length > 0 && (
                    <div className="bg-slate-900 text-slate-100 rounded-2xl p-3.5 space-y-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" /> Koordinasi Kepala Divisi
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {it.turn.delegations.length} divisi terlibat
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {it.turn.delegations.map((d, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 text-xs bg-white/5 rounded-xl px-3 py-2 border border-white/10"
                          >
                            <span className="text-base leading-none mt-0.5">{DIVISIONS[d.division].emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-emerald-300">
                                {DIVISIONS[d.division].headName}
                              </div>
                              <div className="text-slate-300 leading-snug">{d.note}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Kartu Eksekusi Tugas Divisi */}
                  {it.turn && it.turn.actions.length > 0 && (
                    <div className="space-y-2">
                      {it.turn.actions.map(a => (
                        <div
                          key={a.id}
                          className={`rounded-2xl border p-3.5 text-sm transition-all shadow-sm ${a.status === 'done'
                              ? 'bg-emerald-50/60 border-emerald-200'
                              : a.status === 'running'
                                ? 'bg-amber-50/60 border-amber-300 animate-pulse'
                                : a.status === 'failed'
                                  ? 'bg-rose-50/60 border-rose-200'
                                  : 'bg-white border-slate-200'
                            }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                                <span>{DIVISIONS[a.division].emoji}</span>
                                <span>{DIVISIONS[a.division].headName}</span>
                              </div>
                              <p className="font-bold text-slate-900">{a.summary}</p>
                            </div>
                            <span
                              className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${a.status === 'done'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : a.status === 'failed'
                                    ? 'bg-rose-100 text-rose-700'
                                    : a.status === 'running'
                                      ? 'bg-amber-100 text-amber-800'
                                      : a.status === 'rejected'
                                        ? 'bg-slate-100 text-slate-500'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                            >
                              {a.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5" />}
                              {a.status === 'failed' && <AlertCircle className="w-3.5 h-3.5" />}
                              {a.status === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                              {a.status === 'done'
                                ? 'Tercatat di Sistem'
                                : a.status === 'failed'
                                  ? 'Gagal'
                                  : a.status === 'running'
                                    ? 'Sedang Dikerjakan…'
                                    : a.status === 'rejected'
                                      ? 'Dibatalkan'
                                      : 'Menunggu Persetujuan'}
                            </span>
                          </div>

                          {a.resultMessage && (
                            <p
                              className={`text-xs mt-2 font-medium ${a.status === 'done' ? 'text-emerald-800' : 'text-rose-700'
                                }`}
                            >
                              {a.status === 'done' ? '✓ Hasil Kerja: ' : '⚠️ Kendala: '}
                              {a.resultMessage}
                            </p>
                          )}

                          {a.status === 'pending' && (
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() => void runAction(it.id, a)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                              >
                                <Check className="w-3.5 h-3.5" /> Setujui & Eksekusi
                              </button>
                              <button
                                type="button"
                                onClick={() => patchAction(it.id, a.id, { status: 'rejected' })}
                                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
                              >
                                <Ban className="w-3.5 h-3.5" /> Batalkan
                              </button>
                            </div>
                          )}

                          {a.status === 'failed' && (
                            <button
                              type="button"
                              onClick={() => void runAction(it.id, a)}
                              className="mt-2 text-xs font-bold text-emerald-700 hover:underline"
                            >
                              Coba Eksekusi Ulang
                            </button>
                          )}

                          {a.navigateTo && a.status === 'done' && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                navigate(a.navigateTo!);
                              }}
                              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Lihat Hasilnya di Halaman Terkait
                            </button>
                          )}
                        </div>
                      ))}

                      {it.turn.actions.filter(a => a.status === 'pending').length > 1 && (
                        <button
                          type="button"
                          onClick={async () => {
                            for (const a of it.turn!.actions.filter(x => x.status === 'pending')) {
                              await runAction(it.id, a);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5" /> Setujui & Eksekusi Semua Tugas ({it.turn.actions.filter(a => a.status === 'pending').length})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Indikator Live Saat GM & Kepala Divisi Sedang Bekerja */}
          {busy && (
            <div className="bg-white border border-emerald-200 rounded-2xl p-3.5 shadow-sm space-y-2">
              <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-800">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>
                  {phase === 'context' && '🔍 Mengumpulkan data real-time proyek, RAP, kas & personel HRD…'}
                  {phase === 'thinking' && '👔 General Manager sedang berkoordinasi dengan Kepala Divisi…'}
                  {phase === 'executing' && '⚡ Kepala Divisi sedang mengeksekusi perubahan langsung ke database…'}
                </span>
              </div>
              {activeDivisions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pl-6">
                  {activeDivisions.map(d => (
                    <span
                      key={d}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium"
                    >
                      {DIVISIONS[d].emoji} {DIVISIONS[d].headName} aktif
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Chip Saran Tindak Lanjut Kontekstual */}
          {!busy && lastAssistantTurn?.followUps && lastAssistantTurn.followUps.length > 0 && (
            <div className="pt-1">
              <p className="text-[11px] font-semibold text-slate-400 mb-1.5">Tindak lanjut cepat:</p>
              <div className="flex flex-wrap gap-1.5">
                {lastAssistantTurn.followUps.map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => void send(f)}
                    className="text-xs px-3 py-1.5 rounded-full bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-medium shadow-2xs transition-colors"
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>
          )}
          <div ref={bottomRef} />
        </div>

        {connMsg && (
          <p className={`px-4 py-1 text-xs border-t bg-slate-50 ${connOk ? 'text-emerald-700' : 'text-rose-600'}`}>
            {connMsg}
          </p>
        )}

        {/* Input Bar */}
        <form
          className="p-3 border-t bg-white flex gap-2 items-center"
          onSubmit={e => {
            e.preventDefault();
            void send(input);
          }}
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Ngobrol dengan GM atau perintahkan kerja (${focusedProject ? `Fokus: ${focusedProject.name}` : 'Semua Proyek'})…`}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send className="w-4 h-4" /> Kirim
          </button>
        </form>
      </div>
    </motion.div>
  );
}
