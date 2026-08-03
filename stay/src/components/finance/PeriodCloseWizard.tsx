import { useState } from 'react';
import { Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useFinanceStore } from '../../store/financeStore';
import { useAuthStore } from '../../store/authStore';
import { getCurrentPeriod } from '../../lib/financeCalc';
import { buildIncomeStatementFromJournals } from '../../services/finance/incomeStatementService';
import { formatCurrency } from '../../utils/format';
import { findAccountByCode } from '../../data/defaultChartOfAccounts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function PeriodCloseWizard({ isOpen, onClose }: Props) {
  const accounts = useFinanceStore((s) => s.accounts);
  const journalEntries = useFinanceStore((s) => s.journalEntries);
  const journalLines = useFinanceStore((s) => s.journalLines);
  const createJournal = useFinanceStore((s) => s.createJournal);
  const financialPeriods = useFinanceStore((s) => s.financialPeriods);
  const closePeriod = useFinanceStore((s) => s.closePeriod);
  const { tenant, user } = useAuthStore();

  const { month, year } = getCurrentPeriod();
  const [step, setStep] = useState(1);
  const [confirmed, setConfirmed] = useState(false);

  const alreadyClosed = financialPeriods.some(
    (p) => p.periodMonth === month && p.periodYear === year && p.status === 'closed'
  );

  const stmt = buildIncomeStatementFromJournals(accounts, journalEntries, journalLines, month, year);
  const labaAccount = findAccountByCode(accounts, '3105');
  const labaDitahan = findAccountByCode(accounts, '3104');
  const labaAmount = labaAccount?.currentBalance ?? stmt.netProfit;

  const handleClose = () => {
    if (!tenant || !labaAccount || !labaDitahan || labaAmount === 0) {
      closePeriod(month, year, user?.id);
      onClose();
      return;
    }

    createJournal({
      tenantId: tenant.id,
      entryDate: new Date(year, month, 0).toISOString().split('T')[0],
      description: `Jurnal penutup ${month}/${year} — transfer laba ke laba ditahan`,
      source: 'closing',
      referenceType: 'period_close',
      lines: [
        { accountId: labaAccount.id, debit: labaAmount, credit: 0, notes: 'Tutup laba periode' },
        { accountId: labaDitahan.id, debit: 0, credit: labaAmount, notes: 'Laba ditahan' },
      ],
      createdBy: user?.id,
    });

    closePeriod(month, year, user?.id);
    setStep(3);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tutup Buku Bulanan" size="md">
      {alreadyClosed ? (
        <div className="text-center py-8 space-y-3">
          <Lock className="h-12 w-12 text-amber-500 mx-auto" />
          <p className="font-bold text-slate-800">Periode {month}/{year} sudah ditutup</p>
          <p className="text-sm text-slate-500">Hubungi owner untuk membuka kembali jika perlu koreksi.</p>
          <Button onClick={onClose}>Tutup</Button>
        </div>
      ) : step === 1 ? (
        <div className="space-y-4">
          <div className="p-4 bg-sky-50 rounded-xl">
            <p className="text-sm font-bold text-sky-800">Ringkasan Periode {month}/{year}</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span>Total Pendapatan</span><span className="font-bold">{formatCurrency(stmt.totalRevenue)}</span></div>
              <div className="flex justify-between"><span>Total Beban</span><span className="font-bold">{formatCurrency(stmt.totalOperatingExpenses + stmt.totalCogs)}</span></div>
              <div className="flex justify-between font-black text-emerald-700 border-t pt-2"><span>Laba Bersih</span><span>{formatCurrency(stmt.netProfit)}</span></div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>Setelah ditutup, jurnal periode ini tidak bisa diedit. Laba periode akan dipindah ke Laba Ditahan.</p>
          </div>

          <Button className="w-full" onClick={() => setStep(2)}>Lanjut</Button>
        </div>
      ) : step === 2 ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Konfirmasi penutupan buku:</p>
          <ul className="text-sm space-y-2 list-disc pl-5 text-slate-700">
            <li>Transfer laba {formatCurrency(labaAmount)} ke Laba Ditahan</li>
            <li>Kunci jurnal periode {month}/{year}</li>
            <li>Generate laporan penutup otomatis</li>
          </ul>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            Saya mengkonfirmasi data sudah benar dan siap ditutup
          </label>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Kembali</Button>
            <Button className="flex-1" onClick={handleClose} disabled={!confirmed}>Tutup Buku</Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 space-y-3">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
          <p className="font-bold text-slate-800">Buku {month}/{year} berhasil ditutup!</p>
          <p className="text-sm text-slate-500">Laba ditahan telah diperbarui.</p>
          <Button onClick={onClose}>Selesai</Button>
        </div>
      )}
    </Modal>
  );
}
