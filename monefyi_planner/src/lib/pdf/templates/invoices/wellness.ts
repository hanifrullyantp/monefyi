import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import type { InvoicePdfContext } from '../../invoicePdfContext';
import {
  baseDoc,
  combineBackground,
  footerBlock,
  itemsTable,
  notesBlock,
  paletteFor,
} from '../shared';
import {
  invoiceInstallmentsTable,
  invoicePaymentInfoBox,
  invoiceSignatureBlock,
  invoiceStatusBadge,
} from './helpers';

/**
 * Template Invoice 1: Wellness
 * Ciri khas: Background off-white (#F7F7F5), aksen teal (#5E9C98), judul INVOICE tegas,
 * pill box teal untuk customer, dan tata letak elegan natural.
 */
export function buildInvoiceWellness(ctx: InvoicePdfContext): TDocumentDefinitions {
  const p = paletteFor('clean', ctx.colors);
  const teal = '#5E9C98';
  const darkInk = '#0B0B0B';
  const lineMuted = '#E3E3E0';

  const content: Content[] = [
    // Garis aksen atas teal 3px
    {
      canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 3, color: teal }],
      margin: [0, -10, 0, 12] as [number, number, number, number],
    },

    // Header: Brand & INVOICE
    {
      columns: [
        {
          width: '*',
          stack: [
            ...(ctx.logoDataUri
              ? [{ image: ctx.logoDataUri, width: 44, margin: [0, 0, 0, 4] as [number, number, number, number] }]
              : []),
            { text: ctx.companyName, fontSize: 13, bold: true, color: darkInk },
            ...(ctx.companyTagline
              ? [{ text: ctx.companyTagline, fontSize: 8, color: '#555555', margin: [0, 1, 0, 0] as [number, number, number, number] }]
              : []),
          ],
        },
        {
          width: 'auto',
          stack: [
            { text: 'INVOICE', fontSize: 26, bold: true, color: darkInk, characterSpacing: 1.5, alignment: 'right' },
            {
              text: [
                { text: 'No: ', fontSize: 8.5, color: '#666666' },
                { text: `${ctx.invoiceNumber}   `, fontSize: 8.5, bold: true, color: darkInk },
                { text: 'Tanggal: ', fontSize: 8.5, color: '#666666' },
                { text: ctx.dateLabel, fontSize: 8.5, color: darkInk },
              ],
              alignment: 'right',
              margin: [0, 3, 0, 4] as [number, number, number, number],
            },
            invoiceStatusBadge(ctx, teal),
          ],
        },
      ],
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },

    // Info Pembayaran & Box Penerima (Customer)
    {
      columns: [
        {
          width: '*',
          stack: [
            invoicePaymentInfoBox(ctx, '#FFFFFF', lineMuted, darkInk),
          ],
        },
        { width: 14, text: '' },
        {
          width: 210,
          table: {
            widths: ['*'],
            body: [
              [
                {
                  text: ctx.customerName || 'Pelanggan',
                  fillColor: teal,
                  color: '#FFFFFF',
                  bold: true,
                  fontSize: 9,
                  alignment: 'center',
                  margin: [6, 4, 6, 4] as [number, number, number, number],
                },
              ],
              [
                {
                  stack: [
                    { text: 'TAGIHAN KEPADA:', fontSize: 7, bold: true, color: '#777777' },
                    { text: ctx.customerName, fontSize: 9, bold: true, color: darkInk },
                    { text: [ctx.customerPhone, ctx.customerAddress].filter(Boolean).join('\n'), fontSize: 8, color: '#444444' },
                  ],
                  fillColor: '#FFFFFF',
                  margin: [8, 6, 8, 6] as [number, number, number, number],
                },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 0.6,
            vLineWidth: () => 0.6,
            hLineColor: () => lineMuted,
            vLineColor: () => lineMuted,
          },
        },
      ],
      margin: [0, 0, 0, 10] as [number, number, number, number],
    },

    // Judul Dokumen Proyek
    { text: ctx.title, fontSize: 11, bold: true, color: darkInk, margin: [0, 0, 0, 6] as [number, number, number, number] },

    // Tabel Item
    itemsTable(ctx, teal, '#FFFFFF', '#FAFAF8', false),

    // Subtotal & Ringkasan Total
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: 'Rincian Termin Pembayaran', fontSize: 9.5, bold: true, color: darkInk, margin: [0, 2, 0, 2] as [number, number, number, number] },
            invoiceInstallmentsTable(ctx, teal, '#F7F7F5'),
            ...notesBlock(ctx),
          ],
        },
        { width: 18, text: '' },
        {
          width: 190,
          stack: [
            {
              table: {
                widths: ['*', 'auto'],
                body: [
                  [{ text: 'Subtotal', fontSize: 8 }, { text: ctx.subtotalLabel, fontSize: 8, alignment: 'right' }],
                  ...(ctx.discountLabel ? [[{ text: 'Diskon', fontSize: 8, color: '#e11d48' }, { text: ctx.discountLabel, fontSize: 8, alignment: 'right', color: '#e11d48' }]] : []),
                  ...(ctx.taxLabel ? [[{ text: 'PPN', fontSize: 8 }, { text: ctx.taxLabel, fontSize: 8, alignment: 'right' }]] : []),
                  ...(ctx.billingDiscountLabel ? [[{ text: 'Potongan', fontSize: 8, color: '#e11d48' }, { text: ctx.billingDiscountLabel, fontSize: 8, alignment: 'right', color: '#e11d48' }]] : []),
                ],
              },
              layout: 'noBorders',
              margin: [0, 0, 0, 4] as [number, number, number, number],
            },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 190, y2: 0, lineWidth: 0.8, lineColor: '#CFCFCB' }], margin: [0, 2, 0, 4] as [number, number, number, number] },
            {
              table: {
                widths: ['*', 'auto'],
                body: [
                  [
                    { text: 'TOTAL HARGA', fontSize: 9, bold: true, color: darkInk },
                    { text: ctx.grandTotal, fontSize: 13, bold: true, color: teal, alignment: 'right' },
                  ],
                ],
              },
              layout: 'noBorders',
              margin: [0, 2, 0, 10] as [number, number, number, number],
            },
            invoiceSignatureBlock(ctx, 'Hormat Kami', teal),
          ],
        },
      ],
    },

    // Footer
    ...footerBlock(ctx, teal),
  ];

  const doc = baseDoc(p, content, [40, 36, 40, 36], ctx.watermarkText);
  // Custom background off-white #F7F7F5
  doc.background = combineBackground({ ...p, pageBg: '#F7F7F5' }, ctx.watermarkText);
  return doc;
}

