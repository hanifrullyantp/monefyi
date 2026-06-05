import { useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { loadFinanceVersion } from '../../lib/financeVersion';
import FinanceV2Layout from './FinanceV2Layout';
import FinanceV2Dashboard from './FinanceV2Dashboard';
import KasPage from './KasPage';
import PiutangPage from './PiutangPage';
import HutangPage from './HutangPage';
import StokPage from './StokPage';
import PraBayarPage from './PraBayarPage';
import AsetPage from './AsetPage';
import InvestorPage from './InvestorPage';
import OpexPage from './OpexPage';
import LaporanPage from './LaporanPage';

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
          navigate('/app', { replace: true });
          setActiveTab('finance');
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id, navigate, setActiveTab, setFinanceVersionPreference]);

  return (
    <Routes>
      <Route element={<FinanceV2Layout />}>
        <Route index element={<FinanceV2Dashboard />} />
        <Route path="kas" element={<KasPage />} />
        <Route path="piutang" element={<PiutangPage />} />
        <Route path="hutang" element={<HutangPage />} />
        <Route path="stok" element={<StokPage />} />
        <Route path="aset" element={<AsetPage />} />
        <Route path="prabayar" element={<PraBayarPage />} />
        <Route path="investor" element={<InvestorPage />} />
        <Route path="opex" element={<OpexPage />} />
        <Route path="laporan" element={<LaporanPage />} />
      </Route>
    </Routes>
  );
}
