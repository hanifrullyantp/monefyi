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
import { installmentTable, paymentBox, statusBadge } from './formal';

export function buildInvoiceFullColor(ctx: InvoicePdfContext): TDocumentDefinitions {
  const p = paletteFor('fullcolor', ctx.colors);
  const thanks = ctx.paymentStatus === 'paid' ? 'Terima kasih! Pembayaran sudah lunas.' : 'Terima kasih — sisa tagihan menunggu pelunasan.';
  const content: Content[] = [
    {
      table: {
        widths: ['*', 'auto'],
        body: [[
          {
            stack: [
              { text: 'INVOICE', fontSize: 10, color: '#ecfdf5' },
              { text: ctx.invoiceNumber, fontSize: 16, bold: true, color: '#ffffff' },
            ],
            fillColor: p.primary,
            margin: 14,
          },
          {
            stack: [
              statusBadge(ctx, p.accent, '#854d0e'),
              { text: ctx.dateLabel, fontSize: 8, color: '#ecfdf5', alignment: 'right', margin: [0, 6, 0, 0] as [number, number, number, number] },
            ],
            fillColor: p.secondary,
            margin: 14,
          },
        ]],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },
    { text: `Halo ${ctx.customerName}`, fontSize: 13, bold: true, color: p.primary },
    { text: thanks, fontSize: 10, color: p.muted, margin: [0, 2, 0, 10] as [number, number, number, number] },
    { text: ctx.title, fontSize: 12, bold: true, margin: [0, 0, 0, 8] as [number, number, number, number] },
    itemsTable(ctx, p.primary, '#ffffff', p.altRow),
    summaryBlock(ctx, p.primary, '#ffffff', 'TOTAL TAGIHAN'),
    paymentBox(ctx, p.surface),
    installmentTable(ctx, p.primary, p.altRow),
    ...notesBlock(ctx),
    ...bankBlock(ctx, p.primary),
    ...signatureStampBlock(ctx),
    ...footerBlock(ctx),
  ];
  return baseDoc(p, content, [36, 36, 36, 36], ctx.watermarkText);
}
