import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, TrendingDown, CheckCircle2 } from 'lucide-react';

type AlertType = 'danger' | 'warning' | 'success';

interface AlertConfig {
  bg: string;
  border: string;
  icon: React.FC<{ size?: number; className?: string }>;
  iconClass: string;
  title: string;
  titleClass: string;
  message: string;
  btnText: string;
  btnClass: string;
}

const ALERTS: Record<AlertType, AlertConfig> = {
  danger: {
    bg: 'bg-red-950/95',
    border: 'border-red-500/40',
    icon: AlertCircle,
    iconClass: 'text-red-400',
    title: 'Budget Terlampaui!',
    titleClass: 'text-red-400',
    message: 'Pengeluaran makan +Rp 145rb',
    btnText: 'Lihat Detail',
    btnClass: 'bg-red-500/20 text-red-300 hover:bg-red-500/30',
  },
  warning: {
    bg: 'bg-amber-950/95',
    border: 'border-amber-500/40',
    icon: TrendingDown,
    iconClass: 'text-amber-400',
    title: 'Perhatian Cash Flow',
    titleClass: 'text-amber-400',
    message: 'Saldo habis tgl 28 jika lanjut',
    btnText: 'Atur Sekarang',
    btnClass: 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30',
  },
  success: {
    bg: 'bg-green-950/95',
    border: 'border-green-500/40',
    icon: CheckCircle2,
    iconClass: 'text-green-400',
    title: 'Target Tercapai!',
    titleClass: 'text-green-400',
    message: 'Dana darurat 1 bulan terpenuhi',
    btnText: 'Lihat Progress',
    btnClass: 'bg-green-500/20 text-green-300 hover:bg-green-500/30',
  },
};

const ALERT_SEQUENCE: AlertType[] = ['danger', 'warning', 'success'];

export function FinancialAlertOverlay(): React.ReactElement {
  const [currentAlert, setCurrentAlert] = useState<{ type: AlertType; key: number } | null>(null);
  const [seqIndex, setSeqIndex] = useState(0);

  useEffect(() => {
    const show = () => {
      const type = ALERT_SEQUENCE[seqIndex % ALERT_SEQUENCE.length];
      setCurrentAlert({ type, key: Date.now() });
      setSeqIndex(prev => prev + 1);
      setTimeout(() => setCurrentAlert(null), 4400);
    };

    const initialDelay = setTimeout(show, 3000);
    const interval = setInterval(show, 13000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [seqIndex]);

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      <AnimatePresence>
        {currentAlert && (() => {
          const config = ALERTS[currentAlert.type];
          const Icon = config.icon;
          const shake = currentAlert.type !== 'success';
          return (
            <motion.div
              key={currentAlert.key}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.08, 1],
                opacity: [0, 1, 1],
                x: shake ? [-3, 3, -2, 2, 0] : 0,
              }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className={`absolute left-4 right-4 rounded-2xl p-4 text-center border backdrop-blur-lg ${config.bg} ${config.border}`}
              style={{ top: '30%' }}
            >
              <Icon size={28} className={`${config.iconClass} mx-auto mb-2`} />
              <p className={`text-sm font-bold mb-1 ${config.titleClass}`}>{config.title}</p>
              <p className="text-xs text-slate-300 mb-3">{config.message}</p>
              <button className={`text-xs rounded-lg px-3 py-1.5 transition-colors ${config.btnClass}`}>
                {config.btnText}
              </button>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
