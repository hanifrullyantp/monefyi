import { useMemo } from 'react';
import { Calendar, Download, Bell } from 'lucide-react';
import Card, { CardHeader } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { useFinanceStore } from '../../store/financeStore';
import { useAuthStore } from '../../store/authStore';
import { buildIncomeStatementFromJournals } from '../../services/finance/incomeStatementService';
import { getCurrentPeriod } from '../../lib/financeCalc';
import { formatCurrency } from '../../utils/format';

export default function TaxTab() {
  const accounts = useFinanceStore((s) => s.accounts);
  const journalEntries = useFinanceStore((s) => s.journalEntries);
  const journalLines = useFinanceStore((s) => s.journalLines);
  const { tenant } = useAuthStore();
  const { month, year } = getCurrentPeriod();

  const taxPercent = tenant?.taxPercent ?? 10;

  const stmt = useMemo(
    () => buildIncomeStatementFromJournals(accounts, journalEntries, journalLines, month, year),
    [accounts, journalEntries, journalLines, month, year]
  );

  const ppnCollected = Math.round(stmt.totalRevenue * (taxPercent / 100));
  const ppnPaid = accounts.find((a) => a.code === '5202')?.currentBalance ?? 0;
  const ppnRemaining = Math.max(0, ppnCollected - ppnPaid);

  const pph21Estimate = Math.round(stmt.totalOperatingExpenses * 0.05);
  const hutangPajak = accounts.find((a) => a.code === '2103')?.currentBalance ?? 0;

  const dueDate = new Date(year, month, 15).toISOString().split('T')[0];
  const daysUntilDue = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);

  return (
    <div className="space-y-6">
      {daysUntilDue <= 7 && daysUntilDue > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <Bell className="h-5 w-5 text-amber-600" />
          <div>
            <p className="font-bold text-amber-900">Reminder Setor Pajak</p>
            <p className="text-sm text-amber-700">Jatuh tempo setor PPN: {dueDate} ({daysUntilDue} hari lagi)</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="PPN / Pajak Penjualan" subtitle={`Tarif ${taxPercent}%`} />
          <div className="px-4 pb-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Pendapatan kena pajak</span>
              <span className="font-medium">{formatCurrency(stmt.totalRevenue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">PPN terkumpul dari tamu</span>
              <span className="font-medium">{formatCurrency(ppnCollected)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">PPN sudah dibayarkan</span>
              <span className="font-medium">{formatCurrency(ppnPaid)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm p-3 bg-rose-50 rounded-xl">
              <span>Sisa PPN harus disetor</span>
              <span className="text-rose-700">{formatCurrency(ppnRemaining)}</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="PPh / Pajak Penghasilan" />
          <div className="px-4 pb-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Estimasi PPh 21 karyawan</span>
              <span className="font-medium">{formatCurrency(pph21Estimate)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Hutang pajak tercatat</span>
              <span className="font-medium">{formatCurrency(hutangPajak)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">PPh Final UMKM (0.5%)</span>
              <span className="font-medium">{formatCurrency(Math.round(stmt.totalRevenue * 0.005))}</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Pajak Daerah" subtitle="Hotel & restoran (jika berlaku)" />
          <div className="px-4 pb-4 space-y-3 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Pajak hotel (estimasi 10%)</span>
              <span>{formatCurrency(Math.round(stmt.totalRevenue * 0.1))}</span>
            </div>
            <div className="flex justify-between">
              <span>Retribusi daerah</span>
              <span>{formatCurrency(0)}</span>
            </div>
            <p className="text-xs text-slate-400 pt-2">Konfigurasi tarif pajak daerah di Pengaturan properti</p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Estimasi Pajak Bulan Depan" />
          <div className="px-4 pb-4">
            <p className="text-2xl font-black text-slate-800">{formatCurrency(Math.round(stmt.totalRevenue * (taxPercent / 100)))}</p>
            <p className="text-sm text-slate-500 mt-1">Berdasarkan tren pendapatan bulan ini</p>
            <Button variant="outline" size="sm" className="mt-4">
              <Download className="h-3 w-3 mr-1" /> Export Data SPT
            </Button>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Riwayat Pembayaran Pajak" />
        <div className="px-4 pb-4">
          {ppnPaid > 0 ? (
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>Pembayaran PPN — {month}/{year}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{formatCurrency(ppnPaid)}</span>
                <Badge variant="success">Lunas</Badge>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">Belum ada pembayaran pajak tercatat</p>
          )}
        </div>
      </Card>
    </div>
  );
}
