import { NavLink, useLocation } from 'react-router-dom';
import { SANDBOX_FINANCE_TABS } from '../../types/sandboxFinance';

export default function FinanceSandboxTabs() {
  const location = useLocation();
  const base = '/app/finance-v2';

  return (
    <nav className="flex gap-0.5 overflow-x-auto pb-0 border-b-2 border-slate-200">
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
              `px-4 py-3 text-[13px] font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
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
