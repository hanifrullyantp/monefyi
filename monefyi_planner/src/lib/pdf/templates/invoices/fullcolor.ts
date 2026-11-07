import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type { InvoicePdfContext } from '../../invoicePdfContext';
import { buildInvoiceGreenPoly } from './greenpoly';

/**
 * Legacy alias untuk template fullcolor -> sekarang mengarah ke Template 4: Hijau Poligon (#0E7C66, #16A085, #39B06A)
 */
export function buildInvoiceFullColor(ctx: InvoicePdfContext): TDocumentDefinitions {
  return buildInvoiceGreenPoly(ctx);
}
