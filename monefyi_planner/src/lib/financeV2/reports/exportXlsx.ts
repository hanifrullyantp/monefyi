import * as XLSX from 'xlsx';
import type { FinanceReportBundle, ReportKind } from './types';

export function downloadFinanceReportXlsx(bundle: FinanceReportBundle, kind: ReportKind): void {
  const wb = XLSX.utils.book_new();
  const pl = bundle.profitLoss;

  if (kind === 'pl' || kind === 'project') {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Item', 'Nominal'],
      ['Pendapatan', pl.revenue],
      ...pl.revenueByProject.map(r => [`Omzet: ${r.projectName}`, r.amount]),
      ['HPP', pl.hpp],
      ...pl.hppBreakdown.map(r => [r.label, r.amount]),
      ['Laba Kotor', pl.grossProfit],
      ['Opex', pl.opex],
      ...pl.opexBreakdown.map(r => [r.categoryName, r.amount]),
      ['Beban Lainnya', pl.otherExpense],
      ['Laba Bersih', pl.netProfit],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'P&L');
  }

  if (kind === 'neraca') {
    const bs = bundle.balanceSheet;
    const ws = XLSX.utils.aoa_to_sheet([
      ['Sisi', 'Akun', 'Saldo'],
      ...bs.aktiva.map(r => ['Aktiva', r.name, r.balance]),
      ['', 'Total Aktiva', bs.totalAktiva],
      ...bs.pasiva.map(r => ['Pasiva', r.name, r.balance]),
      ['', 'Total Pasiva', bs.totalPasiva],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Neraca');
  }

  if (kind === 'cashflow') {
    const cf = bundle.cashFlow;
    const ws = XLSX.utils.aoa_to_sheet([
      ['Item', 'Nominal'],
      ['Saldo Awal', cf.openingBalance],
      ['Penerimaan', cf.inflows],
      ['Pengeluaran', cf.outflows],
      ['Perubahan Bersih', cf.netChange],
      ['Saldo Akhir', cf.closingBalance],
      [],
      ...cf.byAccount.map(a => [`Kas: ${a.name}`, a.net]),
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Arus Kas');
  }

  if (kind === 'project') {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Proyek', 'Pendapatan', 'Biaya', 'Net'],
      ...bundle.projects.map(r => [r.projectName, r.revenue, r.expense, r.net]),
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Proyek');
  }

  if (kind === 'investor') {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Nama', 'Investasi', 'Tarik', 'Dividen', 'Share%', 'Saran Dividen'],
      ...bundle.investors.map(r => [
        r.investorName, r.invested, r.withdrawn, r.dividends, r.sharePct ?? '', r.suggestedDividend,
      ]),
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Investor');
  }

  const label = { pl: 'Laba-Rugi', neraca: 'Neraca', cashflow: 'Arus-Kas', project: 'Proyek', investor: 'Investor' }[kind];
  XLSX.writeFile(wb, `Laporan-${label}-${bundle.filters.dateFrom}_${bundle.filters.dateTo}.xlsx`);
}
