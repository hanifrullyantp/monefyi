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
 * Template Invoice 8: Innova Hijau (Innova Green)
 * Ciri khas: Header tabel two-tone hijau cerah (#1F9D55) & charcoal gelap (#2B2B2B),
 * badge nomor invoice hijau, baris tabel zebra (#F3F5F4),
 * dan bar Grand Total hijau kontras dengan tipografi dinamis.
 */
export function buildInvoiceInnovaGreen(ctx: InvoicePdfContext): TDocumentDefinitions {
  const p = paletteFor('clean', ctx.colors);
  const greenBrand = '#1F9D55';
  const greenDark = '#0B6B38';
  const greenLime = '#8CD66F';
  const headerDark = '#2B2B2B';
  const darkInk = '#1F2937';
  const muted = '#6B7280';
  const zebraBg = '#F3F5F4';

  const itemRows: Content[][] = ctx.items.map((it, idx) => {
    const isEven = idx % 2 === 1;
    const bg = isEven ? zebraBg : undefined;
    return [
      {
        stack: [
          { text: it.name, fontSize: 8.5, bold: true, color: darkInk },
          ...(it.description ? [{ text: it.description, fontSize: 7.5, color: muted, margin: [0, 1, 0, 0] as [number, number, number, number] }] : []),
        ],
        fillColor: bg,
        margin: [6, 4, 6, 4] as [number, number, number, number],
      },
      { text: `${it.qty} ${it.unit || ''}`.trim(), fontSize: 8, alignment: 'center', color: darkInk, fillColor: bg, margin: [0, 4, 0, 4] as [number, number, number, number] },
      { text: it.unitPrice, fontSize: 8, alignment: 'right', color: darkInk, fillColor: bg, margin: [0, 4, 6, 4] as [number, number, number, number] },
      { text: it.total, fontSize: 8.5, bold: true, alignment: 'right', color: darkInk, fillColor: bg, margin: [0, 4, 6, 4] as [number, number, number, number] },
    ];
  });

  const content: Content[] = [
    // Top Decorative Green Ribbon Bar
    {
      table: {
        widths: ['*', 120, 80, 60],
        body: [
          [
            { text: '', margin: [0, 2, 0, 2] as [number, number, number, number] },
            { text: '', fillColor: greenLime, margin: [0, 2, 0, 2] as [number, number, number, number] },
            { text: '', fillColor: greenBrand, margin: [0, 2, 0, 2] as [number, number, number, number] },
            { text: '', fillColor: greenDark, margin: [0, 2, 0, 2] as [number, number, number, number] },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [-40, -36, -40, 14] as [number, number, number, number],
    },

    // Header Bar: Brand di kiri, INVOICE & Pill No di kanan
    {
      columns: [
        {
          width: '*',
          stack: [
            ...(ctx.logoDataUri
              ? [{ image: ctx.logoDataUri, width: 44, margin: [0, 0, 0, 4] as [number, number, number, number] }]
              : []),
            { text: ctx.companyName, fontSize: 14, bold: true, color: darkInk },
            ...(ctx.companyTagline
              ? [{ text: ctx.companyTagline, fontSize: 7.5, color: muted }]
              : []),
          ],
        },
        {
          width: 'auto',
          stack: [
            { text: 'INVOICE', fontSize: 20, bold: true, color: darkInk, characterSpacing: 1.5, alignment: 'right' },
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      text: `INVOICE NO. #${ctx.invoiceNumber}`,
                      fillColor: greenBrand,
                      color: '#FFFFFF',
                      fontSize: 7.5,
                      bold: true,
                      alignment: 'center',
                      margin: [8, 3, 8, 3] as [number, number, number, number],
                    },
                  ],
                ],
              },
              layout: 'noBorders',
              margin: [0, 2, 0, 4] as [number, number, number, number],
            },
            invoiceStatusBadge(ctx, greenDark),
          ],
        },
      ],
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },

    // Info Pelanggan & Tanggal
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: 'Invoice To:', fontSize: 7.5, color: muted },
            { text: ctx.customerName || 'Pelanggan', fontSize: 10.5, bold: true, color: '#1F7F3E', margin: [0, 2, 0, 1] as [number, number, number, number] },
            { text: [ctx.customerPhone, ctx.customerAddress].filter(Boolean).join('\n'), fontSize: 8, color: '#4B5563' },
          ],
        },
        {
          width: 170,
          stack: [
            {
              table: {
                widths: [70, '*'],
                body: [
                  [{ text: 'Invoice Date:', fontSize: 8, color: muted }, { text: ctx.dateLabel, fontSize: 8, bold: true, alignment: 'right' as const }],
                  ...(ctx.dueDateLabel ? [[{ text: 'Jatuh Tempo:', fontSize: 8, color: muted }, { text: ctx.dueDateLabel, fontSize: 8, alignment: 'right' as const }]] : []),
                ],
              },
              layout: 'noBorders',
            },
          ],
        },
      ],
      margin: [0, 0, 0, 10] as [number, number, number, number],
    },

    // Judul Proyek
    { text: ctx.title, fontSize: 10.5, bold: true, color: darkInk, margin: [0, 0, 0, 6] as [number, number, number, number] },

    // Tabel Item Two-Tone Header (GreenBrand & HeaderDark)
    {
      table: {
        headerRows: 1,
        widths: ['*', 50, 85, 95],
        body: [
          [
            { text: 'Item Description', fontSize: 7.5, bold: true, color: '#FFFFFF', fillColor: greenBrand, margin: [6, 5, 6, 5] as [number, number, number, number] },
            { text: 'Quantity', fontSize: 7.5, bold: true, color: '#FFFFFF', alignment: 'center', fillColor: greenBrand, margin: [0, 5, 0, 5] as [number, number, number, number] },
            { text: 'Unit Price', fontSize: 7.5, bold: true, color: '#FFFFFF', alignment: 'right', fillColor: greenBrand, margin: [0, 5, 6, 5] as [number, number, number, number] },
            { text: 'Total Price', fontSize: 7.5, bold: true, color: '#FFFFFF', alignment: 'right', fillColor: headerDark, margin: [0, 5, 6, 5] as [number, number, number, number] },
          ],
          ...itemRows,
        ],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },

    // Bagian Bawah: Payment Info & Grand Total
    {
      columns: [
        {
          width: '*',
          stack: [
            invoicePaymentInfoBox(ctx, '#F9FAFB', '#E5E7EB', darkInk),
            { text: 'Rincian Termin Pembayaran', fontSize: 9, bold: true, color: darkInk, margin: [0, 6, 0, 2] as [number, number, number, number] },
            invoiceInstallmentsTable(ctx, greenBrand, zebraBg),
            ...notesBlock(ctx),
          ],
        },
        { width: 18, text: '' },
        {
          width: 195,
          stack: [
            invoiceBreakdownTable(ctx),
            // Grand Total Bar Hijau
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      stack: [
                        {
                          columns: [
                            { text: 'Grand total', fontSize: 8.5, bold: true, color: '#FFFFFF' },
                            { text: ctx.grandTotal, fontSize: 12.5, bold: true, color: '#FFFFFF', alignment: 'right' as const },
                          ],
                        },
                      ],
                      fillColor: greenBrand,
                      margin: [8, 5, 8, 5] as [number, number, number, number],
                    },
                  ],
                ],
              },
              layout: 'noBorders',
              margin: [0, 2, 0, 10] as [number, number, number, number],
            },
            invoiceSignatureBlock(ctx, 'Hormat Kami', greenBrand),
          ],
        },
      ],
    },

    // Footer
    ...footerBlock(ctx, greenBrand),

    // Bottom Decorative Ribbon
    {
      table: {
        widths: [120, '*', 120],
        body: [
          [
            { text: '', fillColor: greenBrand, margin: [0, 2, 0, 2] as [number, number, number, number] },
            { text: '', margin: [0, 2, 0, 2] as [number, number, number, number] },
            { text: '', fillColor: greenLime, margin: [0, 2, 0, 2] as [number, number, number, number] },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [-40, 10, -40, -36] as [number, number, number, number],
    },
  ];

  return baseDoc(p, content, [40, 36, 40, 36], ctx.watermarkText);
}
