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
    <div className="p-3.5 sm:p-4 md:p-6 max-w-7xl mx-auto space-y-3.5 sm:space-y-5 pb-28 md:pb-20">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="min-w-0">
          <h1 className="text-[22px] md:text-3xl font-extrabold text-[#0F172A] tracking-tight truncate">
            Keuangan Bisnis
          </h1>
          <p className="text-xs font-semibold text-[#5B6B7A] mt-0.5 truncate">
            {tenant?.name || 'Neraca & arus kas organisasi'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCommandModalOpen(true);
            navigate('/app/finance-v2/kasbank');
          }}
          className="shrink-0 h-11 px-3.5 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold shadow-xs transition-transform active:scale-95 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 stroke-[2.8]" />
          <span>Transaksi Baru</span>
        </button>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden">
        <FinanceSandboxTabs />
      </div>

      {/* Main Card Wrapper */}
      <div className="bg-transparent md:bg-white md:rounded-2xl md:border md:border-slate-100 md:shadow-xs overflow-hidden">
        {/* Desktop Tab Navigation */}
        <div className="hidden md:block px-4 pt-3">
          <FinanceSandboxTabs />
        </div>
        <div className="py-1 md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
