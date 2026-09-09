import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import type { InvoicePdfContext } from '../../invoicePdfContext';
import {
  bankBlock,
  baseDoc,
  footerBlock,
  itemsTable,
  notesBlock,
  paletteFor,
  signatureStampBlock,
  summaryBlock,
} from '../shared';
import { installmentTable, paymentBox } from './formal';

export function buildInvoiceFuturistic(ctx: InvoicePdfContext): TDocumentDefinitions {
  const p = paletteFor('futuristic', ctx.colors);
  const statusLine = ctx.paymentStatus === 'paid'
    ? '[TRANSACTION_COMPLETE ✓]'
    : ctx.paymentStatus === 'partial'
      ? '[TRANSACTION_PARTIAL]'
      : '[AWAITING_PAYMENT]';
  const bar = '▓'.repeat(Math.round(ctx.progressPct / 10)).padEnd(10, '░');

  const content: Content[] = [
    { text: '▸ INVOICE_V2.0', fontSize: 11, bold: true, color: p.primary },
    { text: `${ctx.invoiceNumber}  //  ${ctx.dateLabel}`, fontSize: 8, color: p.accent, margin: [0, 2, 0, 8] as [number, number, number, number] },
    { text: statusLine, fontSize: 12, bold: true, color: p.primary, margin: [0, 0, 0, 10] as [number, number, number, number] },
    { text: `CLIENT: "${ctx.customerName}"`, fontSize: 9, color: p.text },
    { text: `PROJECT: ${ctx.title.toUpperCase().replace(/\s+/g, '_')}`, fontSize: 9, color: p.text, margin: [0, 2, 0, 10] as [number, number, number, number] },
    itemsTable(ctx, p.surface, p.primary, p.altRow, true),
    summaryBlock(ctx, p.primary, '#0a0a0a', 'TOTAL_AMOUNT'),
    { text: `${bar}  ${ctx.progressPct}%`, fontSize: 10, color: p.accent, margin: [0, 8, 0, 8] as [number, number, number, number] },
    paymentBox(ctx, p.surface, p.text),
    installmentTable(ctx, p.surface, p.altRow),
    { text: `HASH  0x${ctx.invoiceNumber.replace(/[^A-Z0-9]/gi, '').slice(0, 12)}`, fontSize: 8, color: p.muted, margin: [0, 8, 0, 4] as [number, number, number, number] },
    ...notesBlock(ctx),
    ...bankBlock(ctx, p.accent),
    ...signatureStampBlock(ctx, p.muted),
    { text: '▸ END_OF_DOCUMENT', fontSize: 8, color: p.primary, margin: [0, 10, 0, 0] as [number, number, number, number] },
    ...footerBlock(ctx, p.muted),
  ];
  return baseDoc(p, content, [40, 40, 40, 40], ctx.watermarkText);
}
