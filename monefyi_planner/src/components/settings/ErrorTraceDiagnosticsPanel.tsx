import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bug,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Share2,
  ExternalLink,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import {
  fetchRuntimeTraces,
  type RuntimeTraceRow,
  type TraceSeverity,
} from '../../services/runtimeTracer';
import { showToast } from '../../store/uiStore';
import { useAppStore } from '../../store/appStore';

export default function ErrorTraceDiagnosticsPanel() {
  const { tenant, user } = useAppStore();
  const [traces, setTraces] = useState<RuntimeTraceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<TraceSeverity | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // Baca dari database runtime_traces
      const data = await fetchRuntimeTraces({
        hours: 48,
        limit: 100,
        severity: filterSeverity === 'all' ? undefined : filterSeverity,
      }).catch(() => [] as RuntimeTraceRow[]);

      // Gabungkan dengan antrean lokal bila ada yang belum terkirim
      let localQueue: any[] = [];
      try {
        localQueue = JSON.parse(localStorage.getItem('monefyi_runtime_trace_queue') || '[]');
      } catch {
        /* ignore */
      }

      const formattedLocal: RuntimeTraceRow[] = localQueue.map((item, idx) => ({
        id: `local-${idx}-${Date.now()}`,
        event_type: item.event_type || 'local_event',
        severity: item.severity || 'error',
        component: item.component || 'browser',
        message: item.message || '',
        stack_trace: item.stack_trace || '',
        metadata: item.metadata || {},
        created_at: new Date().toISOString(),
      }));

      const merged = [...formattedLocal, ...data];
      const filtered =
        filterSeverity === 'all' ? merged : merged.filter(t => t.severity === filterSeverity);
      setTraces(filtered);
    } catch (err) {
      showToast('Gagal memuat log trace', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [filterSeverity]);

  const generateDiagnosticReport = () => {
    const report = {
      app: 'Monefyi Planner',
      timestamp: new Date().toISOString(),
      tenant_id: tenant?.id || null,
      tenant_name: tenant?.name || null,
      user_id: user?.id || null,
      browser: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      total_traces: traces.length,
      traces: traces.slice(0, 30).map(t => ({
        time: t.created_at,
        severity: t.severity,
        component: t.component,
        event: t.event_type,
        message: t.message,
        stack: t.stack_trace,
        metadata: t.metadata,
      })),
    };
    return JSON.stringify(report, null, 2);
  };

  const handleCopyReport = () => {
    const reportText = generateDiagnosticReport();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(reportText);
      setCopiedAll(true);
      showToast('Laporan diagnostik berhasil disalin ke clipboard!', 'success');
      setTimeout(() => setCopiedAll(false), 3000);
    }
  };

  const handleCopySingle = (trace: RuntimeTraceRow) => {
    const snippet = JSON.stringify(
      {
        time: trace.created_at,
        severity: trace.severity,
        component: trace.component,
        event: trace.event_type,
        message: trace.message,
        stack: trace.stack_trace,
      },
      null,
      2,
    );
    if (navigator.clipboard) {
      navigator.clipboard.writeText(snippet);
      setCopiedId(trace.id);
      showToast('Trace disalin!', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleClearLocalLogs = () => {
    try {
      localStorage.removeItem('monefyi_runtime_trace_queue');
      setTraces([]);
      showToast('Log lokal berhasil dibersihkan', 'success');
      void loadData();
    } catch {
      /* ignore */
    }
  };

  const handleSendViaWhatsApp = () => {
    const report = generateDiagnosticReport();
    const truncated = report.length > 2500 ? report.slice(0, 2450) + '\n...[dipotong]' : report;
    const url = `https://wa.me/?text=${encodeURIComponent(
      `*Laporan Diagnostik Error Monefyi Planner:*\n\`\`\`${truncated}\`\`\``,
    )}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <Bug className="w-5 h-5 text-rose-600" />
            Pusat Diagnostik & Pengumpulan Trace Error
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Setiap kali aplikasi atau AI mengalami kendala/error, jejak eksekusi tersimpan di sini. Anda bisa menyalin trace
            lengkap untuk dikirimkan ke developer/tim support.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyReport}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 inline-flex items-center gap-1.5 shadow-2xs"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            Salin Semua Trace
          </button>
          <button
            type="button"
            onClick={handleSendViaWhatsApp}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Share2 className="w-3.5 h-3.5" /> Kirim WhatsApp
          </button>
        </div>
      </div>

      {/* Filter & Kontrol */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-500">Filter Severity:</span>
          {(['all', 'error', 'critical', 'warning', 'info'] as const).map(sev => (
            <button
              key={sev}
              type="button"
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded-lg border font-semibold transition-colors capitalize ${
                filterSeverity === sev
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadData()}
            className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 inline-flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Muat Ulang
          </button>
          <button
            type="button"
            onClick={handleClearLocalLogs}
            className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Bersihkan
          </button>
        </div>
      </div>

      {/* Daftar Trace */}
      {loading ? (
        <div className="py-12 flex items-center justify-center text-xs text-slate-500 gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          Memuat riwayat trace sistem...
        </div>
      ) : traces.length === 0 ? (
        <div className="py-10 text-center text-xs text-slate-500 space-y-1 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          <ShieldAlert className="w-6 h-6 text-emerald-600 mx-auto" />
          <p className="font-semibold text-slate-700">Kondisi Sistem Bersih</p>
          <p className="text-slate-400">Tidak ada catatan trace error atau problem yang tertangkap dalam 48 jam terakhir.</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {traces.map(t => (
            <div
              key={t.id}
              className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                t.severity === 'critical' || t.severity === 'error'
                  ? 'bg-rose-50/40 border-rose-200'
                  : t.severity === 'warning'
                    ? 'bg-amber-50/40 border-amber-200'
                    : 'bg-slate-50/60 border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      t.severity === 'critical' || t.severity === 'error'
                        ? 'bg-rose-100 text-rose-800'
                        : t.severity === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {t.severity}
                  </span>
                  <span className="font-bold text-slate-800 font-mono">{t.event_type}</span>
                  {t.component && (
                    <span className="text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {t.component}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">
                    {new Date(t.created_at).toLocaleString('id-ID')}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopySingle(t)}
                    className="p-1 rounded-md hover:bg-white text-slate-600 border border-transparent hover:border-slate-200"
                    title="Salin trace ini"
                  >
                    {copiedId === t.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {t.message && (
                <p className="font-mono text-slate-800 text-[11px] bg-white p-2 rounded-lg border border-slate-200/60 break-words whitespace-pre-wrap">
                  {t.message}
                </p>
              )}

              {t.stack_trace && (
                <details className="text-[10px] text-slate-500 font-mono">
                  <summary className="cursor-pointer text-slate-600 font-medium hover:underline">
                    Lihat Stack Trace
                  </summary>
                  <pre className="mt-1 p-2 bg-slate-900 text-slate-200 rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {t.stack_trace}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

