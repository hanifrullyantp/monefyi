import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useShellStore } from '../../store/shellStore';
import FinanceSandboxTabs from '../../components/finance-v2/FinanceSandboxTabs';

export default function FinanceV2Layout() {
  const { tenant, setCommandModalOpen } = useAppStore();
  const navigate = useNavigate();
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
        <button
          type="button"
          onClick={() => {
            setCommandModalOpen(true);
            navigate('/app/finance-v2/kasbank');
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Transaksi Baru
        </button>
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
