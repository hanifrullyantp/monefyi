import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Braces, Copy, Download, RefreshCw, Save, Loader2, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import type { Project } from '../../store/appStore';
import type { RapItem } from '../../services/rapService';
import type { CostRealization } from '../../services/costService';
import type { WorkItem } from '../../services/workItemService';
import type { DailyLog } from '../../services/dailyLogService';
import { useUiStore } from '../../store/uiStore';
import {
  buildProjectJsonSnapshot,
  getProjectJsonTemplate,
  parseProjectJson,
  validateProjectJson,
  applyProjectJson,
  downloadProjectJson,
  type ProjectJsonMode,
} from '../../services/projectJsonService';
import { loadProjectIncomes } from '../../services/incomeService';
import { loadProjectTransfers, type ProjectTransfer } from '../../services/projectTransferService';
import type { ProjectIncome } from '../../services/incomeService';

interface Props {
  project: Project;
  rapItems: RapItem[];
  costs: CostRealization[];
  workItems: WorkItem[];
  logs: DailyLog[];
  orgId?: string;
  canEdit: boolean;
  userId?: string;
  currency?: string;
  onApplied: (project: Project) => void;
}

type PanelView = 'data' | 'template';

export default function ProjectJsonPanel({
  project,
  rapItems,
  costs,
  workItems,
  logs,
  orgId,
  canEdit,
  userId,
  currency,
  onApplied,
}: Props) {
  const showToast = useUiStore(s => s.showToast);
  const [view, setView] = useState<PanelView>('data');
  const [editorText, setEditorText] = useState('');
  const [mode, setMode] = useState<ProjectJsonMode>('merge');
  const [parseError, setParseError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<'data' | 'template' | null>(null);
  const [incomes, setIncomes] = useState<ProjectIncome[]>([]);
  const [transfers, setTransfers] = useState<ProjectTransfer[]>([]);

  useEffect(() => {
    loadProjectIncomes(project.id).then(setIncomes).catch(() => setIncomes([]));
    if (orgId) {
      loadProjectTransfers(orgId, project.id).then(setTransfers).catch(() => setTransfers([]));
    }
  }, [project.id, orgId]);

  const snapshot = useMemo(
    () => buildProjectJsonSnapshot({ project, rapItems, costs, workItems, logs, incomes, transfers }),
    [project, rapItems, costs, workItems, logs, incomes, transfers],
  );

  const template = useMemo(() => getProjectJsonTemplate(project), [project]);

  const templateText = useMemo(() => JSON.stringify(template, null, 2), [template]);

  const loadSnapshot = useCallback(() => {
    setEditorText(JSON.stringify(snapshot, null, 2));
    setParseError(null);
    setValidationErrors([]);
    setView('data');
  }, [snapshot]);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const validateEditor = () => {
    try {
      const doc = parseProjectJson(editorText);
      doc.mode = mode;
      const errors = validateProjectJson(doc);
      setParseError(null);
      setValidationErrors(errors);
      return { doc, errors };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'JSON tidak valid';
      setParseError(msg);
      setValidationErrors([]);
      return null;
    }
  };

  const handleCopy = async (text: string, which: 'data' | 'template') => {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleApply = async () => {
    if (!canEdit || !userId) return;
    const result = validateEditor();
    if (!result || result.errors.length) return;

    setSaving(true);
    try {
      const { doc } = result;
      doc.mode = mode;
      const applied = await applyProjectJson(project.id, doc, userId, currency);
      onApplied(applied.project);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menerapkan JSON', 'error');
    } finally {
      setSaving(false);
    }
  };

  const displayText = view === 'template' ? templateText : editorText;

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-wrap items-start gap-3">
        <Braces className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-[200px] space-y-1">
          <h3 className="font-bold text-sm text-emerald-900">Data Proyek via JSON</h3>
          <p className="text-xs text-emerald-700/80 leading-relaxed">
            Semua data proyek — detail, RAP, realisasi, work item, log harian — tersedia sebagai JSON.
            Edit lalu terapkan, atau salin template di bawah untuk proyek baru.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView('data')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${view === 'data' ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-600'}`}
          >
            Data Saat Ini
          </button>
          <button
            type="button"
            onClick={() => setView('template')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${view === 'template' ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-600'}`}
          >
            Template JSON
          </button>
        </div>
      </div>

      {canEdit && view === 'data' && (
        <div className="flex flex-wrap items-center gap-3 bg-white border rounded-xl px-4 py-3">
          <span className="text-xs font-semibold text-slate-500">Mode terapkan:</span>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="radio" name="jsonMode" checked={mode === 'merge'} onChange={() => setMode('merge')} />
            <span><strong>merge</strong> — upsert by id, data lain tetap</span>
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="radio" name="jsonMode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
            <span><strong>replace</strong> — ganti seluruh section dari JSON</span>
          </label>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {view === 'data' && (
          <button type="button" onClick={loadSnapshot} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border bg-white text-xs font-bold text-slate-600 hover:bg-slate-50">
            <RefreshCw className="w-3.5 h-3.5" /> Muat ulang
          </button>
        )}
        <button
          type="button"
          onClick={() => handleCopy(displayText, view)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border bg-white text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          {copied === view ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied === view ? 'Tersalin' : 'Salin'}
        </button>
        <button
          type="button"
          onClick={() => downloadProjectJson(view === 'template' ? template : snapshot, `${project.code || project.id.slice(0, 8)}-${view}.json`)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border bg-white text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          <Download className="w-3.5 h-3.5" /> Unduh .json
        </button>
        {view === 'template' && canEdit && (
          <button
            type="button"
            onClick={() => { setEditorText(templateText); setView('data'); setParseError(null); setValidationErrors([]); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
          >
            Gunakan template di editor
          </button>
        )}
        {canEdit && view === 'data' && (
          <>
            <button
              type="button"
              onClick={validateEditor}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border bg-white text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Validasi
            </button>
            <button
              type="button"
              disabled={saving || !userId}
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 ml-auto"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Terapkan ke Proyek
            </button>
          </>
        )}
      </div>

      {(parseError || validationErrors.length > 0) && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-4 h-4" />
            {parseError || 'Validasi gagal'}
          </div>
          {validationErrors.map(err => (
            <div key={err}>• {err}</div>
          ))}
        </div>
      )}

      <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-700">
        <div className="px-4 py-2 border-b border-slate-700 flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            {view === 'template' ? 'Template JSON (read-only)' : canEdit ? 'Editor JSON' : 'JSON (read-only)'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {view === 'data'
              ? `${rapItems.length} RAP · ${costs.length} realisasi · ${workItems.length} WI · ${logs.length} log`
              : 'Contoh struktur lengkap'}
          </span>
        </div>
        {view === 'template' ? (
          <pre className="p-4 text-xs font-mono text-emerald-300/90 overflow-auto max-h-[min(60vh,520px)] leading-relaxed whitespace-pre-wrap break-words">
            {templateText}
          </pre>
        ) : (
          <textarea
            value={editorText}
            onChange={e => { setEditorText(e.target.value); setParseError(null); setValidationErrors([]); }}
            readOnly={!canEdit}
            spellCheck={false}
            className={`w-full min-h-[min(60vh,520px)] p-4 text-xs font-mono leading-relaxed resize-y bg-transparent text-emerald-300/90 outline-none ${!canEdit ? 'cursor-default' : ''}`}
          />
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-xs text-slate-500">
        <div className="bg-white border rounded-xl p-3 space-y-1">
          <p className="font-bold text-slate-700">Struktur root</p>
          <p><code className="text-emerald-600">project</code> — detail proyek (name, status, dates, budget…)</p>
          <p><code className="text-emerald-600">rap[]</code> — item RAP (type: material|labor|equipment|overhead|other)</p>
          <p><code className="text-emerald-600">realisasi[]</code> — biaya; link via <code>rap_item_id</code> atau <code>rap_ref</code></p>
        </div>
        <div className="bg-white border rounded-xl p-3 space-y-1">
          <p className="font-bold text-slate-700">Tips update</p>
          <p><code className="text-emerald-600">work_items[]</code> — pekerjaan / milestone</p>
          <p><code className="text-emerald-600">daily_logs[]</code> — log harian lapangan</p>
          <p>Sertakan <code>id</code> untuk update record existing. Tanpa id = insert baru.</p>
        </div>
      </div>
    </div>
  );
}
