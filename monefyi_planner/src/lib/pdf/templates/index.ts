import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { normalizePdfTemplate, type PdfTemplate } from '../../../types/estimator';
import type { QuotationPdfContext } from '../quotationPdfContext';
import type { InvoicePdfContext } from '../invoicePdfContext';
import { buildQuotationFormal } from './quotations/formal';
import { buildQuotationModern } from './quotations/modern';
import { buildQuotationClean } from './quotations/clean';
import { buildQuotationFullColor } from './quotations/fullcolor';
import { buildQuotationFuturistic } from './quotations/futuristic';
import { buildInvoiceFormal } from './invoices/formal';
import { buildInvoiceModern } from './invoices/modern';
import { buildInvoiceClean } from './invoices/clean';
import { buildInvoiceFullColor } from './invoices/fullcolor';
import { buildInvoiceFuturistic } from './invoices/futuristic';

const QUOTATION_BUILDERS: Record<PdfTemplate, (ctx: QuotationPdfContext) => TDocumentDefinitions> = {
  formal: buildQuotationFormal,
  modern: buildQuotationModern,
  clean: buildQuotationClean,
  fullcolor: buildQuotationFullColor,
  futuristic: buildQuotationFuturistic,
};

const INVOICE_BUILDERS: Record<PdfTemplate, (ctx: InvoicePdfContext) => TDocumentDefinitions> = {
  formal: buildInvoiceFormal,
  modern: buildInvoiceModern,
  clean: buildInvoiceClean,
  fullcolor: buildInvoiceFullColor,
  futuristic: buildInvoiceFuturistic,
};

export function buildQuotationDoc(ctx: QuotationPdfContext): TDocumentDefinitions {
  const id = normalizePdfTemplate(ctx.template);
  return QUOTATION_BUILDERS[id](ctx);
}

export function buildInvoiceDoc(ctx: InvoicePdfContext): TDocumentDefinitions {
  const id = normalizePdfTemplate(ctx.template);
  return INVOICE_BUILDERS[id](ctx);
}
