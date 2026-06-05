import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import FinanceV2Layout from './FinanceV2Layout';
import FinanceV2Dashboard from './FinanceV2Dashboard';
import FinanceV2Placeholder from './placeholders/FinanceV2Placeholder';

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
        <Route path="kas" element={<FinanceV2Placeholder title="Kas" description="Multi-akun kas dan transfer antar kas — Fase 2." />} />
        <Route path="piutang" element={<FinanceV2Placeholder title="Piutang" description="Manajemen piutang dan pembayaran — Fase 2." />} />
        <Route path="hutang" element={<FinanceV2Placeholder title="Hutang" description="Hutang dagang, pajak, dan lainnya — Fase 2." />} />
        <Route path="stok" element={<FinanceV2Placeholder title="Stok" description="Persediaan barang dan pergerakan stok — Fase 2." />} />
        <Route path="aset" element={<FinanceV2Placeholder title="Aset Tetap" description="Depresiasi aset — Fase 3." />} />
        <Route path="prabayar" element={<FinanceV2Placeholder title="Pra Bayar" description="Amortisasi biaya dibayar dimuka — Fase 3." />} />
        <Route path="investor" element={<FinanceV2Placeholder title="Investor" description="Modal investor dan dividen — Fase 3." />} />
        <Route path="opex" element={<FinanceV2Placeholder title="Opex" description="Budget vs realisasi operasional — Fase 3." />} />
        <Route path="laporan" element={<FinanceV2Placeholder title="Laporan" description="P&L, neraca, arus kas — Fase 4." />} />
      </Route>
    </Routes>
  );
}
