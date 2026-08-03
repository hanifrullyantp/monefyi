import { useState } from 'react';
import { usePosStore } from '../store/posStore';
import { useAppStore } from '../store/appStore';
import { formatCurrency } from '../utils/format';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Wallet, ArrowDownToLine, TrendingUp, RefreshCw } from 'lucide-react';
import { xenditService } from '../services/xenditService';

export default function XenditDashboardPage() {
  const { transactions, bankAccounts } = usePosStore();
  const { tenant } = useAppStore();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const xenditTx = transactions.filter((t) =>
    t.payments.some((p) => p.externalId || p.paymentMethod?.category?.startsWith('xendit'))
  );
  const today = new Date().toISOString().split('T')[0];
  const todayIn = xenditTx
    .filter((t) => t.createdAt.startsWith(today) && t.status === 'paid')
    .reduce((s, t) => s + t.grandTotal, 0);
  const todayFee = xenditTx
    .filter((t) => t.createdAt.startsWith(today))
    .reduce((s, t) => s + t.payments.reduce((fs, p) => fs + (p.xenditFee ?? 0), 0), 0);

  const fetchBalance = async () => {
    setLoading(true);
    try {
      const bal = await xenditService.getBalance();
      setBalance(bal);
    } catch {
      setBalance(0);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    const bank = bankAccounts.find((b) => b.isPrimary);
    if (!amount || !bank) return;
    await xenditService.createDisbursement(amount, bank.id);
    setWithdrawAmount('');
    void fetchBalance();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard Xendit</h1>
          <p className="text-sm text-slate-500">{tenant.name}</p>
        </div>
        <Button variant="outline" size="sm" loading={loading} icon={<RefreshCw className="h-4 w-4" />} onClick={fetchBalance}>
          Refresh Saldo
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-violet-600 text-white rounded-2xl p-5">
          <Wallet className="h-6 w-6 mb-2 opacity-80" />
          <p className="text-sm opacity-80">Saldo Tersedia</p>
          <p className="text-2xl font-black">{formatCurrency(balance ?? 0)}</p>
        </div>
        <div className="bg-white border rounded-2xl p-5">
          <TrendingUp className="h-6 w-6 mb-2 text-emerald-600" />
          <p className="text-sm text-slate-500">Masuk Hari Ini</p>
          <p className="text-2xl font-black text-slate-800">{formatCurrency(todayIn)}</p>
        </div>
        <div className="bg-white border rounded-2xl p-5">
          <p className="text-sm text-slate-500">Fee Hari Ini</p>
          <p className="text-2xl font-black text-red-600">{formatCurrency(todayFee)}</p>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-5 space-y-4">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <ArrowDownToLine className="h-5 w-5" /> Withdraw ke Bank
        </h2>
        {bankAccounts.find((b) => b.isPrimary) && (
          <p className="text-sm text-slate-500">
            Tujuan: {bankAccounts.find((b) => b.isPrimary)?.bankName} · {bankAccounts.find((b) => b.isPrimary)?.accountNumber}
          </p>
        )}
        <div className="flex gap-2">
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="Jumlah withdraw"
            className="flex-1 px-4 py-2.5 rounded-xl border"
          />
          <Button onClick={handleWithdraw} disabled={!withdrawAmount}>Withdraw</Button>
        </div>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-bold text-slate-800">Riwayat Transaksi Xendit</h2>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {xenditTx.length === 0 ? (
            <p className="p-8 text-center text-slate-400 text-sm">Belum ada transaksi Xendit</p>
          ) : (
            xenditTx.map((t) => (
              <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{t.transactionNumber}</p>
                  <p className="text-xs text-slate-500">{t.payments[0]?.paymentMethod?.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(t.grandTotal)}</p>
                  <Badge variant={t.status === 'paid' ? 'success' : 'warning'}>{t.status}</Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
