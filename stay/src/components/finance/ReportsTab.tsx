import { Download, FileText, BarChart3 } from 'lucide-react';
import Card, { CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import { useFinanceStore } from '../../store/financeStore';
import { useAppStore } from '../../store/appStore';
import { buildBalanceSheet } from '../../services/finance/balanceSheetService';
import { buildIncomeStatementFromJournals } from '../../services/finance/incomeStatementService';
import { buildCashFlowStatement } from '../../services/finance/cashFlowService';
import { getCurrentPeriod } from '../../lib/financeCalc';
import { formatCurrency } from '../../utils/format';
import { exportToCsv } from '../../utils/analytics';

const STANDARD_REPORTS = [
  { id: 'neraca', label: 'Neraca per Tanggal', desc: 'Posisi keuangan saat ini' },
  { id: 'laba-rugi', label: 'Laba Rugi per Periode', desc: 'Pendapatan & beban bulan ini' },
  { id: 'arus-kas', label: 'Arus Kas per Periode', desc: 'Aliran kas operasi, investasi, pendanaan' },
  { id: 'buku-besar', label: 'Buku Besar per Akun', desc: 'Detail transaksi per akun' },
  { id: 'jurnal', label: 'Jurnal Umum per Periode', desc: 'Semua entri jurnal' },
  { id: 'trial-balance', label: 'Trial Balance', desc: 'Saldo debit/kredit semua akun' },
  { id: 'aging-piutang', label: 'Aging Piutang', desc: 'Piutang berdasarkan umur' },
  { id: 'aging-hutang', label: 'Aging Hutang', desc: 'Hutang berdasarkan jatuh tempo' },
];

const OPERATIONAL_REPORTS = [
  { id: 'rev-room', label: 'Revenue per Kamar', desc: 'Pendapatan per nomor kamar' },
  { id: 'rev-type', label: 'Revenue per Tipe Kamar', desc: 'Breakdown tipe kamar' },
  { id: 'rev-source', label: 'Revenue per Sumber Booking', desc: 'Direct, OTA, walk-in' },
  { id: 'rev-payment', label: 'Revenue per Metode Pembayaran', desc: 'Cash, transfer, Xendit' },
  { id: 'revpar', label: 'RevPAR', desc: 'Revenue per Available Room' },
  { id: 'adr', label: 'ADR', desc: 'Average Daily Rate' },
  { id: 'gop', label: 'GOP', desc: 'Gross Operating Profit' },
  { id: 'cpOR', label: 'Cost per Occupied Room', desc: 'Biaya per kamar terisi' },
];

export default function ReportsTab() {
  const accounts = useFinanceStore((s) => s.accounts);
  const journalEntries = useFinanceStore((s) => s.journalEntries);
  const journalLines = useFinanceStore((s) => s.journalLines);
  const { bookings, payments, rooms } = useAppStore();
  const { month, year } = getCurrentPeriod();

  const generateReport = (reportId: string) => {
    const date = new Date().toISOString().split('T')[0];

    switch (reportId) {
      case 'neraca': {
        const bs = buildBalanceSheet(accounts);
        exportToCsv(`neraca-${date}.csv`, ['Akun', 'Saldo'], [
          ...bs.aktiva.flatMap((g) => g.children?.map((c) => [c.name, String(c.balance)]) ?? [[g.name, String(g.balance)]]),
          ...bs.pasiva.flatMap((g) => g.children?.map((c) => [c.name, String(c.balance)]) ?? [[g.name, String(g.balance)]]),
        ]);
        break;
      }
      case 'laba-rugi': {
        const stmt = buildIncomeStatementFromJournals(accounts, journalEntries, journalLines, month, year);
        exportToCsv(`laba-rugi-${year}-${month}.csv`, ['Item', 'Jumlah'], [
          ...stmt.revenue.map((r) => [r.label, String(r.amount)]),
          ['Laba Bersih', String(stmt.netProfit)],
        ]);
        break;
      }
      case 'arus-kas': {
        const cf = buildCashFlowStatement(accounts, journalEntries, journalLines, month, year);
        exportToCsv(`arus-kas-${year}-${month}.csv`, ['Kategori', 'Jumlah'], [
          ...cf.operating.map((o) => [o.label, String(o.amount)]),
          ['Saldo Akhir', String(cf.closingCash)],
        ]);
        break;
      }
      case 'trial-balance': {
        exportToCsv(`trial-balance-${date}.csv`, ['Kode', 'Akun', 'Saldo'], 
          accounts.map((a) => [a.code, a.name, String(a.currentBalance)])
        );
        break;
      }
      case 'rev-source': {
        const sources: Record<string, number> = {};
        for (const p of payments.filter((pay) => pay.status === 'paid')) {
          const b = bookings.find((bk) => bk.id === p.bookingId);
          const src = b?.source ?? 'unknown';
          sources[src] = (sources[src] ?? 0) + p.amount;
        }
        exportToCsv(`revenue-source-${date}.csv`, ['Sumber', 'Revenue'], 
          Object.entries(sources).map(([k, v]) => [k, String(v)])
        );
        break;
      }
      case 'revpar': {
        const totalRev = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
        const availableRooms = rooms.filter((r) => r.isActive).length * 30;
        const revpar = availableRooms > 0 ? totalRev / availableRooms : 0;
        exportToCsv(`revpar-${date}.csv`, ['Metrik', 'Nilai'], [
          ['Total Revenue', String(totalRev)],
          ['Available Room Nights', String(availableRooms)],
          ['RevPAR', String(Math.round(revpar))],
        ]);
        break;
      }
      default:
        exportToCsv(`report-${reportId}-${date}.csv`, ['Info'], [['Report generated — detail view coming soon']]);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Laporan Standar Akuntansi" subtitle="Export PDF / Excel / CSV" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4 pb-4">
          {STANDARD_REPORTS.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50">
              <div>
                <p className="font-medium text-sm text-slate-800">{r.label}</p>
                <p className="text-xs text-slate-400">{r.desc}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => generateReport(r.id)}>
                <Download className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Laporan Operasional Penginapan" subtitle="Metrik hospitality" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4 pb-4">
          {OPERATIONAL_REPORTS.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50">
              <div>
                <p className="font-medium text-sm text-slate-800">{r.label}</p>
                <p className="text-xs text-slate-400">{r.desc}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => generateReport(r.id)}>
                <Download className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Quick Stats" subtitle="Metrik operasional realtime" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 pb-4">
          {[
            { label: 'Total Revenue', value: formatCurrency(payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0)), icon: BarChart3 },
            { label: 'Occupancy', value: `${Math.round((bookings.filter((b) => b.status === 'checked_in').length / Math.max(rooms.length, 1)) * 100)}%`, icon: FileText },
            { label: 'Piutang Tamu', value: formatCurrency(accounts.find((a) => a.code === '1201')?.currentBalance ?? 0), icon: FileText },
            { label: 'Kas Total', value: formatCurrency(accounts.filter((a) => ['kas', 'bank', 'xendit'].includes(a.subType)).reduce((s, a) => s + a.currentBalance, 0)), icon: BarChart3 },
          ].map((stat) => (
            <div key={stat.label} className="p-4 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500">{stat.label}</p>
              <p className="text-lg font-black text-slate-800 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
