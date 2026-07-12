import { NavLink, useLocation } from 'react-router-dom';
import { SANDBOX_FINANCE_TABS } from '../../types/sandboxFinance';

export default function FinanceSandboxTabs() {
  const location = useLocation();
  const base = '/app/finance-v2';

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 border-b border-slate-100">
      {SANDBOX_FINANCE_TABS.map(tab => {
        const to = tab.path ? `${base}/${tab.path}` : base;
        const isActive = tab.path
          ? location.pathname === to || location.pathname.startsWith(`${to}/`)
          : location.pathname === base || location.pathname === `${base}/`;
        return (
          <NavLink
            key={tab.slug}
            to={to}
            end={!tab.path}
            className={() =>
              `px-4 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`
            }
          >
            {tab.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
