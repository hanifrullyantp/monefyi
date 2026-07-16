import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { loadFinanceVersion } from '../../lib/financeVersion';
import { LEGACY_FINANCE_REDIRECTS } from '../../types/sandboxFinance';
import FinanceV2Layout from './FinanceV2Layout';
import FinanceV2Dashboard from './FinanceV2Dashboard';
import KasPage from './KasPage';
import OpexPage from './OpexPage';
import AsetPage from './AsetPage';
import StokPage from './StokPage';
import LaporanPage from './LaporanPage';
import FinanceHutangPiutangTab, { FinanceLabaRugiTab } from './FinanceSandboxTabsContent';
import FinancePlanningPage from './FinancePlanningPage';
import FinanceBudgetPage from './FinanceBudgetPage';

function LegacyRedirect({ from }: { from: string }) {
  const to = LEGACY_FINANCE_REDIRECTS[from] || 'overview';
  const path = to === 'overview' ? '/app/finance-v2' : `/app/finance-v2/${to}`;
  return <Navigate to={path} replace />;
}

export default function FinanceV2Routes() {
  const setActiveTab = useAppStore(s => s.setActiveTab);
  const setFinanceVersionPreference = useAppStore(s => s.setFinanceVersionPreference);
  const user = useAppStore(s => s.user);

  useEffect(() => {
    setActiveTab('finance');
  }, [setActiveTab]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    loadFinanceVersion(user.id)
      .then(version => {
        if (cancelled) return;
        setFinanceVersionPreference(version);
      })
      .catch(() => {
        if (!cancelled) setFinanceVersionPreference('v3');
      });
    return () => { cancelled = true; };
  }, [user?.id, setFinanceVersionPreference]);

  return (
    <Routes>
      <Route element={<FinanceV2Layout />}>
        <Route index element={<FinanceV2Dashboard />} />
        <Route path="kasbank" element={<KasPage />} />
        <Route path="hutangpiutang" element={<FinanceHutangPiutangTab mode="combined" />} />
        <Route path="labarugi" element={<FinanceLabaRugiTab />} />
        <Route path="operasional" element={<OpexPage />} />
        <Route path="aset" element={<AsetPage />} />
        <Route path="laporan" element={<LaporanPage />} />
        <Route path="perencanaan" element={<FinancePlanningPage />} />
        <Route path="budget" element={<FinanceBudgetPage />} />
        {/* Legacy paths → sandbox tabs */}
        <Route path="kas" element={<LegacyRedirect from="kas" />} />
        <Route path="piutang" element={<LegacyRedirect from="piutang" />} />
        <Route path="hutang" element={<LegacyRedirect from="hutang" />} />
        <Route path="stok" element={<StokPage />} />
        <Route path="prabayar" element={<LegacyRedirect from="prabayar" />} />
        <Route path="investor" element={<LegacyRedirect from="investor" />} />
        <Route path="opex" element={<LegacyRedirect from="opex" />} />
      </Route>
    </Routes>
  );
}
