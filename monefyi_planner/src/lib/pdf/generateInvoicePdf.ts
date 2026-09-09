import type { EstimationFormDraft } from '../../types/estimator';
import type { PdfDisplayOptions, PdfSettings } from '../../types/pdfSettings';
import type { ProjectIncome } from '../../services/estimationPaymentService';
import { buildInvoicePdfContext } from './invoicePdfContext';
import { buildInvoiceDoc } from './templates';
import { initPdfMake, pdfToBlob, downloadBlob } from './pdfMakeSetup';

function sanitizeFilenamePart(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '').trim() || 'Invoice';
}

export function invoicePdfFilename(draft: EstimationFormDraft): string {
  const customer = draft.customer_name?.trim() || draft.code;
  return `Invoice ${sanitizeFilenamePart(draft.code)} - ${sanitizeFilenamePart(customer)}.pdf`;
}

export async function generateInvoicePdfBlob(
  draft: EstimationFormDraft,
  settings: PdfSettings,
  options: PdfDisplayOptions,
  projectPayments: ProjectIncome[] = [],
): Promise<Blob> {
  const ctx = await buildInvoicePdfContext(draft, settings, options, projectPayments);
  const docDef = buildInvoiceDoc(ctx);
  const pdfMake = initPdfMake();
  const pdf = pdfMake.createPdf(docDef);
  return pdfToBlob(pdf);
}

export async function downloadInvoicePdf(
  draft: EstimationFormDraft,
  settings: PdfSettings,
  options: PdfDisplayOptions,
  projectPayments: ProjectIncome[] = [],
): Promise<void> {
  const blob = await generateInvoicePdfBlob(draft, settings, options, projectPayments);
  downloadBlob(blob, invoicePdfFilename(draft));
}
