import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import type { InvoicePdfContext } from '../../invoicePdfContext';
import {
  baseDoc,
  footerBlock,
  notesBlock,
  paletteFor,
} from '../shared';
import {
  invoiceBreakdownTable,
  invoiceInstallmentsTable,
  invoicePaymentInfoBox,
  invoiceSignatureBlock,
  invoiceStatusBadge,
} from './helpers';

/**
 * Template Invoice 4: Hijau Poligon (Green Polygon)
 * Ciri khas: Poligon geometris bernuansa hijau (#0E7C66, #16A085, #39B06A, #8DD35F)
 * di bagian atas dan bawah, header tabel netral abu-abu terang (#E7E7E7),
 * dan tipografi modern yang kontras & profesional.
 */
export function buildInvoiceGreenPoly(ctx: InvoicePdfContext): TDocumentDefinitions {
  const p = paletteFor('clean', ctx.colors);
  const darkInk = '#111827';
  const muted = '#6B7280';
  const borderLine = '#D9D9D9';
  const greenDeep = '#0E7C66';
  const greenTeal = '#16A085';
  const greenBright = '#39B06A';
  const greenLime = '#8DD35F';

  // Item rows
  const itemRows: Content[][] = ctx.items.map((it, idx) => [
    { text: String(idx + 1), fontSize: 8, alignment: 'center', color: darkInk, margin: [0, 4, 0, 4] as [number, number, number, number] },
    {
      stack: [
        { text: it.name, fontSize: 8.5, bold: true, color: darkInk },
        ...(it.description ? [{ text: it.description, fontSize: 7.5, color: muted, margin: [0, 1, 0, 0] as [number, number, number, number] }] : []),
      ],
      margin: [0, 4, 0, 4] as [number, number, number, number],
    },
    { text: it.unitPrice, fontSize: 8, alignment: 'right', color: darkInk, margin: [0, 4, 0, 4] as [number, number, number, number] },
    { text: `${it.qty} ${it.unit || ''}`.trim(), fontSize: 8, alignment: 'center', color: darkInk, margin: [0, 4, 0, 4] as [number, number, number, number] },
    { text: it.total, fontSize: 8.5, bold: true, alignment: 'right', color: darkInk, margin: [0, 4, 0, 4] as [number, number, number, number] },
  ]);

  const content: Content[] = [
    // Top Decorative Green Poly Bar
    {
      table: {
        widths: [130, 130, 130, '*'],
        body: [
          [
            { text: '', fillColor: greenBright, margin: [0, 2, 0, 2] as [number, number, number, number] },
            { text: '', fillColor: greenDeep, margin: [0, 2, 0, 2] as [number, number, number, number] },
            { text: '', fillColor: greenTeal, margin: [0, 2, 0, 2] as [number, number, number, number] },
            { text: '', fillColor: greenLime, margin: [0, 2, 0, 2] as [number, number, number, number] },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [-40, -40, -40, 14] as [number, number, number, number],
    },

    // Header Poligon & Brand
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: 'INVOICE', fontSize: 24, bold: true, color: darkInk, characterSpacing: 2 },
            {
              text: [
                { text: 'Invoice #: ', fontSize: 8.5, bold: true, color: darkInk },
                { text: `${ctx.invoiceNumber}    `, fontSize: 8.5, color: darkInk },
                { text: 'Tanggal: ', fontSize: 8.5, bold: true, color: darkInk },
                { text: ctx.dateLabel, fontSize: 8.5, color: darkInk },
              ],
              margin: [0, 4, 0, 4] as [number, number, number, number],
            },
            invoiceStatusBadge(ctx, greenDeep),
          ],
        },
        {
          width: 'auto',
          stack: [
            ...(ctx.logoDataUri
              ? [{ image: ctx.logoDataUri, width: 44, alignment: 'right' as const, margin: [0, 0, 0, 4] as [number, number, number, number] }]
              : []),
            { text: ctx.companyName, fontSize: 13, bold: true, color: darkInk, alignment: 'right' as const },
            ...(ctx.companyTagline
              ? [{ text: ctx.companyTagline, fontSize: 7.5, color: muted, alignment: 'right' as const, characterSpacing: 0.5 }]
              : []),
            ...(ctx.companyAddress
              ? [{ text: ctx.companyAddress, fontSize: 7.5, color: muted, alignment: 'right' as const, margin: [0, 2, 0, 0] as [number, number, number, number] }]
              : []),
          ],
        },
      ],
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },

    // Invoice To (Customer)
    {
      table: {
        widths: ['*'],
        body: [
          [
            {
              stack: [
                { text: 'INVOICE TO:', fontSize: 7.5, bold: true, color: greenDeep },
                { text: ctx.customerName || 'Pelanggan', fontSize: 10, bold: true, color: darkInk, margin: [0, 2, 0, 0] as [number, number, number, number] },
                { text: [ctx.customerPhone, ctx.customerAddress].filter(Boolean).join(' • '), fontSize: 8, color: '#374151', margin: [0, 2, 0, 0] as [number, number, number, number] },
              ],
              fillColor: '#F4F7F5',
              margin: [10, 6, 10, 6] as [number, number, number, number],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },

    // Judul Proyek / Dokumen
    { text: ctx.title, fontSize: 10.5, bold: true, color: darkInk, margin: [0, 0, 0, 6] as [number, number, number, number] },

    // Tabel Item (abu-abu terang #E7E7E7 dengan garis tipis)
    {
      table: {
        headerRows: 1,
        widths: [24, '*', 80, 45, 85],
        body: [
          [
            { text: 'SL.', fontSize: 7.5, bold: true, color: darkInk, alignment: 'center', fillColor: '#E7E7E7', margin: [0, 5, 0, 5] as [number, number, number, number] },
            { text: 'ITEM DESCRIPTION', fontSize: 7.5, bold: true, color: darkInk, fillColor: '#E7E7E7', margin: [4, 5, 4, 5] as [number, number, number, number] },
            { text: 'PRICE', fontSize: 7.5, bold: true, color: darkInk, alignment: 'right', fillColor: '#E7E7E7', margin: [0, 5, 4, 5] as [number, number, number, number] },
            { text: 'QTY', fontSize: 7.5, bold: true, color: darkInk, alignment: 'center', fillColor: '#E7E7E7', margin: [0, 5, 0, 5] as [number, number, number, number] },
            { text: 'TOTAL', fontSize: 7.5, bold: true, color: darkInk, alignment: 'right', fillColor: '#E7E7E7', margin: [0, 5, 4, 5] as [number, number, number, number] },
          ],
          ...itemRows,
        ],
      },
      layout: {
        hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.6),
        vLineWidth: () => 0,
        hLineColor: (i, node) => (i === 0 || i === node.table.body.length ? greenDeep : borderLine),
      },
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },

    // Bagian Bawah: Payment Info & Syarat di kiri, Total & Tanda Tangan di kanan
    {
      columns: [
        {
          width: '*',
          stack: [
            invoicePaymentInfoBox(ctx, '#F9FAFB', borderLine, darkInk),
            { text: 'Rincian Termin Pembayaran', fontSize: 9, bold: true, color: darkInk, margin: [0, 6, 0, 2] as [number, number, number, number] },
            invoiceInstallmentsTable(ctx, greenDeep, '#F3F4F6'),
            ...notesBlock(ctx),
          ],
        },
        { width: 18, text: '' },
        {
          width: 195,
          stack: [
            invoiceBreakdownTable(ctx),
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 195, y2: 0, lineWidth: 1, lineColor: '#374151' }], margin: [0, 2, 0, 4] as [number, number, number, number] },
            {
              table: {
                widths: ['*', 'auto'],
                body: [
                  [
                    { text: 'TOTAL:', fontSize: 10, bold: true, color: darkInk },
                    { text: ctx.grandTotal, fontSize: 13, bold: true, color: greenDeep, alignment: 'right' },
                  ],
                ],
              },
              layout: 'noBorders',
              margin: [0, 2, 0, 10] as [number, number, number, number],
            },
            invoiceSignatureBlock(ctx, 'Authorised Sign', greenDeep),
          ],
        },
      ],
    },

    // Footer
    ...footerBlock(ctx, greenDeep),

    // Bottom Decorative Green Poly Bar
    {
      table: {
        widths: [160, 160, '*'],
        body: [
          [
            { text: '', fillColor: greenTeal, margin: [0, 2, 0, 2] as [number, number, number, number] },
            { text: '', fillColor: greenDeep, margin: [0, 2, 0, 2] as [number, number, number, number] },
            { text: '', fillColor: greenLime, margin: [0, 2, 0, 2] as [number, number, number, number] },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [-40, 10, -40, -40] as [number, number, number, number],
    },
  ];

  return baseDoc(p, content, [40, 40, 40, 40], ctx.watermarkText);
}
