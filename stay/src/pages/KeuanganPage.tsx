import { useEffect, useState } from 'react';
import { Scale } from 'lucide-react';
import { cn } from '../utils/cn';
import FinanceDashboard from '../components/finance/FinanceDashboard';
import BalanceSheetTab from '../components/finance/BalanceSheetTab';
import IncomeStatementTab from '../components/finance/IncomeStatementTab';
import CashFlowTab from '../components/finance/CashFlowTab';
import JournalTab from '../components/finance/JournalTab';
import ChartOfAccountsTab from '../components/finance/ChartOfAccountsTab';
import ReconciliationTab from '../components/finance/ReconciliationTab';
import TaxTab from '../components/finance/TaxTab';
import ReportsTab from '../components/finance/ReportsTab';
import { useFinanceStore, runBalanceCheck } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { seedFinanceFromExistingData } from '../services/finance/financeIntegration';
import type { FinanceTab } from '../types/finance';

const TABS: { id: FinanceTab; label: string }[] = [
  { id: 'neraca', label: 'Neraca' },
  { id: 'laba-rugi', label: 'Laba Rugi' },
  { id: 'arus-kas', label: 'Arus Kas' },
  { id: 'jurnal', label: 'Jurnal' },
  { id: 'akun', label: 'Akun' },
  { id: 'rekonsiliasi', label: 'Rekonsiliasi' },
  { id: 'pajak', label: 'Pajak' },
  { id: 'laporan', label: 'Laporan' },
];

export default function KeuanganPage() {
  const { tenant, user } = useAuthStore();
  const initializeFinance = useFinanceStore((s) => s.initializeFinance);
  const { bookings, payments, accountingEntries } = useAppStore();
  const [activeTab, setActiveTab] = useState<FinanceTab>('neraca');
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (tenant?.id) {
      initializeFinance(tenant.id);
    }
  }, [tenant?.id, initializeFinance]);

  useEffect(() => {
    if (!tenant?.id || seeded) return;
    seedFinanceFromExistingData({
      tenantId: tenant.id,
      bookings,
      payments,
      accountingEntries,
      createdBy: user?.id,
    });
    setSeeded(true);
    runBalanceCheck();
  }, [tenant?.id, seeded, bookings, payments, accountingEntries, user?.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <Scale className="h-6 w-6 text-emerald-600" />
          Keuangan & Accounting
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          Pusat kendali finansial — double-entry bookkeeping dengan neraca realtime
        </p>
      </div>

      <FinanceDashboard />

      <div className="border-b border-slate-200 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {activeTab === 'neraca' && <BalanceSheetTab />}
        {activeTab === 'laba-rugi' && <IncomeStatementTab />}
        {activeTab === 'arus-kas' && <CashFlowTab />}
        {activeTab === 'jurnal' && <JournalTab />}
        {activeTab === 'akun' && <ChartOfAccountsTab />}
        {activeTab === 'rekonsiliasi' && <ReconciliationTab />}
        {activeTab === 'pajak' && <TaxTab />}
        {activeTab === 'laporan' && <ReportsTab />}
      </div>
    </div>
  );
}
