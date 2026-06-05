import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { formatDateId, formatRupiahFull } from '../estimatorFormat';
import { initPdfMake, pdfToBlob, downloadBlob } from '../pdf/pdfMakeSetup';
import type { BusinessFinanceReport } from '../../types/financeV1Report';

function money(n: number): string {
  return formatRupiahFull(n);
}

function row(label: string, value: string, bold = false): Content[] {
  return [{ text: label, bold }, { text: value, alignment: 'right', bold }];
}

function pctText(n: number): string {
  return `${n.toFixed(1)}%`;
}

function buildDoc(report: BusinessFinanceReport, orgName: string): TDocumentDefinitions {
  const { dateFrom, dateTo } = report.filters;
  const body: Content[][] = [];

  body.push(row('PENDAPATAN (OMZET)', money(report.revenue.total), true));
  report.revenue.byProject.forEach((p, i) => {
    body.push(row(`  ${i + 1}. ${p.projectName} (${pctText(p.pctOfTotal)})`, money(p.amount)));
  });
  if (report.revenue.byProject.length === 0) {
    body.push(row('  (belum ada pemasukan)', money(0)));
  }

  body.push([{ text: '', colSpan: 2 }, {}]);
  body.push(row('TOTAL HPP (Realisasi Belanja)', money(report.hpp.total), true));
  report.hpp.byType.forEach((h, i) => {
    body.push(row(`  ${i + 1}. ${h.label} (${pctText(h.pctOfTotal)})`, money(h.amount)));
  });
  if (report.hpp.byType.length === 0) {
    body.push(row('  (belum ada realisasi biaya)', money(0)));
  }

  body.push([{ text: '', colSpan: 2 }, {}]);
  body.push(row(`LABA KOTOR (${pctText(report.grossMarginPct)})`, money(report.grossProfit), true));

  body.push([{ text: '', colSpan: 2 }, {}]);
  body.push(row('BIAYA OPERASIONAL BISNIS', money(report.opex.total), true));
  report.opex.byCategory.forEach((o, i) => {
    body.push(row(`  ${i + 1}. ${o.categoryName} (${pctText(o.pctOfTotal)})`, money(o.amount)));
  });
  if (report.opex.byCategory.length === 0) {
    body.push(row('  (belum ada biaya operasional)', money(0)));
  }

  body.push([{ text: '', colSpan: 2 }, {}]);
  body.push(row(`LABA BERSIH (${pctText(report.netMarginPct)})`, money(report.netProfit), true));

  if (report.byProjectProfit.length > 0) {
    body.push([{ text: '', colSpan: 2, margin: [0, 8, 0, 0] }, {}]);
    body.push([{ text: 'RINGKASAN PER PROYEK', bold: true, colSpan: 2 }, {}]);
    for (const p of report.byProjectProfit) {
      body.push(row(
        `  ${p.projectName}`,
        `${money(p.grossProfit)} (omzet ${money(p.revenue)}, HPP ${money(p.hpp)})`,
      ));
    }
  }

  return {
    content: [
      { text: 'Laporan Keuangan Bisnis', style: 'title' },
      { text: orgName, style: 'subtitle' },
      {
        text: `Periode: ${formatDateId(dateFrom)} – ${formatDateId(dateTo)}`,
        style: 'muted',
        margin: [0, 0, 0, 4],
      },
      {
        text: `Dibuat: ${formatDateId(report.generatedAt)}`,
        style: 'muted',
        margin: [0, 0, 0, 12],
      },
      { text: 'Laba Rugi Real-time', style: 'sectionHeader', margin: [0, 0, 0, 6] },
      { table: { widths: ['*', 'auto'], body }, layout: 'lightHorizontalLines' },
      {
        text: 'Catatan: Omzet = pemasukan proyek diterima. HPP = realisasi belanja proyek. Opex = biaya operasional bisnis non-proyek.',
        style: 'muted',
        margin: [0, 16, 0, 0],
        fontSize: 8,
      },
    ],
    styles: {
      title: { fontSize: 16, bold: true },
      subtitle: { fontSize: 11, color: '#475569' },
      muted: { fontSize: 9, color: '#64748b' },
      sectionHeader: { fontSize: 12, bold: true },
    },
    defaultStyle: { fontSize: 10 },
    pageMargins: [40, 48, 40, 48],
  };
}

export async function downloadBusinessReportPdf(
  report: BusinessFinanceReport,
  orgName: string,
): Promise<void> {
  const pdfMake = initPdfMake();
  const doc = buildDoc(report, orgName);
  const blob = await pdfToBlob(pdfMake.createPdf(doc));
  const { dateFrom, dateTo } = report.filters;
  downloadBlob(blob, `Laporan-Keuangan-Bisnis-${dateFrom}_${dateTo}.pdf`);
}
