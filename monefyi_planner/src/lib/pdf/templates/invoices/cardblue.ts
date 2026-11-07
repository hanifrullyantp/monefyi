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
 * Template Invoice 3: Biru Kartu (Card Blue)
 * Ciri khas: Header lengkung biru tua (#1B67AE) dengan teks putih, tabel mengambang
 * seperti kartu putih, serta pill Total berwarna kuning-lime (#E6E64A).
 */
export function buildInvoiceCardBlue(ctx: InvoicePdfContext): TDocumentDefinitions {
  const p = paletteFor('modern', ctx.colors);
  const blue = '#1B67AE';
  const limeYellow = '#E6E64A';
  const cardBorder = '#CBD5E1';

  const content: Content[] = [
    // Header Banner Biru
    {
      table: {
        widths: ['*'],
        body: [
          [
            {
              stack: [
                // Baris Atas Banner: Brand & Title
                {
                  columns: [
                    {
                      width: '*',
                      stack: [
                        ...(ctx.logoDataUri
                          ? [{ image: ctx.logoDataUri, width: 44, margin: [0, 0, 0, 3] as [number, number, number, number] }]
                          : []),
                        { text: ctx.companyName, fontSize: 13, bold: true, color: '#FFFFFF' },
                        ...(ctx.companyTagline
                          ? [{ text: ctx.companyTagline, fontSize: 8, color: '#E2E8F0' }]
                          : []),
                      ],
                    },
                    {
                      width: 'auto',
                      stack: [
                        { text: 'INVOICE', fontSize: 22, bold: true, color: '#FFFFFF', characterSpacing: 1.5, alignment: 'right' },
                        { text: `#${ctx.invoiceNumber}`, fontSize: 9, bold: true, color: '#F1F5F9', alignment: 'right' },
                        invoiceStatusBadge(ctx, limeYellow, '#111827'),
                      ],
                    },
                  ],
                },
                // Garis Pembatas Putih
                {
                  canvas: [{ type: 'line', x1: 0, y1: 0, x2: 505, y2: 0, lineWidth: 0.7, lineColor: '#93C5FD' }],
                  margin: [0, 8, 0, 8] as [number, number, number, number],
                },
                // Baris Bawah Banner: Invoice To & Tanggal
                {
                  columns: [
                    {
                      width: '*',
                      stack: [
                        { text: 'INVOICE TO :', fontSize: 7.5, bold: true, color: '#E2E8F0' },
                        { text: ctx.customerName, fontSize: 11, bold: true, color: '#FFFFFF' },
                        { text: [ctx.customerPhone, ctx.customerAddress, ctx.customerEmail].filter(Boolean).join('  ·  '), fontSize: 8, color: '#E2E8F0' },
                      ],
                    },
                    {
                      width: 'auto',
                      stack: [
                        { text: ctx.dateLabel.toUpperCase(), fontSize: 8.5, bold: true, color: '#FFFFFF', alignment: 'right', margin: [0, 10, 0, 0] as [number, number, number, number] },
                      ],
                    },
                  ],
                },
              ],
              fillColor: blue,
              margin: [16, 14, 16, 14] as [number, number, number, number],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [-40, -40, -40, 14] as [number, number, number, number],
    },

    // Judul Proyek
    { text: ctx.title, fontSize: 11, bold: true, color: '#0F172A', margin: [0, 0, 0, 8] as [number, number, number, number] },

    // Kartu Tabel Mengambang (White Card Effect)
    {
      table: {
        widths: ['*'],
        body: [
          [
            {
              stack: [
                {
                  table: {
                    headerRows: 1,
                    widths: [20, '*', 32, 40, 68, 75],
                    body: [
                      [
                        { text: '#', bold: true, fontSize: 8, color: '#334155' },
                        { text: 'ITEM DESCRIPTION', bold: true, fontSize: 8, color: '#334155' },
                        { text: 'QTY', bold: true, fontSize: 8, color: '#334155', alignment: 'center' as const },
                        { text: 'UNIT', bold: true, fontSize: 8, color: '#334155' },
                        { text: 'UNIT PRICE', bold: true, fontSize: 8, color: '#334155', alignment: 'right' as const },
                        { text: 'TOTAL', bold: true, fontSize: 8, color: '#334155', alignment: 'right' as const },
                      ],
                      ...(ctx.items.length
                        ? ctx.items.map((row) => [
                          { text: String(row.no), fontSize: 8 },
                          { text: row.name, fontSize: 8 },
                          { text: row.qty, alignment: 'center' as const, fontSize: 8 },
                          { text: row.unit, fontSize: 8 },
                          { text: row.unitPrice, alignment: 'right' as const, fontSize: 8 },
                          { text: row.total, alignment: 'right' as const, bold: true, fontSize: 8 },
                        ])
                        : [[
                          { text: 'Tidak ada item', italics: true, color: '#94a3b8', colSpan: 6, alignment: 'center' as const, fontSize: 8 } as Content,
                          { text: '' }, { text: '' }, { text: '' }, { text: '' }, { text: '' },
                        ]]),
                    ],
                  },
                  layout: {
                    hLineWidth: (i, node) => (i === 1 ? 1 : 0.4),
                    vLineWidth: () => 0,
                    hLineColor: (i) => (i === 1 ? '#CBD5E1' : '#EEF0F2'),
                    paddingLeft: () => 6,
                    paddingRight: () => 6,
                    paddingTop: () => 4,
                    paddingBottom: () => 4,
                  },
                },
                // Total Bar dalam kartu
                {
                  columns: [
                    { width: '*', text: '' },
                    {
                      width: 220,
                      stack: [
                        invoiceBreakdownTable(ctx),
                        // Pill Bar Kuning TOTAL
                        {
                          table: {
                            widths: ['*'],
                            body: [
                              [
                                {
                                  stack: [
                                    {
                                      columns: [
                                        { text: 'TOTAL TAGIHAN', bold: true, fontSize: 9, color: '#1E293B' },
                                        { text: ctx.grandTotal, bold: true, fontSize: 13, color: '#1E293B', alignment: 'right' as const },
                                      ],
                                    },
                                  ],
                                  fillColor: limeYellow,
                                  margin: [10, 5, 10, 5] as [number, number, number, number],
                                },
                              ],
                            ],
                          },
                          layout: 'noBorders',
                        },
                      ],
                    },
                  ],
                  margin: [0, 6, 0, 0] as [number, number, number, number],
                },
              ],
              fillColor: '#FFFFFF',
              margin: [12, 10, 12, 10] as [number, number, number, number],
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.8,
        vLineWidth: () => 0.8,
        hLineColor: () => cardBorder,
        vLineColor: () => cardBorder,
      },
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },

    // Bawah: Payment Info & Termin di kiri, Tanda Tangan di kanan
    {
      columns: [
        {
          width: '*',
          stack: [
            invoicePaymentInfoBox(ctx, '#FFFFFF', cardBorder, '#0F172A'),
            { text: 'Termin & Skema Pembayaran', fontSize: 9, bold: true, color: blue, margin: [0, 2, 0, 2] as [number, number, number, number] },
            invoiceInstallmentsTable(ctx, blue, '#F1F5F9'),
            ...notesBlock(ctx),
          ],
        },
        { width: 20, text: '' },
        {
          width: 170,
          stack: [
            invoiceSignatureBlock(ctx, 'Authorised Sign', blue),
          ],
        },
      ],
    },

    // Footer
    ...footerBlock(ctx, blue),
  ];

  const doc = baseDoc(p, content, [40, 40, 40, 40], ctx.watermarkText);
  // Soft blue canvas #E8EFF3
  doc.background = combineBackground({ ...p, pageBg: '#E8EFF3' }, ctx.watermarkText);
  return doc;
}

