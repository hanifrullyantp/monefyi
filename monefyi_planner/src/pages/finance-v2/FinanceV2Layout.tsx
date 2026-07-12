import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { useShellStore } from '../../store/shellStore';
import FinanceSandboxTabs from '../../components/finance-v2/FinanceSandboxTabs';

export default function FinanceV2Layout() {
  const { tenant } = useAppStore();
  const { setShellMeta, clearShellMeta } = useShellStore();

  useEffect(() => {
    setShellMeta({ breadcrumb: [{ label: 'Keuangan Bisnis' }] });
    return () => clearShellMeta();
  }, [setShellMeta, clearShellMeta]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Keuangan Bisnis</h1>
          <p className="text-sm text-slate-500">{tenant?.name || 'Neraca & arus kas organisasi'}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 pt-3">
          <FinanceSandboxTabs />
        </div>
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
