import { NavLink } from 'react-router-dom';
import { FINANCE_V2_NAV } from '../../types/financeV2';
import { LayoutDashboard, Wallet, ArrowDownLeft, ArrowUpRight, Package, Building2, Clock, Users, Receipt, FileText } from 'lucide-react';

const ICONS: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  kas: Wallet,
  piutang: ArrowDownLeft,
  hutang: ArrowUpRight,
  stok: Package,
  aset: Building2,
  prabayar: Clock,
  investor: Users,
  opex: Receipt,
  laporan: FileText,
};

export default function FinanceV2Sidebar() {
  return (
    <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 -mx-1 px-1">
      {FINANCE_V2_NAV.map(item => {
        const Icon = ICONS[item.slug] || LayoutDashboard;
        const to = item.path ? `/app/finance-v2/${item.path}` : '/app/finance-v2';
        const end = item.path === '';
        return (
          <NavLink
            key={item.slug}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
