import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import type { InvoicePdfContext } from '../../invoicePdfContext';
import {
  bankBlock,
  baseDoc,
  footerBlock,
  notesBlock,
  paletteFor,
  signatureStampBlock,
  summaryBlock,
} from '../shared';
import { installmentTable, paymentBox } from './formal';

export function buildInvoiceClean(ctx: InvoicePdfContext): TDocumentDefinitions {
  const p = paletteFor('clean', ctx.colors);
  const statement = (ctx.invoiceNumber.split('-').pop() || '01');
  const content: Content[] = [
    {
      columns: [
        { text: 'INVOICE', fontSize: 9, characterSpacing: 3, color: p.muted },
        { text: ctx.paymentStatus === 'paid' ? 'PAID' : ctx.paymentStatusLabel, alignment: 'right', fontSize: 9, characterSpacing: 2, color: p.primary },
      ],
    },
    { text: statement, fontSize: 32, bold: true, margin: [0, 8, 0, 16] as [number, number, number, number] },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 475, y2: 0, lineWidth: 0.5, lineColor: '#d6d3d1' }], margin: [0, 0, 0, 16] as [number, number, number, number] },
    {
      columns: [
        { width: '*', stack: [{ text: 'KEPADA', fontSize: 8, color: p.muted }, { text: ctx.customerName, fontSize: 12 }] },
        { width: '*', stack: [{ text: 'DARI', fontSize: 8, color: p.muted }, { text: ctx.companyName, fontSize: 12 }] },
      ],
      margin: [0, 0, 0, 16] as [number, number, number, number],
    },
    { text: ctx.title, fontSize: 18, margin: [0, 0, 0, 12] as [number, number, number, number] },
    ...ctx.items.map(row => ({
      columns: [
        { text: row.name, width: '*' },
        { text: row.total, width: 'auto', alignment: 'right' as const },
      ],
      margin: [0, 4, 0, 4] as [number, number, number, number],
    })),
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 475, y2: 0, lineWidth: 0.5, lineColor: '#d6d3d1' }], margin: [0, 8, 0, 8] as [number, number, number, number] },
    summaryBlock(ctx, p.primary),
    paymentBox(ctx, p.surface),
    installmentTable(ctx, p.primary, p.altRow),
    ...notesBlock(ctx),
    ...bankBlock(ctx),
    ...signatureStampBlock(ctx, p.muted),
    ...footerBlock(ctx, p.muted),
  ];
  return baseDoc(p, content, [60, 56, 60, 56], ctx.watermarkText);
}
