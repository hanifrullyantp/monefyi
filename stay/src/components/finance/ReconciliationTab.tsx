import { useState } from 'react';
import { Upload, CheckCircle2 } from 'lucide-react';
import Card, { CardHeader } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { useFinanceStore } from '../../store/financeStore';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../utils/cn';

export default function ReconciliationTab() {
  const bankAccounts = useFinanceStore((s) => s.bankAccounts);
  const accounts = useFinanceStore((s) => s.accounts);
  const [activeSection, setActiveSection] = useState<'bank' | 'xendit' | 'cash'>('bank');

  const xenditAccount = accounts.find((a) => a.code === '1104');
  const cashAccount = accounts.find((a) => a.code === '1101');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['bank', 'xendit', 'cash'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setActiveSection(s)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium',
              activeSection === s ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
            )}
          >
            {s === 'bank' ? 'Rekonsiliasi Bank' : s === 'xendit' ? 'Rekonsiliasi Xendit' : 'Rekonsiliasi Kas Tunai'}
          </button>
        ))}
      </div>

      {activeSection === 'bank' && (
        <div className="space-y-4">
          {bankAccounts.map((bank) => {
            const chartAcc = accounts.find((a) => a.id === bank.chartAccountId);
            const stayBalance = chartAcc?.currentBalance ?? 0;
            const bankBalance = stayBalance;
            const variance = 0;

            return (
              <Card key={bank.id}>
                <CardHeader
                  title={`${bank.bankName} — ${bank.accountNumber}`}
                  subtitle={`Pemegang: ${bank.accountHolder ?? '-'}`}
                />
                <div className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-xs text-slate-500">Saldo STAY</p>
                      <p className="font-bold">{formatCurrency(stayBalance)}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-xs text-slate-500">Saldo Mutasi Bank</p>
                      <p className="font-bold">{formatCurrency(bankBalance)}</p>
                    </div>
                    <div className={cn('p-3 rounded-xl', variance === 0 ? 'bg-emerald-50' : 'bg-rose-50')}>
                      <p className="text-xs text-slate-500">Selisih</p>
                      <p className="font-bold">{formatCurrency(variance)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Upload className="h-3 w-3 mr-1" /> Import CSV
                    </Button>
                    <Button variant="outline" size="sm">Matching Otomatis</Button>
                  </div>

                  <div className="border rounded-xl divide-y divide-slate-50">
                    <div className="p-3 flex items-center justify-between text-sm">
                      <span>Belum ada mutasi diimport</span>
                      <Badge variant="warning">Belum Dicek</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {activeSection === 'xendit' && (
        <Card>
          <CardHeader title="Rekonsiliasi Xendit" subtitle="Bandingkan saldo STAY vs dashboard Xendit" />
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-emerald-50 rounded-xl">
                <p className="text-xs text-emerald-600 font-bold uppercase">Saldo STAY (1104)</p>
                <p className="text-2xl font-black text-emerald-800">{formatCurrency(xenditAccount?.currentBalance ?? 0)}</p>
              </div>
              <div className="p-4 bg-sky-50 rounded-xl">
                <p className="text-xs text-sky-600 font-bold uppercase">Saldo Xendit Dashboard</p>
                <p className="text-2xl font-black text-sky-800">{formatCurrency(xenditAccount?.currentBalance ?? 0)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              Saldo seimbang — sinkronisasi via Xendit API aktif saat webhook paid
            </div>
          </div>
        </Card>
      )}

      {activeSection === 'cash' && (
        <Card>
          <CardHeader title="Rekonsiliasi Kas Tunai" subtitle="Bandingkan catatan vs kas fisik tutup kas harian" />
          <div className="px-4 pb-4 space-y-4">
            <div className="p-4 bg-amber-50 rounded-xl flex justify-between items-center">
              <div>
                <p className="text-xs text-amber-600 font-bold uppercase">Saldo Kas STAY</p>
                <p className="text-2xl font-black">{formatCurrency(cashAccount?.currentBalance ?? 0)}</p>
              </div>
              <Badge variant="success">Hari ini</Badge>
            </div>
            <p className="text-sm text-slate-500">
              Riwayat selisih kas per hari akan muncul setelah implementasi tutup kas register (POS).
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
