import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import FinanceV2Layout from './FinanceV2Layout';
import FinanceV2Dashboard from './FinanceV2Dashboard';
import FinanceV2Placeholder from './placeholders/FinanceV2Placeholder';
import KasPage from './KasPage';
import PiutangPage from './PiutangPage';
import HutangPage from './HutangPage';
import StokPage from './StokPage';
import PraBayarPage from './PraBayarPage';
import AsetPage from './AsetPage';
import InvestorPage from './InvestorPage';
import OpexPage from './OpexPage';

export default function FinanceV2Routes() {
  const location = useLocation();
  const setActiveTab = useAppStore(s => s.setActiveTab);

  useEffect(() => {
    setActiveTab('finance');
  }, [location.pathname, setActiveTab]);

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
        <Route path="laporan" element={<FinanceV2Placeholder title="Laporan" description="P&L, neraca, arus kas — Fase 4." />} />
      </Route>
    </Routes>
  );
}
