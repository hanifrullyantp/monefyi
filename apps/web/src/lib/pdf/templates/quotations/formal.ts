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

/** Formal — korporat, garis ganda, navy/gold. */
export function buildQuotationFormal(ctx: QuotationPdfContext): TDocumentDefinitions {
  const p = paletteFor('formal', ctx.colors);
  const img = buildImageSection(ctx, 'formal');
  const headerLeft: Content[] = [];
  if (ctx.logoDataUri) headerLeft.push({ image: ctx.logoDataUri, width: 52, margin: [0, 0, 0, 4] as [number, number, number, number] });
  headerLeft.push({ text: ctx.companyName, fontSize: 13, bold: true, color: p.primary });
  if (ctx.companyTagline) headerLeft.push({ text: ctx.companyTagline, fontSize: 8, italics: true, color: p.accent });

  const content: Content[] = [
    {
      columns: [
        { width: '*', stack: headerLeft },
        {
          width: 200,
          stack: [
            { text: 'QUOTATION', fontSize: 16, bold: true, alignment: 'right', color: p.primary, characterSpacing: 2 },
            { text: ctx.code, fontSize: 11, alignment: 'right', color: p.text },
            { text: ctx.dateLabel, fontSize: 9, alignment: 'right', color: p.muted },
          ],
        },
      ],
      margin: [0, 0, 0, 8] as [number, number, number, number],
    },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: p.primary }] },
    { canvas: [{ type: 'line', x1: 0, y1: 3, x2: 515, y2: 3, lineWidth: 0.6, lineColor: p.accent }], margin: [0, 2, 0, 12] as [number, number, number, number] },
    partyColumns(ctx, 'COMPANY INFO', 'CLIENT INFO', p.surface, p.text),
    { text: ctx.title, fontSize: 14, bold: true, alignment: 'center', color: p.primary, margin: [0, 4, 0, 4] as [number, number, number, number] },
    { text: `Berlaku ${ctx.validLabel}`, fontSize: 9, alignment: 'center', color: p.muted, margin: [0, 0, 0, 10] as [number, number, number, number] },
    ...(img ? [img] : []),
    itemsTable(ctx, p.primary, '#ffffff', p.altRow, true),
    summaryBlock(ctx, p.primary),
    ...notesBlock(ctx),
    ...termsBlock(ctx, p.primary),
    ...bankBlock(ctx, p.primary),
    ...signatureStampBlock(ctx, p.muted),
    ...footerBlock(ctx, p.accent),
  ];

  return baseDoc(p, content, [40, 42, 40, 42], ctx.watermarkText);
}
