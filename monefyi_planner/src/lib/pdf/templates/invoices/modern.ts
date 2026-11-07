import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type { InvoicePdfContext } from '../../invoicePdfContext';
import { buildInvoiceWellness } from './wellness';

/**
 * Legacy alias untuk template modern -> sekarang mengarah ke Template 1: Wellness (#5E9C98)
 */
export function buildInvoiceModern(ctx: InvoicePdfContext): TDocumentDefinitions {
  return buildInvoiceWellness(ctx);
}
