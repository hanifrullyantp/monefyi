import type { EstimationFormDraft } from '../../types/estimator';
import type { PdfDisplayOptions, PdfSettings } from '../../types/pdfSettings';
import { buildQuotationPdfContext } from './quotationPdfContext';
import { buildDocumentDefinition } from './quotationPdfTemplates';
import { initPdfMake, pdfToBlob, downloadBlob } from './pdfMakeSetup';

function sanitizeFilenamePart(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '').trim() || 'Proyek';
}

/** Nama file unduhan: Penawaran Project {nama proyek}.pdf */
export function quotationPdfFilename(draft: EstimationFormDraft, projectName?: string | null): string {
  const raw = projectName?.trim() || draft.title.trim() || draft.code || 'Proyek';
  return `Penawaran Project ${sanitizeFilenamePart(raw)}.pdf`;
}

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

export async function downloadQuotationPdf(
  draft: EstimationFormDraft,
  settings: PdfSettings,
  options: PdfDisplayOptions,
  projectName?: string | null,
): Promise<void> {
  const blob = await generateQuotationPdfBlob(draft, settings, options);
  downloadBlob(blob, quotationPdfFilename(draft, projectName));
}
