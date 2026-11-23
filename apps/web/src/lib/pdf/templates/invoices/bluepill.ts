import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import type { InvoicePdfContext } from '../../invoicePdfContext';
import {
  baseDoc,
  combineBackground,
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
 * Template Invoice 7: Biru Pill (Blue Pill)
 * Ciri khas: Banner atas biru maritim (#1B4F8A), baris tabel berselang-seling
 * dengan fill pill abu-kebiruan (#E7EDF3), judul kolom minimalis tanpa kotak kaku,
 * dan box Total berupa rounded pill biru kontras (#124E8C).
 */
export function buildInvoiceBluePill(ctx: InvoicePdfContext): TDocumentDefinitions {
  const p = paletteFor('clean', ctx.colors);
  const blueDeep = '#1B4F8A';
  const blueTotal = '#124E8C';
  const pillBg = '#E7EDF3';
  const darkInk = '#1F2937';
  const muted = '#6B7280';

  // Item rows dengan zebra pill striping
  const itemRows: Content[][] = ctx.items.map((it, idx) => {
    const isEven = idx % 2 === 0;
    const bg = isEven ? pillBg : undefined;
    return [
      { text: String(idx + 1).padStart(2, '0'), fontSize: 8, alignment: 'center', color: darkInk, fillColor: bg, margin: [0, 5, 0, 5] as [number, number, number, number] },
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
    // Header Banner Solid Biru
    {
      table: {
        widths: ['*'],
        body: [
          [
            {
              columns: [
                {
                  width: '*',
                  stack: [
                    ...(ctx.logoDataUri
                      ? [{ image: ctx.logoDataUri, width: 44, margin: [0, 0, 0, 4] as [number, number, number, number] }]
                      : []),
                    { text: ctx.companyName, fontSize: 14, bold: true, color: '#FFFFFF', characterSpacing: 1 },
                    ...(ctx.companyTagline
                      ? [{ text: ctx.companyTagline, fontSize: 7.5, color: '#BFDBFE', characterSpacing: 0.8 }]
                      : []),
                  ],
                },
                {
                  width: 'auto',
                  stack: [
                    { text: 'INVOICE', fontSize: 24, bold: true, color: '#FFFFFF', characterSpacing: 2, alignment: 'right' },
                    invoiceStatusBadge(ctx, '#FFFFFF', blueDeep),
                  ],
                },
              ],
              fillColor: blueDeep,
              margin: [14, 12, 14, 12] as [number, number, number, number],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, -10, 0, 14] as [number, number, number, number],
    },

    // Info Pelanggan & No Invoice
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: 'INVOICE TO:', fontSize: 8, bold: true, color: blueDeep },
            { text: ctx.customerName || 'Pelanggan', fontSize: 12, bold: true, color: darkInk, margin: [0, 2, 0, 2] as [number, number, number, number] },
            { text: [ctx.customerPhone, ctx.customerAddress].filter(Boolean).join('\n'), fontSize: 8, color: '#4B5563' },
          ],
        },
        {
          width: 190,
          stack: [
            {
              table: {
                widths: [80, '*'],
                body: [
                  [{ text: 'Invoice Number:', fontSize: 8, bold: true, color: blueDeep }, { text: ctx.invoiceNumber, fontSize: 8, bold: true, alignment: 'right' }],
                  [{ text: 'Invoice Date:', fontSize: 8, bold: true, color: blueDeep }, { text: ctx.dateLabel, fontSize: 8, alignment: 'right' }],
                  [{ text: 'Jatuh Tempo:', fontSize: 8, bold: true, color: blueDeep }, { text: ctx.dueDateLabel || '-', fontSize: 8, alignment: 'right' }],
                ],
              },
              layout: 'noBorders',
            },
          ],
        },
      ],
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },

    // Judul Proyek
    { text: ctx.title, fontSize: 10.5, bold: true, color: blueDeep, margin: [0, 0, 0, 6] as [number, number, number, number] },

    // Tabel Item (Clean text header, zebra pill row striping)
    {
      table: {
        headerRows: 1,
        widths: [24, '*', 80, 45, 85],
        body: [
          [
            { text: 'NO.', fontSize: 7.5, bold: true, color: darkInk, alignment: 'center', margin: [0, 4, 0, 4] as [number, number, number, number] },
            { text: 'PRODUCT DESCRIPTION', fontSize: 7.5, bold: true, color: darkInk, margin: [6, 4, 6, 4] as [number, number, number, number] },
            { text: 'PRICE', fontSize: 7.5, bold: true, color: darkInk, alignment: 'right', margin: [0, 4, 6, 4] as [number, number, number, number] },
            { text: 'QUANTITY', fontSize: 7.5, bold: true, color: darkInk, alignment: 'center', margin: [0, 4, 0, 4] as [number, number, number, number] },
            { text: 'TOTAL', fontSize: 7.5, bold: true, color: darkInk, alignment: 'right', margin: [0, 4, 6, 4] as [number, number, number, number] },
          ],
          ...itemRows,
        ],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },

    // Bagian Bawah: Payment Info & Syarat di kiri, Total Pill di kanan
    {
      columns: [
        {
          width: '*',
          stack: [
            invoicePaymentInfoBox(ctx, pillBg, '#CBD5E1', darkInk),
            { text: 'Rincian Termin Pembayaran', fontSize: 9, bold: true, color: blueDeep, margin: [0, 6, 0, 2] as [number, number, number, number] },
            invoiceInstallmentsTable(ctx, blueDeep, pillBg),
            ...notesBlock(ctx),
          ],
        },
        { width: 18, text: '' },
        {
          width: 195,
          stack: [
            invoiceBreakdownTable(ctx),
            // Rounded Pill Total Blue
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      columns: [
                        { text: 'Total:', fontSize: 9, bold: true, color: '#FFFFFF' },
                        { text: ctx.grandTotal, fontSize: 13, bold: true, color: '#FFFFFF', alignment: 'right' },
                      ],
                      fillColor: blueTotal,
                      margin: [10, 6, 10, 6] as [number, number, number, number],
                    },
                  ],
                ],
              },
              layout: 'noBorders',
              margin: [0, 2, 0, 10] as [number, number, number, number],
            },
            invoiceSignatureBlock(ctx, 'Authorised Signature', blueDeep),
          ],
        },
      ],
    },

    // Footer
    ...footerBlock(ctx, blueDeep),

    // Bottom blue accent bar
    {
      table: {
        widths: ['*'],
        body: [
          [{ text: '', fillColor: blueDeep, margin: [0, 2, 0, 2] as [number, number, number, number] }],
        ],
      },
      layout: 'noBorders',
      margin: [-40, 10, -40, -36] as [number, number, number, number],
    },
  ];

  return baseDoc(p, content, [40, 36, 40, 36], ctx.watermarkText);
}
