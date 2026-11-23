import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type { QuotationPdfContext } from './quotationPdfContext';
import { buildQuotationDoc } from './templates';

/** Router template penawaran (kompatibel dengan import lama). */
export function buildDocumentDefinition(ctx: QuotationPdfContext): TDocumentDefinitions {
  return buildQuotationDoc(ctx);
}
