import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { formatDateId, formatRupiahFull } from '../../estimatorFormat';
import { initPdfMake, pdfToBlob, downloadBlob } from '../../pdf/pdfMakeSetup';
import type { FinanceReportBundle, ReportKind } from './types';

function money(n: number): string {
  return formatRupiahFull(n);
}

function sectionTitle(text: string): Content {
  return { text, style: 'sectionHeader', margin: [0, 12, 0, 6] };
}

function tableRow(label: string, value: string, bold = false): Content[] {
  return [
    { text: label, bold },
    { text: value, alignment: 'right', bold },
  ];
}

function buildPlSection(bundle: FinanceReportBundle): Content[] {
  const pl = bundle.profitLoss;
  const body: Content[][] = [
    tableRow('Pendapatan', money(pl.revenue), true),
    ...pl.revenueByProject.map(r => tableRow(`  ${r.projectName}`, money(r.amount))),
    tableRow('HPP', money(pl.hpp)),
    ...pl.hppBreakdown.map(r => tableRow(`  ${r.label}`, money(r.amount))),
    tableRow('Laba Kotor', money(pl.grossProfit), true),
    tableRow('Beban Operasional', money(pl.opex)),
    ...pl.opexBreakdown.map(r => tableRow(`  ${r.categoryName}`, money(r.amount))),
    tableRow('Beban Lainnya', money(pl.otherExpense)),
    tableRow('Laba Bersih', money(pl.netProfit), true),
  ];
  return [
    sectionTitle('Laporan Laba Rugi'),
    { table: { widths: ['*', 'auto'], body }, layout: 'lightHorizontalLines' },
  ];
}

function buildNeracaSection(bundle: FinanceReportBundle): Content[] {
  const bs = bundle.balanceSheet;
  const body: Content[][] = [
    [{ text: 'AKTIVA', bold: true }, { text: '' }],
    ...bs.aktiva.map(r => tableRow(r.name, money(r.balance))),
    tableRow('Total Aktiva', money(bs.totalAktiva), true),
    [{ text: 'PASIVA & EKUITAS', bold: true, margin: [0, 8, 0, 0] }, { text: '' }],
    ...bs.pasiva.map(r => tableRow(r.name, money(r.balance))),
    tableRow('Total Pasiva', money(bs.totalPasiva), true),
  ];
  return [
    sectionTitle(`Neraca per ${formatDateId(bs.asOfDate)}`),
    { table: { widths: ['*', 'auto'], body }, layout: 'lightHorizontalLines' },
  ];
}

function buildCashFlowSection(bundle: FinanceReportBundle): Content[] {
  const cf = bundle.cashFlow;
  const body: Content[][] = [
    tableRow('Saldo Awal Kas', money(cf.openingBalance)),
    tableRow('Penerimaan', money(cf.inflows)),
    tableRow('Pengeluaran', money(cf.outflows)),
    tableRow('Perubahan Bersih', money(cf.netChange), true),
    tableRow('Saldo Akhir Kas', money(cf.closingBalance), true),
  ];
  return [
    sectionTitle('Arus Kas'),
    { table: { widths: ['*', 'auto'], body }, layout: 'lightHorizontalLines' },
  ];
}

function buildDocDef(bundle: FinanceReportBundle, kind: ReportKind, orgName: string): TDocumentDefinitions {
  const { dateFrom, dateTo } = bundle.filters;
  const sections: Content[] = [
    { text: 'Laporan Keuangan V2', style: 'title' },
    { text: orgName, style: 'subtitle' },
    { text: `Periode: ${formatDateId(dateFrom)} – ${formatDateId(dateTo)}`, style: 'muted', margin: [0, 0, 0, 8] },
  ];

  if (kind === 'pl' || kind === 'project') sections.push(...buildPlSection(bundle));
  if (kind === 'neraca') sections.push(...buildNeracaSection(bundle));
  if (kind === 'cashflow') sections.push(...buildCashFlowSection(bundle));
  if (kind === 'investor') {
    sections.push(sectionTitle('Laporan Investor'));
    sections.push({
      table: {
        widths: ['*', 'auto', 'auto', 'auto', 'auto'],
        body: [
          ['Investor', 'Investasi', 'Tarik', 'Dividen', 'Saran Dividen'],
          ...bundle.investors.map(r => [
            r.investorName,
            money(r.invested),
            money(r.withdrawn),
            money(r.dividends),
            money(r.suggestedDividend),
          ]),
        ],
      },
      layout: 'lightHorizontalLines',
    });
  }
  if (kind === 'project') {
    sections.push(sectionTitle('Per Proyek'));
    sections.push({
      table: {
        widths: ['*', 'auto', 'auto', 'auto'],
        body: [
          ['Proyek', 'Pendapatan', 'Biaya', 'Net'],
          ...bundle.projects.map(r => [r.projectName, money(r.revenue), money(r.expense), money(r.net)]),
        ],
      },
      layout: 'lightHorizontalLines',
    });
  }

  return {
    content: sections,
    styles: {
      title: { fontSize: 16, bold: true },
      subtitle: { fontSize: 11, color: '#475569' },
      muted: { fontSize: 9, color: '#94a3b8' },
      sectionHeader: { fontSize: 12, bold: true, color: '#059669' },
    },
    defaultStyle: { fontSize: 9 },
    pageMargins: [40, 40, 40, 40],
  };
}

export async function downloadFinanceReportPdf(
  bundle: FinanceReportBundle,
  kind: ReportKind,
  orgName: string,
): Promise<void> {
  const pdfMake = initPdfMake();
  const doc = buildDocDef(bundle, kind, orgName);
  const blob = await pdfToBlob(pdfMake.createPdf(doc));
  const label = { pl: 'Laba-Rugi', neraca: 'Neraca', cashflow: 'Arus-Kas', project: 'Proyek', investor: 'Investor' }[kind];
  downloadBlob(blob, `Laporan-${label}-${bundle.filters.dateFrom}_${bundle.filters.dateTo}.pdf`);
}
