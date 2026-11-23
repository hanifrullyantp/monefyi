import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { buildImageSection, type QuotationPdfContext } from '../../quotationPdfContext';
import {
  bankBlock,
  baseDoc,
  footerBlock,
  itemsTable,
  notesBlock,
  paletteFor,
  signatureStampBlock,
  summaryBlock,
  termsBlock,
} from '../shared';

/** Full Color — header gradient-like, badge, total menonjol. */
export function buildQuotationFullColor(ctx: QuotationPdfContext): TDocumentDefinitions {
  const p = paletteFor('fullcolor', ctx.colors);
  const img = buildImageSection(ctx, 'fullcolor');
  const headerStack: Content[] = [];
  if (ctx.logoDataUri) headerStack.push({ image: ctx.logoDataUri, width: 48, margin: [0, 0, 0, 6] as [number, number, number, number] });
  headerStack.push({ text: ctx.companyName, fontSize: 12, bold: true, color: '#ffffff' });
  if (ctx.companyTagline) headerStack.push({ text: ctx.companyTagline, fontSize: 8, color: '#d1fae5' });

  const content: Content[] = [
    {
      table: {
        widths: ['*', 'auto'],
        body: [[
          { stack: headerStack, fillColor: p.primary, margin: 14 },
          {
            stack: [
              { text: `Halo ${ctx.customerName}!`, fontSize: 12, bold: true, color: '#ffffff', alignment: 'right' },
              { text: 'Ini penawaran untuk proyekmu', fontSize: 9, color: '#ecfdf5', alignment: 'right', margin: [0, 4, 0, 0] as [number, number, number, number] },
            ],
            fillColor: p.secondary,
            margin: 14,
          },
        ]],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 14] as [number, number, number, number],
    },
    {
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            { text: 'PROYEK', fontSize: 8, bold: true, color: '#854d0e', fillColor: p.accent, margin: [6, 2, 6, 2] as [number, number, number, number] },
            { text: ctx.title, fontSize: 14, bold: true, color: p.primary, margin: [0, 6, 0, 2] as [number, number, number, number] },
            { text: `${ctx.customerAddress}  ·  ${ctx.validLabel}`, fontSize: 9, color: p.muted },
          ],
          fillColor: p.surface,
          margin: 12,
        }]],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 10] as [number, number, number, number],
    },
    { text: `Tanggal ${ctx.dateLabel}  ·  ${ctx.code}`, fontSize: 9, color: p.muted, margin: [0, 0, 0, 8] as [number, number, number, number] },
    ...(img ? [img] : []),
    { text: 'Rincian Pekerjaan', fontSize: 12, bold: true, color: p.primary, margin: [0, 4, 0, 4] as [number, number, number, number] },
    itemsTable(ctx, p.primary, '#ffffff', p.altRow),
    summaryBlock(ctx, p.primary, '#ffffff', 'TOTAL INVESTASI'),
    ...notesBlock(ctx),
    ...termsBlock(ctx, p.primary),
    ...bankBlock(ctx, p.primary),
    ...signatureStampBlock(ctx, p.muted),
    ...footerBlock(ctx),
  ];

  return baseDoc(p, content, [36, 36, 36, 36], ctx.watermarkText);
}
