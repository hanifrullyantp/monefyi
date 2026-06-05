import type { EstimationFormDraft } from '../../types/estimator';
import type { PdfDisplayOptions, PdfSettings } from '../../types/pdfSettings';
import { buildQuotationPdfContext } from './quotationPdfContext';
import { buildDocumentDefinition } from './quotationPdfTemplates';
import { initPdfMake, pdfToBlob, downloadBlob } from './pdfMakeSetup';

export async function generateQuotationPdfBlob(
  draft: EstimationFormDraft,
  settings: PdfSettings,
  options: PdfDisplayOptions,
): Promise<Blob> {
  const ctx = await buildQuotationPdfContext(draft, settings, options);
  const docDef = buildDocumentDefinition(ctx);
  const pdfMake = initPdfMake();
  const pdf = pdfMake.createPdf(docDef);
  return pdfToBlob(pdf);
}

export function quotationPdfFilename(draft: EstimationFormDraft): string {
  const customer = (draft.customer_name || 'Customer').replace(/[^\w\s-]/g, '').trim().slice(0, 30);
  return `Penawaran-${draft.code}-${customer}.pdf`;
}

export async function downloadQuotationPdf(
  draft: EstimationFormDraft,
  settings: PdfSettings,
  options: PdfDisplayOptions,
): Promise<void> {
  const blob = await generateQuotationPdfBlob(draft, settings, options);
  downloadBlob(blob, quotationPdfFilename(draft));
}
