import { Home, FolderOpen, Receipt, Wallet, Sparkles } from 'lucide-react';

export type BottomNavTab = 'home' | 'projects' | 'estimator' | 'finance';

type Props = {
  activeTab: string;
  onSelectTab: (tab: BottomNavTab) => void;
  onOpenMonefyiAi: () => void;
  pendingSyncCount?: number;
};

export default function BottomNav({
  activeTab,
  onSelectTab,
  onOpenMonefyiAi,
  pendingSyncCount = 0,
}: Props) {
  const isHome = activeTab === 'home';
  const isProjects = activeTab === 'projects';
  const isEstimator = activeTab === 'estimator';
  const isFinance = activeTab === 'finance' || activeTab === 'finance-v2';

  return (
    <nav
      aria-label="Navigasi bawah"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#E5EAE8] h-[72px] flex items-center justify-around px-1 pb-1 box-border shadow-[0_-4px_20px_rgba(15,23,42,0.05)] safe-bottom"
    >
      {/* Home */}
      <button
        type="button"
        onClick={() => onSelectTab('home')}
        aria-label="Home"
        className={`w-16 h-full flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform ${
          isHome ? 'text-[#047857] font-extrabold' : 'text-[#5B6B7A] font-semibold'
        }`}
      >
        <Home className="w-[22px] h-[22px]" />
        <span className="text-[11px] leading-none">Home</span>
      </button>

      {/* Proyek */}
      <button
        type="button"
        onClick={() => onSelectTab('projects')}
        aria-label="Proyek"
        className={`w-16 h-full flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform ${
          isProjects ? 'text-[#047857] font-extrabold' : 'text-[#5B6B7A] font-semibold'
        }`}
      >
        <FolderOpen className="w-[22px] h-[22px]" />
        <span className="text-[11px] leading-none">Proyek</span>
      </button>

      {/* Monefyi AI FAB */}
      <button
        type="button"
        onClick={onOpenMonefyiAi}
        aria-label="Tanya Monefyi AI"
        className="relative -top-3 w-16 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
      >
        <span className="relative w-[54px] h-[54px] rounded-full bg-gradient-to-br from-[#064E3B] to-[#059669] text-white flex items-center justify-center shadow-[0_8px_18px_-6px_rgba(4,120,87,0.7)] border-[3px] border-white">
          <Sparkles className="w-6 h-6" />
          {pendingSyncCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {pendingSyncCount > 9 ? '9+' : pendingSyncCount}
            </span>
          )}
        </span>
        <span className="text-[11px] font-extrabold text-[#047857] leading-none">
          Monefyi
        </span>
      </button>

      {/* Estimator */}
      <button
        type="button"
        onClick={() => onSelectTab('estimator')}
        aria-label="Estimator"
        className={`w-16 h-full flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform ${
          isEstimator ? 'text-[#047857] font-extrabold' : 'text-[#5B6B7A] font-semibold'
        }`}
      >
        <Receipt className="w-[22px] h-[22px]" />
        <span className="text-[11px] leading-none">Estimator</span>
      </button>

      {/* Finance */}
      <button
        type="button"
        onClick={() => onSelectTab('finance')}
        aria-label="Finance"
        className={`w-16 h-full flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform ${
          isFinance ? 'text-[#047857] font-extrabold' : 'text-[#5B6B7A] font-semibold'
        }`}
      >
        <Wallet className="w-[22px] h-[22px]" />
        <span className="text-[11px] leading-none">Finance</span>
      </button>
    </nav>
  );
}

