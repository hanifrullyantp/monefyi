import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { buildImageSection, type QuotationPdfContext } from '../../quotationPdfContext';
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
  termsBlock,
} from '../shared';

/** Modern — kartu rounded, total besar, gaya startup. */
export function buildQuotationModern(ctx: QuotationPdfContext): TDocumentDefinitions {
  const p = paletteFor('modern', ctx.colors);
  const img = buildImageSection(ctx, 'modern');
  const headerLeft: Content[] = [];
  if (ctx.logoDataUri) headerLeft.push({ image: ctx.logoDataUri, width: 56, margin: [0, 0, 0, 6] as [number, number, number, number] });
  headerLeft.push({ text: 'Penawaran Proyek', fontSize: 20, bold: true, color: p.primary });
  headerLeft.push({ text: `#${ctx.code}`, fontSize: 11, color: p.accent, margin: [0, 2, 0, 0] as [number, number, number, number] });

  const content: Content[] = [
    { stack: headerLeft, margin: [0, 0, 0, 8] as [number, number, number, number] },
    { text: `Untuk: ${ctx.customerName}`, fontSize: 11, color: p.text },
    { text: ctx.dateLabel, fontSize: 9, color: p.muted, margin: [0, 2, 0, 12] as [number, number, number, number] },
    partyColumns(ctx, 'FROM', 'TO', p.surface, p.text),
    {
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            { text: ctx.title, fontSize: 13, bold: true, color: p.primary },
            { text: `Durasi berlaku: ${ctx.validLabel}`, fontSize: 9, color: p.muted, margin: [0, 4, 0, 0] as [number, number, number, number] },
          ],
          fillColor: '#f5f3ff',
          margin: 12,
        }]],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 10] as [number, number, number, number],
    },
    ...(img ? [img] : []),
    { text: 'Rincian Pekerjaan', fontSize: 12, bold: true, color: p.secondary, margin: [0, 4, 0, 4] as [number, number, number, number] },
    itemsTable(ctx, p.primary, '#ffffff', p.altRow),
    summaryBlock(ctx, p.primary, '#ffffff', 'TOTAL INVESTASI'),
    ...notesBlock(ctx),
    ...termsBlock(ctx, p.primary),
    ...bankBlock(ctx, p.primary),
    ...signatureStampBlock(ctx, p.muted),
    ...footerBlock(ctx),
  ];

  return baseDoc(p, content, [40, 40, 40, 40], ctx.watermarkText);
}
