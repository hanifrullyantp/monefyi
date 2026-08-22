import { calcEstimationSummary, countedEstimationItems } from '../estimatorCalc';
import type { EstimationFormDraft } from '../../types/estimator';
import {
  buildKwitansiPdfContext,
  defaultKwitansiDescription,
  type KwitansiPaymentCategory,
  type KwitansiPdfInput,
} from './kwitansiPdfContext';
import { buildKwitansiDocumentDefinition } from './kwitansiPdfTemplate';
import { initPdfMake, pdfToBlob, downloadBlob } from './pdfMakeSetup';

function sanitizeFilenamePart(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '').trim() || 'Kwitansi';
}

export function kwitansiPdfFilename(draft: EstimationFormDraft): string {
  const customer = draft.customer_name?.trim() || draft.code;
  return `Kwitansi ${sanitizeFilenamePart(draft.code)} - ${sanitizeFilenamePart(customer)}.pdf`;
}

/** Default nominal berdasarkan jenis pembayaran. */
export function suggestKwitansiAmount(
  draft: EstimationFormDraft,
  category: KwitansiPaymentCategory,
): number {
  const items = countedEstimationItems(draft.items);
  const summary = calcEstimationSummary(items, draft.overhead_pct, draft.discount_pct, draft.tax_pct, {
    discountAmount: draft.discount_amount,
    adjustments: draft.adjustments,
  });
  const total = summary.grandTotal;
  if (total <= 0) return 0;
  if (category === 'pelunasan') return total;
  if (category === 'dp') return Math.round(total * 0.3);
  return total;
}

export { defaultKwitansiDescription, type KwitansiPaymentCategory, type KwitansiPdfInput };

export async function generateKwitansiPdfBlob(input: KwitansiPdfInput): Promise<Blob> {
  const ctx = await buildKwitansiPdfContext(input);
  const docDef = buildKwitansiDocumentDefinition(ctx);
  const pdfMake = initPdfMake();
  const pdf = pdfMake.createPdf(docDef);
  return pdfToBlob(pdf);
}

export async function downloadKwitansiPdf(input: KwitansiPdfInput): Promise<void> {
  const blob = await generateKwitansiPdfBlob(input);
  downloadBlob(blob, kwitansiPdfFilename(input.draft));
}
