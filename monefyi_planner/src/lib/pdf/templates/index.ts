import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { normalizePdfTemplate, type PdfTemplate } from '../../../types/estimator';
import type { QuotationPdfContext } from '../quotationPdfContext';
import type { InvoicePdfContext } from '../invoicePdfContext';

// Quotation Builders (tetap tidak diubah)
import { buildQuotationFormal } from './quotations/formal';
import { buildQuotationModern } from './quotations/modern';
import { buildQuotationClean } from './quotations/clean';
import { buildQuotationFullColor } from './quotations/fullcolor';
import { buildQuotationFuturistic } from './quotations/futuristic';

// 10 Invoice Builders (Sesuai HTML Referensi)
import { buildInvoiceWellness } from './invoices/wellness';
import { buildInvoiceRealEstate } from './invoices/realestate';
import { buildInvoiceCardBlue } from './invoices/cardblue';
import { buildInvoiceGreenPoly } from './invoices/greenpoly';
import { buildInvoiceYellowBlock } from './invoices/yellowblock';
import { buildInvoiceNavyOrange } from './invoices/navyorange';
import { buildInvoiceBluePill } from './invoices/bluepill';
import { buildInvoiceInnovaGreen } from './invoices/innovagreen';
import { buildInvoiceAtlasBlue } from './invoices/atlasblue';
import { buildInvoiceYellowCharcoal } from './invoices/yellowcharcoal';

const QUOTATION_BUILDERS: Record<PdfTemplate, (ctx: QuotationPdfContext) => TDocumentDefinitions> = {
  formal: buildQuotationFormal,
  modern: buildQuotationModern,
  clean: buildQuotationClean,
  fullcolor: buildQuotationFullColor,
  futuristic: buildQuotationFuturistic,
  // Fallbacks untuk nama invoice baru
  wellness: buildQuotationModern,
  realestate: buildQuotationFormal,
  cardblue: buildQuotationModern,
  greenpoly: buildQuotationFullColor,
  yellowblock: buildQuotationModern,
  navyorange: buildQuotationFormal,
  bluepill: buildQuotationModern,
  innovagreen: buildQuotationFullColor,
  atlasblue: buildQuotationClean,
  yellowcharcoal: buildQuotationFuturistic,
};

const INVOICE_BUILDERS: Record<PdfTemplate, (ctx: InvoicePdfContext) => TDocumentDefinitions> = {
  // 10 Desain Invoice Baru
  wellness: buildInvoiceWellness,
  realestate: buildInvoiceRealEstate,
  cardblue: buildInvoiceCardBlue,
  greenpoly: buildInvoiceGreenPoly,
  yellowblock: buildInvoiceYellowBlock,
  navyorange: buildInvoiceNavyOrange,
  bluepill: buildInvoiceBluePill,
  innovagreen: buildInvoiceInnovaGreen,
  atlasblue: buildInvoiceAtlasBlue,
  yellowcharcoal: buildInvoiceYellowCharcoal,
  // Legacy aliases
  formal: buildInvoiceRealEstate,
  modern: buildInvoiceWellness,
  clean: buildInvoiceAtlasBlue,
  fullcolor: buildInvoiceGreenPoly,
  futuristic: buildInvoiceYellowCharcoal,
};

export function buildQuotationDoc(ctx: QuotationPdfContext): TDocumentDefinitions {
  const id = normalizePdfTemplate(ctx.template);
  const builder = QUOTATION_BUILDERS[id] || buildQuotationModern;
  return builder(ctx);
}

export function buildInvoiceDoc(ctx: InvoicePdfContext): TDocumentDefinitions {
  const id = normalizePdfTemplate(ctx.template);
  const builder = INVOICE_BUILDERS[id] || buildInvoiceWellness;
  return builder(ctx);
}
