import { useEffect, useState } from 'react';
import { Download, Edit3, Loader2, MessageCircle, X } from 'lucide-react';
import type { EstimationFormDraft } from '../../../types/estimator';
import { displayOptionsFromDraft, type PdfSettings } from '../../../types/pdfSettings';
import type { DocumentType } from './EstimationDocumentMenu';
import { generateQuotationPdfBlob, quotationPdfFilename } from '../../../lib/pdf/generateQuotationPdf';
import { generateInvoicePdfBlob, invoicePdfFilename } from '../../../lib/pdf/generateInvoicePdf';
import {
  buildKwitansiPdfInputFromDraft,
  generateKwitansiPdfBlob,
  kwitansiPdfFilename,
} from '../../../lib/pdf/generateKwitansiPdf';
import { downloadBlob } from '../../../lib/pdf/pdfMakeSetup';

type Props = {
  open: boolean;
  type: DocumentType;
  draft: EstimationFormDraft;
  settings: PdfSettings;
  projectName?: string | null;
  onClose: () => void;
  onEdit: (type: DocumentType) => void;
  onSendWhatsApp: (type: DocumentType) => void;
};

const TITLES: Record<DocumentType, string> = {
  penawaran: 'Preview Penawaran',
  invoice: 'Preview Invoice',
  kwitansi: 'Preview Kwitansi',
};

async function buildBlob(
  type: DocumentType,
  draft: EstimationFormDraft,
  settings: PdfSettings,
): Promise<Blob> {
  const opts = displayOptionsFromDraft(draft);
  if (type === 'penawaran') return generateQuotationPdfBlob(draft, settings, opts);
  if (type === 'invoice') return generateInvoicePdfBlob(draft, settings, opts);
  return generateKwitansiPdfBlob(buildKwitansiPdfInputFromDraft(draft, settings));
}

function filenameFor(
  type: DocumentType,
  draft: EstimationFormDraft,
  projectName?: string | null,
): string {
  if (type === 'penawaran') return quotationPdfFilename(draft, projectName);
  if (type === 'invoice') return invoicePdfFilename(draft);
  return kwitansiPdfFilename(draft);
}

export default function EstimationDocumentPreviewModal({
  open,
  type,
  draft,
  settings,
  projectName,
  onClose,
  onEdit,
  onSendWhatsApp,
}: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let url: string | null = null;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const blob = await buildBlob(type, draft, settings);
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal membuat PDF');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [open, type, draft, settings]);

  if (!open) return null;

  const title = TITLES[type];

  const handleDownload = async () => {
    try {
      const blob = await buildBlob(type, draft, settings);
      downloadBlob(blob, filenameFor(type, draft, projectName));
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="font-bold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500">{draft.code}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 min-h-0 bg-slate-100 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-sm text-red-600">
              {error}
            </div>
          )}
          {blobUrl && !loading && (
            <iframe src={blobUrl} title={title} className="w-full h-full border-0" />
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap gap-2 justify-end shrink-0">
          <button
            type="button"
            onClick={() => onEdit(type)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 hover:bg-slate-50"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => onSendWhatsApp(type)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <MessageCircle className="w-4 h-4" />
            Kirim WhatsApp
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
