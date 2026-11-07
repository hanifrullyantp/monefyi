import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type { InvoicePdfContext } from '../../invoicePdfContext';
import { buildInvoiceAtlasBlue } from './atlasblue';

/**
 * Legacy alias untuk template clean -> sekarang mengarah ke Template 9: Atlas Biru (#2C9AD3)
 */
export function buildInvoiceClean(ctx: InvoicePdfContext): TDocumentDefinitions {
  return buildInvoiceAtlasBlue(ctx);
}
