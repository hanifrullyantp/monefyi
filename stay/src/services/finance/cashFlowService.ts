import type { CashFlowData, ChartAccount, JournalEntry, JournalLine } from '../../types/finance';
import { getTotalCash } from './balanceSheetService';

const CASH_SUB_TYPES = ['kas', 'bank', 'xendit'];

export function buildCashFlowStatement(
  accounts: ChartAccount[],
  journals: JournalEntry[],
  lines: JournalLine[],
  periodMonth: number,
  periodYear: number,
  openingBalances?: Map<string, number>
): CashFlowData {
  const periodJournals = journals.filter((j) => {
    if (j.status !== 'posted') return false;
    const d = new Date(j.entryDate);
    return d.getMonth() + 1 === periodMonth && d.getFullYear() === periodYear;
  });

  const periodJournalIds = new Set(periodJournals.map((j) => j.id));
  const periodLines = lines.filter((l) => periodJournalIds.has(l.journalId));

  const cashAccountIds = new Set(
    accounts.filter((a) => CASH_SUB_TYPES.includes(a.subType)).map((a) => a.id)
  );

  let guestPayments = 0;
  let payrollOut = 0;
  let operationalOut = 0;
  let supplierOut = 0;
  let assetPurchase = 0;
  let assetSale = 0;
  let capitalIn = 0;
  let capitalOut = 0;
  let loanPayment = 0;

  for (const line of periodLines) {
    if (!cashAccountIds.has(line.accountId)) continue;
    const journal = periodJournals.find((j) => j.id === line.journalId);
    if (!journal) continue;

    const netCash = line.debit - line.credit;
    switch (journal.source) {
      case 'payment':
      case 'pos':
      case 'xendit':
        if (netCash > 0) guestPayments += netCash;
        break;
      case 'payroll':
        if (netCash < 0) payrollOut += Math.abs(netCash);
        break;
      case 'expense':
        if (netCash < 0) operationalOut += Math.abs(netCash);
        break;
      case 'inventory':
        if (netCash < 0) supplierOut += Math.abs(netCash);
        break;
      case 'manual':
        if (netCash < 0) operationalOut += Math.abs(netCash);
        else guestPayments += netCash;
        break;
      default:
        if (netCash < 0) operationalOut += Math.abs(netCash);
        else if (netCash > 0) guestPayments += netCash;
    }
  }

  for (const journal of periodJournals) {
    if (journal.source === 'inventory') {
      const jLines = periodLines.filter((l) => l.journalId === journal.id);
      const assetDebit = jLines.filter((l) => !cashAccountIds.has(l.accountId)).reduce((s, l) => s + l.debit, 0);
      if (assetDebit > 0) assetPurchase += assetDebit;
    }
  }

  const operating = [
    { label: 'Kas masuk dari tamu', amount: guestPayments },
    { label: 'Kas keluar untuk gaji', amount: -payrollOut },
    { label: 'Kas keluar operasional', amount: -operationalOut },
    { label: 'Kas keluar ke supplier', amount: -supplierOut },
  ];
  const netOperating = operating.reduce((s, o) => s + o.amount, 0);

  const investing = [
    { label: 'Pembelian aset', amount: -assetPurchase },
    { label: 'Penjualan aset', amount: assetSale },
  ];
  const netInvesting = investing.reduce((s, i) => s + i.amount, 0);

  const financing = [
    { label: 'Setoran modal pemilik', amount: capitalIn },
    { label: 'Penarikan modal pemilik', amount: -capitalOut },
    { label: 'Pembayaran pinjaman', amount: -loanPayment },
  ];
  const netFinancing = financing.reduce((s, f) => s + f.amount, 0);

  const netChange = netOperating + netInvesting + netFinancing;
  const closingCash = getTotalCash(accounts);
  const openingCash = openingBalances
    ? [...openingBalances.values()].reduce((s, v) => s + v, 0)
    : closingCash - netChange;

  const cashByAccount = accounts
    .filter((a) => CASH_SUB_TYPES.includes(a.subType))
    .map((a) => ({ name: a.name, balance: a.currentBalance }));

  return {
    operating,
    netOperating,
    investing,
    netInvesting,
    financing,
    netFinancing,
    netChange,
    openingCash,
    closingCash,
    cashByAccount,
  };
}

/** Simple 30-day cash flow forecast based on bookings and fixed costs */
export function forecastCashFlow(
  currentCash: number,
  expectedInflows: number[],
  expectedOutflows: number[],
  days = 30
): { day: number; balance: number; inflow: number; outflow: number }[] {
  const forecast: { day: number; balance: number; inflow: number; outflow: number }[] = [];
  let balance = currentCash;

  for (let d = 0; d < days; d++) {
    const inflow = expectedInflows[d] ?? expectedInflows[expectedInflows.length - 1] ?? 0;
    const outflow = expectedOutflows[d] ?? expectedOutflows[expectedOutflows.length - 1] ?? 0;
    balance += inflow - outflow;
    forecast.push({ day: d + 1, balance, inflow, outflow });
  }

  return forecast;
}

export function buildDailyCashFlow(
  journals: JournalEntry[],
  lines: JournalLine[],
  accounts: ChartAccount[],
  days = 30
): { date: string; inflow: number; outflow: number }[] {
  const cashIds = new Set(accounts.filter((a) => CASH_SUB_TYPES.includes(a.subType)).map((a) => a.id));
  const result: Record<string, { inflow: number; outflow: number }> = {};

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  for (const journal of journals) {
    if (journal.status !== 'posted') continue;
    const d = new Date(journal.entryDate);
    if (d < cutoff) continue;

    const dateKey = journal.entryDate;
    if (!result[dateKey]) result[dateKey] = { inflow: 0, outflow: 0 };

    const jLines = lines.filter((l) => l.journalId === journal.id && cashIds.has(l.accountId));
    for (const line of jLines) {
      if (line.debit > 0) result[dateKey].inflow += line.debit;
      if (line.credit > 0) result[dateKey].outflow += line.credit;
    }
  }

  return Object.entries(result)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { inflow, outflow }]) => ({ date, inflow, outflow }));
}
