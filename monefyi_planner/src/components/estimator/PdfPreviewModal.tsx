import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Download, Loader2 } from 'lucide-react';
import type { EstimationFormDraft } from '../../types/estimator';
import type { PdfSettings } from '../../types/pdfSettings';
import { generateQuotationPdfBlob, quotationPdfFilename } from '../../lib/pdf/generateQuotationPdf';
import { downloadBlob } from '../../lib/pdf/pdfMakeSetup';

interface Props {
  draft: EstimationFormDraft;
  settings: PdfSettings;
  projectName?: string | null;
  onClose: () => void;
}

export default function PdfPreviewModal({ draft, settings, projectName, onClose }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const blob = await generateQuotationPdfBlob(draft, settings, {
          showImages: draft.pdf_show_images,
          showBank: draft.pdf_show_bank,
          showSignature: draft.pdf_show_signature,
        });
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal membuat PDF');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [draft, settings]);

  const handleDownload = async () => {
    try {
      const blob = await generateQuotationPdfBlob(draft, settings, {
        showImages: draft.pdf_show_images,
        showBank: draft.pdf_show_bank,
        showSignature: draft.pdf_show_signature,
      });
      downloadBlob(blob, quotationPdfFilename(draft, projectName));
    } catch {
      // ignore
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
        className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-900">Preview PDF</h2>
            <p className="text-xs text-slate-500">{draft.code} · Template {draft.pdf_template}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={loading}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg"
            >
              <Download className="w-4 h-4" /> Download
            </button>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-slate-100 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-rose-600 p-4 text-center">
              {error}
            </div>
          )}
          {blobUrl && !loading && (
            <iframe title="PDF Preview" src={blobUrl} className="w-full h-full border-0" />
          )}
        </div>
      </motion.div>
    </div>
  );
}
