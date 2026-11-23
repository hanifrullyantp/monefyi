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
 * Template Invoice 6: Navy Oranye (Navy Orange)
 * Ciri khas: Header tabel berselang-seling oranye (#F5A623) dan navy (#1F2E4D),
 * aksen geometris kontras dinamis di sudut atas & bawah, pill Total oranye cerah,
 * serta tata letak tabular yang rapi dan terstruktur.
 */
export function buildInvoiceNavyOrange(ctx: InvoicePdfContext): TDocumentDefinitions {
  const p = paletteFor('clean', ctx.colors);
  const navy = '#1F2E4D';
  const orange = '#F5A623';
  const darkInk = '#111827';
  const muted = '#6B7280';
  const gridBorder = '#D1D5DB';

  const itemRows: Content[][] = ctx.items.map((it, idx) => [
    { text: String(idx + 1), fontSize: 8, alignment: 'center', color: darkInk, margin: [0, 4, 0, 4] as [number, number, number, number] },
    {
      stack: [
        { text: it.name, fontSize: 8.5, bold: true, color: darkInk },
        ...(it.description ? [{ text: it.description, fontSize: 7.5, color: muted, margin: [0, 1, 0, 0] as [number, number, number, number] }] : []),
      ],
      margin: [4, 4, 4, 4] as [number, number, number, number],
    },
    { text: it.unitPrice, fontSize: 8, alignment: 'right', color: darkInk, margin: [0, 4, 4, 4] as [number, number, number, number] },
    { text: `${it.qty} ${it.unit || ''}`.trim(), fontSize: 8, alignment: 'center', color: darkInk, margin: [0, 4, 0, 4] as [number, number, number, number] },
    { text: it.total, fontSize: 8.5, bold: true, alignment: 'right', color: darkInk, margin: [0, 4, 4, 4] as [number, number, number, number] },
  ]);

  const content: Content[] = [
    // Top Decorative Navy & Orange Bar
    {
      table: {
        widths: [280, '*'],
        body: [
          [
            { text: '', fillColor: navy, margin: [0, 2, 0, 2] as [number, number, number, number] },
            { text: '', fillColor: orange, margin: [0, 2, 0, 2] as [number, number, number, number] },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [-40, -36, -40, 14] as [number, number, number, number],
    },

    // Header Baris 1: Logo & Brand di kiri, Banner INVOICE di kanan
    {
      columns: [
        {
          width: '*',
          stack: [
            ...(ctx.logoDataUri
              ? [{ image: ctx.logoDataUri, width: 44, margin: [0, 0, 0, 4] as [number, number, number, number] }]
              : []),
            { text: ctx.companyName, fontSize: 13, bold: true, color: navy },
            ...(ctx.companyTagline
              ? [{ text: ctx.companyTagline, fontSize: 8, color: orange, bold: true, characterSpacing: 1 }]
              : []),
          ],
        },
        {
          width: 180,
          table: {
            widths: ['*'],
            body: [
              [
                {
                  text: 'INVOICE',
                  fillColor: navy,
                  color: '#FFFFFF',
                  fontSize: 20,
                  bold: true,
                  alignment: 'center',
                  characterSpacing: 2,
                  margin: [0, 6, 0, 6] as [number, number, number, number],
                },
              ],
            ],
          },
          layout: 'noBorders',
        },
      ],
      margin: [0, 0, 0, 14] as [number, number, number, number],
    },

    // Info Pelanggan di kiri & Detail Invoice di kanan
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: 'INVOICE TO:', fontSize: 7.5, bold: true, color: orange },
            { text: ctx.customerName || 'Pelanggan', fontSize: 11, bold: true, color: navy, margin: [0, 1, 0, 1] as [number, number, number, number] },
            { text: [ctx.customerPhone, ctx.customerAddress].filter(Boolean).join('\n'), fontSize: 8, color: '#4B5563' },
          ],
        },
        {
          width: 180,
          stack: [
            {
              table: {
                widths: [70, '*'],
                body: [
                  [{ text: 'Invoice No:', fontSize: 8, bold: true, color: navy }, { text: ctx.invoiceNumber, fontSize: 8, bold: true, alignment: 'right' }],
                  [{ text: 'Tanggal:', fontSize: 8, bold: true, color: navy }, { text: ctx.dateLabel, fontSize: 8, alignment: 'right' }],
                  [{ text: 'Total Due:', fontSize: 8, bold: true, color: navy }, { text: ctx.grandTotal, fontSize: 8, bold: true, color: orange, alignment: 'right' }],
                ],
              },
              layout: 'noBorders',
            },
            invoiceStatusBadge(ctx, orange, '#FFFFFF'),
          ],
        },
      ],
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },

    // Judul Proyek
    { text: ctx.title, fontSize: 10.5, bold: true, color: navy, margin: [0, 0, 0, 6] as [number, number, number, number] },

    // Tabel Item dengan Header Alternating Orange & Navy
    {
      table: {
        headerRows: 1,
        widths: [24, '*', 80, 45, 85],
        body: [
          [
            { text: 'SL', fontSize: 7.5, bold: true, color: '#FFFFFF', alignment: 'center', fillColor: orange, margin: [0, 5, 0, 5] as [number, number, number, number] },
            { text: 'PRODUCT DESCRIPTION', fontSize: 7.5, bold: true, color: '#FFFFFF', fillColor: navy, margin: [4, 5, 4, 5] as [number, number, number, number] },
            { text: 'PRICE', fontSize: 7.5, bold: true, color: '#FFFFFF', alignment: 'right', fillColor: orange, margin: [0, 5, 4, 5] as [number, number, number, number] },
            { text: 'QTY', fontSize: 7.5, bold: true, color: '#FFFFFF', alignment: 'center', fillColor: navy, margin: [0, 5, 0, 5] as [number, number, number, number] },
            { text: 'AMOUNT', fontSize: 7.5, bold: true, color: '#FFFFFF', alignment: 'right', fillColor: orange, margin: [0, 5, 4, 5] as [number, number, number, number] },
          ],
          ...itemRows,
        ],
      },
      layout: {
        hLineWidth: () => 0.6,
        vLineWidth: () => 0.6,
        hLineColor: () => gridBorder,
        vLineColor: () => gridBorder,
      },
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },

    // Bagian Bawah: Payment Info di kiri, Subtotal & Pill Total Oranye di kanan
    {
      columns: [
        {
          width: '*',
          stack: [
            invoicePaymentInfoBox(ctx, '#F9FAFB', gridBorder, navy),
            { text: 'Rincian Termin Pembayaran', fontSize: 9, bold: true, color: navy, margin: [0, 6, 0, 2] as [number, number, number, number] },
            invoiceInstallmentsTable(ctx, navy, '#F3F4F6'),
            ...notesBlock(ctx),
          ],
        },
        { width: 18, text: '' },
        {
          width: 195,
          stack: [
            invoiceBreakdownTable(ctx, navy),
            // Pill Total Oranye
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      stack: [
                        {
                          columns: [
                            { text: 'TOTAL', fontSize: 9, bold: true, color: '#FFFFFF' },
                            { text: ctx.grandTotal, fontSize: 13, bold: true, color: '#FFFFFF', alignment: 'right' as const },
                          ],
                        },
                      ],
                      fillColor: orange,
                      margin: [8, 6, 8, 6] as [number, number, number, number],
                    },
                  ],
                ],
              },
              layout: 'noBorders',
              margin: [0, 2, 0, 10] as [number, number, number, number],
            },
            invoiceSignatureBlock(ctx, 'Your Sincerely', navy),
          ],
        },
      ],
    },

    // Footer
    ...footerBlock(ctx, navy),

    // Bottom Decorative Navy & Orange Bar
    {
      table: {
        widths: [200, '*'],
        body: [
          [
            { text: '', fillColor: navy, margin: [0, 2, 0, 2] as [number, number, number, number] },
            { text: '', fillColor: orange, margin: [0, 2, 0, 2] as [number, number, number, number] },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [-40, 10, -40, -36] as [number, number, number, number],
    },
  ];

  return baseDoc(p, content, [40, 36, 40, 36], ctx.watermarkText);
}
