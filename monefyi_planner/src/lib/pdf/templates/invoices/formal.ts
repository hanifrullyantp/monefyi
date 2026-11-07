import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import type { InvoicePdfContext } from '../../invoicePdfContext';
import { buildInvoiceRealEstate } from './realestate';
import { invoiceInstallmentsTable, invoicePaymentInfoBox, invoiceStatusBadge } from './helpers';

/**
 * Legacy alias untuk template formal -> sekarang mengarah ke Template 2: Real Estate (Navy & Teal #0F2744, #18B5A9)
 */
export function buildInvoiceFormal(ctx: InvoicePdfContext): TDocumentDefinitions {
  return buildInvoiceRealEstate(ctx);
}

// Export helpers untuk menjaga kompatibilitas jika ada import terdahulu
export function statusBadge(ctx: InvoicePdfContext, fill: string, color = '#ffffff'): Content {
  return invoiceStatusBadge(ctx, fill, color);
}

export function installmentTable(ctx: InvoicePdfContext, header: string, alt?: string): Content {
  return invoiceInstallmentsTable(ctx, header, alt);
}

export function paymentBox(ctx: InvoicePdfContext, surface = '#f8fafc'): Content {
  return invoicePaymentInfoBox(ctx, surface);
}
