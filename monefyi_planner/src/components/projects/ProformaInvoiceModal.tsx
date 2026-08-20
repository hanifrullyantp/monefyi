import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Download, Loader2, FileText } from 'lucide-react';
import type { NormalizedProjectView } from '../../lib/migration/project-normalize';
import type { Project } from '../../store/appStore';
import type { PdfSettings } from '../../types/pdfSettings';
import { formatRupiahFull, parseNumberId } from '../../lib/estimatorFormat';
import {
  downloadProformaPdf,
  generateProformaPdfBlob,
  proformaPdfFilename,
  suggestProformaDpAmount,
} from '../../lib/pdf/generateProformaPdf';
type Props = {
  open: boolean;
  project: Project;
  normalized: NormalizedProjectView;
  settings: PdfSettings;
  onClose: () => void;
  onToast?: (msg: string, type: 'success' | 'error') => void;
};

export default function ProformaInvoiceModal({
  open,
  project,
  normalized,
  settings,
  onClose,
  onToast,
}: Props) {
  const contractValue = normalized.project.contractValue || 0;
  const [dpAmount, setDpAmount] = useState(() => suggestProformaDpAmount(normalized));
  const [dpInput, setDpInput] = useState('');
  const [termsText, setTermsText] = useState('');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const suggested = suggestProformaDpAmount(normalized);
    setDpAmount(suggested);
    setDpInput(formatRupiahFull(suggested).replace('Rp', '').trim());
    setTermsText('');
  }, [open, normalized]);

  const sisa = Math.max(0, contractValue - dpAmount);

  const pdfOptions = {
    showImages: false,
    showBank: true,
    showSignature: true,
  };

  const buildInput = useCallback(() => ({
    project,
    normalized,
    settings,
    options: pdfOptions,
    dpAmount,
    termsText: termsText || undefined,
  }), [project, normalized, settings, dpAmount, termsText]);

  useEffect(() => {
    if (!open) return;
    let url: string | null = null;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const blob = await generateProformaPdfBlob(buildInput());
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setBlobUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal membuat PDF');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const timer = setTimeout(load, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
  }, [open, buildInput]);

  if (!open) return null;

  const handleDpChange = (raw: string) => {
    setDpInput(raw);
    const n = parseNumberId(raw);
    setDpAmount(Math.max(0, Math.min(n, contractValue)));
  };

  const handleDownload = async () => {
    try {
      await downloadProformaPdf(buildInput());
      onToast?.('Proforma Invoice diunduh', 'success');
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Gagal unduh PDF', 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-5xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-5 h-5 text-blue-700 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-bold text-slate-900 truncate">Proforma Invoice</h2>
              <p className="text-xs text-slate-500 truncate">{project.name}</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              disabled={loading || contractValue <= 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-700 text-white text-sm font-bold hover:bg-blue-800 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Unduh
            </button>
            <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100" aria-label="Tutup">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[18rem_1fr] flex-1 min-h-0">
          <div className="border-b lg:border-b-0 lg:border-r border-slate-100 p-4 space-y-4 overflow-y-auto">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Total Nilai Project</p>
              <p className="text-lg font-black text-slate-900 tabular-nums">{formatRupiahFull(contractValue)}</p>
            </div>

            <label className="block">
              <span className="text-xs font-bold text-slate-600">Pembayaran DP</span>
              <input
                value={dpInput}
                onChange={e => handleDpChange(e.target.value)}
                placeholder="0"
                className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold tabular-nums focus:border-blue-500 outline-none"
              />
            </label>

            <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-3">
              <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">Sisa Pembayaran</p>
              <p className="text-xl font-black text-blue-900 tabular-nums mt-0.5">{formatRupiahFull(sisa)}</p>
              <p className="text-[11px] text-blue-600/80 mt-1">
                = Total nilai project − Pembayaran DP
              </p>
            </div>

            <label className="block">
              <span className="text-xs font-bold text-slate-600">Syarat & Ketentuan (opsional)</span>
              <textarea
                value={termsText}
                onChange={e => setTermsText(e.target.value)}
                rows={4}
                placeholder="Kosongkan untuk syarat default..."
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-xs resize-none focus:border-blue-500 outline-none"
              />
            </label>

            <p className="text-[10px] text-slate-400">
              Branding & rekening dari Pengaturan Estimator → PDF.
            </p>
          </div>

          <div className="relative bg-slate-100 min-h-[240px] lg:min-h-0">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}
            {error && !loading && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-red-600">
                {error}
              </div>
            )}
            {blobUrl && !error && (
              <iframe
                title={proformaPdfFilename(project)}
                src={blobUrl}
                className="w-full h-full min-h-[240px] lg:min-h-0 border-0"
              />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
