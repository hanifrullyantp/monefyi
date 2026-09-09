import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import type { PdfTemplate } from '../../../types/estimator';
import type { PdfSettings } from '../../../types/pdfSettings';
import { displayOptionsFromDraft } from '../../../types/pdfSettings';
import { previewEstimationDraft, previewPdfSettings } from '../../../lib/pdf/pdfTemplatePreviewData';
import { generateQuotationPdfBlob, quotationPdfFilename } from '../../../lib/pdf/generateQuotationPdf';
import { generateInvoicePdfBlob, invoicePdfFilename } from '../../../lib/pdf/generateInvoicePdf';
import { downloadBlob } from '../../../lib/pdf/pdfMakeSetup';
import type { PreviewDisplayToggles } from './TemplateCustomizer';

type Kind = 'quotation' | 'invoice';

type Props = {
  kind: Kind;
  template: PdfTemplate;
  settings: PdfSettings;
  display?: PreviewDisplayToggles;
};

function applyDisplay(draft: ReturnType<typeof previewEstimationDraft>, display?: PreviewDisplayToggles) {
  if (!display) return draft;
  draft.pdf_show_logo = display.showLogo;
  draft.pdf_show_signature = display.showSignature;
  draft.pdf_show_stamp = display.showStamp;
  draft.pdf_show_footer = display.showFooter;
  return draft;
}

export default function TemplatePreview({ kind, template, settings, display }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const draft = applyDisplay(previewEstimationDraft(template), display);
        const merged = previewPdfSettings({
          ...settings,
          default_pdf_template: kind === 'quotation' ? template : settings.default_pdf_template,
          default_invoice_template: kind === 'invoice' ? template : settings.default_invoice_template,
        });
        draft.pdf_primary_color = merged.primary_color;
        draft.pdf_secondary_color = merged.secondary_color;
        const opts = displayOptionsFromDraft(draft);
        const blob = kind === 'quotation'
          ? await generateQuotationPdfBlob(draft, merged, opts)
          : await generateInvoicePdfBlob(draft, merged, opts);
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal membuat preview');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [kind, template, settings, display]);

  const handleDownload = async () => {
    try {
      const draft = applyDisplay(previewEstimationDraft(template), display);
      draft.pdf_primary_color = settings.primary_color;
      draft.pdf_secondary_color = settings.secondary_color;
      const merged = previewPdfSettings(settings);
      const opts = displayOptionsFromDraft(draft);
      const blob = kind === 'quotation'
        ? await generateQuotationPdfBlob(draft, merged, opts)
        : await generateInvoicePdfBlob(draft, merged, opts);
      downloadBlob(
        blob,
        kind === 'quotation' ? quotationPdfFilename(draft) : invoicePdfFilename(draft),
      );
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="bg-slate-100 rounded-2xl p-3 sticky top-20">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-xs font-bold text-slate-500 uppercase">Preview</h3>
        <button
          type="button"
          onClick={() => void handleDownload()}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </button>
      </div>
      <div className="relative bg-white rounded-xl overflow-hidden h-[520px] border border-slate-200">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-xs text-red-600 text-center">
            {error}
          </div>
        )}
        {blobUrl && !loading && (
          <iframe src={blobUrl} title="PDF preview" className="w-full h-full border-0" />
        )}
      </div>
    </div>
  );
}
