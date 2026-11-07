import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import type { InvoicePdfContext } from '../../invoicePdfContext';
import {
  baseDoc,
  combineBackground,
  notesBlock,
  paletteFor,
} from '../shared';
import {
  invoiceBreakdownTable,
  invoiceInstallmentsTable,
  invoiceMetaTable,
  invoicePaymentInfoBox,
  invoiceSignatureBlock,
  invoiceStatusBadge,
} from './helpers';

/**
 * Template Invoice 9: Atlas Biru (Atlas Blue)
 * Ciri khas: Banner atas biru langit (#2C9AD3), header tabel biru cerah (#3FA0D6)
 * dengan zebra baris (#E7ECF1 / #F5F7F9), box Total biru lembut (#E3EAF1)
 * dengan teks total biru tua (#1F7FB8), serta footer bar biru penuh.
 */
export function buildInvoiceAtlasBlue(ctx: InvoicePdfContext): TDocumentDefinitions {
  const p = paletteFor('clean', ctx.colors);
  const blueSky = '#2C9AD3';
  const blueDark = '#1F7FB8';
  const blueHeader = '#3FA0D6';
  const darkInk = '#111827';
  const muted = '#6B7280';
  const totalBoxBg = '#E3EAF1';

  const itemRows: Content[][] = ctx.items.map((it, idx) => {
    const bg = idx % 2 === 0 ? '#E7ECF1' : '#F5F7F9';
    return [
      { text: String(idx + 1), fontSize: 8, alignment: 'center', color: darkInk, fillColor: bg, margin: [0, 5, 0, 5] as [number, number, number, number] },
      {
        stack: [
          { text: it.name, fontSize: 8.5, bold: true, color: darkInk },
          ...(it.description ? [{ text: it.description, fontSize: 7.5, color: muted, margin: [0, 1, 0, 0] as [number, number, number, number] }] : []),
        ],
        fillColor: bg,
        margin: [6, 5, 6, 5] as [number, number, number, number],
      },
      { text: it.unitPrice, fontSize: 8, alignment: 'right', color: darkInk, fillColor: bg, margin: [0, 5, 6, 5] as [number, number, number, number] },
      { text: `${it.qty} ${it.unit || ''}`.trim(), fontSize: 8, alignment: 'center', color: darkInk, fillColor: bg, margin: [0, 5, 0, 5] as [number, number, number, number] },
      { text: it.total, fontSize: 8.5, bold: true, alignment: 'right', color: darkInk, fillColor: bg, margin: [0, 5, 6, 5] as [number, number, number, number] },
    ];
  });

  const content: Content[] = [
    // Header: Brand di kiri & Banner INVOICE di kanan
    {
      columns: [
        {
          width: '*',
          stack: [
            ...(ctx.logoDataUri
              ? [{ image: ctx.logoDataUri, width: 44, margin: [0, 0, 0, 4] as [number, number, number, number] }]
              : []),
            { text: ctx.companyName, fontSize: 13, bold: true, color: darkInk, characterSpacing: 1 },
            ...(ctx.companyTagline
              ? [{ text: ctx.companyTagline, fontSize: 8, color: muted, characterSpacing: 0.8 }]
              : []),
          ],
        },
        {
          width: 190,
          table: {
            widths: ['*'],
            body: [
              [
                {
                  text: 'INVOICE',
                  fillColor: blueSky,
                  color: '#FFFFFF',
                  fontSize: 22,
                  bold: true,
                  alignment: 'center',
                  characterSpacing: 2,
                  margin: [0, 8, 0, 8] as [number, number, number, number],
                },
              ],
            ],
          },
          layout: 'noBorders',
        },
      ],
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },

    // Info Pelanggan & No Invoice
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: 'INVOICE TO:', fontSize: 8, bold: true, color: darkInk },
            { text: ctx.customerName || 'Pelanggan', fontSize: 10.5, bold: true, color: darkInk, margin: [0, 2, 0, 1] as [number, number, number, number] },
            { text: [ctx.customerPhone, ctx.customerAddress].filter(Boolean).join('\n'), fontSize: 8, color: '#4B5563' },
          ],
        },
        {
          width: 180,
          stack: [
            invoiceMetaTable(ctx, darkInk),
            invoiceStatusBadge(ctx, blueSky),
          ],
        },
      ],
      margin: [0, 0, 0, 10] as [number, number, number, number],
    },

    // Judul Proyek
    { text: ctx.title, fontSize: 10.5, bold: true, color: darkInk, margin: [0, 0, 0, 6] as [number, number, number, number] },

    // Tabel Item (Header Biru Cerah #3FA0D6 + Zebra Fills)
    {
      table: {
        headerRows: 1,
        widths: [24, '*', 80, 45, 85],
        body: [
          [
            { text: 'SL', fontSize: 7.5, bold: true, color: '#FFFFFF', alignment: 'center', fillColor: blueHeader, margin: [0, 5, 0, 5] as [number, number, number, number] },
            { text: 'ITEM DESCRIPTION', fontSize: 7.5, bold: true, color: '#FFFFFF', fillColor: blueHeader, margin: [6, 5, 6, 5] as [number, number, number, number] },
            { text: 'PRICE', fontSize: 7.5, bold: true, color: '#FFFFFF', alignment: 'right', fillColor: blueHeader, margin: [0, 5, 6, 5] as [number, number, number, number] },
            { text: 'QTY', fontSize: 7.5, bold: true, color: '#FFFFFF', alignment: 'center', fillColor: blueHeader, margin: [0, 5, 0, 5] as [number, number, number, number] },
            { text: 'TOTAL', fontSize: 7.5, bold: true, color: '#FFFFFF', alignment: 'right', fillColor: blueHeader, margin: [0, 5, 6, 5] as [number, number, number, number] },
          ],
          ...itemRows,
        ],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },

    // Bagian Bawah: Payment Info & Syarat di kiri, Total Box & Sign di kanan
    {
      columns: [
        {
          width: '*',
          stack: [
            invoicePaymentInfoBox(ctx, '#F9FAFB', '#D1D5DB', darkInk),
            { text: 'Rincian Termin Pembayaran', fontSize: 9, bold: true, color: darkInk, margin: [0, 6, 0, 2] as [number, number, number, number] },
            invoiceInstallmentsTable(ctx, blueSky, '#E7ECF1'),
            ...notesBlock(ctx),
          ],
        },
        { width: 18, text: '' },
        {
          width: 195,
          stack: [
            invoiceBreakdownTable(ctx, darkInk),
            // Total Box Soft Blue #E3EAF1
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      columns: [
                        { text: 'TOTAL:', fontSize: 9, bold: true, color: darkInk },
                        { text: ctx.grandTotal, fontSize: 13, bold: true, color: blueDark, alignment: 'right' },
                      ],
                      fillColor: totalBoxBg,
                      margin: [8, 6, 8, 6] as [number, number, number, number],
                    },
                  ],
                ],
              },
              layout: 'noBorders',
              margin: [0, 2, 0, 10] as [number, number, number, number],
            },
            invoiceSignatureBlock(ctx, 'Hormat Kami', blueSky),
          ],
        },
      ],
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },
    // Bottom solid sky blue bar #2C9AD3 with footer contact text
    {
      table: {
        widths: ['*'],
        body: [
          [
            {
              columns: [
                { text: ctx.companyPhone ? `Telp: ${ctx.companyPhone}` : '', fontSize: 7.5, color: '#FFFFFF', alignment: 'left' },
                { text: ctx.companyAddress || '', fontSize: 7.5, color: '#FFFFFF', alignment: 'center' },
                { text: 'www.monefyi.com', fontSize: 7.5, color: '#FFFFFF', alignment: 'right' },
              ],
              fillColor: blueSky,
              margin: [10, 6, 10, 6] as [number, number, number, number],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [-40, 14, -40, -42] as [number, number, number, number],
    },
  ];

  return baseDoc(p, content, [40, 36, 40, 42], ctx.watermarkText);
}
