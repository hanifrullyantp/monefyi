import type { CommandTabDef, CommandTabId, TabBadges } from './types';
import { COMMAND_TABS } from './types';

interface ProjectCommandTabsProps {
  activeTab: CommandTabId;
  badges: TabBadges;
  onChange: (tab: CommandTabId) => void;
}

export default function ProjectCommandTabs({ activeTab, badges, onChange }: ProjectCommandTabsProps) {
  return (
    <div className="flex overflow-x-auto border-b border-slate-200 bg-white px-1 shrink-0 scrollbar-thin">
      {COMMAND_TABS.map(tab => {
        const badge = badges[tab.id as keyof TabBadges];
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            title={`Alt+${tab.shortcut}`}
            className={`relative flex items-center gap-2 px-3 md:px-4 py-3 text-xs md:text-sm font-bold whitespace-nowrap border-b-[3px] transition-colors ${
              isActive
                ? 'text-emerald-600 border-emerald-600 bg-emerald-50/50'
                : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <tab.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            {badge != null && badge > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                isActive ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export { COMMAND_TABS };
export type { CommandTabDef, CommandTabId };
