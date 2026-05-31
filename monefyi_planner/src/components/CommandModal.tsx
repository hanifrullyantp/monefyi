import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sparkles, Mic, MicOff, Send, CheckCircle, AlertCircle,
  Wallet, BarChart3, FileText, CheckSquare, Clock, Plus,
  RotateCcw, MessageSquare
} from 'lucide-react';
import { parseCommand, aiParseCommand } from '../lib/commandParser';
import { executeIntent } from '../lib/intentExecutor';
import { logCommand, loadCommandLogs } from '../services/commandService';
import { loadWorkItems } from '../services/workItemService';
import { useAppStore } from '../store/appStore';

type Stage = 'idle' | 'listening' | 'processing' | 'confirm' | 'success' | 'error';

interface ParsedCommand {
  intent: string;
  description: string;
  data: Record<string, string | number>;
  warning?: string;
}

const quickCommands = [
  { icon: Wallet, label: 'Catat Biaya', color: 'bg-indigo-100 text-indigo-700', template: 'catat semen 10 sak 65000' },
  { icon: BarChart3, label: 'Update Progress', color: 'bg-emerald-100 text-emerald-700', template: 'update progress pondasi 75%' },
  { icon: FileText, label: 'Cek Budget', color: 'bg-blue-100 text-blue-700', template: 'cek budget project' },
  { icon: Clock, label: 'Log Pekerja', color: 'bg-amber-100 text-amber-700', template: 'hari ini hadir 8 orang' },
  { icon: Plus, label: 'Buka Proyek', color: 'bg-rose-100 text-rose-700', template: 'buka project' },
];

export default function CommandModal() {
  const navigate = useNavigate();
  const {
    setCommandModalOpen,
    projects,
    user,
    tenant,
    selectedProjectId,
    refreshData,
    setCommandLogs,
  } = useAppStore();
  const [input, setInput] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [isListening, setIsListening] = useState(false);
  const [parsedCmd, setParsedCmd] = useState<ParsedCommand | null>(null);
  const [transcript, setTranscript] = useState('');
  const [layer, setLayer] = useState<1 | 2 | 3>(1);
  const [resultMessage, setResultMessage] = useState('');
  const [resultDetails, setResultDetails] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const activeProject =
    projects.find(p => p.id === selectedProjectId) ||
    projects.find(p => p.status === 'active') ||
    projects[0];

  useEffect(() => {
    if (user?.id) {
      loadCommandLogs(user.id).then(logs => {
        setCommandLogs(logs);
        setHistory(logs.map(l => l.input));
      }).catch(console.error);
    }
  }, [user?.id, setCommandLogs]);

  useEffect(() => {
    if (stage === 'idle') inputRef.current?.focus();
  }, [stage]);

  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert('Browser kamu tidak mendukung voice input. Coba Chrome.');
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SR();
    recognition.lang = 'id-ID';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setStage('listening');
    };
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = Array.from(event.results).map((r: any) => r[0].transcript).join('');
      setTranscript(t);
      if (event.results[event.results.length - 1].isFinal) {
        setInput(t);
        setStage('idle');
        setIsListening(false);
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
      setStage('idle');
    };
    recognition.onend = () => {
      setIsListening(false);
      if (stage === 'listening') setStage('idle');
    };
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setStage('idle');
  };

  const handleProcess = async (text = input) => {
    if (!text.trim() || !user || !tenant) return;
    setStage('processing');
    setInput(text);

    let parsed = parseCommand(text);

    if (parsed.confidence < 0.75) {
      setLayer(2);
      const aiResult = await aiParseCommand(text, {
        projects: projects.map(p => ({ name: p.name, id: p.id, status: p.status })),
        work_items: [],
        current_project: activeProject?.name || null,
      });
      if (aiResult && aiResult.confidence >= 0.6) {
        parsed = aiResult;
        setLayer(3);
      }
    } else {
      setLayer(1);
    }

    if (parsed.intent === 'unknown' || parsed.confidence < 0.5) {
      setResultMessage('Maaf, saya belum memahami perintah tersebut.');
      setResultDetails(`Input: "${text}"`);
      setStage('error');
      await logCommand({
        userId: user.id,
        orgId: tenant.id,
        inputType: isListening ? 'voice' : 'text',
        rawInput: text,
        parsedIntent: parsed.intent,
        parsedParams: parsed.params,
        confidence: parsed.confidence,
        executionStatus: 'failed',
      });
      return;
    }

    setParsedCmd({
      intent: parsed.intent,
      description: parsed.intent.replace(/_/g, ' '),
      data: parsed.params as Record<string, string | number>,
    });
    setStage('confirm');
  };

  const handleExecute = async () => {
    if (!parsedCmd || !user || !tenant) return;
    setStage('processing');

    const parsed = {
      intent: parsedCmd.intent,
      params: parsedCmd.data,
      confidence: 0.9,
      raw: input,
    };

    try {
      const workItems = activeProject
        ? await loadWorkItems(activeProject.id)
        : [];

      const result = await executeIntent(parsed, {
        userId: user.id,
        orgId: tenant.id,
        projects,
        currentProject: activeProject || null,
        workItems,
        onNavigate: path => navigate(path),
        onRefreshProjects: refreshData,
        loadWorkItemsForProject: loadWorkItems,
      });

      await logCommand({
        userId: user.id,
        orgId: tenant.id,
        inputType: isListening ? 'voice' : 'text',
        rawInput: input,
        parsedIntent: parsed.intent,
        parsedParams: parsed.params as Record<string, unknown>,
        confidence: parsed.confidence,
        executionStatus: result.success ? 'executed' : 'failed',
        errorMessage: result.success ? undefined : result.message,
      });

      if (result.navigateTo) navigate(result.navigateTo);
      if (result.refreshProjects) await refreshData();

      setResultMessage(result.message);
      setResultDetails(result.details || '');
      setStage(result.success ? 'success' : 'error');
    } catch (e) {
      setResultMessage('Gagal mengeksekusi perintah');
      setResultDetails(e instanceof Error ? e.message : String(e));
      setStage('error');
    }
  };

  const handleReset = () => {
    setStage('idle');
    setInput('');
    setParsedCmd(null);
    setTranscript('');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) setCommandModalOpen(false); }}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-black text-slate-900 text-sm">Monefyi Assistant</div>
              <div className="text-xs text-slate-400">
                Konteks: <span className="text-indigo-600 font-medium">{activeProject?.name || 'Umum'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setCommandModalOpen(false)}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            {/* IDLE / INPUT */}
            {stage === 'idle' && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Input */}
                <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-200 focus-within:border-indigo-400 rounded-2xl px-4 py-3 mb-5 transition-colors">
                  <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleProcess()}
                    placeholder="Ketik atau ucapkan perintah..."
                    className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder-slate-400"
                  />
                  <button
                    onClick={isListening ? stopListening : startListening}
                    className={`p-1.5 rounded-xl transition-colors ${isListening ? 'bg-rose-100 text-rose-600' : 'hover:bg-indigo-100 text-slate-400 hover:text-indigo-600'}`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  {input && (
                    <button
                      onClick={() => handleProcess()}
                      className="p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Quick Commands */}
                <div className="mb-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Perintah Cepat</p>
                  <div className="grid grid-cols-3 gap-2">
                    {quickCommands.map((cmd, i) => (
                      <button
                        key={i}
                        onClick={() => handleProcess(cmd.template)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl ${cmd.color} hover:opacity-80 transition-opacity`}
                      >
                        <cmd.icon className="w-5 h-5" />
                        <span className="text-xs font-semibold">{cmd.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* History */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Riwayat</p>
                  <div className="space-y-2">
                    {history.map((h, i) => (
                      <button
                        key={i}
                        onClick={() => { setInput(h); inputRef.current?.focus(); }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-left group"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-600 truncate">{h}</span>
                        <Send className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 ml-auto shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* LISTENING */}
            {stage === 'listening' && (
              <motion.div key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-8">
                <div className="flex justify-center items-end gap-1.5 h-12 mb-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="waveform-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
                <p className="text-lg font-bold text-slate-800 mb-2">🎤 Mendengarkan...</p>
                {transcript && <p className="text-sm text-slate-500 italic">"{transcript}"</p>}
                <button onClick={stopListening} className="mt-6 px-6 py-2.5 bg-rose-100 text-rose-700 rounded-xl text-sm font-medium hover:bg-rose-200 transition-colors">
                  ⏹ Stop
                </button>
              </motion.div>
            )}

            {/* PROCESSING */}
            {stage === 'processing' && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-10 text-center">
                <div className="w-12 h-12 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="font-bold text-slate-800 mb-2">⚙️ Memproses perintah...</p>
                <div className="space-y-1.5">
                  {[
                    { n: 1, label: 'Rule-Based Parser', done: layer >= 1 },
                    { n: 2, label: 'Fuzzy Matching', done: layer >= 2 },
                    { n: 3, label: 'AI GPT-4o', done: layer >= 3 },
                  ].map(l => (
                    <div key={l.n} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${l.done ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-50 text-slate-400'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${l.done ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                      Layer {l.n}: {l.label}
                      {l.done && layer === l.n && <span className="ml-auto animate-pulse">...</span>}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* CONFIRM */}
            {stage === 'confirm' && parsedCmd && (
              <motion.div key="confirm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">📝 Konfirmasi {parsedCmd.description}</span>
                  <span className="ml-auto text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">Layer {layer}</span>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-200">
                  {Object.entries(parsedCmd.data).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                      <span className="text-xs text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="text-sm font-semibold text-slate-800">{val}</span>
                    </div>
                  ))}
                </div>

                {parsedCmd.warning && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl mb-4 text-sm text-amber-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {parsedCmd.warning}
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={handleReset} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                    <X className="w-4 h-4" /> Batal
                  </button>
                  <button onClick={handleExecute} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200">
                    <CheckCircle className="w-4 h-4" /> Benar, Catat!
                  </button>
                </div>
              </motion.div>
            )}

            {/* SUCCESS */}
            {stage === 'success' && parsedCmd && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-lg font-black text-slate-900 mb-1">✅ Berhasil!</p>
                <p className="text-sm text-slate-500 mb-2">{resultMessage}</p>
                {resultDetails && <p className="text-xs text-slate-400 mb-6">{resultDetails}</p>}

                <div className="flex gap-3">
                  <button onClick={handleReset} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    Catat Lagi
                  </button>
                  <button onClick={() => setCommandModalOpen(false)} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors">
                    Selesai
                  </button>
                </div>
              </motion.div>
            )}

            {/* ERROR */}
            {stage === 'error' && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                </div>
                <p className="text-lg font-bold text-slate-800 mb-2">{resultMessage || '❓ Perintah tidak dipahami'}</p>
                <p className="text-sm text-slate-500 mb-6">{resultDetails || 'Coba ulangi dengan lebih spesifik.'}</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleReset} className="py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
                    Coba Lagi
                  </button>
                  <button onClick={() => setCommandModalOpen(false)} className="py-3 bg-slate-900 text-white rounded-xl text-sm font-bold">
                    Tutup
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 text-center">
          <span className="text-xs text-slate-400">Powered by <span className="font-semibold text-indigo-500">Monefyi AI</span> · Layer 1→2→3 Parsing</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
