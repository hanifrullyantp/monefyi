import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sparkles, Mic, MicOff, Send, CheckCircle, AlertCircle,
  Wallet, BarChart3, FileText, Clock, Plus,
  RotateCcw, MessageSquare, Wand2, Brain, PencilLine,
  Hash, Lightbulb, TrendingUp, ShoppingCart,
} from 'lucide-react';
import {
  aiParseCommand, runCommandPipeline,
  type ParsedCommand, type ParseSource,
} from '../lib/commandParser';
import { finalizeParams } from '../lib/commandNormalize';
import {
  resolveTags, tagSuggestions, applyTagSuggestion, applyProgressTagHints, tagTypeLabel,
  type TaggableEntity, type ResolvedTag,
} from '../lib/commandTags';
import {
  buildNextActions, historyRecommendations, type Recommendation,
} from '../lib/recommendations';
import { executeIntent } from '../lib/intentExecutor';
import { parseCostText, type ParsedCostLine } from '../lib/costParser';
import { formatRupiah } from '../utils/projectUi';
import { logCommand, loadCommandLogs } from '../services/commandService';
import { recordCorrection, loadMemoryExamples } from '../services/commandMemoryService';
import { loadAliases } from '../services/commandAliasService';
import { loadWorkItems } from '../services/workItemService';
import { loadRapItems } from '../services/rapService';
import { aggregateCostByRapItem, loadCostRealizations } from '../services/costService';
import { findCostDuplicate } from '../lib/rapDuplicateDetect';
import { listMembers } from '../services/memberService';
import { useAppStore } from '../store/appStore';

type Stage = 'idle' | 'listening' | 'processing' | 'confirm' | 'success' | 'error';

interface FormState {
  intent: string;
  data: Record<string, string | number>;
  projectName: string;
}

const quickCommands = [
  { icon: Wallet, label: 'Catat Biaya', color: 'bg-emerald-100 text-emerald-700', template: 'catat semen 10 sak 65000' },
  { icon: BarChart3, label: 'Update Progress', color: 'bg-emerald-100 text-emerald-700', template: 'update progress pondasi 75%' },
  { icon: FileText, label: 'Cek Budget', color: 'bg-blue-100 text-blue-700', template: 'cek budget project' },
  { icon: Clock, label: 'Log Pekerja', color: 'bg-amber-100 text-amber-700', template: 'hari ini hadir 8 orang' },
  { icon: Plus, label: 'Buka Proyek', color: 'bg-rose-100 text-rose-700', template: 'buka project' },
];

const INTENT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'record_cost', label: 'Catat Biaya' },
  { value: 'record_cost_batch', label: 'Catat Biaya (Batch)' },
  { value: 'update_progress', label: 'Update Progress' },
  { value: 'check_budget', label: 'Cek Budget' },
  { value: 'check_progress', label: 'Cek Progress' },
  { value: 'add_worker_log', label: 'Log Pekerja' },
  { value: 'open_project', label: 'Buka Proyek' },
  { value: 'ask_recommendation', label: 'Rekomendasi' },
  { value: 'open_report', label: 'Buka Laporan' },
];

const FIELD_LABELS: Record<string, string> = {
  item: 'Item / Material',
  qty: 'Jumlah',
  unitPrice: 'Harga Satuan',
  total: 'Total',
  progress: 'Progress (%)',
  workItem: 'Pekerjaan',
  workers: 'Jumlah Pekerja',
  amount: 'Nominal',
  source: 'Sumber',
};

const NUMBER_FIELDS = new Set(['qty', 'unitPrice', 'total', 'progress', 'workers', 'amount']);

// Fields that are derived/handled elsewhere and should not be free-text inputs.
const HIDDEN_FIELDS = new Set(['projectName']);

const STAGE_ORDER: Record<ParseSource, number> = { memory: 1, rule: 2, ai: 3 };

function intentLabel(intent: string): string {
  return INTENT_OPTIONS.find(o => o.value === intent)?.label || intent.replace(/_/g, ' ');
}

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
  const [transcript, setTranscript] = useState('');
  const [pipelineStage, setPipelineStage] = useState<ParseSource>('memory');
  const [resultMessage, setResultMessage] = useState('');
  const [resultDetails, setResultDetails] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  const [form, setForm] = useState<FormState>({ intent: '', data: {}, projectName: '' });
  const [origParse, setOrigParse] = useState<ParsedCommand | null>(null);
  const [edited, setEdited] = useState(false);
  const [workItemOptions, setWorkItemOptions] = useState<string[]>([]);
  const [rapOptions, setRapOptions] = useState<string[]>([]);

  // Phase 2: tagging, recommendations, writing autocomplete.
  const [taggables, setTaggables] = useState<TaggableEntity[]>([]);
  const [nextActions, setNextActions] = useState<Recommendation[]>([]);
  const [histRecs, setHistRecs] = useState<Recommendation[]>([]);
  const [writeHints, setWriteHints] = useState<string[]>([]);
  const [tagOpen, setTagOpen] = useState<{ fragment: string; matches: TaggableEntity[] } | null>(null);
  const [resolvedTags, setResolvedTags] = useState<ResolvedTag[]>([]);
  const [writeSuggest, setWriteSuggest] = useState<string[]>([]);
  // Tag-free text used for learning so memory signatures stay clean.
  const [learnText, setLearnText] = useState('');
  const [batchMode, setBatchMode] = useState(false);
  const [batchLines, setBatchLines] = useState<ParsedCostLine[]>([]);
  const [batchDuplicateIdx, setBatchDuplicateIdx] = useState<Set<number>>(new Set());

  const inputRef = useRef<HTMLTextAreaElement>(null);
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
        setHistRecs(historyRecommendations(logs));
        setWriteHints(prev => Array.from(new Set([...logs.map(l => l.input), ...prev])));
      }).catch(console.error);
    }
  }, [user?.id, setCommandLogs]);

  useEffect(() => {
    if (stage === 'idle') inputRef.current?.focus();
  }, [stage]);

  // Load taggable entities (projects + workers + RAP + work items + aliases) and memory hints.
  useEffect(() => {
    const orgId = tenant?.id;
    if (!orgId) return;
    let cancelled = false;

    (async () => {
      const base: TaggableEntity[] = projects.map(p => ({ type: 'project', id: p.id, name: p.name }));

      const [members, aliases, memEx] = await Promise.all([
        listMembers(orgId).catch(() => []),
        loadAliases(orgId).catch(() => []),
        loadMemoryExamples(orgId, 12).catch(() => []),
      ]);

      const workerTags: TaggableEntity[] = members
        .map(m => m.profile?.name)
        .filter((n): n is string => Boolean(n))
        .map(name => ({ type: 'worker' as const, name }));

      let rapTags: TaggableEntity[] = [];
      let workItemTags: TaggableEntity[] = [];
      if (activeProject) {
        const [rap, workItems] = await Promise.all([
          loadRapItems(activeProject.id).catch(() => []),
          loadWorkItems(activeProject.id).catch(() => []),
        ]);
        rapTags = rap.map(r => ({ type: 'rap' as const, id: r.id, name: r.name }));
        workItemTags = workItems
          .filter(wi => (Number(wi.progress_pct) || 0) < 100 && wi.status !== 'completed')
          .map(wi => ({
            type: 'work_item' as const,
            id: wi.id,
            name: wi.name,
            progressPct: Number(wi.progress_pct) || 0,
          }));
      }

      if (cancelled) return;
      setTaggables([...base, ...workItemTags, ...workerTags, ...rapTags, ...aliases]);
      setWriteHints(prev => Array.from(new Set([...prev, ...memEx.map(e => e.input)])));
    })();

    return () => { cancelled = true; };
  }, [tenant?.id, projects, activeProject?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build next-action recommendations for the active project.
  useEffect(() => {
    if (!activeProject) { setNextActions([]); return; }
    let cancelled = false;

    (async () => {
      const [rap, costByRap, workItems] = await Promise.all([
        loadRapItems(activeProject.id).catch(() => []),
        aggregateCostByRapItem(activeProject.id).catch(() => ({})),
        loadWorkItems(activeProject.id).catch(() => []),
      ]);
      if (cancelled) return;
      setNextActions(buildNextActions({ rapItems: rap, costByRap, workItems }));
    })();

    return () => { cancelled = true; };
  }, [activeProject?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load work item / RAP suggestions for the chosen target project.
  useEffect(() => {
    if (stage !== 'confirm') return;
    const target = projects.find(p => p.name === form.projectName) || activeProject;
    if (!target) return;
    loadWorkItems(target.id).then(items => setWorkItemOptions(items.map(i => i.name))).catch(() => setWorkItemOptions([]));
    loadRapItems(target.id).then(items => setRapOptions(items.map(i => i.name))).catch(() => setRapOptions([]));
  }, [stage, form.projectName]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (stage !== 'confirm' || !batchMode || !batchLines.length) {
      setBatchDuplicateIdx(new Set());
      return;
    }
    const target = projects.find(p => p.name === form.projectName) || activeProject;
    if (!target) return;
    let cancelled = false;
    loadCostRealizations(target.id).then(costs => {
      if (cancelled) return;
      const dupes = new Set<number>();
      batchLines.forEach((line, idx) => {
        if (findCostDuplicate(costs, { date: line.date, amount: line.total, description: line.item })) {
          dupes.add(idx);
        }
      });
      setBatchDuplicateIdx(dupes);
    }).catch(() => setBatchDuplicateIdx(new Set()));
    return () => { cancelled = true; };
  }, [stage, batchMode, batchLines, form.projectName, activeProject?.id, projects]); // eslint-disable-line react-hooks/exhaustive-deps

  // React to typing: tag autocomplete + writing suggestions.
  const handleInputChange = (value: string) => {
    setInput(value);

    const sugg = tagSuggestions(value, taggables);
    setTagOpen(sugg && sugg.matches.length ? sugg : null);

    setResolvedTags(value.includes('#') ? resolveTags(value, taggables).tags : []);

    if (!sugg && value.trim().length >= 2) {
      const frag = value.toLowerCase();
      const matches = writeHints
        .filter(h => h && h.toLowerCase() !== frag && h.toLowerCase().includes(frag))
        .slice(0, 4);
      setWriteSuggest(matches);
    } else {
      setWriteSuggest([]);
    }
  };

  const chooseTag = (entity: TaggableEntity) => {
    const next = applyTagSuggestion(input, entity);
    setInput(next);
    setTagOpen(null);
    setResolvedTags(resolveTags(next, taggables).tags);
    inputRef.current?.focus();
  };

  const pipelineContext = () => ({
    orgId: tenant?.id,
    projects: projects.map(p => ({ name: p.name, id: p.id, status: p.status })),
    work_items: [],
    current_project: activeProject?.name || null,
  });

  const populateForm = (parsed: ParsedCommand) => {
    if (parsed.intent === 'record_cost_batch' && Array.isArray(parsed.params.items)) {
      setBatchMode(true);
      setBatchLines(parsed.params.items as ParsedCostLine[]);
      setForm({
        intent: 'record_cost_batch',
        data: {},
        projectName: activeProject?.name || '',
      });
      setOrigParse(parsed);
      setEdited(false);
      return;
    }

    setBatchMode(false);
    setBatchLines([]);
    const data: Record<string, string | number> = {};
    let projectName = '';
    for (const [k, v] of Object.entries(parsed.params || {})) {
      if (k === 'projectName') {
        projectName = v != null ? String(v) : '';
        continue;
      }
      if (k === 'items') continue;
      if (v == null) continue;
      data[k] = typeof v === 'number' ? v : String(v);
    }
    setForm({
      intent: parsed.intent,
      data,
      projectName: projectName || activeProject?.name || '',
    });
    setOrigParse(parsed);
    setEdited(false);
  };

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
    setTagOpen(null);
    setWriteSuggest([]);
    setPipelineStage('memory');

    // Batch cost paste: parse raw text first (before tag cleanup collapses newlines).
    const batchFromRaw = parseCostText(text);
    if (batchFromRaw.length > 0) {
      populateForm({
        intent: 'record_cost_batch',
        params: { items: batchFromRaw },
        confidence: 0.9,
        raw: text,
        source: 'rule',
      });
      setLearnText(text);
      setStage('confirm');
      return;
    }

    const { cleanText, hints } = resolveTags(text, taggables);
    const parseText = cleanText || text;
    setLearnText(parseText);

    const batchFromClean = parseCostText(parseText);
    if (batchFromClean.length > 0) {
      populateForm({
        intent: 'record_cost_batch',
        params: { items: batchFromClean },
        confidence: 0.9,
        raw: text,
        source: 'rule',
      });
      setStage('confirm');
      return;
    }

    let parsed = await runCommandPipeline(parseText, pipelineContext(), s => setPipelineStage(s));

    // Apply tag hints to improve accuracy (project, RAP, worker, work item / progress).
    if (hints.projectName) parsed.params = { ...parsed.params, projectName: hints.projectName };
    if (hints.rapName && !parsed.params.item) parsed.params = { ...parsed.params, item: hints.rapName };
    if (hints.workerName && !parsed.params.source) parsed.params = { ...parsed.params, source: hints.workerName };

    parsed = {
      ...parsed,
      ...applyProgressTagHints(parseText, hints, parsed),
    };

    // Work-item tag alone → open editable confirm for progress update.
    const taggedProgressOnly =
      hints.workItemName &&
      parsed.intent === 'update_progress' &&
      parsed.confidence >= 0.75;

    if ((parsed.intent === 'unknown' || parsed.confidence < 0.5) && !taggedProgressOnly) {
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

    populateForm(parsed);
    setStage('confirm');
  };

  const handleFixWithAI = async () => {
    if (!input.trim()) return;
    setStage('processing');
    setPipelineStage('ai');
    const aiResult = await aiParseCommand(input, pipelineContext());
    if (aiResult && aiResult.intent !== 'unknown') {
      populateForm(aiResult);
      setEdited(false);
      setStage('confirm');
    } else {
      setResultMessage('AI belum bisa memahami. Silakan isi manual.');
      setResultDetails('');
      setStage('error');
    }
  };

  const openManualForm = () => {
    setForm({
      intent: 'record_cost',
      data: {},
      projectName: activeProject?.name || '',
    });
    setOrigParse({ intent: 'unknown', params: {}, confidence: 0, raw: input, source: 'ai' });
    setEdited(true);
    setStage('confirm');
  };

  const updateField = (key: string, value: string) => {
    setForm(prev => {
      const data = { ...prev.data, [key]: value };
      // Keep total in sync when editing qty / unit price for cost entries.
      if ((key === 'qty' || key === 'unitPrice') && prev.intent === 'record_cost') {
        const qty = Number(key === 'qty' ? value : data.qty);
        const unitPrice = Number(key === 'unitPrice' ? value : data.unitPrice);
        if (!Number.isNaN(qty) && !Number.isNaN(unitPrice) && qty && unitPrice) {
          data.total = qty * unitPrice;
        }
      }
      return { ...prev, data };
    });
    setEdited(true);
  };

  const formToParams = (): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form.data)) {
      if (v === '' || v == null) continue;
      out[k] = NUMBER_FIELDS.has(k) ? Number(v) : v;
    }
    if (form.projectName) out.projectName = form.projectName;
    return finalizeParams(out);
  };

  const handleExecute = async () => {
    if (!user || !tenant || !form.intent) return;
    setStage('processing');

    const finalParams = batchMode && form.intent === 'record_cost_batch'
      ? { items: batchLines }
      : formToParams();
    const parsed = {
      intent: form.intent,
      params: finalParams,
      confidence: 0.95,
      raw: input,
    };

    const target =
      projects.find(p => p.name === form.projectName) || activeProject || null;

    try {
      const workItems = target ? await loadWorkItems(target.id) : [];

      const result = await executeIntent(parsed, {
        userId: user.id,
        orgId: tenant.id,
        projects,
        currentProject: target,
        workItems,
        onNavigate: path => navigate(path),
        onRefreshProjects: refreshData,
        loadWorkItemsForProject: loadWorkItems,
      });

      // Learning: persist corrections / reinforce so the parser improves over time.
      if (result.success && form.intent !== 'unknown') {
        const shouldLearn =
          edited || origParse?.source === 'ai' || origParse?.source === 'memory';
        if (shouldLearn) {
          await recordCorrection({
            orgId: tenant.id,
            userId: user.id,
            rawInput: learnText || input,
            intent: form.intent,
            params: finalParams,
            source: edited ? 'user' : (origParse?.source === 'ai' ? 'ai' : 'user'),
          }).catch(() => {});
        }
        if (form.intent === 'record_cost_batch') {
          const batchSeeds = [
            { rawInput: 'duit keluar', params: { items: [] } },
            { rawInput: 'duit keluar :', params: { items: [] } },
            {
              rawInput: '- 63.500 belanja ferum (indra)',
              params: { items: [{ date: '2026-06-05', total: 63500, item: 'belanja ferum', supplier: 'indra' }] },
            },
          ];
          for (const seed of batchSeeds) {
            await recordCorrection({
              orgId: tenant.id,
              userId: user.id,
              rawInput: seed.rawInput,
              intent: 'record_cost_batch',
              params: seed.params,
              source: 'user',
            }).catch(() => {});
          }
        }
      }

      await logCommand({
        userId: user.id,
        orgId: tenant.id,
        inputType: isListening ? 'voice' : 'text',
        rawInput: input,
        parsedIntent: parsed.intent,
        parsedParams: finalParams,
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
    setForm({ intent: '', data: {}, projectName: '' });
    setOrigParse(null);
    setEdited(false);
    setTranscript('');
    setTagOpen(null);
    setResolvedTags([]);
    setWriteSuggest([]);
    setLearnText('');
    setBatchMode(false);
    setBatchLines([]);
    setBatchDuplicateIdx(new Set());
  };

  const sourceBadge = (() => {
    if (!origParse) return 'Aturan';
    if (origParse.source === 'memory') return 'Memori Tim';
    if (origParse.source === 'ai') return origParse.provider ? `AI · ${origParse.provider}` : 'AI';
    return 'Aturan';
  })();

  const renderFieldInput = (key: string, value: string | number) => {
    const strVal = value === 0 ? '0' : String(value ?? '');

    if (key === 'workItem' && workItemOptions.length > 0) {
      return (
        <select
          value={strVal}
          onChange={e => updateField(key, e.target.value)}
          className="text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1 max-w-[60%] focus:border-emerald-400 outline-none"
        >
          <option value="">— pilih —</option>
          {!workItemOptions.includes(strVal) && strVal && <option value={strVal}>{strVal}</option>}
          {workItemOptions.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }

    return (
      <input
        type={NUMBER_FIELDS.has(key) ? 'number' : 'text'}
        value={strVal}
        list={key === 'item' && rapOptions.length ? 'rap-options' : undefined}
        onChange={e => updateField(key, e.target.value)}
        className="text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1 text-right max-w-[60%] focus:border-emerald-400 outline-none"
      />
    );
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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-black text-slate-900 text-sm">Monefyi Assistant</div>
              <div className="text-xs text-slate-400">
                Konteks: <span className="text-emerald-600 font-medium">{activeProject?.name || 'Umum'}</span>
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
                <div className="relative mb-2">
                  <div className="flex items-start gap-2 bg-slate-50 border-2 border-slate-200 focus-within:border-emerald-400 rounded-2xl px-4 py-3 transition-colors">
                    <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <textarea
                      ref={inputRef}
                      value={input}
                      rows={input.includes('\n') ? 6 : 2}
                      onChange={e => handleInputChange(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          setTagOpen(null);
                          handleProcess();
                        }
                      }}
                      placeholder="Ketik perintah atau paste WhatsApp (Duit keluar)… #proyek #rap"
                      className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder-slate-400 resize-y min-h-[2.5rem]"
                    />
                    <button
                      onClick={isListening ? stopListening : startListening}
                      className={`p-1.5 rounded-xl transition-colors ${isListening ? 'bg-rose-100 text-rose-600' : 'hover:bg-emerald-100 text-slate-400 hover:text-emerald-600'}`}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    {input && (
                      <button
                        onClick={() => handleProcess()}
                        className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Tag autocomplete dropdown */}
                  {tagOpen && (
                    <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                      {tagOpen.matches.map((m, i) => (
                        <button
                          key={`${m.type}-${m.name}-${i}`}
                          onClick={() => chooseTag(m)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-emerald-50 text-left"
                        >
                          <Hash className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="text-sm text-slate-700 truncate">
                            {m.name}
                            {m.type === 'work_item' && m.progressPct != null && (
                              <span className="text-slate-400 font-normal"> · {m.progressPct}%</span>
                            )}
                          </span>
                          <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-400">{tagTypeLabel(m.type)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resolved tag chips */}
                {resolvedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {resolvedTags.map((t, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${t.matched ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}
                      >
                        <Hash className="w-3 h-3" />{t.name || t.key}
                      </span>
                    ))}
                  </div>
                )}

                {/* Writing suggestions */}
                {writeSuggest.length > 0 && (
                  <div className="mb-4 space-y-1">
                    {writeSuggest.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => { handleInputChange(s); inputRef.current?.focus(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors text-left"
                      >
                        <PencilLine className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-xs text-emerald-700 truncate">{s}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Next-action recommendations */}
                {nextActions.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Rekomendasi Berikutnya
                    </p>
                    <div className="space-y-2">
                      {nextActions.map(rec => (
                        <button
                          key={rec.id}
                          onClick={() => handleProcess(rec.command)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-50 hover:from-emerald-100 hover:to-emerald-100 transition-colors text-left group"
                        >
                          {rec.type === 'cost'
                            ? <ShoppingCart className="w-4 h-4 text-emerald-500 shrink-0" />
                            : <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-slate-700 truncate">{rec.label}</div>
                            {rec.detail && <div className="text-[11px] text-slate-400 truncate">{rec.detail}</div>}
                          </div>
                          <Send className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-500 shrink-0 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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

                {/* Frequently used (from history signatures) */}
                {histRecs.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Sering Dilakukan</p>
                    <div className="flex flex-wrap gap-2">
                      {histRecs.map(rec => (
                        <button
                          key={rec.id}
                          onClick={() => handleProcess(rec.command)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 text-xs font-medium transition-colors"
                          title={rec.detail}
                        >
                          {rec.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* History */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Riwayat</p>
                  <div className="space-y-2">
                    {history.slice(0, 5).map((h, i) => (
                      <button
                        key={i}
                        onClick={() => { handleInputChange(h); inputRef.current?.focus(); }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-left group"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-600 truncate">{h}</span>
                        <Send className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-500 ml-auto shrink-0 transition-colors" />
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
                <p className="text-lg font-bold text-slate-800 mb-2">Mendengarkan...</p>
                {transcript && <p className="text-sm text-slate-500 italic">"{transcript}"</p>}
                <button onClick={stopListening} className="mt-6 px-6 py-2.5 bg-rose-100 text-rose-700 rounded-xl text-sm font-medium hover:bg-rose-200 transition-colors">
                  Stop
                </button>
              </motion.div>
            )}

            {/* PROCESSING */}
            {stage === 'processing' && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-10 text-center">
                <div className="w-12 h-12 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="font-bold text-slate-800 mb-2">Memproses perintah...</p>
                <div className="space-y-1.5">
                  {[
                    { key: 'memory' as ParseSource, label: 'Memori Tim' },
                    { key: 'rule' as ParseSource, label: 'Aturan Parser' },
                    { key: 'ai' as ParseSource, label: 'AI Multi-Provider' },
                  ].map(l => {
                    const done = STAGE_ORDER[pipelineStage] >= STAGE_ORDER[l.key];
                    return (
                      <div key={l.key} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${done ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        {l.label}
                        {done && pipelineStage === l.key && <span className="ml-auto animate-pulse">...</span>}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* CONFIRM (editable) */}
            {stage === 'confirm' && (
              <motion.div key="confirm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <PencilLine className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">Konfirmasi &amp; Koreksi</span>
                  <span className="ml-auto inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                    <Brain className="w-3 h-3" /> {sourceBadge}
                  </span>
                </div>

                <datalist id="rap-options">
                  {rapOptions.map(o => <option key={o} value={o} />)}
                </datalist>

                <div className="bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-200 space-y-3">
                  {/* Intent selector */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Jenis Perintah</span>
                    <select
                      value={form.intent}
                      onChange={e => { setForm(p => ({ ...p, intent: e.target.value })); setEdited(true); }}
                      className="text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1 focus:border-emerald-400 outline-none"
                    >
                      {!INTENT_OPTIONS.some(o => o.value === form.intent) && form.intent && (
                        <option value={form.intent}>{intentLabel(form.intent)}</option>
                      )}
                      {INTENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>

                  {/* Target project selector */}
                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-500">Proyek Tujuan</span>
                    <select
                      value={form.projectName}
                      onChange={e => { setForm(p => ({ ...p, projectName: e.target.value })); setEdited(true); }}
                      className="text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1 max-w-[60%] focus:border-emerald-400 outline-none"
                    >
                      <option value="">— umum —</option>
                      {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>

                  {/* Editable params */}
                  {!batchMode && Object.entries(form.data)
                    .filter(([key]) => !HIDDEN_FIELDS.has(key))
                    .map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        <span className="text-xs text-slate-500 capitalize">{FIELD_LABELS[key] || key.replace(/_/g, ' ')}</span>
                        {renderFieldInput(key, val)}
                      </div>
                    ))}
                </div>

                {batchMode && batchLines.length > 0 && (
                  <div className="mb-4 border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 border-b text-xs font-bold text-slate-600 flex flex-wrap gap-2 justify-between">
                      <span>Preview {batchLines.length} biaya · Total {formatRupiah(batchLines.reduce((s, l) => s + l.total, 0))}</span>
                      {batchDuplicateIdx.size > 0 && (
                        <span className="text-amber-700 font-semibold">
                          {batchDuplicateIdx.size} baris mirip biaya existing
                        </span>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-white sticky top-0">
                          <tr className="text-slate-500">
                            <th className="p-2 text-left">Tgl</th>
                            <th className="p-2 text-left">Item</th>
                            <th className="p-2 text-right">Total</th>
                            <th className="p-2 w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {batchLines.map((line, idx) => (
                            <tr key={idx} className={`border-t border-slate-100 ${batchDuplicateIdx.has(idx) ? 'bg-amber-50' : ''}`}>
                              <td className="p-2">
                                {batchDuplicateIdx.has(idx) && (
                                  <span className="text-[10px] text-amber-700 font-bold block mb-0.5">dup</span>
                                )}
                                <input
                                  type="date"
                                  value={line.date}
                                  onChange={e => {
                                    const v = e.target.value;
                                    setBatchLines(prev => prev.map((l, i) => i === idx ? { ...l, date: v } : l));
                                    setEdited(true);
                                  }}
                                  className="border rounded px-1 py-0.5 w-full"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  value={line.item}
                                  onChange={e => {
                                    const v = e.target.value;
                                    setBatchLines(prev => prev.map((l, i) => i === idx ? { ...l, item: v } : l));
                                    setEdited(true);
                                  }}
                                  className="border rounded px-1 py-0.5 w-full"
                                />
                                {line.supplier && <span className="text-[10px] text-slate-400">({line.supplier})</span>}
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  value={line.total}
                                  onChange={e => {
                                    const v = Number(e.target.value);
                                    setBatchLines(prev => prev.map((l, i) => i === idx ? { ...l, total: v } : l));
                                    setEdited(true);
                                  }}
                                  className="border rounded px-1 py-0.5 w-full text-right"
                                />
                              </td>
                              <td className="p-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBatchLines(prev => prev.filter((_, i) => i !== idx));
                                    setEdited(true);
                                  }}
                                  className="text-rose-500 hover:text-rose-700"
                                  aria-label="Hapus baris"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {edited && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-xs text-emerald-700">
                    <Brain className="w-4 h-4 shrink-0" />
                    Koreksi ini akan dipelajari agar perintah serupa lebih akurat untuk tim.
                  </div>
                )}

                <div className="flex gap-2 mb-3">
                  <button onClick={handleFixWithAI} className="flex-1 py-2.5 border border-emerald-200 bg-emerald-50 rounded-xl text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5" /> Perbaiki dgn AI
                  </button>
                </div>

                <div className="flex gap-3">
                  <button onClick={handleReset} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                    <X className="w-4 h-4" /> Batal
                  </button>
                  <button onClick={handleExecute} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-200">
                    <CheckCircle className="w-4 h-4" />
                    {batchMode ? `Catat ${batchLines.length} biaya` : 'Benar, Catat!'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* SUCCESS */}
            {stage === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-lg font-black text-slate-900 mb-1">Berhasil!</p>
                <p className="text-sm text-slate-500 mb-2">{resultMessage}</p>
                {resultDetails && <p className="text-xs text-slate-400 mb-6">{resultDetails}</p>}

                <div className="flex gap-3">
                  <button onClick={handleReset} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    Catat Lagi
                  </button>
                  <button onClick={() => setCommandModalOpen(false)} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors">
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
                <p className="text-lg font-bold text-slate-800 mb-2">{resultMessage || 'Perintah tidak dipahami'}</p>
                <p className="text-sm text-slate-500 mb-6">{resultDetails || 'Coba ulangi dengan lebih spesifik.'}</p>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={handleReset} className="py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
                    Coba Lagi
                  </button>
                  <button onClick={handleFixWithAI} className="py-3 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-100 flex items-center justify-center gap-1">
                    <Wand2 className="w-3.5 h-3.5" /> AI
                  </button>
                  <button onClick={openManualForm} className="py-3 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1">
                    <PencilLine className="w-3.5 h-3.5" /> Manual
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 text-center">
          <span className="text-xs text-slate-400">Powered by <span className="font-semibold text-emerald-500">Monefyi AI</span> · Memori Tim → Aturan → AI</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
