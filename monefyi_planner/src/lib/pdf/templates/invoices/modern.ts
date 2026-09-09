import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import type { InvoicePdfContext } from '../../invoicePdfContext';
import {
  bankBlock,
  baseDoc,
  footerBlock,
  itemsTable,
  notesBlock,
  paletteFor,
  partyColumns,
  signatureStampBlock,
  summaryBlock,
} from '../shared';
import { installmentTable, paymentBox, statusBadge } from './formal';

export function buildInvoiceModern(ctx: InvoicePdfContext): TDocumentDefinitions {
  const p = paletteFor('modern', ctx.colors);
  const fill = ctx.paymentStatus === 'paid' ? '#059669' : p.primary;
  const content: Content[] = [
    { text: 'Invoice', fontSize: 22, bold: true, color: p.primary },
    { text: ctx.invoiceNumber, fontSize: 11, color: p.accent, margin: [0, 2, 0, 8] as [number, number, number, number] },
    statusBadge(ctx, fill),
    { text: `Untuk ${ctx.customerName}  ·  ${ctx.dateLabel}`, fontSize: 9, color: p.muted, margin: [0, 10, 0, 10] as [number, number, number, number] },
    partyColumns(ctx, 'FROM', 'BILL TO', p.surface),
    { text: ctx.title, fontSize: 12, bold: true, margin: [0, 0, 0, 8] as [number, number, number, number] },
    itemsTable(ctx, p.primary, '#ffffff', p.altRow),
    summaryBlock(ctx, p.primary, '#ffffff', 'TOTAL TAGIHAN'),
    paymentBox(ctx, '#f5f3ff'),
    { text: 'Timeline pembayaran', fontSize: 11, bold: true, color: p.primary },
    installmentTable(ctx, p.primary, p.altRow),
    ...notesBlock(ctx),
    ...bankBlock(ctx, p.primary),
    ...signatureStampBlock(ctx),
    ...footerBlock(ctx),
  ];
  return baseDoc(p, content, [40, 40, 40, 40], ctx.watermarkText);
}
