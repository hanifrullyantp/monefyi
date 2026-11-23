import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type { InvoicePdfContext } from '../../invoicePdfContext';
import { buildInvoiceYellowCharcoal } from './yellowcharcoal';

/**
 * Legacy alias untuk template futuristic -> sekarang mengarah ke Template 10: Kuning Charcoal (#FFC52E, #2D2F38)
 */
export function buildInvoiceFuturistic(ctx: InvoicePdfContext): TDocumentDefinitions {
  return buildInvoiceYellowCharcoal(ctx);
}
