import { Outlet } from 'react-router-dom';
import FinanceV2Sidebar from '../../components/finance-v2/FinanceV2Sidebar';

export default function FinanceV2Layout() {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900">Keuangan V2</h1>
        <p className="text-sm text-slate-500">Neraca berbasis double-entry — terpisah dari Finance V1.</p>
      </div>
      <FinanceV2Sidebar />
      <Outlet />
    </div>
  );
}
