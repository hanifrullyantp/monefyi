import { useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
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

function LegacyRedirect({ from }: { from: string }) {
  const to = LEGACY_FINANCE_REDIRECTS[from] || 'overview';
  const path = to === 'overview' ? '/app/finance-v2' : `/app/finance-v2/${to}`;
  return <Navigate to={path} replace />;
}

export default function FinanceV2Routes() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAppStore(s => s.user);
  const setActiveTab = useAppStore(s => s.setActiveTab);
  const setFinanceVersionPreference = useAppStore(s => s.setFinanceVersionPreference);

  useEffect(() => {
    setActiveTab('finance');
  }, [location.pathname, setActiveTab]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    loadFinanceVersion(user.id)
      .then(version => {
        if (cancelled) return;
        setFinanceVersionPreference(version);
        if (version === 'v1') {
          navigate('/app/finance-v2', { replace: true });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id, navigate, setFinanceVersionPreference]);

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
