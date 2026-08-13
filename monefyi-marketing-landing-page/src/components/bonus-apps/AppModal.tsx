import React from 'react';
import { Sparkles } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { BagiHasilApp } from './apps/BagiHasilApp';
import { SalaryApp } from './apps/SalaryApp';
import { DebtFreeApp } from './apps/DebtFreeApp';
import { BudgetApp } from './apps/BudgetApp';
import { PremiumIcon } from '../ui/PremiumIcon';

interface AppModalProps {
  open: boolean;
  onClose: () => void;
  appId: string | null;
  appName: string;
}

export function AppModal({ open, onClose, appId, appName }: AppModalProps) {
  const renderApp = () => {
    switch (appId) {
      case 'bagi-hasil': return <BagiHasilApp />;
      case 'salary': return <SalaryApp />;
      case 'debt-free': return <DebtFreeApp />;
      case 'budget': return <BudgetApp />;
      default: return null;
    }
  };

  const getIcon = () => {
    switch (appId) {
      case 'bagi-hasil': return 'Calculator';
      case 'salary': return 'Receipt';
      case 'debt-free': return 'Target';
      case 'budget': return 'PieChart';
      default: return 'Sparkles';
    }
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-3xl">
      <div className="bg-gradient-to-r from-green-900/50 to-slate-900 px-6 py-5 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PremiumIcon name={getIcon() as any} variant="glow" color="green" size="md" />
          <div>
            <h3 className="text-white font-bold leading-none">{appName}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="green" size="sm">GRATIS</Badge>
              <span className="text-[10px] text-slate-400">Versi Ringan</span>
            </div>
          </div>
        </div>
      </div>
      <div className="p-6 overflow-y-auto max-h-[70vh]">
        {renderApp()}
      </div>
      <div className="bg-slate-800/50 p-6 border-t border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-400">
          <Sparkles size={16} className="text-amber-400" />
          <p className="text-xs">Dapatkan versi <b>FULL & Terintegrasi</b> di aplikasi Monefyi</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            onClose();
            window.location.hash = 'pricing';
          }}
        >
          Lihat Harga & Promo
        </Button>
      </div>
    </Modal>
  );
}
