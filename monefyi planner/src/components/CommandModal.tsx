import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sparkles, Mic, MicOff, Send, CheckCircle, AlertCircle,
  Wallet, BarChart3, FileText, CheckSquare, Clock, Plus,
  RotateCcw, MessageSquare
} from 'lucide-react';
import { useAppStore } from '../store/appStore';

type Stage = 'idle' | 'listening' | 'processing' | 'confirm' | 'success' | 'error';

interface ParsedCommand {
  intent: string;
  description: string;
  data: Record<string, string | number>;
  warning?: string;
}

const quickCommands = [
  { icon: Wallet, label: 'Catat Biaya', color: 'bg-indigo-100 text-indigo-700', template: 'catat semen 50 sak 65 ribu' },
  { icon: BarChart3, label: 'Update Progress', color: 'bg-emerald-100 text-emerald-700', template: 'update progress pondasi 75%' },
  { icon: FileText, label: 'Laporan', color: 'bg-blue-100 text-blue-700', template: 'gimana project rumah pak ahmad?' },
  { icon: CheckSquare, label: 'Todo', color: 'bg-violet-100 text-violet-700', template: 'todo cek material besok pagi' },
  { icon: Clock, label: 'Absensi', color: 'bg-amber-100 text-amber-700', template: 'check in' },
  { icon: Plus, label: 'Baru', color: 'bg-rose-100 text-rose-700', template: 'buat project baru' },
];

const exampleHistory = [
  'catat semen 50 sak 65 ribu project rumah pak ahmad',
  'update pondasi 70 persen',
  'gimana saldo kas?',
];

function formatRupiah(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

function parseCommand(input: string): ParsedCommand | null {
  const lower = input.toLowerCase().trim();

  // Attendance
  if (/^(check in|hadir|masuk|absen masuk)$/.test(lower)) {
    return {
      intent: 'ABSENSI_CHECKIN',
      description: 'Check In Absensi',
      data: { waktu: '08:15', lokasi: 'Site A — Terverifikasi ✓', status: 'Tepat Waktu' },
    };
  }
  if (/^(check out|pulang|selesai|absen keluar)$/.test(lower)) {
    return {
      intent: 'ABSENSI_CHECKOUT',
      description: 'Check Out Absensi',
      data: { waktu: '17:05', total_kerja: '8 jam 50 menit', status: 'Lembur 5 menit' },
    };
  }

  // Cost recording
  const costMatch = lower.match(/(?:catat|beli|nota|bayar|keluar).*?(\d[\d.,]*)\s*(sak|kubik|m3|m²|liter|kg|batang|unit|buah|ls|orang|hari|set)\s*(?:@|harga|x)?\s*(\d[\d.,]*)?\s*(?:ribu|rb|juta|jt|k)?/);
  if (costMatch || lower.includes('catat') || lower.includes('beli') || lower.includes('nota')) {
    const parts = lower.match(/(?:catat|beli|nota|bayar)\s+(.+?)\s+(\d+)\s*(\w+)\s+(?:harga\s+)?(\d+)\s*(ribu|rb|juta|jt)?/);
    let item = 'Item', qty = 1, unit = 'pcs', price = 0;
    if (parts) {
      item = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
      qty = parseInt(parts[2]);
      unit = parts[3];
      price = parseInt(parts[4]) * (parts[5]?.includes('juta') || parts[5]?.includes('jt') ? 1000000 : parts[5]?.includes('ribu') || parts[5]?.includes('rb') ? 1000 : 1);
    } else {
      // Simple extraction
      const words = lower.split(' ');
      const numIdx = words.findIndex(w => /^\d+$/.test(w));
      if (numIdx > 0) {
        item = words.slice(1, numIdx).join(' ');
        item = item.charAt(0).toUpperCase() + item.slice(1);
        qty = parseInt(words[numIdx]);
        unit = words[numIdx + 1] || 'pcs';
        const priceWord = words.slice(numIdx + 2).join(' ');
        if (priceWord.includes('juta') || priceWord.includes('jt')) {
          price = parseFloat(priceWord) * 1000000;
        } else if (priceWord.includes('ribu') || priceWord.includes('rb')) {
          const p = priceWord.replace(/[^\d]/g, '');
          price = parseInt(p) * 1000;
        } else {
          price = parseInt(priceWord.replace(/[^\d]/g, '')) || 65000;
        }
      }
    }
    if (!price) price = 65000;
    const total = qty * price;
    return {
      intent: 'CATAT_BIAYA',
      description: 'Catat Realisasi Biaya',
      data: {
        item: item || 'Semen',
        qty: qty || 50,
        unit: unit || 'sak',
        harga_satuan: formatRupiah(price || 65000),
        total: formatRupiah(total || 3250000),
        project: 'Rumah Pak Ahmad',
        tanggal: new Date().toLocaleDateString('id-ID'),
      },
      warning: total > 5000000 ? '⚠️ Budget kategori ini sudah 85% terpakai' : undefined,
    };
  }

  // Progress update
  const progressMatch = lower.match(/(?:update|progress|hari ini).*?(\w[\w\s]+?)\s+(?:sudah\s+)?(\d+)\s*(?:%|persen)/);
  if (progressMatch) {
    return {
      intent: 'UPDATE_PROGRESS',
      description: 'Update Progress Task',
      data: {
        task: progressMatch[1].trim(),
        progress_baru: `${progressMatch[2]}%`,
        progress_lama: '65%',
        project: 'Rumah Pak Ahmad',
        tanggal: new Date().toLocaleDateString('id-ID'),
      },
    };
  }

  // Query
  if (lower.includes('gimana') || lower.includes('saldo') || lower.includes('progress') || lower.includes('laporan') || lower.includes('budget')) {
    return {
      intent: 'QUERY',
      description: 'Tampilkan Informasi',
      data: {
        project: 'Rumah Pak Ahmad',
        progress: '67% (target: 72%)',
        budget: '62% terpakai (Rp 279jt / Rp 450jt)',
        cpi: '0.91',
        spi: '0.93',
        health: '⚠️ At Risk — Behind 5%',
      },
    };
  }

  // Todo
  if (lower.includes('todo') || lower.includes('ingatkan') || lower.includes('tugas')) {
    const taskDesc = lower.replace(/^(todo|ingatkan|tambah tugas|tugas)\s+/i, '');
    return {
      intent: 'TAMBAH_TODO',
      description: 'Tambah Todo',
      data: {
        judul: taskDesc || 'Tugas baru',
        prioritas: 'Medium',
        deadline: 'Besok',
        assign_ke: 'Diri Sendiri',
      },
    };
  }

  return null;
}

export default function CommandModal() {
  const { setCommandModalOpen, addTransaction, addTodo, addCommandLog, projects } = useAppStore();
  const [input, setInput] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [isListening, setIsListening] = useState(false);
  const [parsedCmd, setParsedCmd] = useState<ParsedCommand | null>(null);
  const [transcript, setTranscript] = useState('');
  const [layer, setLayer] = useState<1 | 2 | 3>(1);
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const activeProject = projects.find(p => p.status === 'active');

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
    if (!text.trim()) return;
    setStage('processing');
    setInput(text);

    // Simulate processing layers
    await new Promise(r => setTimeout(r, 800));

    const parsed = parseCommand(text);
    if (parsed) {
      setLayer(1);
      setParsedCmd(parsed);
      setStage('confirm');
    } else {
      // Simulate Layer 2/3
      setLayer(2);
      await new Promise(r => setTimeout(r, 400));
      setLayer(3);
      await new Promise(r => setTimeout(r, 600));
      setParsedCmd({
        intent: 'UNKNOWN',
        description: 'Interpretasi Perintah',
        data: { input: text, catatan: 'Perintah tidak dikenali sepenuhnya' },
      });
      setStage('error');
    }

    addCommandLog({
      id: Date.now().toString(),
      input: text,
      intent: parsed?.intent,
      success: !!parsed,
      timestamp: new Date().toISOString(),
    });
  };

  const handleExecute = () => {
    if (!parsedCmd) return;
    setStage('processing');

    setTimeout(() => {
      if (parsedCmd.intent === 'CATAT_BIAYA') {
        addTransaction({
          id: Date.now().toString(),
          type: 'expense',
          amount: parsedCmd.data.total ? parseInt(parsedCmd.data.total.toString().replace(/[^\d]/g, '')) : 0,
          description: parsedCmd.data.item?.toString() || 'Item',
          category: 'Material',
          account: 'BCA Utama',
          date: new Date().toISOString().split('T')[0],
          project_id: '1',
          created_at: new Date().toISOString(),
        });
      } else if (parsedCmd.intent === 'TAMBAH_TODO') {
        addTodo({
          id: Date.now().toString(),
          title: parsedCmd.data.judul?.toString() || 'Todo baru',
          priority: 'medium',
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      }
      setStage('success');
    }, 600);
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
                    {exampleHistory.map((h, i) => (
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
                <p className="text-sm text-slate-500 mb-6">{parsedCmd.description} telah dicatat</p>

                {parsedCmd.data.total && (
                  <div className="bg-emerald-50 rounded-2xl p-4 mb-6 border border-emerald-100 text-left">
                    <div className="text-sm font-semibold text-emerald-800 mb-1">💡 Info:</div>
                    <div className="text-xs text-emerald-700">Total pengeluaran hari ini: Rp 5.800.000</div>
                    <div className="text-xs text-amber-600 mt-1">⚠️ Budget kategori ini tersisa 15%</div>
                  </div>
                )}

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
                <p className="text-lg font-bold text-slate-800 mb-2">❓ Perintah tidak dipahami</p>
                <p className="text-sm text-slate-500 mb-6">
                  Coba ulangi dengan lebih spesifik. Contoh:<br />
                  <em className="text-indigo-600">"catat semen 50 sak 65 ribu"</em>
                </p>
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
