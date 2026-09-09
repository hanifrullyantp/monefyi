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

function statusBadge(ctx: InvoicePdfContext, fill: string, color = '#ffffff'): Content {
  return {
    table: {
      widths: ['auto'],
      body: [[{
        text: ctx.paymentStatusLabel,
        bold: true,
        fontSize: 10,
        color,
        fillColor: fill,
        alignment: 'center',
        margin: [12, 4, 12, 4] as [number, number, number, number],
      }]],
    },
    layout: 'noBorders',
  };
}

function installmentTable(ctx: InvoicePdfContext, header: string, alt?: string): Content {
  if (!ctx.installments.length) return { text: '' };
  const body = [
    [
      { text: 'Termin', bold: true, color: '#ffffff', fillColor: header, fontSize: 9 },
      { text: 'Nominal', bold: true, color: '#ffffff', fillColor: header, fontSize: 9, alignment: 'right' as const },
      { text: 'Status', bold: true, color: '#ffffff', fillColor: header, fontSize: 9 },
      { text: 'Tanggal', bold: true, color: '#ffffff', fillColor: header, fontSize: 9 },
    ],
    ...ctx.installments.map((row, i) => [
      { text: row.label, fillColor: alt && i % 2 ? alt : undefined, fontSize: 9 },
      { text: row.amount, alignment: 'right' as const, fillColor: alt && i % 2 ? alt : undefined, fontSize: 9 },
      { text: row.statusLabel, fillColor: alt && i % 2 ? alt : undefined, fontSize: 9 },
      { text: row.paidDate || '—', fillColor: alt && i % 2 ? alt : undefined, fontSize: 9 },
    ]),
  ];
  return {
    table: {
      headerRows: 1,
      widths: ['*', 90, 70, 80],
      body,
    },
    layout: {
      hLineWidth: () => 0.4,
      vLineWidth: () => 0,
      hLineColor: () => '#e2e8f0',
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
    margin: [0, 8, 0, 8] as [number, number, number, number],
  } as Content;
}

function paymentBox(ctx: InvoicePdfContext, fill: string, text = '#0f172a'): Content {
  return {
    table: {
      widths: ['*', '*'],
      body: [[
        {
          stack: [
            { text: 'Metode', fontSize: 8, color: '#64748b' },
            { text: ctx.paymentMethod, bold: true, fontSize: 10, color: text },
            { text: `Tanggal: ${ctx.paymentDateLabel}`, fontSize: 8, color: '#64748b', margin: [0, 4, 0, 0] as [number, number, number, number] },
          ],
          fillColor: fill,
          margin: 10,
        },
        {
          stack: [
            { text: 'Dibayar / Sisa', fontSize: 8, color: '#64748b' },
            { text: ctx.amountPaid, bold: true, fontSize: 10, color: text },
            { text: `Sisa ${ctx.amountRemaining}`, fontSize: 8, color: '#64748b', margin: [0, 4, 0, 0] as [number, number, number, number] },
          ],
          fillColor: fill,
          margin: 10,
        },
      ]],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 10] as [number, number, number, number],
  };
}

export function buildInvoiceFormal(ctx: InvoicePdfContext): TDocumentDefinitions {
  const p = paletteFor('formal', ctx.colors);
  const stampFill = ctx.paymentStatus === 'paid' ? '#991b1b' : ctx.paymentStatus === 'partial' ? '#b45309' : '#334155';
  const content: Content[] = [
    {
      columns: [
        {
          width: '*',
          stack: [
            ...(ctx.logoDataUri ? [{ image: ctx.logoDataUri, width: 48, margin: [0, 0, 0, 4] as [number, number, number, number] }] : []),
            { text: ctx.companyName, fontSize: 13, bold: true, color: p.primary },
          ],
        },
        {
          width: 220,
          stack: [
            { text: 'INVOICE', fontSize: 16, bold: true, alignment: 'right', color: p.primary, characterSpacing: 2 },
            { text: ctx.invoiceNumber, alignment: 'right', fontSize: 11 },
            { text: ctx.dateLabel, alignment: 'right', fontSize: 9, color: p.muted },
            statusBadge(ctx, stampFill),
          ],
        },
      ],
    },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: p.primary }], margin: [0, 10, 0, 2] as [number, number, number, number] },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.6, lineColor: p.accent }], margin: [0, 0, 0, 12] as [number, number, number, number] },
    partyColumns(ctx, 'DARI', 'TAGIHAN KEPADA', p.surface),
    { text: ctx.title, bold: true, fontSize: 12, alignment: 'center', margin: [0, 0, 0, 8] as [number, number, number, number] },
    itemsTable(ctx, p.primary, '#ffffff', p.altRow, true),
    summaryBlock(ctx, p.primary, '#ffffff', 'TOTAL TAGIHAN'),
    paymentBox(ctx, p.surface),
    { text: 'RINCIAN TERMIN', fontSize: 11, bold: true, color: p.primary, margin: [0, 4, 0, 0] as [number, number, number, number] },
    installmentTable(ctx, p.primary, p.altRow),
    ...notesBlock(ctx),
    ...bankBlock(ctx, p.primary),
    ...signatureStampBlock(ctx, p.muted),
    ...footerBlock(ctx, p.accent),
  ];
  return baseDoc(p, content, [40, 42, 40, 42], ctx.watermarkText);
}

export { statusBadge, installmentTable, paymentBox };
